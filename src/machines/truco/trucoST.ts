// Truco state machine.
//
// Implements 1v1 Argentine Truco per pagat.com and the Wikipedia rules:
//   - 40-card Spanish deck.
//   - Cartas bravas: 01_E > 01_B > 07_E > 07_O. Same-rank cards are parda.
//   - Envido chain: envido (+2) / real envido (+3) / falta envido. NO_QUIERO
//     awards the previously-accepted stake (or 1 for the initial call).
//   - Truco chain: truco (2) → retruco (3) → vale cuatro (4). The accepter
//     holds the right to raise next. NO_QUIERO awards previous stake to caller.
//   - Parda tie-breaking: earlier trick wins if one parda, mano wins if all three.
//   - MAZO acts as no-quiero to the active bet and forfeits the round.
//   - First to targetScore (default 30) wins.

import { createMachine, assign } from 'xstate';
import type { GameContext, TrucoEvent, EnvidoBet, TrucoBet, Trick, Player } from './types.js';
import { createShuffledDeck, dealCards, generateMatchId } from './deck.js';
import { createEmptyTrick, determineRoundWinner, resolveTrick, getNextTrickLeader } from './tricks.js';
import { resolveEnvido, canCallEnvido } from './envido.js';

function createInitialContext(seed?: string): GameContext {
  const matchId = generateMatchId();
  const gameSeed = seed ?? matchId;

  return {
    seed: gameSeed,
    matchId,
    deck: createShuffledDeck(gameSeed),
    discarded: [],
    logs: [`Game initialized with seed ${gameSeed}`],
    board: {
      currentTrick: 0,
      cardsInPlay: { player: null, adversary: null },
      trickWinner: null,
    },
    player: { id: 'player1', name: 'Player 1', hand: [], wonTricks: 0, score: 0 },
    adversary: { id: 'player2', name: 'Player 2', hand: [], wonTricks: 0, score: 0 },
    currentTurn: 0,
    mano: 1,
    dealer: 0,
    roundStake: 1,
    envidoStake: 0,
    envidoAcceptedStake: 0,
    envidoCalled: false,
    trucoState: 'none',
    envidoState: 'none',
    trucoCalledThisRound: false,
    trucoHolder: null,
    gameState: 'idle',
    betInitiator: null,
    awaitingResponse: false,
    tricks: [createEmptyTrick(), createEmptyTrick(), createEmptyTrick()],
    trickLeaders: [null, null, null],
    roundWinner: null,
    gameWinner: null,
    targetScore: 30,
  };
}

// ---------- Helpers ----------

function addLog(context: GameContext, message: string): string[] {
  return [...context.logs, `[${new Date().toISOString()}] ${message}`];
}

function playerName(context: GameContext, index: number): string {
  return index === 0 ? context.player.name : context.adversary.name;
}

function awardPoints(
  context: GameContext,
  to: number,
  points: number,
): { player: Player; adversary: Player } {
  if (to === 0) {
    return {
      player: { ...context.player, score: context.player.score + points },
      adversary: context.adversary,
    };
  }
  return {
    player: context.player,
    adversary: { ...context.adversary, score: context.adversary.score + points },
  };
}

function computeGameWinner(player: Player, adversary: Player, target: number): number | null {
  if (player.score >= target) return 0;
  if (adversary.score >= target) return 1;
  return null;
}

function falta(context: GameContext): number {
  return Math.max(
    context.targetScore - Math.max(context.player.score, context.adversary.score),
    1,
  );
}

// Guards for truco escalation. Truco can be raised by whoever holds the right
// (the latest accepter). Before any accept, the opener's opponent responds.
function mayInitiateTruco(ctx: GameContext): boolean {
  return (
    ctx.gameState === 'playing' &&
    ctx.trucoState === 'none' &&
    !ctx.awaitingResponse &&
    // Locked out of new truco only if a game-ending move is pending.
    ctx.roundWinner === null
  );
}

