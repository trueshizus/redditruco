import { describe, it, expect } from 'vitest';
import {
  applyAction,
  initMatchSnapshot,
  peekSnapshot,
  replayEvents,
  actionToTuple,
  type MatchAction,
  type MatchEventTuple,
  type MatchSlot,
  type PersistedMatchSnapshot,
} from '../../src/shared/match';

/**
 * Drives a deterministic plain-cards round (no envido/truco bets) using
 * peekSnapshot to inspect state. Records every player event so we can replay.
 *
 * Stops on round_complete or game_over (won't happen in one round, but a
 * safety in case of weird seeds).
 */
function drivePlainRound(
  matchId: string,
  p1: string,
  p2: string,
): { events: MatchEventTuple[]; finalSnap: PersistedMatchSnapshot } {
  const { snapshot } = initMatchSnapshot({ matchId, p1Name: p1, p2Name: p2 });
  let snap = snapshot;
  const events: MatchEventTuple[] = [];
  let seq = 0;
  let safety = 30;

  const apply = (slot: MatchSlot, action: MatchAction) => {
    seq += 1;
    const r = applyAction(snap, slot, action);
    if (!r.ok) throw new Error(`drive failed at seq ${seq}: ${r.reason}`);
    snap = r.snapshot;
    events.push(actionToTuple(seq, 1_700_000_000_000 + seq, slot, action));
  };

  while (safety-- > 0) {
    const peek = peekSnapshot(snap);
    if (peek.stateValue === 'round_complete' || peek.stateValue === 'game_over') break;
    if (peek.stateValue === 'trick_complete') {
      apply(peek.context.currentTurn as MatchSlot, { type: 'CONTINUE' });
      continue;
    }
    if (peek.stateValue !== 'playing') {
      throw new Error(`unexpected state in plain round: ${peek.stateValue}`);
    }
    const turn = peek.context.currentTurn as MatchSlot;
    const hand =
      turn === 0 ? peek.context.player.hand : peek.context.adversary.hand;
    if (hand.length === 0) break;
    apply(turn, { type: 'PLAY_CARD', cardId: hand[0]! });
  }

  return { events, finalSnap: snap };
}

describe('replayEvents', () => {
  it('reconstructs the same final snapshot from a recorded event log', () => {
    const matchId = 'M-REPLAY-1';
    const { events, finalSnap } = drivePlainRound(matchId, 'alice', 'bob');
    expect(events.length).toBeGreaterThan(0);

    const replayed = replayEvents({
      matchId,
      p1Name: 'alice',
      p2Name: 'bob',
      events,
    });

    expect(replayed.failedAt).toBeNull();
    expect(replayed.appliedCount).toBe(events.length);

    const live = peekSnapshot(finalSnap);
    const restored = peekSnapshot(replayed.snapshot);
    expect(restored.context.player.score).toBe(live.context.player.score);
    expect(restored.context.adversary.score).toBe(live.context.adversary.score);
    expect(restored.context.player.hand).toEqual(live.context.player.hand);
    expect(restored.context.adversary.hand).toEqual(live.context.adversary.hand);
    expect(restored.stateValue).toBe(live.stateValue);
  });

  it('reports failure index when an event is illegal', () => {
    const matchId = 'M-REPLAY-2';
    const bogus: MatchEventTuple[] = [
      [1, 1_700_000_000_000, 0, 'QUIERO'],
    ];
    const r = replayEvents({ matchId, p1Name: 'a', p2Name: 'b', events: bogus });
    expect(r.failedAt).toBe(1);
    expect(r.appliedCount).toBe(0);
    expect(r.failureReason).toMatch(/no bet/i);
  });

  it('round-trips through JSON without losing state', () => {
    const matchId = 'M-REPLAY-3';
    const { events } = drivePlainRound(matchId, 'a', 'b');
    const serialised = JSON.stringify(events);
    const parsed = JSON.parse(serialised) as MatchEventTuple[];
    const r = replayEvents({ matchId, p1Name: 'a', p2Name: 'b', events: parsed });
    expect(r.failedAt).toBeNull();
  });
});
