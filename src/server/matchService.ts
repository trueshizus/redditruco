// Match orchestration. The single source of truth that the HTTP handlers
// (and tests) call into. Wraps a Store + the pure shared/match logic.
//
// Key schema (one Reddit post = one lobby holding many matches):
//   match:{matchId}                  hash    metadata
//   match:{matchId}:snapshot         string  cached PersistedMatchSnapshot (JSON)
//   match:{matchId}:events           zset    score=seq, member=tuple JSON
//   match:{matchId}:players          hash    username -> "0" | "1"
//   match:{matchId}:presence:{slot}  string  TTL-bearing heartbeat marker
//
//   post:{postId}:open               zset    score=createdAt, member=matchId  (public, awaiting opponent)
//   post:{postId}:active             zset    score=startedAt, member=matchId  (in-progress + finished here)
//   challenge:{token}                string  matchId (TTL: 24h, private invites)
//   user:{username}:matches          zset    score=startedAt, member=matchId  (history)
//
// Storage cost per match: ~3-5 KB (events log dominates). Compression deferred.

import { realtime } from '@devvit/web/server';
import {
  applyAction as pureApplyAction,
  initMatchSnapshot,
  peekSnapshot,
  actionToTuple,
  tupleToAction,
  type MatchAction,
  type MatchEventTuple,
  type MatchMeta,
  type MatchReplay,
  type MatchSlot,
  type MatchView,
  type MatchVisibility,
  type PersistedMatchSnapshot,
} from '../shared/match/index.js';
import type { Store } from './storage/store.js';

// ---------- Constants ----------

const PRESENCE_TTL_SEC = 120; // 2 minutes — disconnect threshold per product spec.
const CHALLENGE_TTL_SEC = 24 * 60 * 60; // private invite link lifetime.
const MATCH_TTL_SEC = 7 * 24 * 60 * 60; // archived matches kept for 7 days.

// ---------- Types ----------

export type CreateMatchInput = {
  postId: string;
  creator: string;
  visibility: MatchVisibility;
};

export type CreateMatchResult = { matchId: string; joinToken?: string };

export type JoinResult =
  | { ok: true; meta: MatchMeta; snapshot: PersistedMatchSnapshot }
  | { ok: false; reason: string };

export type FindResult =
  | { matchId: string; role: 'creator' | 'joiner'; meta: MatchMeta }
  | { error: string };

export type ActionResult =
  | {
      ok: true;
      seq: number;
      snapshot: PersistedMatchSnapshot;
      meta: MatchMeta;
      gameOver: boolean;
    }
  | { ok: false; reason: string; status?: number };

// ---------- Service ----------

export type MatchServiceDeps = {
  store: Store;
  /** epoch ms — server-supplied. Injectable for tests. */
  now: () => number;
  /** Matchid generator. Injectable for deterministic tests. */
  randomId: (kind: 'match' | 'token') => string;
  /** Realtime broadcaster. Defaults to Devvit; tests pass a no-op. */
  broadcast?: (channel: string, msg: unknown) => Promise<void>;
};

export type MatchService = ReturnType<typeof createMatchService>;

