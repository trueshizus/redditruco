// End-to-end-ish integration test: wires the client lobbyApi against the
// SAME matchService logic the production server uses, via a fake fetch
// that routes /api/matches/* calls to in-memory handlers.
//
// This is the closest we can get to a "production-like" test without
// running the actual Devvit runtime. It catches contract drift between
// client API expectations and server responses.

import { describe, it, expect } from 'vitest';
import { makeLobbyApi } from '../../src/client/multiplayer/lobbyApi';
import { createMatchService } from '../../src/server/matchService';
import { createMemoryStore } from '../../src/server/storage/memoryStore';
import type { MatchAction } from '../../src/shared/match';

type RouteHandler = (
  req: { url: URL; method: string; body: unknown; username: string },
) => Promise<{ status: number; body: unknown }>;

/**
 * Stand up a minimal in-memory "server" matching the real Express router.
 * Returns a fake fetch that the lobbyApi can use as if it were going to
 * a real server.
 */
function makeFakeServer(opts: { username: string }) {
  let nowMs = 1_700_000_000_000;
  let counter = 0;
  const store = createMemoryStore({ now: () => nowMs });
  const broadcasts: { channel: string; msg: unknown }[] = [];

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

  const POST_ID = 'reddit-post-xyz';

  const routes: { method: string; pattern: RegExp; handler: RouteHandler }[] = [
    {
      method: 'POST',
      pattern: /^\/api\/matches$/,
      handler: async ({ body, username }) => {
        const visibility = (body as { visibility: 'public' | 'private' }).visibility;
        const r = await svc.createMatch({ postId: POST_ID, creator: username, visibility });
        return { status: 200, body: r };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/matches\/open$/,
      handler: async () => {
        const matches = await svc.listOpenInPost(POST_ID, 20);
        return { status: 200, body: { matches } };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/matches\/find$/,
      handler: async ({ username }) => {
        const r = await svc.findOrCreate(POST_ID, username);
        return { status: 200, body: r };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/matches\/([^/]+)\/join$/,
      handler: async ({ url, body, username }) => {
        const id = url.pathname.split('/')[3]!;
        const token = (body as { joinToken?: string } | null)?.joinToken;
        const r = await svc.joinMatch(id, username, token);
        return { status: r.ok ? 200 : 400, body: r };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/matches\/([^/]+)$/,
      handler: async ({ url }) => {
        const id = url.pathname.split('/')[3]!;
        const v = await svc.getView(id);
        return v ? { status: 200, body: v } : { status: 404, body: { error: 'not found' } };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/matches\/([^/]+)\/events$/,
      handler: async ({ url }) => {
        const id = url.pathname.split('/')[3]!;
        const since = parseInt(url.searchParams.get('since') ?? '0', 10);
        const events = await svc.getEvents(id, isNaN(since) ? 0 : since);
        const v = await svc.getView(id);
        return { status: 200, body: { events, lastSeq: v?.lastSeq ?? 0 } };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/matches\/([^/]+)\/action$/,
      handler: async ({ url, body, username }) => {
        const id = url.pathname.split('/')[3]!;
        const action = (body as { action: MatchAction; expectedSeq?: number }).action;
        const expectedSeq = (body as { expectedSeq?: number }).expectedSeq;
        const r = await svc.applyAction({
          matchId: id,
          username,
          action,
          ...(expectedSeq != null ? { expectedSeq } : {}),
        });
        if (!r.ok) return { status: r.status ?? 400, body: { ok: false, reason: r.reason } };
        return {
          status: 200,
          body: {
            ok: true,
            seq: r.seq,
            snapshot: r.snapshot,
            meta: r.meta,
            gameOver: r.gameOver,
          },
        };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/matches\/([^/]+)\/heartbeat$/,
      handler: async ({ url, username }) => {
        const id = url.pathname.split('/')[3]!;
        const slot = await svc.slotFor(id, username);
        if (slot === null) return { status: 403, body: { error: 'not a participant' } };
        await svc.bumpPresence(id, slot);
        return { status: 200, body: { ok: true } };
      },
    },
  ];

  function makeFetch(username: string): typeof fetch {
    return async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://x');
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      const route = routes.find((r) => r.method === method && r.pattern.test(url.pathname));
      if (!route) {
        return new Response(JSON.stringify({ error: `no route ${method} ${url.pathname}` }), {
          status: 404,
        });
      }
      const r = await route.handler({ url, method, body, username });
      return new Response(JSON.stringify(r.body), { status: r.status });
    };
  }

  return {
    fetch: makeFetch(opts.username),
    asUser: (u: string) => makeFetch(u),
    advance: (ms: number) => {
      nowMs += ms;
    },
    broadcasts,
    svc,
  };
}

describe('lobby + matchService integration', () => {
  it('quick-match pairing: alice creates, bob joins → both reach the same active match', async () => {
    const server = makeFakeServer({ username: 'alice' });
    const aliceApi = makeLobbyApi(server.asUser('alice'));
    const bobApi = makeLobbyApi(server.asUser('bob'));

    const aliceFind = await aliceApi.findOrCreate();
    expect('matchId' in aliceFind && aliceFind.role).toBe('creator');

    const bobFind = await bobApi.findOrCreate();
    if (!('matchId' in bobFind)) throw new Error('bob find failed');
    expect(bobFind.role).toBe('joiner');
    if ('matchId' in aliceFind) {
      expect(bobFind.matchId).toBe(aliceFind.matchId);
    }

    // Both can fetch the match view.
    const aView = await aliceApi.getView(bobFind.matchId);
    if ('error' in aView) throw new Error(aView.error);
    expect(aView.meta.status).toBe('active');
    expect(aView.meta.p1).toBe('alice');
    expect(aView.meta.p2).toBe('bob');
  });

  it('full action round-trip: alice plays a card, server records seq=1', async () => {
    const server = makeFakeServer({ username: 'alice' });
    const aliceApi = makeLobbyApi(server.asUser('alice'));
    const bobApi = makeLobbyApi(server.asUser('bob'));

    await aliceApi.findOrCreate(); // alice creates
    const found = await bobApi.findOrCreate(); // bob joins
    if (!('matchId' in found)) throw new Error('pair failed');
    const matchId = found.matchId;

    const view = await aliceApi.getView(matchId);
    if ('error' in view) throw new Error(view.error);
    const ctx = (view.snapshot as { context: { currentTurn: number; player: { hand: string[] }; adversary: { hand: string[] } } }).context;
    const turnUser = ctx.currentTurn === 0 ? 'alice' : 'bob';
    const hand = ctx.currentTurn === 0 ? ctx.player.hand : ctx.adversary.hand;

    const turnApi = turnUser === 'alice' ? aliceApi : bobApi;
    const r = await turnApi.submitAction(matchId, { type: 'PLAY_CARD', cardId: hand[0]! });
    if (!('ok' in r) || !r.ok) throw new Error('action rejected');
    expect(r.seq).toBe(1);

    // Both players see the event in the events log.
    const evtsAlice = await aliceApi.getEvents(matchId, 0);
    const evtsBob = await bobApi.getEvents(matchId, 0);
    expect(evtsAlice.events).toHaveLength(1);
    expect(evtsBob.events).toHaveLength(1);
    expect(evtsAlice.events[0]![3]).toBe('PLAY_CARD');

    // Broadcast was emitted.
    expect(server.broadcasts.some((b) => b.channel === `truco:${matchId}`)).toBe(true);
  });

  it('rejects action from non-participant via the API surface', async () => {
    const server = makeFakeServer({ username: 'alice' });
    const aliceApi = makeLobbyApi(server.asUser('alice'));
    const bobApi = makeLobbyApi(server.asUser('bob'));
    const eveApi = makeLobbyApi(server.asUser('eve'));

    await aliceApi.findOrCreate();
    const paired = await bobApi.findOrCreate();
    if (!('matchId' in paired)) throw new Error('pair failed');

    await expect(
      eveApi.submitAction(paired.matchId, { type: 'CONTINUE' }),
    ).rejects.toThrow(/participant/i);
  });

  it('private match flow: token gates joining', async () => {
    const server = makeFakeServer({ username: 'alice' });
    const aliceApi = makeLobbyApi(server.asUser('alice'));
    const bobApi = makeLobbyApi(server.asUser('bob'));

    const created = await aliceApi.create('private');
    expect(created.joinToken).toBeDefined();

    // Without token: rejected.
    await expect(bobApi.join(created.matchId)).rejects.toThrow();

    // With wrong token: rejected.
    await expect(bobApi.join(created.matchId, 'wrong')).rejects.toThrow();

    // With right token: accepted.
    const r = await bobApi.join(created.matchId, created.joinToken);
    if (!r.ok) throw new Error(`join failed: ${r.reason}`);
    expect(r.meta.status).toBe('active');
  });

  it('opponent disconnect after 2+ minutes abandons match', async () => {
    const server = makeFakeServer({ username: 'alice' });
    const aliceApi = makeLobbyApi(server.asUser('alice'));
    const bobApi = makeLobbyApi(server.asUser('bob'));

    await aliceApi.findOrCreate();
    const paired = await bobApi.findOrCreate();
    if (!('matchId' in paired)) throw new Error('pair failed');

    // Skip 130 seconds — past the 120s presence TTL.
    server.advance(130 * 1000);

    const view = await aliceApi.getView(paired.matchId);
    if ('error' in view) throw new Error(view.error);
    const ctx = (view.snapshot as { context: { currentTurn: number; player: { hand: string[] }; adversary: { hand: string[] } } }).context;
    const turnUser = ctx.currentTurn === 0 ? 'alice' : 'bob';
    const hand = ctx.currentTurn === 0 ? ctx.player.hand : ctx.adversary.hand;
    const turnApi = turnUser === 'alice' ? aliceApi : bobApi;

    await expect(
      turnApi.submitAction(paired.matchId, { type: 'PLAY_CARD', cardId: hand[0]! }),
    ).rejects.toThrow(/disconnect|abandon/i);
  });
});