function mayRaiseTruco(ctx: GameContext, from: TrucoBet, current: number): boolean {
  // Can raise from either `playing` (holder raises after accepting) or
  // `truco_betting` (responder counter-raises instead of answering).
  if (ctx.trucoState !== from) return false;
  if (ctx.gameState === 'playing') {
    return ctx.trucoHolder === current;
  }
  if (ctx.gameState === 'truco_betting') {
    // The responder is implicit (the non-initiator in 1v1); the machine trusts
    // the caller to send the event on their behalf. The guard just enforces
    // that a bet is on the table awaiting a response.
    return ctx.awaitingResponse;
  }
  return false;
}

// ---------- Machine ----------

export const trucoStateMachine = createMachine({
  id: 'truco',
  initial: 'idle',
  types: {
    context: {} as GameContext,
    events: {} as TrucoEvent,
  },
  context: () => createInitialContext(),

  states: {
    idle: {
      entry: assign({ gameState: 'idle' }),
      on: {
        START_GAME: { target: 'dealing' },
      },
    },

    dealing: {
      entry: assign(({ context }) => {
        // Reshuffle each deal so subsequent rounds aren't dealing from the
        // same small leftover pile. Use matchId + round# as seed for
        // reproducibility.
        const roundNumber = context.player.score + context.adversary.score;
        const roundSeed = `${context.matchId}#${roundNumber}`;
        const freshDeck = createShuffledDeck(roundSeed);
        const { player1Hand, player2Hand, remainingDeck } = dealCards(freshDeck);

        return {
          gameState: 'dealing' as const,
          deck: remainingDeck,
          discarded: [],
          player: { ...context.player, hand: player1Hand, wonTricks: 0 },
          adversary: { ...context.adversary, hand: player2Hand, wonTricks: 0 },
          board: {
            currentTrick: 0,
            cardsInPlay: { player: null, adversary: null },
            trickWinner: null,
          },
          tricks: [createEmptyTrick(), createEmptyTrick(), createEmptyTrick()] as [
            Trick, Trick, Trick,
          ],
          trickLeaders: [context.mano, null, null] as [number | null, number | null, number | null],
          roundStake: 1,
          envidoStake: 0,
          envidoAcceptedStake: 0,
          envidoCalled: false,
          trucoState: 'none' as TrucoBet,
          envidoState: 'none' as EnvidoBet,
          trucoCalledThisRound: false,
          trucoHolder: null,
          betInitiator: null,
          awaitingResponse: false,
          roundWinner: null,
          currentTurn: context.mano,
          logs: addLog(context, `--- Round ${roundNumber + 1} dealt. ${playerName(context, context.mano)} is mano.`),
        };
      }),
      always: {
        target: 'playing',
        actions: assign({ gameState: 'playing' }),
      },
    },

    playing: {
      entry: assign({ gameState: 'playing' }),
      on: {
        // -------- Card play --------
        PLAY_CARD: {
          actions: assign(({ context, event }) => {
            const turn = context.currentTurn;
            const actingPlayer = turn === 0 ? context.player : context.adversary;
            if (!actingPlayer.hand.includes(event.cardId)) return {};

            const updatedHand = actingPlayer.hand.filter((c) => c !== event.cardId);
            const player = turn === 0 ? { ...context.player, hand: updatedHand } : context.player;
            const adversary = turn === 1 ? { ...context.adversary, hand: updatedHand } : context.adversary;

            const board = {
              ...context.board,
              cardsInPlay: {
                player: turn === 0 ? event.cardId : context.board.cardsInPlay.player,
                adversary: turn === 1 ? event.cardId : context.board.cardsInPlay.adversary,
              },
            };

            const logs = addLog(context, `${playerName(context, turn)} plays ${event.cardId}`);
            const trickComplete = board.cardsInPlay.player !== null && board.cardsInPlay.adversary !== null;

            if (!trickComplete) {
              return {
                player,
                adversary,
                board,
                logs,
                currentTurn: turn === 0 ? 1 : 0,
              };
            }

            // Both cards down. Resolve the trick.
            const trickIdx = context.board.currentTrick;
            const leader = context.trickLeaders[trickIdx] ?? context.mano;
            const winner = resolveTrick(
              board.cardsInPlay.player!,
              board.cardsInPlay.adversary!,
              context.mano,
              trickIdx,
              context.tricks.slice(0, trickIdx),
            );

            const updatedTricks = [...context.tricks] as [Trick, Trick, Trick];
            updatedTricks[trickIdx] = {
              player1Card: board.cardsInPlay.player!,
              player2Card: board.cardsInPlay.adversary!,
              winner,
            };

            const trickLogs = addLog(
              { ...context, logs },
              winner !== null
                ? `${playerName(context, winner)} wins trick ${trickIdx + 1}`
                : `Trick ${trickIdx + 1} is parda`,
            );

            const withTrickPoints = awardPoints(
              { ...context, player, adversary },
              winner ?? 0,
              0, // no points awarded for winning a trick directly; affects wonTricks only
            );
            // Manually bump wonTricks for the winner without awarding score.
            const afterPlayer =
              winner === 0
                ? { ...withTrickPoints.player, wonTricks: withTrickPoints.player.wonTricks + 1 }
                : withTrickPoints.player;
            const afterAdversary =
              winner === 1
                ? { ...withTrickPoints.adversary, wonTricks: withTrickPoints.adversary.wonTricks + 1 }
                : withTrickPoints.adversary;

            const discarded = [
              ...context.discarded,
              board.cardsInPlay.player!,
              board.cardsInPlay.adversary!,
            ];

            const roundResult = determineRoundWinner(updatedTricks, context.mano);

            // Next trick leader: winner, or leader of this trick if parda.
            const nextLeader = getNextTrickLeader(updatedTricks[trickIdx]!, leader);
            const trickLeaders = [...context.trickLeaders] as [number | null, number | null, number | null];
            if (!roundResult.roundComplete && trickIdx < 2) {
              trickLeaders[trickIdx + 1] = nextLeader;
            }

            return {
              player: afterPlayer,
              adversary: afterAdversary,
              board: {
                ...board,
                cardsInPlay: { player: null, adversary: null },
                trickWinner: winner,
              },
              tricks: updatedTricks,
              trickLeaders,
              discarded,
              logs: trickLogs,
              gameState: 'trick_complete' as const,
              roundWinner: roundResult.roundComplete ? roundResult.roundWinner : null,
              currentTurn: nextLeader,
            };
          }),
        },

        // -------- Envido calls (initial) --------
        CALL_ENVIDO: {
          target: 'envido_betting',
          guard: ({ context }) =>
            canCallEnvido(
              context.board.currentTrick,
              context.tricks[0]?.player1Card || null,
              context.tricks[0]?.player2Card || null,
              context.envidoCalled,
              context.trucoState,
              context.trucoCalledThisRound,
              context.gameState,
              context.board.cardsInPlay.player,
              context.board.cardsInPlay.adversary,
            ),
          actions: assign(({ context }) => ({
            envidoState: 'envido' as EnvidoBet,
            envidoStake: 2,
            envidoAcceptedStake: 0,
            betInitiator: context.currentTurn,
            awaitingResponse: true,
            logs: addLog(context, `${playerName(context, context.currentTurn)} calls Envido (2)`),
          })),
        },
        CALL_REAL_ENVIDO: {
          target: 'envido_betting',
          guard: ({ context }) =>
            canCallEnvido(
              context.board.currentTrick,
              context.tricks[0]?.player1Card || null,
              context.tricks[0]?.player2Card || null,
              context.envidoCalled,
              context.trucoState,
              context.trucoCalledThisRound,
              context.gameState,
              context.board.cardsInPlay.player,
              context.board.cardsInPlay.adversary,
            ),
          actions: assign(({ context }) => ({
            envidoState: 'real_envido' as EnvidoBet,
            envidoStake: 3,
            envidoAcceptedStake: 0,
            betInitiator: context.currentTurn,
            awaitingResponse: true,
            logs: addLog(context, `${playerName(context, context.currentTurn)} calls Real Envido (3)`),
          })),
        },
        CALL_FALTA_ENVIDO: {
          target: 'envido_betting',
          guard: ({ context }) =>
            canCallEnvido(
              context.board.currentTrick,
              context.tricks[0]?.player1Card || null,
              context.tricks[0]?.player2Card || null,
              context.envidoCalled,
              context.trucoState,
              context.trucoCalledThisRound,
              context.gameState,
              context.board.cardsInPlay.player,
              context.board.cardsInPlay.adversary,
            ),
          actions: assign(({ context }) => {
            const points = falta(context);
            return {
              envidoState: 'falta_envido' as EnvidoBet,
              envidoStake: points,
              envidoAcceptedStake: 0,
              betInitiator: context.currentTurn,
              awaitingResponse: true,
              logs: addLog(context, `${playerName(context, context.currentTurn)} calls Falta Envido (${points})`),
            };
          }),
        },

        // -------- Truco calls --------
        CALL_TRUCO: {
          target: 'truco_betting',
          guard: ({ context }) => mayInitiateTruco(context),
          actions: assign(({ context }) => ({
            trucoState: 'truco' as TrucoBet,
            roundStake: 2,
            trucoCalledThisRound: true,
            betInitiator: context.currentTurn,
            awaitingResponse: true,
            logs: addLog(context, `${playerName(context, context.currentTurn)} calls Truco (2)`),
          })),
        },
        CALL_RETRUCO: {
          target: 'truco_betting',
          guard: ({ context }) => mayRaiseTruco(context, 'truco', context.currentTurn),
          actions: assign(({ context }) => ({
            trucoState: 'retruco' as TrucoBet,
            roundStake: 3,
            betInitiator: context.currentTurn,
            awaitingResponse: true,
            logs: addLog(context, `${playerName(context, context.currentTurn)} calls Retruco (3)`),
          })),
        },
        CALL_VALE_CUATRO: {
          target: 'truco_betting',
          guard: ({ context }) => mayRaiseTruco(context, 'retruco', context.currentTurn),
          actions: assign(({ context }) => ({
            trucoState: 'vale_cuatro' as TrucoBet,
            roundStake: 4,
            betInitiator: context.currentTurn,
            awaitingResponse: true,
            logs: addLog(context, `${playerName(context, context.currentTurn)} calls Vale Cuatro (4)`),
          })),
        },

        // -------- Forfeit --------
        MAZO: {
          target: 'round_complete',
          actions: assign(({ context }) => {
            const winner = context.currentTurn === 0 ? 1 : 0;
            const scores = awardPoints(context, winner, context.roundStake);
            return {
              ...scores,
              roundWinner: winner,
              logs: addLog(
                context,
                `${playerName(context, context.currentTurn)} goes to mazo. ${playerName({ ...context, ...scores }, winner)} wins ${context.roundStake}.`,
              ),
            };
          }),
        },
      },

      always: [
        { target: 'trick_complete', guard: ({ context }) => context.gameState === 'trick_complete' },
        { target: 'round_complete', guard: ({ context }) => context.gameState === 'round_complete' },
      ],
    },

    // -------- Envido betting --------
    envido_betting: {
      entry: assign({ gameState: 'envido_betting' }),
      on: {
        // Raises: accepted amount "ladders up" as the previously-called value
        // is implicitly accepted.
        CALL_ENVIDO: {
          guard: ({ context }) => context.awaitingResponse && context.betInitiator !== null,
          actions: assign(({ context }) => ({
            envidoState: 'envido' as EnvidoBet,
            envidoAcceptedStake: context.envidoStake,
            envidoStake: context.envidoStake + 2,
            betInitiator: context.currentTurn,
            logs: addLog(context, `${playerName(context, context.currentTurn)} raises with Envido (+2, now ${context.envidoStake + 2})`),
          })),
        },
        CALL_REAL_ENVIDO: {
          guard: ({ context }) => context.awaitingResponse && context.betInitiator !== null,
          actions: assign(({ context }) => ({
            envidoState: 'real_envido' as EnvidoBet,
            envidoAcceptedStake: context.envidoStake,
            envidoStake: context.envidoStake + 3,
            betInitiator: context.currentTurn,
            logs: addLog(context, `${playerName(context, context.currentTurn)} raises with Real Envido (+3, now ${context.envidoStake + 3})`),
          })),
        },
        CALL_FALTA_ENVIDO: {
          guard: ({ context }) => context.awaitingResponse && context.betInitiator !== null,
          actions: assign(({ context }) => {
            const points = falta(context);
            return {
              envidoState: 'falta_envido' as EnvidoBet,
              envidoAcceptedStake: context.envidoStake,
              envidoStake: points,
              betInitiator: context.currentTurn,
              logs: addLog(context, `${playerName(context, context.currentTurn)} raises with Falta Envido (${points})`),
            };
          }),
        },

        QUIERO: {
          target: 'playing',
          guard: ({ context }) => context.awaitingResponse && context.betInitiator !== null,
          actions: assign(({ context }) => {
            const result = resolveEnvido(context.player.hand, context.adversary.hand, context.mano);
            const scores = awardPoints(context, result.winner, context.envidoStake);
            return {
              ...scores,
              envidoCalled: true,
              envidoState: 'none' as EnvidoBet,
              envidoStake: 0,
              envidoAcceptedStake: 0,
              betInitiator: null,
              awaitingResponse: false,
              logs: addLog(
                context,
                `Envido accepted. ${context.player.name}: ${result.player1Points} | ${context.adversary.name}: ${result.player2Points}. ${playerName({ ...context, ...scores }, result.winner)} wins ${context.envidoStake}.`,
              ),
            };
          }),
        },

        NO_QUIERO: {
          target: 'playing',
          guard: ({ context }) => context.awaitingResponse && context.betInitiator !== null,
          actions: assign(({ context }) => {
            const initiator = context.betInitiator!;
            const points = context.envidoAcceptedStake || 1;
            const scores = awardPoints(context, initiator, points);
            return {
              ...scores,
              envidoCalled: true,
              envidoState: 'none' as EnvidoBet,
              envidoStake: 0,
              envidoAcceptedStake: 0,
              betInitiator: null,
              awaitingResponse: false,
              logs: addLog(context, `Envido declined. ${playerName({ ...context, ...scores }, initiator)} scores ${points}.`),
            };
          }),
        },

        // Mazo during envido betting: refuse envido AND forfeit round.
        MAZO: {
          target: 'round_complete',
          actions: assign(({ context }) => {
            const initiator = context.betInitiator!;
            const envidoPts = context.envidoAcceptedStake || 1;
            const afterEnvido = awardPoints(context, initiator, envidoPts);
            const roundWinner = context.currentTurn === 0 ? 1 : 0;
            const afterRound = awardPoints(
              { ...context, ...afterEnvido },
              roundWinner,
              context.roundStake,
            );
            return {
              ...afterRound,
              envidoCalled: true,
              envidoState: 'none' as EnvidoBet,
              envidoStake: 0,
              envidoAcceptedStake: 0,
              betInitiator: null,
              awaitingResponse: false,
              roundWinner,
              logs: addLog(
                context,
                `Mazo during envido. Envido → ${playerName(context, initiator)} (${envidoPts}); round → ${playerName(context, roundWinner)} (${context.roundStake}).`,
              ),
            };
          }),
        },
      },
    },

    // -------- Truco betting --------
    truco_betting: {
      entry: assign({ gameState: 'truco_betting' }),
      on: {
        CALL_RETRUCO: {
          guard: ({ context }) => mayRaiseTruco(context, 'truco', context.currentTurn),
          actions: assign(({ context }) => ({
            trucoState: 'retruco' as TrucoBet,
            roundStake: 3,
            betInitiator: context.currentTurn,
            logs: addLog(context, `${playerName(context, context.currentTurn)} raises to Retruco (3)`),
          })),
        },
        CALL_VALE_CUATRO: {
          guard: ({ context }) => mayRaiseTruco(context, 'retruco', context.currentTurn),
          actions: assign(({ context }) => ({
            trucoState: 'vale_cuatro' as TrucoBet,
            roundStake: 4,
            betInitiator: context.currentTurn,
            logs: addLog(context, `${playerName(context, context.currentTurn)} raises to Vale Cuatro (4)`),
          })),
        },

        QUIERO: {
          target: 'playing',
          guard: ({ context }) => context.awaitingResponse && context.betInitiator !== null,
          actions: assign(({ context }) => {
            // Accepter = the non-initiator (1v1); they hold the right to raise next.
            const accepter = context.betInitiator === 0 ? 1 : 0;
            return {
              trucoHolder: accepter,
              betInitiator: null,
              awaitingResponse: false,
              logs: addLog(context, `${playerName(context, accepter)} accepts. Round now worth ${context.roundStake}.`),
            };
          }),
        },

        NO_QUIERO: {
          target: 'round_complete',
          guard: ({ context }) => context.awaitingResponse && context.betInitiator !== null,
          actions: assign(({ context }) => {
            const initiator = context.betInitiator!;
            const points = Math.max(context.roundStake - 1, 1);
            const scores = awardPoints(context, initiator, points);
            return {
              ...scores,
              roundWinner: initiator,
              betInitiator: null,
              awaitingResponse: false,
              logs: addLog(context, `Truco declined. ${playerName({ ...context, ...scores }, initiator)} wins ${points}.`),
            };
          }),
        },

        MAZO: {
          target: 'round_complete',
          actions: assign(({ context }) => {
            const initiator = context.betInitiator!;
            const points = Math.max(context.roundStake - 1, 1);
            const scores = awardPoints(context, initiator, points);
            return {
              ...scores,
              roundWinner: initiator,
              betInitiator: null,
              awaitingResponse: false,
              logs: addLog(context, `Mazo during truco. ${playerName({ ...context, ...scores }, initiator)} wins ${points}.`),
            };
          }),
        },
      },
    },

    // -------- Trick complete (UX pause) --------
    trick_complete: {
      entry: assign({ gameState: 'trick_complete' }),
      on: {
        CONTINUE: [
          {
            target: 'round_complete',
            guard: ({ context }) => context.roundWinner !== null,
          },
          {
            target: 'playing',
            actions: assign(({ context }) => ({
              gameState: 'playing' as const,
              board: {
                ...context.board,
                currentTrick: context.board.currentTrick + 1,
                cardsInPlay: { player: null, adversary: null },
                trickWinner: null,
              },
              // currentTurn was already set to nextLeader when the trick resolved.
            })),
          },
        ],
      },
    },

    // -------- Round complete --------
    // Points have already been awarded by whoever concluded the round
    // (MAZO, NO_QUIERO, or the final PLAY_CARD). This state only:
    //   1) for the natural trick-play path, awards roundStake to the trick winner,
    //   2) computes gameWinner,
    //   3) transitions to game_over or waits for NEXT_ROUND.
    round_complete: {
      entry: assign(({ context, event }) => {
        // If we came here via CONTINUE from trick_complete, points haven't
        // been awarded yet (trick play doesn't auto-award). Award now.
        const awardFromTrickPlay = event.type === 'CONTINUE';
        const base = awardFromTrickPlay && context.roundWinner !== null
          ? awardPoints(context, context.roundWinner, context.roundStake)
          : { player: context.player, adversary: context.adversary };

        const gameWinner = computeGameWinner(base.player, base.adversary, context.targetScore);
        const logs = awardFromTrickPlay && context.roundWinner !== null
          ? addLog(
              { ...context, ...base },
              `Round complete. ${playerName({ ...context, ...base }, context.roundWinner)} wins ${context.roundStake}.`,
            )
          : context.logs;

        return {
          ...base,
          gameState: 'round_complete' as const,
          gameWinner,
          logs,
        };
      }),

      always: { target: 'game_over', guard: ({ context }) => context.gameWinner !== null },

      on: {
        NEXT_ROUND: {
          target: 'dealing',
          guard: ({ context }) => context.gameWinner === null,
          actions: assign(({ context }) => ({
            dealer: context.dealer === 0 ? 1 : 0,
            mano: context.mano === 0 ? 1 : 0,
            logs: addLog(context, '--- Next round ---'),
          })),
        },
      },
    },

    game_over: {
      entry: assign(({ context }) => ({
        gameState: 'game_over' as const,
        logs: addLog(context, `Game over. ${playerName(context, context.gameWinner ?? 0)} wins.`),
      })),
      on: {
        RESTART_GAME: {
          target: 'idle',
          actions: assign(() => createInitialContext()),
        },
      },
    },
  },
});
