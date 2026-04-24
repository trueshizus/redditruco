// Main Truco State Machine - trucoST.ts
// Based on PDF specification for Argentinian Truco game backend

import { createMachine, assign } from 'xstate';
import type { GameContext, TrucoEvent, Card, EnvidoBet, TrucoBet, Trick } from './types.js';
import { createShuffledDeck, dealCards, generateMatchId } from './deck.js';
import { createEmptyTrick, determineRoundWinner, resolveTrick, getNextTrickLeader, isTrickComplete } from './tricks.js';
import { calculateEnvidoPoints, resolveEnvido, canCallEnvido } from './envido.js';

// Create initial game context
function createInitialContext(seed?: string): GameContext {
  const matchId = generateMatchId();
  const gameSeed = seed || matchId;
  
  return {
    // Game identification
    seed: gameSeed,
    matchId,
    
    // Deck and cards
    deck: createShuffledDeck(gameSeed),
    discarded: [],
    
    // Game log
    logs: [`Game initialized with seed ${gameSeed}`],
    
    // Board state
    board: {
      currentTrick: 0,
      cardsInPlay: {
        player: null,
        adversary: null,
      },
      trickWinner: null,
    },
    
    // Players
    player: {
      id: 'player1',
      name: 'Player 1',
      hand: [],
      wonTricks: 0,
      score: 0,
    },
    adversary: {
      id: 'player2',
      name: 'Player 2',
      hand: [],
      wonTricks: 0,
      score: 0,
    },
    
    // Game flow
    currentTurn: 0, // 0 for player, 1 for adversary
    mano: 1, // adversary starts as mano (opposite of dealer)
    dealer: 0, // player starts as dealer
    
    // Betting state
    roundStake: 1, // Default 1 point per round
    envidoStake: 0,
    envidoCalled: false,
    trucoState: 'none',
    envidoState: 'none',
    trucoCalledThisRound: false,
    
    // Game state
    gameState: 'idle',
    betInitiator: null,
    awaitingResponse: false,
    
    // Round completion
    tricks: [createEmptyTrick(), createEmptyTrick(), createEmptyTrick()],
    roundWinner: null,
    gameWinner: null,
    
    // Game settings
    targetScore: 30,
  };
}

// Utility functions for state machine
function addLog(context: GameContext, message: string): string[] {
  return [...context.logs, `[${new Date().toISOString()}] ${message}`];
}

function canCallTruco({ context }: { context: GameContext }): boolean {
  return (
    context.gameState === 'playing' &&
    context.trucoState === 'none' &&
    context.roundStake === 1 && // Only allow Truco if round is still worth 1 point
    !context.awaitingResponse
  );
}

function canCallRetruco({ context }: { context: GameContext }): boolean {
  return (
    context.gameState === 'truco_betting' &&
    context.trucoState === 'truco' &&
    context.awaitingResponse &&
    context.betInitiator !== context.currentTurn
  );
}

function canCallValeCuatro({ context }: { context: GameContext }): boolean {
  return (
    context.gameState === 'truco_betting' &&
    context.trucoState === 'retruco' &&
    context.awaitingResponse &&
    context.betInitiator !== context.currentTurn
  );
}

