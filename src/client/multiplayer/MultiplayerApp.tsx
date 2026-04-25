// Top-level multiplayer entry. Shows the lobby until paired, then mounts
// the in-match view. Reuses the table UI's machine for now; swap to chat
// renderer by setting renderMode='chat'.

import { useEffect } from 'react';
import { LobbyView } from './LobbyView';
import { useLobby } from './useLobby';
import { MatchSession } from './MatchSession';

type MultiplayerAppProps = {
  /** Override for tests — usually unset, useLobby fetches from /api/init. */
  username?: string | null;
};

export function MultiplayerApp({ username }: MultiplayerAppProps) {
  const lobby = useLobby(username !== undefined ? { username } : {});

  // Auto-refresh the open list every 5s while idle so a waiting creator
  // sees a joiner appear.
  useEffect(() => {
    if (lobby.joinedMatchId) return;
    if (lobby.status !== 'idle') return;
    const id = setInterval(() => void lobby.refreshOpen(), 5000);
    return () => clearInterval(id);
  }, [lobby.joinedMatchId, lobby.status, lobby.refreshOpen]);

  if (lobby.joinedMatchId) {
    return <MatchSession matchId={lobby.joinedMatchId} username={lobby.username ?? ''} />;
  }

  return (
    <LobbyView
      status={lobby.status}
      username={lobby.username}
      openMatches={lobby.openMatches}
      errorMessage={lobby.errorMessage}
      privateInvite={lobby.privateInvite}
      onQuickMatch={() => void lobby.quickMatch()}
      onCreatePrivate={() => void lobby.createPrivate()}
      onJoinPublic={(id) => void lobby.joinPublic(id)}
      onRefresh={() => void lobby.refreshOpen()}
    />
  );
}
