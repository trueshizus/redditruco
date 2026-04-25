// Thin fetch wrappers for the match endpoints. Pure functions so tests can
// drop in a stub fetch.

import type {
  ActionResponse,
  CreateMatchResponse,
  FindMatchResponse,
  GetEventsResponse,
  GetMatchResponse,
  HeartbeatResponse,
  JoinMatchResponse,
  ListOpenResponse,
  ReplayResponse,
} from '../../shared/types/match-api';
import type { MatchAction, MatchVisibility } from '../../shared/match';

export type Fetcher = typeof fetch;

async function jsonOrThrow<T>(p: Promise<Response>): Promise<T> {
  const r = await p;
  const body = (await r.json().catch(() => ({}))) as T;
  if (!r.ok) {
    const reason = (body as { reason?: string; error?: string }).reason ??
      (body as { error?: string }).error ?? `http ${r.status}`;
    throw new LobbyError(reason, r.status);
  }
  return body;
}

export class LobbyError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'LobbyError';
  }
}

export function makeLobbyApi(f: Fetcher = fetch) {
  return {
    create: (visibility: MatchVisibility) =>
      jsonOrThrow<CreateMatchResponse>(
        f('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility }),
        }),
      ),

    findOrCreate: () =>
      jsonOrThrow<FindMatchResponse>(f('/api/matches/find', { method: 'POST' })),

    listOpen: () => jsonOrThrow<ListOpenResponse>(f('/api/matches/open')),

    join: (matchId: string, joinToken?: string) =>
      jsonOrThrow<JoinMatchResponse>(
        f(`/api/matches/${matchId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(joinToken ? { joinToken } : {}),
        }),
      ),

    getView: (matchId: string) =>
      jsonOrThrow<GetMatchResponse>(f(`/api/matches/${matchId}`)),

    getEvents: (matchId: string, since = 0) =>
      jsonOrThrow<GetEventsResponse>(
        f(`/api/matches/${matchId}/events?since=${since}`),
      ),

    submitAction: (matchId: string, action: MatchAction, expectedSeq?: number) =>
      jsonOrThrow<ActionResponse>(
        f(`/api/matches/${matchId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, expectedSeq }),
        }),
      ),

    getReplay: (matchId: string) =>
      jsonOrThrow<ReplayResponse>(f(`/api/matches/${matchId}/replay`)),

    heartbeat: (matchId: string) =>
      jsonOrThrow<HeartbeatResponse>(
        f(`/api/matches/${matchId}/heartbeat`, { method: 'POST' }),
      ),
  };
}

export type LobbyApi = ReturnType<typeof makeLobbyApi>;
