import { createMachine, assign } from 'xstate';

// Spanish deck: 1-7, 10-12 for each suit (E, B, C, O)
const SPANISH_DECK = [
  '01_E',
  '02_E',
  '03_E',
  '04_E',
  '05_E',
  '06_E',
  '07_E',
  '10_E',
  '11_E',
  '12_E',
  '01_B',
  '02_B',
  '03_B',
  '04_B',
  '05_B',
  '06_B',
  '07_B',
  '10_B',
  '11_B',
  '12_B',
  '01_C',
  '02_C',
  '03_C',
  '04_C',
  '05_C',
  '06_C',
  '07_C',
  '10_C',
  '11_C',
  '12_C',
  '01_O',
  '02_O',
  '03_O',
  '04_O',
  '05_O',
  '06_O',
  '07_O',
  '10_O',
  '11_O',
  '12_O',
].map((card) => `${card}.svg`);

function generateMatchId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return function() {
    hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
    return hash / 0x80000000;
  };
}

function shuffleDeck(seed?: string): string[] {
  const deck = [...SPANISH_DECK];
  const random = seed ? seededRandom(seed) : Math.random;
  
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

function dealCards(seed?: string): [string[], string[]] {
  const shuffledDeck = shuffleDeck(seed);
  return [
    shuffledDeck.slice(0, 3), // Player 1 gets first 3 cards
    shuffledDeck.slice(3, 6), // Player 2 gets next 3 cards
  ];
}

function logGameState(matchId: string, state: string, context: Partial<GameContext>, action?: string) {
  const logEntry = {
    matchId,
    timestamp: new Date().toISOString(),
    state,
    action,
    score: context.score,
    currentTurn: context.currentTurn,
    currentBet: context.currentBet,
    betPoints: context.betPoints,
    handValue: context.handValue,
  };
  console.log('🎮 Game State Log:', logEntry);
}

// Truco card hierarchy (highest to lowest)
const CARD_HIERARCHY = [
  '01_E.svg', // As de Espadas (highest)
  '01_B.svg', // As de Bastos
  '07_E.svg', // Siete de Espadas
  '07_O.svg', // Siete de Oros
  '03_E.svg',
  '03_B.svg',
  '03_C.svg',
  '03_O.svg', // Tres
  '02_E.svg',
  '02_B.svg',
  '02_C.svg',
  '02_O.svg', // Dos
  '01_C.svg',
  '01_O.svg', // As falsos
  '12_E.svg',
  '12_B.svg',
  '12_C.svg',
  '12_O.svg', // Rey
  '11_E.svg',
  '11_B.svg',
  '11_C.svg',
  '11_O.svg', // Caballo
  '10_E.svg',
  '10_B.svg',
  '10_C.svg',
  '10_O.svg', // Sota
  '07_B.svg',
  '07_C.svg', // Siete falsos
  '06_E.svg',
  '06_B.svg',
  '06_C.svg',
  '06_O.svg', // Seis
  '05_E.svg',
  '05_B.svg',
  '05_C.svg',
  '05_O.svg', // Cinco
  '04_E.svg',
  '04_B.svg',
  '04_C.svg',
  '04_O.svg', // Cuatro (lowest)
];

function compareCards(card1: string, card2: string): number {
  const index1 = CARD_HIERARCHY.indexOf(card1);
  const index2 = CARD_HIERARCHY.indexOf(card2);

  if (index1 < index2) return 1; // card1 wins (lower index = higher value)
  if (index1 > index2) return -1; // card2 wins
  return 0; // tie (parda)
}

function createEmptyTrick(): Trick {
  return {
    player1Card: null,
    player2Card: null,
    winner: null,
  };
}

function determineHandWinner(tricks: [Trick, Trick, Trick]): number | null {
  const tricksWon = [0, 0]; // [player1Wins, player2Wins]

  tricks.forEach((trick) => {
    if (trick.winner !== null) {
      tricksWon[trick.winner]!++;
    }
  });

  // Need 2 tricks to win hand
  if (tricksWon[0]! >= 2) return 0;
  if (tricksWon[1]! >= 2) return 1;

  return null; // Hand not yet decided
}

function getCardValue(card: string): number {
  const number = card.split('_')[0]!;
  const numValue = parseInt(number);

  // Face cards (10, 11, 12) = 0 points for Envido
  if (numValue >= 10) return 0;

  // Cards 1-7 have face value for Envido
  return numValue;
}

function getCardSuit(card: string): string {
  return card.split('_')[1]!.replace('.svg', '');
}

function calculateEnvidoPoints(cards: string[]): number {
  const cardsBySuit: { [suit: string]: number[] } = {};

  // Group cards by suit and get their values
  cards.forEach((card) => {
    const suit = getCardSuit(card);
    const value = getCardValue(card);

    if (!cardsBySuit[suit]) {
      cardsBySuit[suit] = [];
    }
    cardsBySuit[suit].push(value);
  });

  let maxPoints = 0;

  // Check each suit for envido points
  Object.values(cardsBySuit).forEach((suitCards) => {
    if (suitCards.length >= 2) {
      // Sort descending and take top 2
      suitCards.sort((a, b) => b - a);
      const points = suitCards[0]! + suitCards[1]! + 20;
      maxPoints = Math.max(maxPoints, points);
    } else if (suitCards.length === 1) {
      // Single card value (no +20 bonus)
      maxPoints = Math.max(maxPoints, suitCards[0]!);
    }
  });

  return maxPoints;
}

// Validation functions for game actions
function canCallEnvido(context: GameContext): boolean {
  return (
    context.gameState === 'playing' && 
    context.currentTrick === 0 &&
    !context.tricks[0].player1Card &&
    !context.tricks[0].player2Card &&
    context.currentBet === 'none' &&
    !context.trucoCalledThisRound  // Prevent Envido after Truco
  );
}

function canCallTruco(context: GameContext): boolean {
  return (
    context.gameState === 'playing' && 
    context.currentBet !== 'truco' && 
    context.currentBet !== 'retruco' && 
    context.currentBet !== 'vale_cuatro'
  );
}

function canCallRetruco(context: GameContext): boolean {
  return (
    context.gameState === 'truco_betting' && 
    context.currentBet === 'truco'
  );
}

function canCallValeCuatro(context: GameContext): boolean {
  return (
    context.gameState === 'truco_betting' && 
    context.currentBet === 'retruco'
  );
}

function canPlayCard(context: GameContext): boolean {
  const playerCards = context.cards[context.currentTurn] || [];
  return (
    context.gameState === 'playing' && 
    context.selectedCardId !== undefined && 
    playerCards.includes(context.selectedCardId)
  );
}

function canRespond(context: GameContext, playerIndex: number): boolean {
  return (
    (context.gameState === 'envido_betting' || context.gameState === 'truco_betting') &&
    context.awaitingResponse && 
    context.betInitiator !== playerIndex
  );
}

interface Trick {
  player1Card: string | null;
  player2Card: string | null;
  winner: number | null; // 0 for player1, 1 for player2, null for tie/incomplete
}

interface GameContext {
  matchId: string; // Unique identifier for this game match
  players: { id: string; name: string }[];
  score: [number, number];
  cards: [string[], string[]]; // [player1Cards, player2Cards]
  selectedCardId: string | undefined;
  flippedCardId: string | undefined;
  currentTurn: number; // 0 for player1, 1 for player2
  gameState:
    | 'idle'
    | 'dealing'
    | 'playing'
    | 'envido_betting'
    | 'truco_betting'
    | 'hand_complete'
    | 'finished';
  dealer: number; // 0 for player1, 1 for player2
  mano: number; // the "mano" player (hand player)
  currentTrick: number; // 0, 1, or 2 (three tricks per hand)
  tricks: [Trick, Trick, Trick]; // Three tricks per hand
  handWinner: number | null; // Winner of the current hand
  // Betting state
  currentBet:
    | 'none'
    | 'envido'
    | 'real_envido'
    | 'falta_envido'
    | 'truco'
    | 'retruco'
    | 'vale_cuatro';
  betPoints: number; // Points at stake for current bet
  betInitiator: number | null; // Who started the current bet
  awaitingResponse: boolean; // Waiting for bet response
  handValue: number; // Base hand value (1 point, multiplied by truco)
  trucoCalledThisRound: boolean; // Track if Truco was called in this round
}

// Export game action helpers for UI use
export const gameActions = {
  canCallEnvido,
  canCallTruco,
  canCallRetruco,
  canCallValeCuatro,
  canPlayCard,
  canRespond,
};

export const gameStateMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5gF8A0IB2B7CdGigEMBbMAZQBdCKx8QAHLWASwuawzoA9EBaANnQBPPv2RoQRUpWpgAdMwgAbWkgZNW7Tmp4IALACZhiABwBGOQFZx4oA */
  id: 'gameState',
  initial: 'idle',
  context: {
    matchId: generateMatchId(),
    players: [
      { id: 'player1', name: 'Darkening' },
      { id: 'player2', name: 'shizus' },
    ],
    score: [0, 0],
    cards: [[], []], // Empty initially until cards are dealt
    selectedCardId: undefined,
    flippedCardId: undefined,
    currentTurn: 0, // Start with player1
    gameState: 'idle',
    dealer: 0,
    mano: 1, // mano is opposite of dealer
    currentTrick: 0,
    tricks: [createEmptyTrick(), createEmptyTrick(), createEmptyTrick()],
    handWinner: null,
    // Betting state
    currentBet: 'none',
    betPoints: 0,
    betInitiator: null,
    awaitingResponse: false,
    handValue: 1, // Base hand value
    trucoCalledThisRound: false,
  } as GameContext,
  states: {
    idle: {
      on: {
        START_GAME: {
          target: 'dealing',
          actions: assign({
            gameState: 'dealing' as const,
          }),
        },
        SELECT_CARD: {
          actions: assign({
            selectedCardId: ({ event }) => event.cardId,
          }),
        },
        FLIP_CARD: {
          actions: assign(({ context, event }) => ({
            flippedCardId:
              context.selectedCardId === event.cardId
                ? context.flippedCardId === event.cardId
                  ? undefined
                  : event.cardId
                : context.flippedCardId,
          })),
        },
        CLEAR_SELECTION: {
          actions: assign({
            selectedCardId: undefined,
            flippedCardId: undefined,
          }),
        },
      },
    },
    dealing: {
      entry: assign(({ context }) => {
        const cards = dealCards(context.matchId);
        logGameState(context.matchId, 'dealing', { ...context, cards }, 'DEAL_CARDS');
        return {
          gameState: 'dealing' as const,
          cards,
        };
      }),
      always: {
        target: 'playing',
        actions: assign({
          gameState: 'playing' as const,
          currentTurn: ({ context }) => context.mano, // mano player starts
        }),
      },
    },
    playing: {
      entry: assign({
        gameState: 'playing' as const,
      }),
      on: {
        SELECT_CARD: {
          actions: assign({
            selectedCardId: ({ event }) => event.cardId,
          }),
          // Only allow selecting cards from the current player's hand
          guard: ({ context, event }) => {
            const playerCards = context.cards[context.currentTurn] || [];
            return playerCards.includes(event.cardId);
          },
        },
        FLIP_CARD: {
          actions: assign(({ context, event }) => ({
            flippedCardId:
              context.selectedCardId === event.cardId
                ? context.flippedCardId === event.cardId
                  ? undefined
                  : event.cardId
                : context.flippedCardId,
          })),
          // Only allow flipping cards that belong to the current player
          guard: ({ context, event }) => {
            const playerCards = context.cards[context.currentTurn] || [];
            return playerCards.includes(event.cardId);
          },
        },
        PLAY_CARD: {
          actions: assign(({ context }) => {
            if (!context.selectedCardId) return {};

            const currentTrickData = context.tricks[context.currentTrick]!;

            // Remove played card from current player's hand
            const newCards = context.cards.map((playerCards, index) =>
              index === context.currentTurn
                ? playerCards.filter((card) => card !== context.selectedCardId)
                : playerCards
            ) as [string[], string[]];

            // Update the current trick with the played card
            const newTricks = [...context.tricks] as [Trick, Trick, Trick];
            if (context.currentTurn === 0) {
              newTricks[context.currentTrick]! = {
                player1Card: context.selectedCardId,
                player2Card: currentTrickData.player2Card,
                winner: currentTrickData.winner,
              };
            } else {
              newTricks[context.currentTrick]! = {
                player1Card: currentTrickData.player1Card,
                player2Card: context.selectedCardId,
                winner: currentTrickData.winner,
              };
            }

            // Check if trick is complete (both players played)
            const updatedTrick = newTricks[context.currentTrick]!;
            const isTrickComplete = updatedTrick.player1Card && updatedTrick.player2Card;

            let trickWinner = null;
            let nextTurn = context.currentTurn === 0 ? 1 : 0;

            if (isTrickComplete) {
              // Determine trick winner
              const comparison = compareCards(updatedTrick.player1Card!, updatedTrick.player2Card!);
              if (comparison > 0) {
                trickWinner = 0; // player1 wins
                nextTurn = 0; // winner leads next trick
              } else if (comparison < 0) {
                trickWinner = 1; // player2 wins
                nextTurn = 1; // winner leads next trick
              } else {
                // Parda (tie) - mano wins first trick, previous winner wins subsequent tricks
                if (context.currentTrick === 0) {
                  trickWinner = context.mano;
                  nextTurn = context.mano;
                } else {
                  // Find previous trick winner
                  const prevTrickWinner =
                    context.tricks
                      .slice(0, context.currentTrick)
                      .reverse()
                      .find((trick) => trick.winner !== null)?.winner ?? context.mano;
                  trickWinner = prevTrickWinner;
                  nextTurn = prevTrickWinner;
                }
              }

              newTricks[context.currentTrick]! = {
                player1Card: updatedTrick.player1Card,
                player2Card: updatedTrick.player2Card,
                winner: trickWinner,
              };
            }

            // Check for hand completion and next trick logic
            let nextTrickNumber = context.currentTrick;
            let newHandWinner = context.handWinner;

            if (isTrickComplete) {
              // Check if hand is won (2 out of 3 tricks)
              newHandWinner = determineHandWinner(newTricks);

              // If hand not won and tricks remain, advance to next trick
              if (newHandWinner === null && context.currentTrick < 2) {
                nextTrickNumber = context.currentTrick + 1;
              }
            }

            return {
              cards: newCards,
              tricks: newTricks,
              selectedCardId: undefined,
              flippedCardId: undefined,
              currentTurn: nextTurn,
              currentTrick: nextTrickNumber,
              handWinner: newHandWinner,
            };
          }),
          // Make sure the player has a selected card that belongs to them
          guard: ({ context }) => {
            const playerCards = context.cards[context.currentTurn] || [];
            return context.selectedCardId !== undefined && 
                   playerCards.some(card => card === context.selectedCardId);
          },
        },
        // Envido betting
        ENVIDO: {
          target: 'envido_betting',
          actions: assign(({ context }) => {
            const newContext = {
              currentBet: 'envido' as const,
              betPoints: 2,
              betInitiator: context.currentTurn,
              awaitingResponse: true,
              gameState: 'envido_betting' as const,
            };
            logGameState(context.matchId, 'envido_betting', { ...context, ...newContext }, 'ENVIDO');
            return newContext;
          }),
          guard: ({ context }) => canCallEnvido(context),
        },
        REAL_ENVIDO: {
          target: 'envido_betting',
          actions: assign({
            currentBet: 'real_envido' as const,
            betPoints: 3,
            betInitiator: ({ context }) => context.currentTurn,
            awaitingResponse: true,
            gameState: 'envido_betting' as const,
          }),
          guard: ({ context }) => canCallEnvido(context),
        },
        FALTA_ENVIDO: {
          target: 'envido_betting',
          actions: assign({
            currentBet: 'falta_envido' as const,
            betPoints: ({ context }) => Math.max(30 - Math.max(...context.score), 1),
            betInitiator: ({ context }) => context.currentTurn,
            awaitingResponse: true,
            gameState: 'envido_betting' as const,
          }),
          guard: ({ context }) => canCallEnvido(context),
        },
        // Truco betting
        TRUCO: {
          target: 'truco_betting',
          actions: assign(({ context }) => {
            const newContext = {
              currentBet: 'truco' as const,
              handValue: 2,
              betInitiator: context.currentTurn,
              awaitingResponse: true,
              gameState: 'truco_betting' as const,
              trucoCalledThisRound: true,  // Mark that Truco was called
            };
            logGameState(context.matchId, 'truco_betting', { ...context, ...newContext }, 'TRUCO');
            return newContext;
          }),
          guard: ({ context }) => canCallTruco(context),
        },
        END_GAME: {
          target: 'finished',
        },
        // Add MAZO handler (player surrenders hand)
        MAZO: {
          target: 'hand_complete',
          actions: assign(({ context }) => {
            // The player who called MAZO surrenders
            const opponent = context.currentTurn === 0 ? 1 : 0;
            return {
              handWinner: opponent,
              gameState: 'hand_complete' as const,
            };
          }),
        },
      },
      always: [
        {
          target: 'finished',
          guard: ({ context }) => context.score[0] >= 30 || context.score[1] >= 30,
        },
        {
          target: 'hand_complete',
          guard: ({ context }) => context.handWinner !== null,
        },
      ],
    },
    envido_betting: {
      entry: assign({
        gameState: 'envido_betting' as const,
      }),
      on: {
        QUIERO: {
          target: 'playing',
          actions: assign(({ context }) => {
            // Calculate envido points for both players
            const player1Points = calculateEnvidoPoints(context.cards[0]);
            const player2Points = calculateEnvidoPoints(context.cards[1]);

            const winner =
              player1Points > player2Points ? 0 : player2Points > player1Points ? 1 : context.mano; // Mano wins ties in envido

            const newContext = {
              score: [
                context.score[0] + (winner === 0 ? context.betPoints : 0),
                context.score[1] + (winner === 1 ? context.betPoints : 0),
              ] as [number, number],
              currentBet: 'none' as const,
              betPoints: 0,
              betInitiator: null,
              awaitingResponse: false,
              gameState: 'playing' as const,
            };
            logGameState(context.matchId, 'playing', { ...context, ...newContext }, `QUIERO_ENVIDO_WINNER_${winner}_P1:${player1Points}_P2:${player2Points}`);
            return newContext;
          }),
          // Only the responding player can accept
          guard: ({ context }) => 
            context.awaitingResponse && 
            context.betInitiator !== context.currentTurn,
        },
        NO_QUIERO: {
          target: 'playing',
          actions: assign(({ context }) => ({
            score: [
              context.score[0] + (context.betInitiator === 0 ? 1 : 0),
              context.score[1] + (context.betInitiator === 1 ? 1 : 0),
            ] as [number, number],
            currentBet: 'none' as const,
            betPoints: 0,
            betInitiator: null,
            awaitingResponse: false,
            gameState: 'playing' as const,
          })),
          // Only the responding player can decline
          guard: ({ context }) => 
            context.awaitingResponse && 
            context.betInitiator !== context.currentTurn,
        },
      },
    },
    truco_betting: {
      entry: assign({
        gameState: 'truco_betting' as const,
      }),
      on: {
        QUIERO: {
          target: 'playing',
          actions: assign({
            currentBet: 'none' as const,
            betPoints: 0,
            betInitiator: null,
            awaitingResponse: false,
            gameState: 'playing' as const,
          }),
          // Only the responding player can accept
          guard: ({ context }) => 
            context.awaitingResponse && 
            context.betInitiator !== context.currentTurn,
        },
        NO_QUIERO: {
          target: 'hand_complete',
          actions: assign(({ context }) => ({
            score: [
              context.score[0] + (context.betInitiator === 0 ? 1 : 0),
              context.score[1] + (context.betInitiator === 1 ? 1 : 0),
            ] as [number, number],
            handWinner: context.betInitiator,
            currentBet: 'none' as const,
            betPoints: 0,
            betInitiator: null,
            awaitingResponse: false,
            gameState: 'hand_complete' as const,
          })),
          // Only the responding player can decline
          guard: ({ context }) => 
            context.awaitingResponse && 
            context.betInitiator !== context.currentTurn,
        },
        RETRUCO: {
          actions: assign({
            currentBet: 'retruco' as const,
            handValue: 3,
            betInitiator: ({ context }) => context.currentTurn,
            awaitingResponse: true,
          }),
          // Can only call retruco if the current bet is truco and it's the opponent's turn
          guard: ({ context }) => canCallRetruco(context) && context.betInitiator !== context.currentTurn,
        },
        VALE_CUATRO: {
          actions: assign({
            currentBet: 'vale_cuatro' as const,
            handValue: 4,
            betInitiator: ({ context }) => context.currentTurn,
            awaitingResponse: true,
          }),
          // Can only call vale cuatro if the current bet is retruco and it's the opponent's turn
          guard: ({ context }) => canCallValeCuatro(context) && context.betInitiator !== context.currentTurn,
        },
      },
    },
    hand_complete: {
      entry: assign(({ context }) => ({
        gameState: 'hand_complete' as const,
        score: [
          context.score[0] + (context.handWinner === 0 ? context.handValue : 0),
          context.score[1] + (context.handWinner === 1 ? context.handValue : 0),
        ] as [number, number],
      })),
      on: {
        START_NEW_HAND: {
          target: 'dealing',
          actions: assign(({ context }) => ({
            // Reset hand state
            cards: [[], []] as [string[], string[]],
            currentTrick: 0,
            tricks: [createEmptyTrick(), createEmptyTrick(), createEmptyTrick()] as [
              Trick,
              Trick,
              Trick,
            ],
            handWinner: null,
            selectedCardId: undefined,
            flippedCardId: undefined,
            // Reset betting state
            currentBet: 'none' as const,
            betPoints: 0,
            betInitiator: null,
            awaitingResponse: false,
            handValue: 1,
            trucoCalledThisRound: false,  // Reset Truco flag for new round
            // Rotate dealer and mano
            dealer: context.dealer === 0 ? 1 : 0,
            mano: context.mano === 0 ? 1 : 0,
            currentTurn: 0,
            gameState: 'dealing' as const,
          })),
        },
      },
      always: {
        target: 'finished',
        guard: ({ context }) => context.score[0] >= 3 || context.score[1] >= 3, // Temporarily 3 for testing
      },
    },
    finished: {
      entry: assign({
        gameState: 'finished' as const,
      }),
      on: {
        RESTART: {
          target: 'idle',
          actions: assign(({ context }) => {
            const newMatchId = generateMatchId();
            const newContext = {
              matchId: newMatchId,
              score: [0, 0] as [number, number],
              cards: [[], []] as [string[], string[]],
              selectedCardId: undefined,
              flippedCardId: undefined,
              currentTurn: 0,
              gameState: 'idle' as const,
              dealer: 0,
              mano: 1,
              currentTrick: 0,
              tricks: [createEmptyTrick(), createEmptyTrick(), createEmptyTrick()] as [
                Trick,
                Trick,
                Trick,
              ],
              handWinner: null,
              currentBet: 'none' as const,
              betPoints: 0,
              betInitiator: null,
              awaitingResponse: false,
              handValue: 1,
              trucoCalledThisRound: false,
            };
            logGameState(context.matchId, 'restarting', context, 'RESTART_GAME');
            logGameState(newMatchId, 'idle', newContext, 'NEW_GAME_STARTED');
            return newContext;
          }),
        },
      },
    },
  },
});