// Main state machine definition
export const trucoStateMachine = createMachine(
  {
    id: 'truco',
    initial: 'idle',
    types: {
      context: {} as GameContext,
      events: {} as TrucoEvent,
    },
    context: createInitialContext(),
    
    states: {
      // Initial idle state
      idle: {
        entry: assign({
          gameState: 'idle',
        }),
        on: {
          START_GAME: {
            target: 'dealing',
          },
        },
      },

      // Dealing cards state
      dealing: {
        entry: assign(({ context }) => {
          const { player1Hand, player2Hand, remainingDeck } = dealCards(context.deck);
          
          const updatedPlayer = { ...context.player, hand: player1Hand, wonTricks: 0 };
          const updatedAdversary = { ...context.adversary, hand: player2Hand, wonTricks: 0 };
          
          const logs = addLog(context, `Dealt 3 cards to each player. Round ${Math.floor((context.player.score + context.adversary.score) / 2) + 1} begins.`);
          
          return {
            gameState: 'dealing' as const,
            deck: remainingDeck,
            player: updatedPlayer,
            adversary: updatedAdversary,
            logs,
            // Reset round state
            board: {
              currentTrick: 0,
              cardsInPlay: { player: null, adversary: null },
              trickWinner: null,
            },
            tricks: [createEmptyTrick(), createEmptyTrick(), createEmptyTrick()] as [Trick, Trick, Trick],
            roundStake: 1,
            envidoStake: 0,
            envidoCalled: false,
            trucoState: 'none' as TrucoBet,
            envidoState: 'none' as EnvidoBet,
            trucoCalledThisRound: false,  // Reset Truco flag for new round
            betInitiator: null,
            awaitingResponse: false,
            roundWinner: null,
            currentTurn: context.mano, // mano starts
          } as Partial<GameContext>;
        }),
        always: {
          target: 'playing',
          actions: assign({
            gameState: 'playing',
          }),
        },
      },

      // Main playing state
      playing: {
        entry: assign({
          gameState: 'playing',
        }),
        on: {
          // Card play
          PLAY_CARD: {
            actions: assign(({ context, event }) => {
              const currentPlayer = context.currentTurn === 0 ? context.player : context.adversary;
              
              // Validate card in hand
              if (!currentPlayer.hand.includes(event.cardId)) {
                return {}; // Invalid move, no state change
              }
              
              // Remove card from hand
              const updatedHand = currentPlayer.hand.filter(card => card !== event.cardId);
              const updatedPlayer = context.currentTurn === 0 
                ? { ...context.player, hand: updatedHand }
                : context.player;
              const updatedAdversary = context.currentTurn === 1
                ? { ...context.adversary, hand: updatedHand }
                : context.adversary;
              
              // Update board
              const updatedBoard = { ...context.board };
              if (context.currentTurn === 0) {
                updatedBoard.cardsInPlay.player = event.cardId;
              } else {
                updatedBoard.cardsInPlay.adversary = event.cardId;
              }
              
              const logs = addLog(context, `${currentPlayer.name} plays ${event.cardId}`);
              
              // Check if trick is complete
              const trickComplete = updatedBoard.cardsInPlay.player && updatedBoard.cardsInPlay.adversary;
              
              if (trickComplete) {
                // Resolve trick
                const trickWinner = resolveTrick(
                  updatedBoard.cardsInPlay.player!,
                  updatedBoard.cardsInPlay.adversary!,
                  context.mano,
                  context.board.currentTrick,
                  context.tricks.slice(0, context.board.currentTrick)
                );
                
                // Update trick in tricks array
                const updatedTricks = [...context.tricks] as [typeof context.tricks[0], typeof context.tricks[1], typeof context.tricks[2]];
                updatedTricks[context.board.currentTrick] = {
                  player1Card: updatedBoard.cardsInPlay.player!,
                  player2Card: updatedBoard.cardsInPlay.adversary!,
                  winner: trickWinner,
                };
                
                // Update won tricks count
                const finalPlayer = trickWinner === 0 
                  ? { ...updatedPlayer, wonTricks: updatedPlayer.wonTricks + 1 }
                  : updatedPlayer;
                const finalAdversary = trickWinner === 1
                  ? { ...updatedAdversary, wonTricks: updatedAdversary.wonTricks + 1 }
                  : updatedAdversary;
                
                // Add trick logs
                const trickLogs = addLog({ ...context, logs }, 
                  trickWinner !== null 
                    ? `${trickWinner === 0 ? finalPlayer.name : finalAdversary.name} wins trick ${context.board.currentTrick + 1}`
                    : `Trick ${context.board.currentTrick + 1} is tied (parda)`
                );
                
                // Move played cards to discarded
                const updatedDiscarded = [
                  ...context.discarded,
                  updatedBoard.cardsInPlay.player!,
                  updatedBoard.cardsInPlay.adversary!
                ];
                
                // Clear board for next trick
                updatedBoard.cardsInPlay = { player: null, adversary: null };
                updatedBoard.trickWinner = trickWinner;
                
                // Check if round is complete
                const roundResult = determineRoundWinner(updatedTricks, context.mano);
                
                // Always go to trick_complete state first to show the result
                return {
                  player: finalPlayer,
                  adversary: finalAdversary,
                  board: updatedBoard,
                  tricks: updatedTricks,
                  discarded: updatedDiscarded,
                  logs: trickLogs,
                  gameState: 'trick_complete' as const,
                  roundWinner: roundResult.roundComplete ? roundResult.roundWinner : null,
                };
              } else {
                // Trick not complete, switch turns
                return {
                  player: updatedPlayer,
                  adversary: updatedAdversary,
                  board: updatedBoard,
                  logs,
                  currentTurn: context.currentTurn === 0 ? 1 : 0,
                };
              }
            }),
          },

          // Envido calls
          CALL_ENVIDO: {
            target: 'envido_betting',
            guard: ({ context }) => canCallEnvido(
              context.board.currentTrick,
              context.tricks[0]?.player1Card || null,
              context.tricks[0]?.player2Card || null,
              context.envidoCalled,
              context.trucoState,
              context.trucoCalledThisRound,
              context.gameState
            ),
            actions: assign(({ context }) => ({
              gameState: 'envido_betting' as const,
              envidoState: 'envido' as EnvidoBet,
              envidoStake: 2,
              betInitiator: context.currentTurn,
              awaitingResponse: true,
              logs: addLog(context, `${context.currentTurn === 0 ? context.player.name : context.adversary.name} calls Envido (2 points)`),
            })),
          },

          CALL_REAL_ENVIDO: {
            target: 'envido_betting',
            guard: ({ context }) => canCallEnvido(
              context.board.currentTrick,
              context.tricks[0]?.player1Card || null,
              context.tricks[0]?.player2Card || null,
              context.envidoCalled,
              context.trucoState,
              context.trucoCalledThisRound,
              context.gameState
            ),
            actions: assign(({ context }) => ({
              gameState: 'envido_betting' as const,
              envidoState: 'real_envido' as EnvidoBet,
              envidoStake: 3,
              betInitiator: context.currentTurn,
              awaitingResponse: true,
              logs: addLog(context, `${context.currentTurn === 0 ? context.player.name : context.adversary.name} calls Real Envido (3 points)`),
            })),
          },

          CALL_FALTA_ENVIDO: {
            target: 'envido_betting',
            guard: ({ context }) => canCallEnvido(
              context.board.currentTrick,
              context.tricks[0]?.player1Card || null,
              context.tricks[0]?.player2Card || null,
              context.envidoCalled,
              context.trucoState,
              context.trucoCalledThisRound,
              context.gameState
            ),
            actions: assign(({ context }) => {
              const faltaPoints = Math.max(context.targetScore - Math.max(context.player.score, context.adversary.score), 1);
              return {
                gameState: 'envido_betting' as const,
                envidoState: 'falta_envido' as EnvidoBet,
                envidoStake: faltaPoints,
                betInitiator: context.currentTurn,
                awaitingResponse: true,
                logs: addLog(context, `${context.currentTurn === 0 ? context.player.name : context.adversary.name} calls Falta Envido (${faltaPoints} points)`),
              };
            }),
          },

          // Truco calls
          CALL_TRUCO: {
            target: 'truco_betting',
            guard: ({ context }) => canCallTruco({ context }),
            actions: assign(({ context }) => ({
              gameState: 'truco_betting' as const,
              trucoState: 'truco' as TrucoBet,
              roundStake: 2,
              betInitiator: context.currentTurn,
              awaitingResponse: true,
              trucoCalledThisRound: true,  // Mark that Truco was called
              logs: addLog(context, `${context.currentTurn === 0 ? context.player.name : context.adversary.name} calls Truco (2 points)`),
            })),
          },

          // Forfeit round
          MAZO: {
            target: 'round_complete',
            actions: assign(({ context }) => {
              const winner = context.currentTurn === 0 ? 1 : 0;
              return {
                gameState: 'round_complete' as const,
                roundWinner: winner,
                logs: addLog(context, `${context.currentTurn === 0 ? context.player.name : context.adversary.name} goes to deck. ${winner === 0 ? context.player.name : context.adversary.name} wins the round!`),
              };
            }),
          },
        },
        
        always: [
          {
            target: 'trick_complete',
            guard: ({ context }) => context.gameState === 'trick_complete',
          },
          {
            target: 'round_complete',
            guard: ({ context }) => context.gameState === 'round_complete',
          },
        ],
      },

      // Envido betting state
      envido_betting: {
        entry: assign({
          gameState: 'envido_betting',
        }),
        on: {
          QUIERO: {
            target: 'playing',
            guard: ({ context }) => 
              context.awaitingResponse && 
              context.betInitiator !== null,
            actions: assign(({ context }) => {
              // Calculate envido points and determine winner
              const envidoResult = resolveEnvido(
                context.player.hand,
                context.adversary.hand,
                context.mano
              );
              
              // Award points to winner
              const updatedPlayer = envidoResult.winner === 0
                ? { ...context.player, score: context.player.score + context.envidoStake }
                : context.player;
              const updatedAdversary = envidoResult.winner === 1
                ? { ...context.adversary, score: context.adversary.score + context.envidoStake }
                : context.adversary;
              
              const winner = envidoResult.winner === 0 ? context.player.name : context.adversary.name;
              
              return {
                gameState: 'playing' as const,
                player: updatedPlayer,
                adversary: updatedAdversary,
                envidoCalled: true,
                envidoState: 'none' as EnvidoBet,
                envidoStake: 0,
                betInitiator: null,
                awaitingResponse: false,
                logs: addLog(context, 
                  `Envido accepted. ${context.player.name}: ${envidoResult.player1Points}, ${context.adversary.name}: ${envidoResult.player2Points}. ${winner} wins and scores ${context.envidoStake} points.`
                ),
              };
            }),
          },
          
          NO_QUIERO: {
            target: 'playing',
            guard: ({ context }) => 
              context.awaitingResponse && 
              context.betInitiator !== null,
            actions: assign(({ context }) => {
              // Award 1 point to bet initiator
              const updatedPlayer = context.betInitiator === 0
                ? { ...context.player, score: context.player.score + 1 }
                : context.player;
              const updatedAdversary = context.betInitiator === 1
                ? { ...context.adversary, score: context.adversary.score + 1 }
                : context.adversary;
              
              const initiatorName = context.betInitiator === 0 ? context.player.name : context.adversary.name;
              
              return {
                gameState: 'playing' as const,
                player: updatedPlayer,
                adversary: updatedAdversary,
                envidoCalled: true,
                envidoState: 'none' as EnvidoBet,
                envidoStake: 0,
                betInitiator: null,
                awaitingResponse: false,
                logs: addLog(context, `Envido declined. ${initiatorName} scores 1 point.`),
              };
            }),
          },
        },
      },

      // Truco betting state
      truco_betting: {
        entry: assign({
          gameState: 'truco_betting',
        }),
        on: {
          QUIERO: {
            target: 'playing',
            guard: ({ context }) => 
              context.awaitingResponse && 
              context.betInitiator !== null,
            actions: assign(({ context }) => ({
              gameState: 'playing' as const,
              trucoState: 'none' as TrucoBet,
              betInitiator: null,
              awaitingResponse: false,
              logs: addLog(context, `Truco accepted. Round is now worth ${context.roundStake} points.`),
            })),
          },
          
          NO_QUIERO: {
            target: 'round_complete',
            guard: ({ context }) => 
              context.awaitingResponse && 
              context.betInitiator !== null,
            actions: assign(({ context }) => {
              // Award current round stake minus 1 to bet initiator
              const points = Math.max(context.roundStake - 1, 1);
              const updatedPlayer = context.betInitiator === 0
                ? { ...context.player, score: context.player.score + points }
                : context.player;
              const updatedAdversary = context.betInitiator === 1
                ? { ...context.adversary, score: context.adversary.score + points }
                : context.adversary;
              
              const initiatorName = context.betInitiator === 0 ? context.player.name : context.adversary.name;
              
              return {
                gameState: 'round_complete' as const,
                player: updatedPlayer,
                adversary: updatedAdversary,
                roundWinner: context.betInitiator,
                trucoState: 'none' as TrucoBet,
                betInitiator: null,
                awaitingResponse: false,
                logs: addLog(context, `Truco declined. ${initiatorName} wins the round and scores ${points} points.`),
              };
            }),
          },
          
          CALL_RETRUCO: {
            guard: ({ context }) => canCallRetruco({ context }),
            actions: assign(({ context }) => ({
              trucoState: 'retruco' as TrucoBet,
              roundStake: 3,
              betInitiator: context.currentTurn,
              awaitingResponse: true,
              logs: addLog(context, `${context.currentTurn === 0 ? context.player.name : context.adversary.name} calls Retruco (3 points)`),
            })),
          },
          
          CALL_VALE_CUATRO: {
            guard: ({ context }) => canCallValeCuatro({ context }),
            actions: assign(({ context }) => ({
              trucoState: 'vale_cuatro' as TrucoBet,
              roundStake: 4,
              betInitiator: context.currentTurn,
              awaitingResponse: true,
              logs: addLog(context, `${context.currentTurn === 0 ? context.player.name : context.adversary.name} calls Vale Cuatro (4 points)`),
            })),
          },
        },
      },

      // Trick complete state - pause to show trick result
      trick_complete: {
        entry: assign({
          gameState: 'trick_complete',
        }),
        on: {
          CONTINUE: [
            {
              // If round is complete, go to round_complete
              target: 'round_complete',
              guard: ({ context }) => context.roundWinner !== null,
              actions: assign(({ context }) => {
                const winner = context.roundWinner === 0 ? context.player.name : context.adversary.name;
                return {
                  logs: addLog(context, `Round complete. ${winner} wins the round!`),
                };
              }),
            },
            {
              // Otherwise, continue to next trick
              target: 'playing',
              actions: assign(({ context }) => {
                const nextLeader = getNextTrickLeader(
                  context.tricks[context.board.currentTrick]!, 
                  context.currentTurn
                );
                
                return {
                  gameState: 'playing' as const,
                  board: {
                    ...context.board,
                    currentTrick: context.board.currentTrick + 1,
                    cardsInPlay: { player: null, adversary: null },
                    trickWinner: null,
                  },
                  currentTurn: nextLeader,
                };
              }),
            }
          ],
        },
      },

      // Round complete state
      round_complete: {
        entry: assign(({ context }) => {
          // Award round points to winner
          const roundWinner = context.roundWinner;
          if (roundWinner === null) return {};
          
          const points = context.roundStake;
          const updatedPlayer = roundWinner === 0
            ? { ...context.player, score: context.player.score + points }
            : context.player;
          const updatedAdversary = roundWinner === 1
            ? { ...context.adversary, score: context.adversary.score + points }
            : context.adversary;
          
          // Check for game winner
          const gameWinner = updatedPlayer.score >= context.targetScore ? 0 
            : updatedAdversary.score >= context.targetScore ? 1 
            : null;
          
          return {
            gameState: 'round_complete' as const,
            player: updatedPlayer,
            adversary: updatedAdversary,
            gameWinner,
          };
        }),
        
        on: {
          NEXT_ROUND: {
            target: 'dealing',
            guard: ({ context }) => context.gameWinner === null,
            actions: assign(({ context }) => ({
              // Switch dealer and mano for next round
              dealer: context.dealer === 0 ? 1 : 0,
              mano: context.mano === 0 ? 1 : 0,
              logs: addLog(context, '--- Starting new round ---'),
            })),
          },
        },
        
        always: {
          target: 'game_over',
          guard: ({ context }) => context.gameWinner !== null,
        },
      },

      // Game over state
      game_over: {
        entry: assign(({ context }) => ({
          gameState: 'game_over' as const,
          logs: addLog(context, `Game Over! ${context.gameWinner === 0 ? context.player.name : context.adversary.name} wins the match!`),
        })),
        
        on: {
          RESTART_GAME: {
            target: 'idle',
            actions: assign(() => createInitialContext()),
          },
        },
      },
    },
  },
  {
    // Machine options can go here if needed
  }
);