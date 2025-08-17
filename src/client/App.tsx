import { useMachine } from '@xstate/react';
import { Player } from './components/Player';
import { Board } from './components/Board';
import { gameStateMachine } from './machines/gameStateMachine';

export const App = () => {
  const [state, send] = useMachine(gameStateMachine);
  
  // Use cards from state machine context instead of hardcoded values
  const user1Cards = state.context.cards[0];
  const user2Cards = state.context.cards[1];
  
  const handleCardSelect = (cardId: string) => {
    send({ type: 'SELECT_CARD', cardId });
  };
  
  const handleCardToggleFlip = (cardId: string) => {
    send({ type: 'FLIP_CARD', cardId });
  };
  
  const handlePlayCard = () => {
    if (state.context.selectedCardId) {
      send({ type: 'PLAY_CARD' });
    }
  };
  
  const handleStartGame = () => {
    send({ type: 'START_GAME' });
  };
  
  return (
    <main className="min-h-screen grid grid-rows-3 bg-gradient-to-b from-slate-800 to-slate-900">
      {/* Top Player - Opponent */}
      <Player 
        id={state.context.players[1].id}
        cards={user2Cards}
        selectedCardId={state.context.selectedCardId}
        flippedCardId={state.context.flippedCardId}
        onCardSelect={handleCardSelect}
        onCardToggleFlip={handleCardToggleFlip}
        isCurrentPlayer={state.context.currentTurn === 1}
      />
      
      {/* Middle Board - this will grow */}
      <Board>
        <div className="text-center space-y-2">
          <div>Game State: {String(state.value)}</div>
          <div>Current Turn: {state.context.players[state.context.currentTurn]?.name || 'Unknown'}</div>
          <div>Score: {state.context.score[0]} - {state.context.score[1]}</div>
          {state.context.selectedCardId && (
            <button 
              onClick={handlePlayCard}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Play Selected Card
            </button>
          )}
          {state.value === 'idle' && (
            <button 
              onClick={handleStartGame}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Start Game
            </button>
          )}
        </div>
      </Board>
      
      {/* Bottom Player - You */}
      <Player 
        id={state.context.players[0].id}
        cards={user1Cards}
        selectedCardId={state.context.selectedCardId}
        flippedCardId={state.context.flippedCardId}
        onCardSelect={handleCardSelect}
        onCardToggleFlip={handleCardToggleFlip}
        isCurrentPlayer={state.context.currentTurn === 0}
      />
    </main>
  );
};
