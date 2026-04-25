// Drop-in replacement for useCanillitaBot when the opponent is a remote
// human. Same conceptual shape: tells the local XState actor about the
// opponent's actions. Routes the local user's actions through the server
// instead of dispatching them locally.
//
// Authority model: the SERVER is the source of truth. We send actions via
// HTTP, the server validates + persists + broadcasts, and we apply broadcast
// events to our local actor. This means user actions take a round-trip
// before showing up locally — acceptable for turn-based.

import { useCallback, useEffect, useRef, useState } from 'react';
import { connectRealtime } from '@devvit/web/client';
import type {
  MatchAction,
  MatchMeta,
  MatchSlot,
  PersistedMatchSnapshot,
} from '../../shared/match';

export type RemoteStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export type RemoteEventMessage = {
  kind: 'event';
  seq: number;
  slot: MatchSlot;
  action: MatchAction;
  gameOver?: boolean;
  winner?: string | null;
  finalScore?: string | null;
};

export type RemoteMatchStartedMessage = {
  kind: 'match_started';
  matchId: string;
  p1: string;
  p2: string;
  startedAt: number;
};

export type RemoteAbandonedMessage = {
  kind: 'abandoned';
  winner: string;
  reason: string;
};

export type RemoteMessage =
  | RemoteEventMessage
  | RemoteMatchStartedMessage
  | RemoteAbandonedMessage;

interface UseRemotePlayerArgs {
  matchId: string | null;
  /** Called each time a remote event arrives — App should `send()` it to the local actor. */
  onRemoteEvent: (msg: RemoteEventMessage) => void;
  onMatchStarted?: (msg: RemoteMatchStartedMessage) => void;
  onAbandoned?: (msg: RemoteAbandonedMessage) => void;
  /** How often to ping presence (ms). Server TTL is 120s; we ping at 30s. */
  heartbeatMs?: number;
  enabled?: boolean;
}

export type UseRemotePlayerResult = {
  status: RemoteStatus;
  /** Last seq we acknowledged. Used to gap-detect against incoming msgs. */
  lastSeq: number;
  meta: MatchMeta | null;
  snapshot: PersistedMatchSnapshot | null;
  /** Submit a user action. Returns server response or throws on network error. */
  postAction: (action: MatchAction, expectedSeq?: number) => Promise<PostActionResult>;
};

export type PostActionResult =
  | { ok: true; seq: number; snapshot: PersistedMatchSnapshot; meta: MatchMeta; gameOver: boolean }
  | { ok: false; reason: string; status: number };

const DEFAULT_HEARTBEAT_MS = 30_000;

