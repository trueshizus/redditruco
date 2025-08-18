import { useMachine } from '@xstate/react';
import { Player } from './components/Player';
import { Board } from './components/Board';
import { gameStateMachine, gameActions } from './machines/gameStateMachine';
import { useTranslation } from './hooks/useTranslation';

export const App = () => {
  const [state, send] = useMachine(gameStateMachine);
  const { t, language, setLanguage } = useTranslation();

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

  // Use helper functions to determine button availability
  const canCallEnvido = gameActions.canCallEnvido(state.context);
  const canCallTruco = gameActions.canCallTruco(state.context);
  const canCallRetruco = gameActions.canCallRetruco(state.context);
  const canCallValeCuatro = gameActions.canCallValeCuatro(state.context);
  
  // Check if players can respond to bets
  const canPlayer1Respond = gameActions.canRespond(state.context, 0);
  const canPlayer2Respond = gameActions.canRespond(state.context, 1);

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
          {/* Language Switcher */}
          <div className="flex justify-center gap-2 mb-2">
            <button 
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs rounded ${language === 'en' ? 'bg-yellow-600 text-white' : 'bg-yellow-200 text-black'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('es')}
              className={`px-2 py-1 text-xs rounded ${language === 'es' ? 'bg-yellow-600 text-white' : 'bg-yellow-200 text-black'}`}
            >
              ES
            </button>
          </div>
          <div className="text-xs text-yellow-400 font-mono">
            {t.game.info.matchId}: {state.context.matchId}
          </div>
          <div>Game State: {String(state.value)}</div>
          <div>
            {t.game.info.currentTurn}: {state.context.players[state.context.currentTurn]?.name || 'Unknown'}
          </div>
          <div>
            {t.game.info.score}: {state.context.score[0]} - {state.context.score[1]}
          </div>
          <div className="text-sm text-yellow-200">
            {t.game.info.dealer}: {state.context.players[state.context.dealer]?.name} | {t.game.info.mano}:{' '}
            {state.context.players[state.context.mano]?.name}
          </div>
          <div className="text-xs text-yellow-300">
            {t.game.info.cardsDealt(state.context.cards[0].length + state.context.cards[1].length, 6)}
          </div>
          {state.context.currentBet !== 'none' && (
            <div className="text-sm text-orange-200 bg-orange-900/50 px-2 py-1 rounded">
              {t.betting.called(
                state.context.players[state.context.betInitiator!]?.name || '',
                state.context.currentBet,
                state.context.currentBet.includes('envido') ? state.context.betPoints : state.context.handValue
              )}
            </div>
          )}
          {state.context.selectedCardId && state.value === 'playing' && (
            <button
              onClick={handlePlayCard}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {t.actions.buttons.playCard}
            </button>
          )}
          {state.value === 'idle' && (
            <button
              onClick={handleStartGame}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t.actions.buttons.startGame}
            </button>
          )}
          {state.value === 'hand_complete' && (
            <div className="space-y-2">
              <div className="text-lg font-bold text-yellow-300">
                {t.betting.handWinner(state.context.players[state.context.handWinner!]?.name || '')}
              </div>
              <button
                onClick={handleStartNewHand}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                {t.actions.buttons.startNewHand}
              </button>
            </div>
          )}
          {state.value === 'finished' && (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-yellow-300">{t.game.winner.gameOver}</div>
              <div className="text-lg text-yellow-200">
                {t.game.winner.winner}:{' '}
                {state.context.score[0] >= 30
                  ? state.context.players[0]?.name
                  : state.context.players[1]?.name}
              </div>
              <div className="text-sm text-yellow-300">
                {t.game.winner.finalScore}: {state.context.score[0]} - {state.context.score[1]}
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
