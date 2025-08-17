import { useMachine } from '@xstate/react';
import { Player } from './components/Player';
import { Board } from './components/Board';
import { gameStateMachine } from './machines/gameStateMachine';

export const App = () => {
  const [state, send] = useMachine(gameStateMachine);
  
  const user1Cards = ['01_E.svg', '07_C.svg', '12_O.svg'];
  const user2Cards = ['02_B.svg', '05_C.svg', '11_O.svg'];
  
  const handleCardSelect = (cardId: string) => {
    send({ type: 'SELECT_CARD', cardId });
  };
  
  const handleCardToggleFlip = (cardId: string) => {
    send({ type: 'FLIP_CARD', cardId });
  };
  
  return (
    <main className="min-h-screen grid grid-rows-3 bg-gradient-to-b from-slate-800 to-slate-900">
      {/* Top Player - Opponent */}
      <Player 
        id="shizus"
        cards={user2Cards}
        selectedCardId={state.context.selectedCardId}
        flippedCardId={state.context.flippedCardId}
        onCardSelect={handleCardSelect}
        onCardToggleFlip={handleCardToggleFlip}
      />
      
      {/* Middle Board - this will grow */}
      <Board />
      
      {/* Bottom Player - You */}
      <Player 
        id="Darkening"
        cards={user1Cards}
        selectedCardId={state.context.selectedCardId}
        flippedCardId={state.context.flippedCardId}
        onCardSelect={handleCardSelect}
        onCardToggleFlip={handleCardToggleFlip}
      />
    </main>
  );
};
