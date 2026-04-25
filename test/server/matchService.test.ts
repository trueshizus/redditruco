import { describe, it, expect } from 'vitest';
import {
  createMatchService,
  type MatchService,
} from '../../src/server/matchService';
import { createMemoryStore } from '../../src/server/storage/memoryStore';
import type { MatchAction, MatchSlot } from '../../src/shared/match';

type Broadcast = { channel: string; msg: unknown };

function makeSvc(): {
  svc: MatchService;
  broadcasts: Broadcast[];
  store: ReturnType<typeof createMemoryStore>;
  advance: (ms: number) => void;
  setTime: (ts: number) => void;
} {
  let nowMs = 1_700_000_000_000;
  const store = createMemoryStore({ now: () => nowMs });
  const broadcasts: Broadcast[] = [];
  let counter = 0;
  const svc = createMatchService({
    store,
    now: () => nowMs,
    randomId: (kind) => {
      counter += 1;
      return kind === 'match' ? `M${counter}` : `T${counter}`;
    },
    broadcast: async (channel, msg) => {
      broadcasts.push({ channel, msg });
    },
  });
  return {
    svc,
    broadcasts,
    store,
    advance: (ms) => {
      nowMs += ms;
    },
    setTime: (ts) => {
      nowMs = ts;
    },
  };
}

// ---------- Lifecycle ----------

describe('matchService — lifecycle', () => {
  it('create + join + initial state', async () => {
    const { svc } = makeSvc();
    const c = await svc.createMatch({
      postId: 'p1',
      creator: 'alice',
      visibility: 'public',
    });
    expect(c.matchId).toBe('M1');
    expect(c.joinToken).toBeUndefined();

    const j = await svc.joinMatch('M1', 'bob');
    expect(j.ok).toBe(true);
    if (!j.ok) return;
    expect(j.meta.status).toBe('active');
    expect(j.meta.p1).toBe('alice');
    expect(j.meta.p2).toBe('bob');

    const view = await svc.getView('M1');
    expect(view).not.toBeNull();
    expect(view!.lastSeq).toBe(0);
    expect(view!.snapshot).not.toBeNull();
  });

  it('rejects creator joining their own match', async () => {
    const { svc } = makeSvc();
    await svc.createMatch({ postId: 'p1', creator: 'alice', visibility: 'public' });
    const r = await svc.joinMatch('M1', 'alice');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/own match/);
  });

  it('rejects second joiner (slot already filled)', async () => {
    const { svc } = makeSvc();
    await svc.createMatch({ postId: 'p1', creator: 'alice', visibility: 'public' });
    const ok1 = await svc.joinMatch('M1', 'bob');
    expect(ok1.ok).toBe(true);
    const ok2 = await svc.joinMatch('M1', 'carol');
    expect(ok2.ok).toBe(false);
  });

  it('private match requires correct join token', async () => {
    const { svc } = makeSvc();
    const c = await svc.createMatch({
      postId: 'p1',
      creator: 'alice',
      visibility: 'private',
    });
    expect(c.joinToken).toBeDefined();

    const wrong = await svc.joinMatch('M1', 'bob', 'wrong-token');
    expect(wrong.ok).toBe(false);

    const right = await svc.joinMatch('M1', 'bob', c.joinToken);
    expect(right.ok).toBe(true);
  });

  it('private matches do NOT show in public open list', async () => {
    const { svc } = makeSvc();
    await svc.createMatch({ postId: 'p1', creator: 'alice', visibility: 'private' });
    const open = await svc.listOpenInPost('p1');
    expect(open).toHaveLength(0);
  });

  it('public matches DO show in open list and disappear after join', async () => {
    const { svc } = makeSvc();
    await svc.createMatch({ postId: 'p1', creator: 'alice', visibility: 'public' });
    expect(await svc.listOpenInPost('p1')).toHaveLength(1);
    await svc.joinMatch('M1', 'bob');
    expect(await svc.listOpenInPost('p1')).toHaveLength(0);
  });
});

// ---------- Find-or-create ----------

describe('matchService — findOrCreate', () => {
  it('first user creates, second user joins', async () => {
    const { svc } = makeSvc();
    const a = await svc.findOrCreate('p1', 'alice');
    expect('matchId' in a && a.role).toBe('creator');

    const b = await svc.findOrCreate('p1', 'bob');
    expect('matchId' in b && b.role).toBe('joiner');

    if ('matchId' in a && 'matchId' in b) {
      expect(a.matchId).toBe(b.matchId);
    }
  });

  it('does not pair user with themselves', async () => {
    const { svc } = makeSvc();
    await svc.findOrCreate('p1', 'alice');
    const second = await svc.findOrCreate('p1', 'alice');
    expect('matchId' in second && second.role).toBe('creator');
  });
});

