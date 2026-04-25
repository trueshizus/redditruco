// Match-level types: persistent storage shape for multiplayer matches.
//
// Storage strategy: event sourcing. Every match is fully reconstructible from
// (matchId, players[], events[]). `snapshot` is a cache for fast resume.
//
// Compact event tuples keep the log small: ~40-60 bytes per event in JSON,
// so a typical Truco match is 2-5 KB.

import type { TrucoEvent, GameContext } from '../truco/types.js';

export type MatchVisibility = 'public' | 'private';
export type MatchMode = 'casual'; // forward-compat for 'ranked'
export type MatchStatus = 'open' | 'active' | 'finished' | 'abandoned';

export type MatchSlot = 0 | 1;

export type MatchMeta = {
  matchId: string;
  postId: string;
  visibility: MatchVisibility;
  mode: MatchMode;
  status: MatchStatus;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  /** Username of slot 0 (creator + mano of round 0). */
  p1: string;
  /** Username of slot 1. null while waiting for opponent. */
  p2: string | null;
  /** Username of the winner once finished. */
  winner: string | null;
  /** "30-12" style display score. */
  finalScore: string | null;
  /** Length of the events list; denormalized for cheap reads. */
  turnCount: number;
  /** Token required to join a private match. Omitted for public matches. */
  joinToken?: string;
};

/**
 * Player-initiated events. Subset of TrucoEvent — excludes machine-internal
 * events (DEAL_CARDS) and admin-only events (RESTART_GAME, START_GAME).
 *
 * The server controls START_GAME automatically once both players have joined.
 */
export type MatchAction =
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'CALL_ENVIDO' }
  | { type: 'CALL_REAL_ENVIDO' }
  | { type: 'CALL_FALTA_ENVIDO' }
  | { type: 'CALL_TRUCO' }
  | { type: 'CALL_RETRUCO' }
  | { type: 'CALL_VALE_CUATRO' }
  | { type: 'QUIERO' }
  | { type: 'NO_QUIERO' }
  | { type: 'MAZO' }
  | { type: 'CONTINUE' }
  | { type: 'NEXT_ROUND' };

export type MatchActionType = MatchAction['type'];

/**
 * Compact event log entry. Tuple form: [seq, ts, slot, type, ...payload].
 * Stored in a Redis list as JSON-stringified arrays.
 *
 * Only PLAY_CARD has a payload (the card id). Everything else is just the type.
 */
export type MatchEventTuple =
  | [number, number, MatchSlot, 'PLAY_CARD', string]
  | [number, number, MatchSlot, Exclude<MatchActionType, 'PLAY_CARD'>];

/**
 * Persisted XState snapshot. XState v5 produces this from getPersistedSnapshot()
 * and accepts it back in createActor(machine, { snapshot }). We treat it as
 * opaque JSON; the only field we look at is `context` (typed as GameContext)
 * for read-only purposes.
 */
export type PersistedMatchSnapshot = {
  status: 'active' | 'done' | 'error' | 'stopped';
  value: unknown;
  context: GameContext;
  // XState includes other fields (children, historyValue, etc.) — kept as unknown.
  [key: string]: unknown;
};

/** Full match-shaped object returned by GET /api/matches/:id. */
export type MatchView = {
  meta: MatchMeta;
  snapshot: PersistedMatchSnapshot | null;
  /** Last seq the client has seen; used for delta fetches. */
  lastSeq: number;
};

/** Response from GET /api/matches/:id/replay. */
export type MatchReplay = {
  matchId: string;
  seed: string;
  p1: string;
  p2: string;
  events: MatchEventTuple[];
  result: {
    winner: string | null;
    finalScore: string | null;
    finishedAt: number | null;
  };
};

export type { TrucoEvent, GameContext };
