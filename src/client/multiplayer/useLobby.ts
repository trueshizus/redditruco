// Lobby state machine. Wraps the lobby API with React state.
// Consumers: LobbyView for rendering; MultiplayerApp for orchestration.

import { useCallback, useEffect, useState } from 'react';
import { LobbyError, makeLobbyApi, type LobbyApi } from './lobbyApi.js';
import type { MatchMeta } from '../../shared/match';

type LobbyStatus = 'idle' | 'searching' | 'creating' | 'joining' | 'error';

export type UseLobbyResult = {
  status: LobbyStatus;
  username: string | null;
  openMatches: MatchMeta[];
  errorMessage: string | null;
  privateInvite: { matchId: string; joinToken: string } | null;
  /** Set once the lobby has paired the user into a match. */
  joinedMatchId: string | null;
  /** Manually clear an error. */
  clearError: () => void;
  refreshOpen: () => Promise<void>;
  quickMatch: () => Promise<void>;
  createPrivate: () => Promise<void>;
  joinPublic: (matchId: string) => Promise<void>;
};

export function useLobby(opts: { api?: LobbyApi; username?: string | null } = {}): UseLobbyResult {
  const api = opts.api ?? makeLobbyApi();
  const [status, setStatus] = useState<LobbyStatus>('idle');
  const [username, setUsername] = useState<string | null>(opts.username ?? null);
  const [openMatches, setOpenMatches] = useState<MatchMeta[]>([]);
  const [errorMessage, setError] = useState<string | null>(null);
  const [privateInvite, setPrivateInvite] = useState<{
    matchId: string;
    joinToken: string;
  } | null>(null);
  const [joinedMatchId, setJoinedMatchId] = useState<string | null>(null);

  // Initial username fetch from /api/init if not supplied. Tests pass it directly.
  useEffect(() => {
    if (opts.username !== undefined) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/init');
        const body = (await r.json()) as { username?: string };
        if (!cancelled && body.username) setUsername(body.username);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opts.username]);

  const refreshOpen = useCallback(async () => {
    try {
      const r = await api.listOpen();
      setOpenMatches(r.matches);
    } catch (err) {
      setError(toMsg(err));
    }
  }, [api]);

  // Auto-load on mount.
  useEffect(() => {
    void refreshOpen();
  }, [refreshOpen]);

  const handle = useCallback(
    async (s: Exclude<LobbyStatus, 'idle' | 'error'>, fn: () => Promise<void>) => {
      setStatus(s);
      setError(null);
      try {
        await fn();
        setStatus('idle');
      } catch (err) {
        setStatus('error');
        setError(toMsg(err));
      }
    },
    [],
  );

  const quickMatch = useCallback(
    () =>
      handle('searching', async () => {
        const r = await api.findOrCreate();
        if ('error' in r) throw new LobbyError(r.error, 0);
        // role==='joiner' → match is active; role==='creator' → still waiting.
        if (r.role === 'joiner') {
          setJoinedMatchId(r.matchId);
        } else {
          // We're now the creator-waiting; refresh list so user sees it.
          await refreshOpen();
        }
      }),
    [api, handle, refreshOpen],
  );

  const createPrivate = useCallback(
    () =>
      handle('creating', async () => {
        const r = await api.create('private');
        if (!r.joinToken) throw new LobbyError('server did not return token', 500);
        setPrivateInvite({ matchId: r.matchId, joinToken: r.joinToken });
      }),
    [api, handle],
  );

  const joinPublic = useCallback(
    (matchId: string) =>
      handle('joining', async () => {
        const r = await api.join(matchId);
        if (!r.ok) throw new LobbyError(r.reason, 400);
        setJoinedMatchId(matchId);
      }),
    [api, handle],
  );

  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') setStatus('idle');
  }, [status]);

  return {
    status,
    username,
    openMatches,
    errorMessage,
    privateInvite,
    joinedMatchId,
    clearError,
    refreshOpen,
    quickMatch,
    createPrivate,
    joinPublic,
  };
}

function toMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