export function createMatchService(deps: MatchServiceDeps) {
  const { store, now, randomId } = deps;
  const broadcast =
    deps.broadcast ??
    (async (channel, msg) => {
      await realtime.send(channel, msg as Parameters<typeof realtime.send>[1]);
    });

  // ---------- Keys ----------

  const k = {
    meta: (id: string) => `match:${id}`,
    snapshot: (id: string) => `match:${id}:snapshot`,
    events: (id: string) => `match:${id}:events`,
    players: (id: string) => `match:${id}:players`,
    presence: (id: string, slot: MatchSlot) => `match:${id}:presence:${slot}`,
    open: (postId: string) => `post:${postId}:open`,
    active: (postId: string) => `post:${postId}:active`,
    challenge: (token: string) => `challenge:${token}`,
    history: (username: string) => `user:${username}:matches`,
    channel: (id: string) => `truco:${id}`,
  };

  // ---------- Meta serialization ----------

  function serializeMeta(meta: MatchMeta): Record<string, string> {
    const out: Record<string, string> = {
      matchId: meta.matchId,
      postId: meta.postId,
      visibility: meta.visibility,
      mode: meta.mode,
      status: meta.status,
      createdAt: String(meta.createdAt),
      startedAt: meta.startedAt == null ? '' : String(meta.startedAt),
      finishedAt: meta.finishedAt == null ? '' : String(meta.finishedAt),
      p1: meta.p1,
      p2: meta.p2 ?? '',
      winner: meta.winner ?? '',
      finalScore: meta.finalScore ?? '',
      turnCount: String(meta.turnCount),
    };
    if (meta.joinToken) out.joinToken = meta.joinToken;
    return out;
  }

  function parseMeta(raw: Record<string, string>): MatchMeta | null {
    if (!raw.matchId) return null;
    return {
      matchId: raw.matchId,
      postId: raw.postId ?? '',
      visibility: (raw.visibility as MatchVisibility) ?? 'public',
      mode: 'casual',
      status: (raw.status as MatchMeta['status']) ?? 'open',
      createdAt: parseInt(raw.createdAt ?? '0', 10),
      startedAt: raw.startedAt ? parseInt(raw.startedAt, 10) : null,
      finishedAt: raw.finishedAt ? parseInt(raw.finishedAt, 10) : null,
      p1: raw.p1 ?? '',
      p2: raw.p2 ? raw.p2 : null,
      winner: raw.winner ? raw.winner : null,
      finalScore: raw.finalScore ? raw.finalScore : null,
      turnCount: parseInt(raw.turnCount ?? '0', 10),
      ...(raw.joinToken ? { joinToken: raw.joinToken } : {}),
    };
  }

  async function loadMeta(matchId: string): Promise<MatchMeta | null> {
    return parseMeta(await store.hGetAll(k.meta(matchId)));
  }

  async function loadSnapshot(matchId: string): Promise<PersistedMatchSnapshot | null> {
    const raw = await store.get(k.snapshot(matchId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedMatchSnapshot;
  }

  async function saveSnapshot(matchId: string, snap: PersistedMatchSnapshot): Promise<void> {
    await store.set(k.snapshot(matchId), JSON.stringify(snap), { ttlSec: MATCH_TTL_SEC });
  }

  // ---------- Slot resolution ----------

  async function slotFor(matchId: string, username: string): Promise<MatchSlot | null> {
    const players = await store.hGetAll(k.players(matchId));
    const raw = players[username];
    if (raw === '0') return 0;
    if (raw === '1') return 1;
    return null;
  }

  // ---------- Public API ----------

  async function createMatch(input: CreateMatchInput): Promise<CreateMatchResult> {
    const matchId = randomId('match');
    const ts = now();
    const joinToken = input.visibility === 'private' ? randomId('token') : undefined;

    const meta: MatchMeta = {
      matchId,
      postId: input.postId,
      visibility: input.visibility,
      mode: 'casual',
      status: 'open',
      createdAt: ts,
      startedAt: null,
      finishedAt: null,
      p1: input.creator,
      p2: null,
      winner: null,
      finalScore: null,
      turnCount: 0,
      ...(joinToken ? { joinToken } : {}),
    };

    await store.hSet(k.meta(matchId), serializeMeta(meta));
    await store.hSet(k.players(matchId), { [input.creator]: '0' });
    await store.expire(k.meta(matchId), MATCH_TTL_SEC);

    if (input.visibility === 'public') {
      await store.zAdd(k.open(input.postId), [{ score: ts, member: matchId }]);
    } else if (joinToken) {
      await store.set(k.challenge(joinToken), matchId, { ttlSec: CHALLENGE_TTL_SEC });
    }

    return joinToken ? { matchId, joinToken } : { matchId };
  }

  async function joinMatch(
    matchId: string,
    username: string,
    joinToken?: string,
  ): Promise<JoinResult> {
    const meta = await loadMeta(matchId);
    if (!meta) return { ok: false, reason: 'match not found' };
    if (meta.status !== 'open') return { ok: false, reason: `match is ${meta.status}` };
    if (meta.p1 === username) return { ok: false, reason: 'cannot join your own match' };
    if (meta.visibility === 'private' && meta.joinToken !== joinToken)
      return { ok: false, reason: 'invalid join token' };

    // Atomic slot 1 claim — first joiner wins.
    const claimed = await store.hSetNX(k.players(matchId), username, '1');
    if (!claimed) {
      // Race lost. Reload to see the state.
      const fresh = await loadMeta(matchId);
      return {
        ok: false,
        reason: fresh && fresh.status !== 'open' ? `match is ${fresh.status}` : 'race lost',
      };
    }

    // Initialize snapshot — first time we run START_GAME.
    const ts = now();
    const { snapshot } = initMatchSnapshot({
      matchId,
      p1Name: meta.p1,
      p2Name: username,
    });

    const updatedMeta: MatchMeta = {
      ...meta,
      p2: username,
      status: 'active',
      startedAt: ts,
    };

    await store.hSet(k.meta(matchId), serializeMeta(updatedMeta));
    await saveSnapshot(matchId, snapshot);

    // Move from open → active in lobby indices.
    if (meta.visibility === 'public') {
      await store.zRem(k.open(meta.postId), [matchId]);
    }
    await store.zAdd(k.active(meta.postId), [{ score: ts, member: matchId }]);

    // History for both players.
    await store.zAdd(k.history(meta.p1), [{ score: ts, member: matchId }]);
    await store.zAdd(k.history(username), [{ score: ts, member: matchId }]);

    // Heartbeat both as "live" to start.
    await store.set(k.presence(matchId, 0), String(ts), { ttlSec: PRESENCE_TTL_SEC });
    await store.set(k.presence(matchId, 1), String(ts), { ttlSec: PRESENCE_TTL_SEC });

    await broadcast(k.channel(matchId), {
      kind: 'match_started',
      matchId,
      p1: meta.p1,
      p2: username,
      startedAt: ts,
    });

    return { ok: true, meta: updatedMeta, snapshot };
  }

  async function findOrCreate(postId: string, username: string): Promise<FindResult> {
    // Scan top N open matches in this post (oldest first = fair queue).
    // - If we find one not created by us and still open → join it.
    // - If our OWN open match is in the list → return it as creator (we're
    //   already waiting; don't create yet another).
    // - If neither, create a fresh public match.
    const candidates = await store.zRange(k.open(postId), -Infinity, Infinity, { limit: 20 });
    let myOwn: { matchId: string; meta: MatchMeta } | null = null;

    for (const c of candidates) {
      const candidateMeta = await loadMeta(c.member);
      if (!candidateMeta || candidateMeta.status !== 'open') continue;
      if (candidateMeta.p1 === username) {
        if (!myOwn) myOwn = { matchId: c.member, meta: candidateMeta };
        continue;
      }
      const join = await joinMatch(c.member, username);
      if (!join.ok) continue;
      return { matchId: c.member, role: 'joiner', meta: join.meta };
    }

    if (myOwn) {
      return { matchId: myOwn.matchId, role: 'creator', meta: myOwn.meta };
    }

    const created = await createMatch({ postId, creator: username, visibility: 'public' });
    const meta = await loadMeta(created.matchId);
    if (!meta) return { error: 'failed to create match' };
    return { matchId: created.matchId, role: 'creator', meta };
  }

  async function getView(matchId: string): Promise<MatchView | null> {
    const meta = await loadMeta(matchId);
    if (!meta) return null;
    const snapshot = await loadSnapshot(matchId);
    return { meta, snapshot, lastSeq: meta.turnCount };
  }

  async function getEvents(matchId: string, sinceSeq = 0): Promise<MatchEventTuple[]> {
    const entries = await store.zRange(k.events(matchId), sinceSeq + 1, Infinity);
    return entries.map((e) => JSON.parse(e.member) as MatchEventTuple);
  }

  async function getReplay(matchId: string): Promise<MatchReplay | null> {
    const meta = await loadMeta(matchId);
    if (!meta || !meta.p2) return null;
    const events = await getEvents(matchId, 0);
    return {
      matchId,
      seed: meta.matchId,
      p1: meta.p1,
      p2: meta.p2,
      events,
      result: {
        winner: meta.winner,
        finalScore: meta.finalScore,
        finishedAt: meta.finishedAt,
      },
    };
  }

  async function listOpenInPost(postId: string, limit = 20): Promise<MatchMeta[]> {
    const ids = await store.zRange(k.open(postId), -Infinity, Infinity, { limit });
    const metas = await Promise.all(ids.map((e) => loadMeta(e.member)));
    return metas.filter((m): m is MatchMeta => m !== null);
  }

  async function bumpPresence(matchId: string, slot: MatchSlot): Promise<void> {
    await store.set(k.presence(matchId, slot), String(now()), {
      ttlSec: PRESENCE_TTL_SEC,
    });
  }

  async function presenceLive(matchId: string, slot: MatchSlot): Promise<boolean> {
    return await store.exists(k.presence(matchId, slot));
  }

  async function applyMatchAction(args: {
    matchId: string;
    username: string;
    action: MatchAction;
    expectedSeq?: number;
  }): Promise<ActionResult> {
    const meta = await loadMeta(args.matchId);
    if (!meta) return { ok: false, reason: 'match not found', status: 404 };
    if (meta.status === 'finished' || meta.status === 'abandoned')
      return { ok: false, reason: `match is ${meta.status}`, status: 409 };

    const slot = await slotFor(args.matchId, args.username);
    if (slot === null) return { ok: false, reason: 'not a participant', status: 403 };

    if (args.expectedSeq != null && args.expectedSeq !== meta.turnCount) {
      return {
        ok: false,
        reason: `seq mismatch: expected ${args.expectedSeq}, current ${meta.turnCount}`,
        status: 409,
      };
    }

    // Sweep stale presence: if opponent disconnected past TTL, abandon match
    // and award win to the present player.
    const opponentSlot: MatchSlot = slot === 0 ? 1 : 0;
    const opponentLive = await presenceLive(args.matchId, opponentSlot);
    if (!opponentLive && meta.status === 'active') {
      const ts = now();
      const winner = slot === 0 ? meta.p1 : meta.p2!;
      const finalMeta: MatchMeta = {
        ...meta,
        status: 'abandoned',
        finishedAt: ts,
        winner,
      };
      await store.hSet(k.meta(args.matchId), serializeMeta(finalMeta));
      await broadcast(k.channel(args.matchId), {
        kind: 'abandoned',
        winner,
        reason: 'opponent disconnected',
      });
      return {
        ok: false,
        reason: 'opponent disconnected — match abandoned',
        status: 410,
      };
    }

    const snap = await loadSnapshot(args.matchId);
    if (!snap) return { ok: false, reason: 'snapshot missing', status: 500 };

    const result = pureApplyAction(snap, slot, args.action);
    if (!result.ok) return { ok: false, reason: result.reason, status: 400 };

    const seq = meta.turnCount + 1;
    const ts = now();
    const tuple = actionToTuple(seq, ts, slot, args.action);

    await store.zAdd(k.events(args.matchId), [
      { score: seq, member: JSON.stringify(tuple) },
    ]);
    await saveSnapshot(args.matchId, result.snapshot);

    // Detect game-over and finalize match.
    let updatedMeta: MatchMeta = { ...meta, turnCount: seq };
    if (result.gameOver && result.winnerSlot != null) {
      const winnerName = result.winnerSlot === 0 ? meta.p1 : meta.p2!;
      const finalScore = `${result.context.player.score}-${result.context.adversary.score}`;
      updatedMeta = {
        ...updatedMeta,
        status: 'finished',
        finishedAt: ts,
        winner: winnerName,
        finalScore,
      };
    }
    await store.hSet(k.meta(args.matchId), serializeMeta(updatedMeta));

    // Bump our own presence on every action.
    await bumpPresence(args.matchId, slot);

    await broadcast(k.channel(args.matchId), {
      kind: 'event',
      seq,
      slot,
      action: args.action,
      ...(result.gameOver
        ? {
            gameOver: true,
            winner: updatedMeta.winner,
            finalScore: updatedMeta.finalScore,
          }
        : {}),
    });

    return {
      ok: true,
      seq,
      snapshot: result.snapshot,
      meta: updatedMeta,
      gameOver: result.gameOver,
    };
  }

  return {
    createMatch,
    joinMatch,
    findOrCreate,
    getView,
    getEvents,
    getReplay,
    listOpenInPost,
    bumpPresence,
    presenceLive,
    applyAction: applyMatchAction,
    /** Test helper — peek at current snapshot context without mutating. */
    peek: async (matchId: string) => {
      const snap = await loadSnapshot(matchId);
      return snap ? peekSnapshot(snap) : null;
    },
    /** Helper for tests/handlers that need to map slot→username. */
    slotFor,
    /** Re-export action decoder for handlers wanting to log raw events. */
    decodeTuple: tupleToAction,
  };
}