export function useRemotePlayer({
  matchId,
  onRemoteEvent,
  onMatchStarted,
  onAbandoned,
  heartbeatMs = DEFAULT_HEARTBEAT_MS,
  enabled = true,
}: UseRemotePlayerArgs): UseRemotePlayerResult {
  const [status, setStatus] = useState<RemoteStatus>('idle');
  const [meta, setMeta] = useState<MatchMeta | null>(null);
  const [snapshot, setSnapshot] = useState<PersistedMatchSnapshot | null>(null);
  const lastSeqRef = useRef(0);
  const [lastSeq, setLastSeq] = useState(0);

  // Refs let our timer/handler closures see the latest callbacks without
  // tearing down the realtime subscription on every render.
  const onEvtRef = useRef(onRemoteEvent);
  const onStartedRef = useRef(onMatchStarted);
  const onAbandonRef = useRef(onAbandoned);
  useEffect(() => {
    onEvtRef.current = onRemoteEvent;
    onStartedRef.current = onMatchStarted;
    onAbandonRef.current = onAbandoned;
  }, [onRemoteEvent, onMatchStarted, onAbandoned]);

  // Bootstrap: fetch initial snapshot whenever matchId changes.
  useEffect(() => {
    if (!enabled || !matchId) return;
    let cancelled = false;
    setStatus('connecting');

    (async () => {
      try {
        const r = await fetch(`/api/matches/${matchId}`);
        if (!r.ok) throw new Error(`bootstrap failed: ${r.status}`);
        const view = (await r.json()) as {
          meta: MatchMeta;
          snapshot: PersistedMatchSnapshot | null;
          lastSeq: number;
        };
        if (cancelled) return;
        setMeta(view.meta);
        setSnapshot(view.snapshot);
        lastSeqRef.current = view.lastSeq;
        setLastSeq(view.lastSeq);
      } catch (err) {
        if (!cancelled) setStatus('error');
        console.error('[useRemotePlayer] bootstrap', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchId, enabled]);

  // Subscribe to realtime channel.
  useEffect(() => {
    if (!enabled || !matchId) return;
    let connection: { disconnect: () => Promise<void> } | null = null;
    let cancelled = false;

    (async () => {
      try {
        connection = await connectRealtime({
          channel: `truco:${matchId}`,
          onConnect: () => {
            if (!cancelled) setStatus('connected');
          },
          onDisconnect: () => {
            if (!cancelled) setStatus('disconnected');
          },
          onMessage: (raw) => {
            const msg = raw as RemoteMessage;
            if (!msg || typeof msg !== 'object') return;
            switch (msg.kind) {
              case 'event': {
                // Gap detection: if seq jumped, request a delta to fill the gap.
                if (msg.seq !== lastSeqRef.current + 1) {
                  void backfillEvents(matchId, lastSeqRef.current).then((events) => {
                    for (const tuple of events) {
                      // Reuse onRemoteEvent for each gap event.
                      onEvtRef.current({
                        kind: 'event',
                        seq: tuple[0],
                        slot: tuple[2],
                        action:
                          tuple[3] === 'PLAY_CARD'
                            ? { type: 'PLAY_CARD', cardId: tuple[4] as string }
                            : ({ type: tuple[3] } as MatchAction),
                      });
                      lastSeqRef.current = tuple[0];
                      setLastSeq(tuple[0]);
                    }
                  });
                  return;
                }
                onEvtRef.current(msg);
                lastSeqRef.current = msg.seq;
                setLastSeq(msg.seq);
                break;
              }
              case 'match_started':
                onStartedRef.current?.(msg);
                break;
              case 'abandoned':
                onAbandonRef.current?.(msg);
                break;
            }
          },
        });
      } catch (err) {
        if (!cancelled) setStatus('error');
        console.error('[useRemotePlayer] connect', err);
      }
    })();

    return () => {
      cancelled = true;
      void connection?.disconnect().catch(() => {});
    };
  }, [matchId, enabled]);

  // Heartbeat loop.
  useEffect(() => {
    if (!enabled || !matchId) return;
    const id = setInterval(() => {
      void fetch(`/api/matches/${matchId}/heartbeat`, { method: 'POST' }).catch(() => {});
    }, heartbeatMs);
    return () => clearInterval(id);
  }, [matchId, enabled, heartbeatMs]);

  const postAction = useCallback<UseRemotePlayerResult['postAction']>(
    async (action, expectedSeq) => {
      if (!matchId) throw new Error('no active match');
      const r = await fetch(`/api/matches/${matchId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, expectedSeq }),
      });
      const body = (await r.json()) as PostActionResult;
      if (r.ok && 'ok' in body && body.ok) {
        // Don't update local snapshot here — the broadcast will arrive.
        return body;
      }
      return {
        ok: false,
        reason: 'reason' in body ? body.reason : `http ${r.status}`,
        status: r.status,
      };
    },
    [matchId],
  );

  return { status, lastSeq, meta, snapshot, postAction };
}

async function backfillEvents(
  matchId: string,
  sinceSeq: number,
): Promise<[number, number, MatchSlot, string, ...unknown[]][]> {
  try {
    const r = await fetch(`/api/matches/${matchId}/events?since=${sinceSeq}`);
    if (!r.ok) return [];
    const body = (await r.json()) as {
      events: [number, number, MatchSlot, string, ...unknown[]][];
    };
    return body.events ?? [];
  } catch {
    return [];
  }
}
