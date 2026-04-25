// Pure-render lobby surface. Pass it state + handlers; it draws the UI.
// No side effects, fully testable.

import type { MatchMeta } from '../../shared/match';

type LobbyStatus = 'idle' | 'searching' | 'creating' | 'joining' | 'error';

type LobbyViewProps = {
  status: LobbyStatus;
  username: string | null;
  openMatches: MatchMeta[];
  errorMessage: string | null;
  privateInvite: { matchId: string; joinToken: string } | null;
  onQuickMatch: () => void;
  onCreatePrivate: () => void;
  onJoinPublic: (matchId: string) => void;
  onRefresh: () => void;
};

export function LobbyView({
  status,
  username,
  openMatches,
  errorMessage,
  privateInvite,
  onQuickMatch,
  onCreatePrivate,
  onJoinPublic,
  onRefresh,
}: LobbyViewProps) {
  const busy = status !== 'idle' && status !== 'error';
  return (
    <div
      className="lobby-view"
      style={{
        fontFamily: '"JetBrains Mono", monospace',
        padding: '1rem',
        background: '#0e1014',
        color: '#d6dde8',
        minHeight: '100vh',
      }}
    >
      <header style={{ marginBottom: '1.5rem' }}>
        <div style={{ color: '#7fbf7f', fontSize: '1.1rem' }}>#truco-lobby</div>
        <div style={{ color: '#999', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          {username ? `Welcome, u/${username}` : 'Connecting…'}
        </div>
      </header>

      <section
        aria-label="Match actions"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}
      >
        <button
          type="button"
          disabled={busy || !username}
          onClick={onQuickMatch}
          style={btn('#3ab36a')}
          data-testid="lobby-quick-match"
        >
          {status === 'searching' ? 'Buscando rival…' : 'Quick Match (jugar ya)'}
        </button>
        <button
          type="button"
          disabled={busy || !username}
          onClick={onCreatePrivate}
          style={btn('#5577cc')}
          data-testid="lobby-create-private"
        >
          {status === 'creating' ? 'Creando…' : 'Crear partida privada'}
        </button>
      </section>

      {privateInvite && (
        <section
          aria-label="Private invite"
          style={{
            background: '#181d24',
            padding: '0.75rem',
            border: '1px solid #2a3340',
            borderRadius: 4,
            marginBottom: '1.5rem',
          }}
          data-testid="lobby-private-invite"
        >
          <div style={{ color: '#9bb', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            Invite link
          </div>
          <code style={{ color: '#d6dde8', wordBreak: 'break-all' }}>
            {privateInvite.matchId} · token: {privateInvite.joinToken}
          </code>
        </section>
      )}

      <section aria-label="Open matches">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <h2 style={{ fontSize: '0.9rem', color: '#9bb', margin: 0 }}>
            Partidas abiertas en este post
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            style={{
              ...btn('#333'),
              padding: '0.2rem 0.6rem',
              fontSize: '0.75rem',
            }}
            data-testid="lobby-refresh"
          >
            ↻
          </button>
        </div>
        {openMatches.length === 0 ? (
          <div style={{ color: '#666', fontSize: '0.85rem', padding: '0.5rem 0' }}>
            (ninguna por ahora — crea una con Quick Match)
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
            data-testid="lobby-open-list"
          >
            {openMatches.map((m) => (
              <li
                key={m.matchId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  background: '#181d24',
                  border: '1px solid #2a3340',
                  borderRadius: 4,
                }}
              >
                <span style={{ color: '#d6dde8', fontSize: '0.85rem' }}>
                  u/{m.p1}{' '}
                  <span style={{ color: '#777' }}>· {timeAgo(m.createdAt, Date.now())}</span>
                </span>
                <button
                  type="button"
                  disabled={busy || m.p1 === username}
                  onClick={() => onJoinPublic(m.matchId)}
                  style={btn(m.p1 === username ? '#444' : '#3ab36a')}
                  data-testid={`lobby-join-${m.matchId}`}
                >
                  {m.p1 === username ? 'Tu partida' : 'Unirse'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {errorMessage && (
        <div
          role="alert"
          style={{ marginTop: '1.5rem', color: '#f55', fontSize: '0.85rem' }}
          data-testid="lobby-error"
        >
          ⚠ {errorMessage}
        </div>
      )}
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: 4,
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    cursor: 'pointer',
  };
}

function timeAgo(ts: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}
