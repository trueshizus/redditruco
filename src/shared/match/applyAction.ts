// Pure transition function: (snapshot, slot, action) → next snapshot.
// Runs the XState Truco machine server-side and enforces slot identity.
//
// XState v5 typing note: getPersistedSnapshot() returns Snapshot<unknown>
// (a discriminated union including 'done'/'error' variants without a
// `context` field). For our match-snapshot type we treat it as opaque
// JSON; we read context off the LIVE actor (.getSnapshot()) which carries
// the typed GameContext.

import { createActor } from 'xstate';
import { trucoStateMachine } from '../truco/trucoST.js';
import type { GameContext } from '../truco/types.js';
import type {
  MatchAction,
  MatchSlot,
  PersistedMatchSnapshot,
} from './types.js';

export type ApplyResult =
  | {
      ok: true;
      snapshot: PersistedMatchSnapshot;
      context: GameContext;
      stateValue: string;
      gameOver: boolean;
      winnerSlot: MatchSlot | null;
    }
  | { ok: false; reason: string };

// Snapshots are opaque JSON between extractions of context — see file header.
// The `any` casts here are the ONLY type-system escape hatches in this module.
/* eslint-disable @typescript-eslint/no-explicit-any */

function startFromSnapshot(snapshot: PersistedMatchSnapshot) {
  const actor = createActor(trucoStateMachine, { snapshot: snapshot as any });
  actor.start();
  return actor;
}

function startFresh() {
  const actor = createActor(trucoStateMachine);
  actor.start();
  return actor;
}

function persistedFrom(actor: ReturnType<typeof startFresh>): PersistedMatchSnapshot {
  return actor.getPersistedSnapshot() as any;
}

/**
 * Read context + state value from a persisted snapshot without mutating it.
 * Useful for clients/tests that need to inspect state to decide their next
 * action.
 */
export function peekSnapshot(snapshot: PersistedMatchSnapshot): {
  context: GameContext;
  stateValue: string;
} {
  const actor = startFromSnapshot(snapshot);
  const live = actor.getSnapshot();
  const out = { context: live.context, stateValue: String(live.value) };
  actor.stop();
  return out;
}

/**
 * Create a brand-new match snapshot. Drives the machine through START_GAME
 * (which auto-deals via the dealing.always transition) so the returned
 * snapshot is in `playing`, ready for the first PLAY_CARD.
 *
 * `matchId` becomes the seed for deterministic shuffling, so any client can
 * replay the match by re-running events against this same seed.
 */
export function initMatchSnapshot(opts: {
  matchId: string;
  p1Name: string;
  p2Name: string;
}): { snapshot: PersistedMatchSnapshot; context: GameContext } {
  // Step 1: build a default snapshot, patch context with our seed/names.
  const seed = startFresh();
  const defaultCtx = seed.getSnapshot().context;
  const seedSnap = persistedFrom(seed) as any;
  seed.stop();

  const patchedSnap: PersistedMatchSnapshot = {
    ...seedSnap,
    context: {
      ...defaultCtx,
      matchId: opts.matchId,
      seed: opts.matchId,
      player: { ...defaultCtx.player, name: opts.p1Name },
      adversary: { ...defaultCtx.adversary, name: opts.p2Name },
    },
  };

  // Step 2: resume from patched snapshot, send START_GAME.
  // dealing has `always: { target: 'playing' }`, so we land in `playing`.
  const driver = startFromSnapshot(patchedSnap);
  driver.send({ type: 'START_GAME' });
  const live = driver.getSnapshot();
  const persisted = persistedFrom(driver);
  driver.stop();

  return { snapshot: persisted, context: live.context };
}

/**
 * Apply a player action to an existing match snapshot.
 *
 * Validation order:
 *   1. Slot identity matches the actor expected by the current state.
 *   2. Sending the event to the machine actually changes the state value
 *      OR the context (no-op = illegal move).
 */
