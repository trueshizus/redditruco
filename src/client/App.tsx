import { useMachine } from '@xstate/react';
import { Board } from './components/Board';
import { OpponentStatusBar } from './components/OpponentStatusBar';
import { OpponentDebugPanel } from './components/OpponentDebugPanel';
import { PlayerSection } from './components/PlayerSection';
import { SlidingResponseOverlay } from './components/SlidingResponseOverlay';
import { trucoStateMachine, canCallEnvido } from '../machines/truco';
import { useTranslation } from './hooks/useTranslation';



export const App = () => {
  const [state, send] = useMachine(trucoStateMachine);
  const { t, language, setLanguage } = useTranslation();

  // Use cards from state machine context instead of hardcoded values  
  const user1Cards = state.context.player.hand;
  const user2Cards = state.context.adversary.hand;

  const handleCardSelect = (cardId: string) => {
    // In the new state machine, we play cards directly
    send({ type: 'PLAY_CARD', cardId });
  };

  const handleCardToggleFlip = (cardId: string) => {
    // Card flipping is removed from the new state machine for simplicity
  };

  const handleStartGame = () => {
    send({ type: 'START_GAME' });
  };

  const handleStartNewHand = () => {
    send({ type: 'NEXT_ROUND' });
  };

  const handleContinue = () => {
    send({ type: 'CONTINUE' });
  };

  // Button handlers - updated event names for new state machine
  const handleEnvido = () => send({ type: 'CALL_ENVIDO' });
  const handleRealEnvido = () => send({ type: 'CALL_REAL_ENVIDO' });
  const handleFaltaEnvido = () => send({ type: 'CALL_FALTA_ENVIDO' });
  const handleTruco = () => send({ type: 'CALL_TRUCO' });
  const handleQuiero = () => send({ type: 'QUIERO' });
  const handleNoQuiero = () => send({ type: 'NO_QUIERO' });
  const handleMazo = () => send({ type: 'MAZO' });

  // Use proper validation logic from state machine
  const canCallEnvidoValidation = canCallEnvido(
    state.context.board.currentTrick,
    state.context.tricks[0]?.player1Card || null,
    state.context.tricks[0]?.player2Card || null,
    state.context.envidoCalled,
    state.context.trucoState,
    state.context.trucoCalledThisRound,
    state.context.gameState
  );
  
  const canCallTruco = state.context.gameState === 'playing' && 
                      state.context.trucoState === 'none' &&
                      state.context.roundStake === 1;
  
  const canCallMazo = state.context.gameState === 'playing';

  // Check if players can respond to bets
  const canRespond = state.context.awaitingResponse;

  // Determine player status text
  const getPlayerStatusText = () => {
    if (state.context.currentTurn === 0) return 'Your turn';
    if (canRespond && state.context.betInitiator !== 0) return 'Respond to bet';
    return 'Waiting...';
  };

  return (
    <main className="app grid grid-cols-1 grid-rows-10 h-full bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900">
      
      {/* Section 1: Opponent Area (1 row) */}
      <section className="h-full flex flex-col overflow-hidden">
        <OpponentStatusBar
          opponentName={state.context.adversary.name}
          cardCount={user2Cards.length}
          isOpponentTurn={state.context.currentTurn === 1}
        />

        <OpponentDebugPanel
          isVisible={state.context.currentTurn === 1 || (canRespond && state.context.betInitiator === 0)}
          opponentCards={state.context.currentTurn === 1 && state.context.gameState === 'playing' ? user2Cards : []}
          canCallEnvido={state.context.currentTurn === 1 && canCallEnvidoValidation}
          canCallTruco={state.context.currentTurn === 1 && canCallTruco}
          canCallMazo={state.context.currentTurn === 1 && canCallMazo}
          onPlayCard={(cardId) => send({ type: 'PLAY_CARD', cardId })}
          onCallEnvido={handleEnvido}
          onCallRealEnvido={handleRealEnvido}
          onCallFaltaEnvido={handleFaltaEnvido}
          onCallTruco={handleTruco}
          onCallMazo={handleMazo}
        />
      </section>

      {/* Section 2: Game Board (4 rows) */}
      <section className="row-span-4 h-full flex flex-col overflow-hidden">
        <Board
          currentTrick={state.context.tricks[state.context.board.currentTrick]!}
          trickNumber={state.context.board.currentTrick}
          tricks={state.context.tricks}
          cardsInPlay={state.context.board.cardsInPlay || { player: null, adversary: null }}
          logs={state.context.logs || []}
          playerScore={state.context.player.score}
          adversaryScore={state.context.adversary.score}
          envidoState={state.context.envidoState}
          trucoState={state.context.trucoState}
          envidoStake={state.context.envidoStake}
          roundStake={state.context.roundStake}
          language={language}
          setLanguage={setLanguage}
        >
          <div className="flex flex-col items-center space-y-4">
            {state.value === 'idle' && (
              <div className="text-center">
                <div className="text-yellow-100 text-lg font-medium mb-4">Ready to Play Truco?</div>
                <button
                  onClick={handleStartGame}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  🎴 Start Game
                </button>
              </div>
            )}
            {state.value === 'trick_complete' && (
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="text-yellow-100 text-lg font-bold">
                    {state.context.board.trickWinner !== null 
                      ? `🏆 ${state.context.board.trickWinner === 0 ? 'You' : 'Opponent'} won the trick!`
                      : "🤝 Trick Tied (Parda)"}
                  </div>
                </div>
                <button
                  onClick={handleContinue}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-6 py-3 rounded-lg text-base font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Continue →
                </button>
              </div>
            )}
            {state.value === 'round_complete' && (
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="text-yellow-100 text-lg font-bold">
                    🎉 Round Winner: {state.context.roundWinner === 0 ? 'You!' : 'Opponent'}
                  </div>
                </div>
                <button
                  onClick={handleStartNewHand}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-6 py-3 rounded-lg text-base font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Next Round →
                </button>
              </div>
            )}
            {state.value === 'game_over' && (
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-6">
                  <div className="text-2xl font-bold text-yellow-300 mb-2">🎊 Game Over!</div>
                  <div className="text-lg text-yellow-200 mb-2">
                    Winner: {state.context.gameWinner === 0 ? 'You!' : 'Opponent'}
                  </div>
                  <div className="text-yellow-300">
                    Final Score: {state.context.player.score} - {state.context.adversary.score}
                  </div>
                </div>
                <button
                  onClick={() => send({ type: 'RESTART_GAME' })}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  🎴 Play Again
                </button>
              </div>
            )}
          </div>
        </Board>
      </section>

      {/* Section 3: Player Area (5 rows) */}
      <section className="row-span-5 h-full flex flex-col overflow-hidden">
        
          <PlayerSection
            playerName={state.context.player.name}
            playerCards={user1Cards}
            isPlayerTurn={state.context.currentTurn === 0}
            canRespond={canRespond}
            betInitiator={state.context.betInitiator}
            statusText={getPlayerStatusText()}
            canCallEnvido={canCallEnvidoValidation}
            canCallTruco={canCallTruco}
            canCallMazo={canCallMazo}
            onCardSelect={handleCardSelect}
            onCardToggleFlip={handleCardToggleFlip}
            onEnvido={handleEnvido}
            onRealEnvido={handleRealEnvido}
            onFaltaEnvido={handleFaltaEnvido}
            onTruco={handleTruco}
            onMazo={handleMazo}
          />
        
      </section>

      {/* Sliding Response Overlay - Positioned absolutely over the grid */}
      <SlidingResponseOverlay
        isVisible={canRespond && state.context.betInitiator !== 0}
        onQuiero={handleQuiero}
        onNoQuiero={handleNoQuiero}
      />
    </main>
  );
};
