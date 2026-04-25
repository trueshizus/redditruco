// HTTP API contract for match endpoints. Shared between client and server.

import type {
  MatchAction,
  MatchEventTuple,
  MatchMeta,
  MatchReplay,
  MatchVisibility,
  PersistedMatchSnapshot,
} from '../match/types.js';

// POST /api/matches
export type CreateMatchBody = {
  visibility: MatchVisibility;
};
export type CreateMatchResponse = {
  matchId: string;
  joinToken?: string;
};

// GET /api/matches/open
export type ListOpenResponse = {
  matches: MatchMeta[];
};

// POST /api/matches/find
export type FindMatchResponse =
  | { matchId: string; role: 'creator' | 'joiner'; meta: MatchMeta }
  | { error: string };

// POST /api/matches/:id/join
export type JoinMatchBody = {
  joinToken?: string;
};
export type JoinMatchResponse =
  | { ok: true; meta: MatchMeta; snapshot: PersistedMatchSnapshot }
  | { ok: false; reason: string };

// GET /api/matches/:id
export type GetMatchResponse = {
  meta: MatchMeta;
  snapshot: PersistedMatchSnapshot | null;
  lastSeq: number;
} | { error: string };

// GET /api/matches/:id/events?since=N
export type GetEventsResponse = {
  events: MatchEventTuple[];
  lastSeq: number;
};

// POST /api/matches/:id/action
export type ActionBody = {
  action: MatchAction;
  expectedSeq?: number;
};
export type ActionResponse =
  | {
      ok: true;
      seq: number;
      snapshot: PersistedMatchSnapshot;
      meta: MatchMeta;
      gameOver: boolean;
    }
  | { ok: false; reason: string };

// GET /api/matches/:id/replay
export type ReplayResponse = MatchReplay | { error: string };

// POST /api/matches/:id/heartbeat
export type HeartbeatResponse = { ok: true } | { error: string };