// ---------- Action flow ----------

describe('matchService — applyAction', () => {
  async function bootstrap(): Promise<{
    svc: MatchService;
    broadcasts: Broadcast[];
    matchId: string;
    p1Slot: MatchSlot;
    p2Slot: MatchSlot;
    advance: (ms: number) => void;
  }> {
    const env = makeSvc();
    await env.svc.createMatch({ postId: 'p1', creator: 'alice', visibility: 'public' });
    const j = await env.svc.joinMatch('M1', 'bob');
    if (!j.ok) throw new Error('join failed');
    return {
      svc: env.svc,
      broadcasts: env.broadcasts,
      matchId: 'M1',
      p1Slot: 0,
      p2Slot: 1,
      advance: env.advance,
    };
  }

  it('plays a card and advances seq + broadcasts', async () => {
    const { svc, broadcasts, matchId } = await bootstrap();
    const peek = await svc.peek(matchId);
    expect(peek).not.toBeNull();
    const turnUser = peek!.context.currentTurn === 0 ? 'alice' : 'bob';
    const hand =
      peek!.context.currentTurn === 0
        ? peek!.context.player.hand
        : peek!.context.adversary.hand;
    const beforeBroadcasts = broadcasts.length;

    const r = await svc.applyAction({
      matchId,
      username: turnUser,
      action: { type: 'PLAY_CARD', cardId: hand[0]! },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.seq).toBe(1);
    expect(broadcasts.length).toBe(beforeBroadcasts + 1);
    const sent = broadcasts[broadcasts.length - 1]!.msg as { kind: string; seq: number };
    expect(sent.kind).toBe('event');
    expect(sent.seq).toBe(1);
  });

  it('rejects action from wrong player (slot enforcement)', async () => {
    const { svc, matchId } = await bootstrap();
    const peek = await svc.peek(matchId);
    const wrongUser = peek!.context.currentTurn === 0 ? 'bob' : 'alice';
    const wrongHand =
      peek!.context.currentTurn === 0
        ? peek!.context.adversary.hand
        : peek!.context.player.hand;
    const r = await svc.applyAction({
      matchId,
      username: wrongUser,
      action: { type: 'PLAY_CARD', cardId: wrongHand[0]! },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/turn/);
      expect(r.status).toBe(400);
    }
  });

  it('rejects action from non-participant', async () => {
    const { svc, matchId } = await bootstrap();
    const r = await svc.applyAction({
      matchId,
      username: 'eve',
      action: { type: 'CONTINUE' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it('rejects expectedSeq mismatch (concurrent action detection)', async () => {
    const { svc, matchId } = await bootstrap();
    const peek = await svc.peek(matchId);
    const turnUser = peek!.context.currentTurn === 0 ? 'alice' : 'bob';
    const hand =
      peek!.context.currentTurn === 0
        ? peek!.context.player.hand
        : peek!.context.adversary.hand;
    // Successful action bumps seq to 1.
    const r1 = await svc.applyAction({
      matchId,
      username: turnUser,
      action: { type: 'PLAY_CARD', cardId: hand[0]! },
      expectedSeq: 0,
    });
    expect(r1.ok).toBe(true);

    // Stale client sends with expectedSeq=0 again.
    const peek2 = await svc.peek(matchId);
    const turnUser2 = peek2!.context.currentTurn === 0 ? 'alice' : 'bob';
    const hand2 =
      peek2!.context.currentTurn === 0
        ? peek2!.context.player.hand
        : peek2!.context.adversary.hand;
    const r2 = await svc.applyAction({
      matchId,
      username: turnUser2,
      action: { type: 'PLAY_CARD', cardId: hand2[0]! },
      expectedSeq: 0,
    });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toMatch(/seq/);
  });
});

// ---------- Disconnection / abandonment ----------

describe('matchService — disconnection (2-min TTL)', () => {
  it('abandons match if opponent presence has expired before action', async () => {
    const env = makeSvc();
    await env.svc.createMatch({ postId: 'p1', creator: 'alice', visibility: 'public' });
    await env.svc.joinMatch('M1', 'bob');

    // Bob disconnects: simulate 2+ minutes without any presence bump.
    env.advance(125 * 1000);

    const peek = await env.svc.peek('M1');
    const turnUser = peek!.context.currentTurn === 0 ? 'alice' : 'bob';
    // The active player tries to act; service should detect opponent's
    // presence is expired and abandon.
    const otherUser = turnUser === 'alice' ? 'bob' : 'alice';
    const present = otherUser; // The one who acts is "present", their opponent is gone.
    const presentHand =
      (peek!.context.currentTurn === 0 ? peek!.context.player.hand : peek!.context.adversary.hand);
    const r = await env.svc.applyAction({
      matchId: 'M1',
      username: present,
      action: { type: 'PLAY_CARD', cardId: presentHand[0]! },
    });
    // Either present === turnUser (slot match) and apply detects opponent is dead,
    // or present !== turnUser (slot mismatch). We craft `present` to be the turnUser.
    // Re-derive: the present player must be turnUser to even pass slot check.
    if (turnUser === otherUser) {
      // Skip if our setup happens to put the disconnect on the active player.
      // Re-run with the right test.
      return;
    }
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/disconnect|abandon/);
      expect(r.status).toBe(410);
    }
  });

  it('bumpPresence prevents abandonment', async () => {
    const env = makeSvc();
    await env.svc.createMatch({ postId: 'p1', creator: 'alice', visibility: 'public' });
    await env.svc.joinMatch('M1', 'bob');

    // 90s pass, both players heartbeat, then 90s more — neither has crossed
    // the 120s window without a heartbeat.
    env.advance(90 * 1000);
    await env.svc.bumpPresence('M1', 0);
    await env.svc.bumpPresence('M1', 1);
    env.advance(90 * 1000);

    expect(await env.svc.presenceLive('M1', 0)).toBe(true);
    expect(await env.svc.presenceLive('M1', 1)).toBe(true);
  });
});

// ---------- Replay ----------

describe('matchService — replay', () => {
  it('serves event log + result for a finished match', async () => {
    const env = makeSvc();
    await env.svc.createMatch({ postId: 'p1', creator: 'alice', visibility: 'public' });
    await env.svc.joinMatch('M1', 'bob');

    // Play 3 actions to populate the log.
    let appliedSeq = 0;
    for (let i = 0; i < 3; i++) {
      const peek = await env.svc.peek('M1');
      if (!peek) break;
      if (peek.stateValue !== 'playing') break;
      const turn = peek.context.currentTurn as MatchSlot;
      const turnUser = turn === 0 ? 'alice' : 'bob';
      const hand = turn === 0 ? peek.context.player.hand : peek.context.adversary.hand;
      if (hand.length === 0) break;
      const r = await env.svc.applyAction({
        matchId: 'M1',
        username: turnUser,
        action: { type: 'PLAY_CARD', cardId: hand[0]! },
      });
      if (r.ok) appliedSeq = r.seq;
    }

    expect(appliedSeq).toBeGreaterThan(0);

    const replay = await env.svc.getReplay('M1');
    expect(replay).not.toBeNull();
    expect(replay!.events).toHaveLength(appliedSeq);
    expect(replay!.p1).toBe('alice');
    expect(replay!.p2).toBe('bob');
    expect(replay!.seed).toBe('M1');
    // First event is a PLAY_CARD by either slot.
    expect(replay!.events[0]![3]).toBe('PLAY_CARD');
  });

  it('events log returns delta when sinceSeq is provided', async () => {
    const env = makeSvc();
    await env.svc.createMatch({ postId: 'p1', creator: 'alice', visibility: 'public' });
    await env.svc.joinMatch('M1', 'bob');
    const peek = await env.svc.peek('M1');
    const turn = peek!.context.currentTurn as MatchSlot;
    const turnUser = turn === 0 ? 'alice' : 'bob';
    const hand = turn === 0 ? peek!.context.player.hand : peek!.context.adversary.hand;
    await env.svc.applyAction({
      matchId: 'M1',
      username: turnUser,
      action: { type: 'PLAY_CARD', cardId: hand[0]! },
    });
    const all = await env.svc.getEvents('M1', 0);
    const deltaFrom1 = await env.svc.getEvents('M1', 1);
    expect(all).toHaveLength(1);
    expect(deltaFrom1).toHaveLength(0);
  });
});

// ---------- Action helper for use across tests ----------

export async function playOne(
  svc: MatchService,
  matchId: string,
  p1: string,
  p2: string,
): Promise<MatchAction | null> {
  const peek = await svc.peek(matchId);
  if (!peek || peek.stateValue !== 'playing') return null;
  const turn = peek.context.currentTurn as MatchSlot;
  const username = turn === 0 ? p1 : p2;
  const hand = turn === 0 ? peek.context.player.hand : peek.context.adversary.hand;
  if (hand.length === 0) return null;
  const action: MatchAction = { type: 'PLAY_CARD', cardId: hand[0]! };
  await svc.applyAction({ matchId, username, action });
  return action;
}
