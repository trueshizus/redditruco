// Verifies lobbyApi constructs the right HTTP requests. Uses a fake fetch
// that captures calls without a real server.

import { describe, it, expect } from 'vitest';
import { makeLobbyApi, LobbyError } from '../../src/client/multiplayer/lobbyApi';
import type { Fetcher } from '../../src/client/multiplayer/lobbyApi';

type Recorded = { url: string; method: string; body: unknown };

function recordFetch(handler: (req: Recorded) => { status?: number; body: unknown }): {
  fetch: Fetcher;
  calls: Recorded[];
} {
  const calls: Recorded[] = [];
  const fakeFetch: Fetcher = async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const rec: Recorded = { url, method, body };
    calls.push(rec);
    const r = handler(rec);
    return new Response(JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { fetch: fakeFetch, calls };
}

describe('lobbyApi', () => {
  it('create posts visibility and returns matchId', async () => {
    const { fetch, calls } = recordFetch(() => ({
      body: { matchId: 'M1' },
    }));
    const api = makeLobbyApi(fetch);
    const r = await api.create('public');
    expect(r.matchId).toBe('M1');
    expect(calls[0]!.url).toBe('/api/matches');
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.body).toEqual({ visibility: 'public' });
  });

  it('create private returns joinToken', async () => {
    const { fetch } = recordFetch(() => ({ body: { matchId: 'M2', joinToken: 'T-secret' } }));
    const api = makeLobbyApi(fetch);
    const r = await api.create('private');
    expect(r.joinToken).toBe('T-secret');
  });

  it('listOpen returns the matches array', async () => {
    const matches = [{ matchId: 'M1', p1: 'alice' }];
    const { fetch } = recordFetch(() => ({ body: { matches } }));
    const api = makeLobbyApi(fetch);
    const r = await api.listOpen();
    expect(r.matches).toEqual(matches);
  });

  it('findOrCreate returns role + meta', async () => {
    const { fetch, calls } = recordFetch(() => ({
      body: { matchId: 'M3', role: 'joiner', meta: { matchId: 'M3' } },
    }));
    const api = makeLobbyApi(fetch);
    const r = await api.findOrCreate();
    expect('matchId' in r && r.role).toBe('joiner');
    expect(calls[0]!.method).toBe('POST');
  });

  it('join sends joinToken when provided', async () => {
    const { fetch, calls } = recordFetch(() => ({
      body: { ok: true, meta: { matchId: 'M1' }, snapshot: {} },
    }));
    const api = makeLobbyApi(fetch);
    await api.join('M1', 'T-secret');
    expect(calls[0]!.url).toBe('/api/matches/M1/join');
    expect(calls[0]!.body).toEqual({ joinToken: 'T-secret' });
  });

  it('submitAction includes expectedSeq when provided', async () => {
    const { fetch, calls } = recordFetch(() => ({
      body: { ok: true, seq: 5, snapshot: {}, meta: {}, gameOver: false },
    }));
    const api = makeLobbyApi(fetch);
    await api.submitAction('M1', { type: 'PLAY_CARD', cardId: '01_E' }, 4);
    expect(calls[0]!.url).toBe('/api/matches/M1/action');
    expect(calls[0]!.body).toEqual({
      action: { type: 'PLAY_CARD', cardId: '01_E' },
      expectedSeq: 4,
    });
  });

  it('throws LobbyError on non-2xx with reason text', async () => {
    const { fetch } = recordFetch(() => ({
      status: 400,
      body: { ok: false, reason: 'not your turn' },
    }));
    const api = makeLobbyApi(fetch);
    await expect(
      api.submitAction('M1', { type: 'PLAY_CARD', cardId: '01_E' }),
    ).rejects.toThrow(LobbyError);
  });

  it('heartbeat hits the right URL', async () => {
    const { fetch, calls } = recordFetch(() => ({ body: { ok: true } }));
    const api = makeLobbyApi(fetch);
    await api.heartbeat('M1');
    expect(calls[0]!.url).toBe('/api/matches/M1/heartbeat');
    expect(calls[0]!.method).toBe('POST');
  });

  it('getEvents passes since query param', async () => {
    const { fetch, calls } = recordFetch(() => ({ body: { events: [], lastSeq: 0 } }));
    const api = makeLobbyApi(fetch);
    await api.getEvents('M1', 7);
    expect(calls[0]!.url).toContain('since=7');
  });
});