export function applyAction(
  snapshot: PersistedMatchSnapshot,
  slot: MatchSlot,
  action: MatchAction,
): ApplyResult {
  const actor = startFromSnapshot(snapshot);
  const before = actor.getSnapshot();
  const beforeValue = String(before.value);
  const beforeCtx = before.context;

  const slotCheck = checkSlotAuthority(beforeCtx, beforeValue, slot, action);
  if (!slotCheck.ok) {
    actor.stop();
    return { ok: false, reason: slotCheck.reason };
  }

  actor.send(action);
  const after = actor.getSnapshot();
  const afterValue = String(after.value);
  const afterCtx = after.context;

  // Detect no-op: machine accepted the event but assign returned {} (e.g.
  // PLAY_CARD with a card not in hand). XState produces a new context
  // object on every assign, so reference-equality misses these. Compare
  // by JSON to be robust — match contexts are small.
  if (afterValue === beforeValue && JSON.stringify(afterCtx) === JSON.stringify(beforeCtx)) {
    actor.stop();
    return { ok: false, reason: `illegal action ${action.type} in state ${beforeValue}` };
  }

  const persisted = persistedFrom(actor);
  const winnerSlot =
    afterCtx.gameWinner === 0 || afterCtx.gameWinner === 1
      ? (afterCtx.gameWinner as MatchSlot)
      : null;

  actor.stop();
  return {
    ok: true,
    snapshot: persisted,
    context: afterCtx,
    stateValue: afterValue,
    gameOver: afterValue === 'game_over' || winnerSlot !== null,
    winnerSlot,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------- Slot authority ----------

type SlotCheck = { ok: true } | { ok: false; reason: string };

/**
 * Returns true if the given slot is allowed to send the given action right
 * now. The XState machine has loose turn enforcement (it trusts the UI in
 * single-player mode), so we tighten it here.
 */
function checkSlotAuthority(
  ctx: GameContext,
  stateValue: string,
  slot: MatchSlot,
  action: MatchAction,
): SlotCheck {
  switch (action.type) {
    case 'PLAY_CARD': {
      if (stateValue !== 'playing') return reject('cannot play card outside playing state');
      if (ctx.currentTurn !== slot) return reject('not your turn');
      return { ok: true };
    }

    case 'CALL_TRUCO':
    case 'CALL_RETRUCO':
    case 'CALL_VALE_CUATRO': {
      if (stateValue === 'playing') {
        return { ok: true };
      }
      if (stateValue === 'truco_betting') {
        if (!ctx.awaitingResponse) return reject('no truco bet awaiting response');
        if (ctx.betInitiator === slot)
          return reject('you initiated this truco bet, you cannot raise it');
        return { ok: true };
      }
      return reject(`cannot escalate truco from state ${stateValue}`);
    }

    case 'CALL_ENVIDO':
    case 'CALL_REAL_ENVIDO':
    case 'CALL_FALTA_ENVIDO': {
      if (stateValue === 'playing') return { ok: true };
      if (stateValue === 'envido_betting') {
        if (!ctx.awaitingResponse) return reject('no envido bet awaiting response');
        if (ctx.betInitiator === slot)
          return reject('you initiated this envido, you cannot raise it');
        return { ok: true };
      }
      if (stateValue === 'truco_betting') {
        if (!ctx.awaitingResponse) return reject('cannot interrupt: no truco bet pending');
        if (ctx.betInitiator === slot)
          return reject('only the responder may interrupt truco with envido');
        return { ok: true };
      }
      return reject(`cannot call envido from state ${stateValue}`);
    }

    case 'QUIERO':
    case 'NO_QUIERO': {
      if (stateValue !== 'envido_betting' && stateValue !== 'truco_betting') {
        return reject('no bet to respond to');
      }
      if (!ctx.awaitingResponse) return reject('no bet awaiting response');
      if (ctx.betInitiator === slot)
        return reject('you initiated the bet, you cannot respond to it');
      return { ok: true };
    }

    case 'MAZO': {
      if (
        stateValue !== 'playing' &&
        stateValue !== 'envido_betting' &&
        stateValue !== 'truco_betting'
      ) {
        return reject(`cannot mazo from state ${stateValue}`);
      }
      return { ok: true };
    }

    case 'CONTINUE': {
      if (stateValue !== 'trick_complete') return reject('CONTINUE only valid in trick_complete');
      return { ok: true };
    }

    case 'NEXT_ROUND': {
      if (stateValue !== 'round_complete') return reject('NEXT_ROUND only valid in round_complete');
      return { ok: true };
    }

    default: {
      const _exhaustive: never = action;
      return reject(`unknown action ${(_exhaustive as { type: string }).type}`);
    }
  }
}

function reject(reason: string): SlotCheck {
  return { ok: false, reason };
}
