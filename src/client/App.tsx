import { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { Board } from './components/Board';
import { OpponentStatusBar } from './components/OpponentStatusBar';
import { OpponentDebugPanel } from './components/OpponentDebugPanel';
import { PlayerSection } from './components/PlayerSection';
import { SlidingResponseOverlay } from './components/SlidingResponseOverlay';
import { trucoStateMachine, canCallEnvido } from '../shared/truco';
import { useTranslation } from './hooks/useTranslation';

export const App = () => {
  const [state, send] = useMachine(trucoStateMachine);
  const { language, setLanguage, t } = useTranslation();

  // Dev-only: expose the state machine snapshot for Playwright tests.
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as { __trucoState: unknown }).__trucoState = {
        value: state.value,
        context: state.context,
      };
    }
  });

  const user1Cards = state.context.player.hand;
  const user2Cards = state.context.adversary.hand;

  const handleCardSelect = (cardId: string) => send({ type: 'PLAY_CARD', cardId });
  const handleCardToggleFlip = (_cardId: string) => {
    // Card flipping is not modeled in the Truco state machine.
  };

  const handleStartGame = () => send({ type: 'START_GAME' });
  const handleStartNewHand = () => send({ type: 'NEXT_ROUND' });
  const handleContinue = () => send({ type: 'CONTINUE' });

  const handleEnvido = () => send({ type: 'CALL_ENVIDO' });
  const handleRealEnvido = () => send({ type: 'CALL_REAL_ENVIDO' });
  const handleFaltaEnvido = () => send({ type: 'CALL_FALTA_ENVIDO' });
  const handleTruco = () => send({ type: 'CALL_TRUCO' });
  const handleRetruco = () => send({ type: 'CALL_RETRUCO' });
  const handleValeCuatro = () => send({ type: 'CALL_VALE_CUATRO' });
  const handleQuiero = () => send({ type: 'QUIERO' });
  const handleNoQuiero = () => send({ type: 'NO_QUIERO' });
  const handleMazo = () => send({ type: 'MAZO' });

  const canCallEnvidoValidation = canCallEnvido(
    state.context.board.currentTrick,
    state.context.tricks[0]?.player1Card || null,
    state.context.tricks[0]?.player2Card || null,
    state.context.envidoCalled,
    state.context.trucoState,
    state.context.trucoCalledThisRound,
    state.context.gameState,
    state.context.board.cardsInPlay.player,
    state.context.board.cardsInPlay.adversary
  );

  const inPlaying = state.context.gameState === 'playing';
  const inTrucoBetting = state.context.gameState === 'truco_betting';
  const holdingTruco = state.context.trucoHolder === state.context.currentTurn;

  const canCallTruco =
    inPlaying && state.context.trucoState === 'none' && !state.context.awaitingResponse;
  const canCallRetruco = inPlaying && state.context.trucoState === 'truco' && holdingTruco;
  const canCallValeCuatro = inPlaying && state.context.trucoState === 'retruco' && holdingTruco;
  const canCallMazo = inPlaying;

  const canRespond = state.context.awaitingResponse;
  const isInitiator = state.context.betInitiator === 0;
  const playerAwaitingResponse = canRespond && isInitiator;
  const playerMustRespond = canRespond && !isInitiator;

  // Envido está primero: the truco responder can interrupt with envido.
  const canInterruptWithEnvido =
    inTrucoBetting &&
    canRespond &&
    state.context.board.currentTrick === 0 &&
    state.context.board.cardsInPlay.player === null &&
    state.context.board.cardsInPlay.adversary === null &&
    !state.context.envidoCalled;

  // Responder's counter-raise options inside truco_betting.
  const respondWithRetruco = inTrucoBetting && canRespond && state.context.trucoState === 'truco';
  const respondWithValeCuatro =
    inTrucoBetting && canRespond && state.context.trucoState === 'retruco';

  const getPlayerStatusText = () => {
    if (playerAwaitingResponse) return t.status.waitingForResponse;
    if (playerMustRespond) return t.status.respondToBet;
    if (state.context.currentTurn === 0 && inPlaying) return t.status.yourTurn;
    return t.status.waiting;
  };

  return (
    <main
      className="app grid grid-cols-1 grid-rows-10 h-full bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900"
      data-testid="game-root"
      data-game-state={String(state.value)}
    >
      <section className="h-full flex flex-col overflow-hidden">
        <OpponentStatusBar
          cardCount={user2Cards.length}
          isOpponentTurn={state.context.currentTurn === 1}
        />

        <OpponentDebugPanel
          isVisible={state.context.currentTurn === 1 || (canRespond && state.context.betInitiator === 0)}
          opponentCards={state.context.currentTurn === 1 && inPlaying ? user2Cards : []}
          canCallEnvido={
            (state.context.currentTurn === 1 && canCallEnvidoValidation) ||
            // Envido está primero: opponent can respond to player's truco with envido.
            (canInterruptWithEnvido && state.context.betInitiator === 0)
          }
          canCallTruco={state.context.currentTurn === 1 && canCallTruco}
          canCallMazo={state.context.currentTurn === 1 && canCallMazo}
          canRespond={canRespond && state.context.betInitiator === 0}
          trucoState={state.context.trucoState}
          onPlayCard={(cardId) => send({ type: 'PLAY_CARD', cardId })}
          onCallEnvido={handleEnvido}
          onCallRealEnvido={handleRealEnvido}
          onCallFaltaEnvido={handleFaltaEnvido}
          onCallTruco={handleTruco}
          onCallMazo={handleMazo}
          onQuiero={handleQuiero}
          onNoQuiero={handleNoQuiero}
          onRetruco={handleRetruco}
          onValeCuatro={handleValeCuatro}
        />
      </section>

      <section className="row-span-4 h-full flex flex-col overflow-hidden">
        <Board
          currentTrick={state.context.tricks[state.context.board.currentTrick]!}
          trickNumber={state.context.board.currentTrick}
          tricks={state.context.tricks}
          cardsInPlay={state.context.board.cardsInPlay || { player: null, adversary: null }}
          playerScore={state.context.player.score}
          adversaryScore={state.context.adversary.score}
          envidoState={state.context.envidoState}
          trucoState={state.context.trucoState}
          envidoStake={state.context.envidoStake}
          roundStake={state.context.roundStake}
          language={language}
          setLanguage={setLanguage}
          showBettingBanner={
            state.value === 'playing' ||
            state.value === 'envido_betting' ||
            state.value === 'truco_betting'
          }
        >
          <div className="flex flex-col items-center space-y-4">
            {state.value === 'idle' && (
              <div className="text-center">
                <div className="text-yellow-100 text-lg font-medium mb-4">{t.idle.prompt}</div>
                <button
                  data-testid="action-START_GAME"
                  onClick={handleStartGame}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {t.idle.startButton}
                </button>
              </div>
            )}
            {state.value === 'trick_complete' && (
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="text-yellow-100 text-lg font-bold" data-testid="trick-result">
                    {state.context.board.trickWinner === null
                      ? t.trick.parda
                      : state.context.board.trickWinner === 0
                      ? t.trick.youWon
                      : t.trick.opponentWon(t.common.opponent)}
                  </div>
                </div>
                <button
                  data-testid="action-CONTINUE"
                  onClick={handleContinue}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-6 py-3 rounded-lg text-base font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  {t.trick.continue}
                </button>
              </div>
            )}
            {state.value === 'round_complete' && (
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="text-yellow-100 text-lg font-bold" data-testid="round-result">
                    {state.context.roundWinner === 0 ? t.round.youWon : t.round.opponentWon}
                  </div>
                </div>
                <button
                  data-testid="action-NEXT_ROUND"
                  onClick={handleStartNewHand}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-6 py-3 rounded-lg text-base font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  {t.round.nextRound}
                </button>
              </div>
            )}
            {state.value === 'game_over' && (
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-6">
                  <div className="text-2xl font-bold text-yellow-300 mb-2" data-testid="game-over">
                    {t.gameOver.title}
                  </div>
                  <div className="text-lg text-yellow-200 mb-2">
                    {state.context.gameWinner === 0 ? t.gameOver.youWin : t.gameOver.opponentWins}
                  </div>
                  <div className="text-yellow-300">
                    {t.gameOver.finalScore}: {state.context.player.score} - {state.context.adversary.score}
                  </div>
                </div>
                <button
                  data-testid="action-RESTART_GAME"
                  onClick={() => send({ type: 'RESTART_GAME' })}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {t.gameOver.restart}
                </button>
              </div>
            )}
          </div>
        </Board>
      </section>

      <section className="row-span-5 h-full flex flex-col overflow-hidden">
        <PlayerSection
          playerCards={user1Cards}
          isPlayerTurn={state.context.currentTurn === 0}
          statusText={getPlayerStatusText()}
          canCallEnvido={canCallEnvidoValidation}
          canCallTruco={canCallTruco}
          canCallRetruco={canCallRetruco}
          canCallValeCuatro={canCallValeCuatro}
          canCallMazo={canCallMazo}
          onCardSelect={handleCardSelect}
          onCardToggleFlip={handleCardToggleFlip}
          onEnvido={handleEnvido}
          onRealEnvido={handleRealEnvido}
          onFaltaEnvido={handleFaltaEnvido}
          onTruco={handleTruco}
          onRetruco={handleRetruco}
          onValeCuatro={handleValeCuatro}
          onMazo={handleMazo}
        />
      </section>

      <SlidingResponseOverlay
        isVisible={playerMustRespond}
        onQuiero={handleQuiero}
        onNoQuiero={handleNoQuiero}
        canInterruptWithEnvido={canInterruptWithEnvido}
        onInterruptWithEnvido={handleEnvido}
        onInterruptWithRealEnvido={handleRealEnvido}
        onInterruptWithFaltaEnvido={handleFaltaEnvido}
        canCallRetruco={respondWithRetruco}
        canCallValeCuatro={respondWithValeCuatro}
        onRetruco={handleRetruco}
        onValeCuatro={handleValeCuatro}
      />
    </main>
  );
};
