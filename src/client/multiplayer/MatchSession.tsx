// In-match view for multiplayer. Subscribes to realtime, posts actions,
// and shows a minimal play surface.
//
// This is intentionally bare for v1: it proves the wiring works end-to-end.
// Future iteration will reuse the chat ChatLayout / MessageLog components
// here for UX parity with single-player.

import { useEffect, useState, useCallback } from 'react';
import { useRemotePlayer, type RemoteEventMessage } from './useRemotePlayer';
import type { GameContext, MatchSlot, PersistedMatchSnapshot } from '../../shared/match';

type MatchSessionProps = {
  matchId: string;
  username: string;
};

type LocalView = {
  context: GameContext;
  stateValue: string;
};

export function MatchSession({ matchId, username }: MatchSessionProps) {
  const [view, setView] = useState<LocalView | null>(null);
  const [eventsLog, setEventsLog] = useState<RemoteEventMessage[]>([]);
  const [postError, setPostError] = useState<string | null>(null);

  const remote = useRemotePlayer({
    matchId,
    onRemoteEvent: (msg) => {
      setEventsLog((prev) => [...prev, msg]);
    },
    onAbandoned: (msg) => {
      setPostError(`Match abandoned: ${msg.reason}. Winner: ${msg.winner}.`);
    },
  });

  // Recompute local view from snapshot whenever it (or events) changes.
  useEffect(() => {
    const snap = remote.snapshot;
    if (!snap) {
      setView(null);
      return;
    }
    const ctx = (snap as PersistedMatchSnapshot).context;
    const value = String((snap as PersistedMatchSnapshot).value);
    setView({ context: ctx, stateValue: value });
  }, [remote.snapshot, eventsLog]);

  const meSlot: MatchSlot | null =
    remote.meta?.p1 === username ? 0 : remote.meta?.p2 === username ? 1 : null;

  const isMyTurn =
    view !== null &&
    meSlot !== null &&
    view.stateValue === 'playing' &&
    view.context.currentTurn === meSlot;

  const myHand: string[] = (() => {
    if (!view || meSlot === null) return [];
    return meSlot === 0 ? view.context.player.hand : view.context.adversary.hand;
  })();

  const playCard = useCallback(
    async (cardId: string) => {
      setPostError(null);
      const r = await remote.postAction({ type: 'PLAY_CARD', cardId });
      if (!r.ok) setPostError(r.reason);
    },
    [remote],
  );

  return (
    <div
      style={{
        fontFamily: '"JetBrains Mono", monospace',
        padding: '1rem',
        background: '#0e1014',
        color: '#d6dde8',
        minHeight: '100vh',
      }}
      data-testid="match-session"
    >
      <header style={{ marginBottom: '1rem' }}>
        <div style={{ color: '#7fbf7f', fontSize: '1.05rem' }}>#truco · {matchId}</div>
        <div style={{ color: '#999', fontSize: '0.85rem' }}>
          {remote.meta ? `${remote.meta.p1} vs ${remote.meta.p2 ?? '…waiting'}` : 'connecting…'}
          {' · '}
          <span style={{ color: statusColor(remote.status) }}>{remote.status}</span>
          {' · seq '}
          {remote.lastSeq}
        </div>
      </header>

      {view && (
        <section style={{ marginBottom: '1rem' }}>
          <div style={{ color: '#9bb', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            State: {view.stateValue} · Turn:{' '}
            {view.context.currentTurn === meSlot ? 'you' : 'opponent'} · Score:{' '}
            {view.context.player.score}-{view.context.adversary.score}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
            {myHand.map((card) => (
              <button
                type="button"
                key={card}
                disabled={!isMyTurn}
                onClick={() => void playCard(card)}
                style={{
                  background: '#1a2128',
                  color: '#d6dde8',
                  border: '1px solid #2a3340',
                  padding: '0.5rem 0.7rem',
                  borderRadius: 4,
                  fontFamily: 'inherit',
                  cursor: isMyTurn ? 'pointer' : 'default',
                  opacity: isMyTurn ? 1 : 0.5,
                }}
                data-testid={`hand-${card}`}
              >
                [{card}]
              </button>
            ))}
          </div>
        </section>
      )}

      <section
        aria-label="Event log"
        style={{
          background: '#181d24',
          border: '1px solid #2a3340',
          borderRadius: 4,
          padding: '0.5rem',
          fontSize: '0.8rem',
          maxHeight: 220,
          overflowY: 'auto',
        }}
        data-testid="event-log"
      >
        {eventsLog.length === 0 ? (
          <div style={{ color: '#666' }}>(awaiting events…)</div>
        ) : (
          eventsLog.map((e) => (
            <div key={e.seq} style={{ color: '#9bb' }}>
              [{e.seq}] slot {e.slot}: {e.action.type}
              {e.action.type === 'PLAY_CARD' ? ` ${e.action.cardId}` : ''}
            </div>
          ))
        )}
      </section>

      {postError && (
        <div role="alert" style={{ marginTop: '1rem', color: '#f55' }} data-testid="match-error">
          ⚠ {postError}
        </div>
      )}
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case 'connected':
      return '#7fbf7f';
    case 'connecting':
      return '#cc9';
    case 'disconnected':
    case 'error':
      return '#f55';
    default:
      return '#999';
  }
}
