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

  const handleStartNewHand = () => {
    send({ type: 'START_NEW_HAND' });
  };

  // Button handlers
  const handleEnvido = () => send({ type: 'ENVIDO' });
  const handleRealEnvido = () => send({ type: 'REAL_ENVIDO' });
  const handleFaltaEnvido = () => send({ type: 'FALTA_ENVIDO' });
  const handleTruco = () => send({ type: 'TRUCO' });
  const handleRetruco = () => send({ type: 'RETRUCO' });
  const handleValeCuatro = () => send({ type: 'VALE_CUATRO' });
  const handleQuiero = () => send({ type: 'QUIERO' });
  const handleNoQuiero = () => send({ type: 'NO_QUIERO' });
  const handleMazo = () => send({ type: 'MAZO' });

  // Determine button availability
  const canCallEnvido =
    state.value === 'playing' &&
    state.context.currentTrick === 0 &&
    !state.context.tricks[0].player1Card &&
    !state.context.tricks[0].player2Card &&
    state.context.currentBet === 'none';

  const canCallTruco = state.value === 'playing' && state.context.currentBet === 'none';

  const canRespond =
    (state.value === 'envido_betting' || state.value === 'truco_betting') &&
    state.context.awaitingResponse;

  return (
    <main className="min-h-screen grid grid-rows-3 bg-gradient-to-b from-slate-800 to-slate-900">
      {/* Top Player - Opponent */}
      <Player
        id={state.context.players[1]!.id}
        cards={user2Cards}
        selectedCardId={state.context.selectedCardId}
        flippedCardId={state.context.flippedCardId}
        onCardSelect={handleCardSelect}
        onCardToggleFlip={handleCardToggleFlip}
        isCurrentPlayer={state.context.currentTurn === 1}
        onEnvido={handleEnvido}
        onRealEnvido={handleRealEnvido}
        onFaltaEnvido={handleFaltaEnvido}
        onTruco={handleTruco}
        onRetruco={handleRetruco}
        onValeCuatro={handleValeCuatro}
        onQuiero={handleQuiero}
        onNoQuiero={handleNoQuiero}
        onMazo={handleMazo}
        canCallEnvido={canCallEnvido && state.context.currentTurn === 1}
        canCallTruco={canCallTruco && state.context.currentTurn === 1}
        canRespond={canRespond && state.context.betInitiator !== 1}
      />

      {/* Middle Board - this will grow */}
      <Board
        currentTrick={state.context.tricks[state.context.currentTrick]!}
        trickNumber={state.context.currentTrick}
        tricks={state.context.tricks}
      >
        <div className="text-center space-y-2">
          <div className="text-xs text-yellow-400 font-mono">
            Match ID: {state.context.matchId}
          </div>
          <div>Game State: {String(state.value)}</div>
          <div>
            Current Turn: {state.context.players[state.context.currentTurn]?.name || 'Unknown'}
          </div>
          <div>
            Score: {state.context.score[0]} - {state.context.score[1]}
          </div>
          <div className="text-sm text-yellow-200">
            Dealer: {state.context.players[state.context.dealer]?.name} | Mano:{' '}
            {state.context.players[state.context.mano]?.name}
          </div>
          <div className="text-xs text-yellow-300">
            Cards dealt: {state.context.cards[0].length + state.context.cards[1].length}/6
          </div>
          {state.context.currentBet !== 'none' && (
            <div className="text-sm text-orange-200 bg-orange-900/50 px-2 py-1 rounded">
              {state.context.players[state.context.betInitiator!]?.name} called:{' '}
              {state.context.currentBet.replace('_', ' ').toUpperCase()}(
              {state.context.currentBet.includes('envido')
                ? state.context.betPoints
                : state.context.handValue}{' '}
              pts)
            </div>
          )}
          {state.context.selectedCardId && state.value === 'playing' && (
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
              Start Game & Deal Cards
            </button>
          )}
          {state.value === 'hand_complete' && (
            <div className="space-y-2">
              <div className="text-lg font-bold text-yellow-300">
                Hand Winner: {state.context.players[state.context.handWinner!]?.name}
              </div>
              <button
                onClick={handleStartNewHand}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Start New Hand
              </button>
            </div>
          )}
          {state.value === 'finished' && (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-yellow-300">🏆 GAME OVER! 🏆</div>
              <div className="text-lg text-yellow-200">
                Winner:{' '}
                {state.context.score[0] >= 30
                  ? state.context.players[0]?.name
                  : state.context.players[1]?.name}
              </div>
              <div className="text-sm text-yellow-300">
                Final Score: {state.context.score[0]} - {state.context.score[1]}
              </div>
            </div>
          )}
        </div>
      </Board>

      {/* Bottom Player - You */}
      <Player
        id={state.context.players[0]!.id}
        cards={user1Cards}
        selectedCardId={state.context.selectedCardId}
        flippedCardId={state.context.flippedCardId}
        onCardSelect={handleCardSelect}
        onCardToggleFlip={handleCardToggleFlip}
        isCurrentPlayer={state.context.currentTurn === 0}
        onEnvido={handleEnvido}
        onRealEnvido={handleRealEnvido}
        onFaltaEnvido={handleFaltaEnvido}
        onTruco={handleTruco}
        onRetruco={handleRetruco}
        onValeCuatro={handleValeCuatro}
        onQuiero={handleQuiero}
        onNoQuiero={handleNoQuiero}
        onMazo={handleMazo}
        canCallEnvido={canCallEnvido && state.context.currentTurn === 0}
        canCallTruco={canCallTruco && state.context.currentTurn === 0}
        canRespond={canRespond && state.context.betInitiator !== 0}
      />
    </main>
  );
};
