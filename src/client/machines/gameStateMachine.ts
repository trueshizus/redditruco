
import { createMachine, assign } from 'xstate';

interface GameContext {
  players: { id: string; name: string }[];
  score: [number, number];
  cards: [string[], string[]]; // [player1Cards, player2Cards]
  selectedCardId: string | undefined;
  flippedCardId: string | undefined;
  currentTurn: number; // 0 for player1, 1 for player2
  gameState: 'idle' | 'dealing' | 'playing' | 'finished';
}

export const gameStateMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5gF8A0IB2B7CdGigEMBbMAZQBdCKx8QAHLWASwuawzoA9EBaANnQBPPv2RoQRUpWpgAdMwgAbWkgZNW7Tmp4IALACZhiABwBGOQFZx4oA */
  id: 'gameState',
  initial: 'idle',
  context: {
    players: [
      { id: 'player1', name: 'Darkening' }, 
      { id: 'player2', name: 'shizus' }
    ],
    score: [0, 0],
    cards: [
      ['01_E.svg', '07_C.svg', '12_O.svg'], // player1 cards (hardcoded for now)
      ['02_B.svg', '05_C.svg', '11_O.svg']  // player2 cards (hardcoded for now)
    ],
    selectedCardId: undefined,
    flippedCardId: undefined,
    currentTurn: 0, // Start with player1
    gameState: 'idle',
  } as GameContext,
  states: {
    idle: {
      on: {
        START_GAME: {
          target: 'dealing',
          actions: assign({
            gameState: 'dealing'
          })
        },
        SELECT_CARD: {
          actions: assign({
            selectedCardId: ({ event }) => event.cardId
          })
        },
        FLIP_CARD: {
          actions: assign(({ context, event }) => ({
            flippedCardId: context.selectedCardId === event.cardId 
              ? (context.flippedCardId === event.cardId ? undefined : event.cardId)
              : context.flippedCardId
          }))
        },
        CLEAR_SELECTION: {
          actions: assign({
            selectedCardId: undefined,
            flippedCardId: undefined
          })
        }
      }
    },
    dealing: {
      entry: assign({
        gameState: 'dealing'
      }),
      on: {
        CARDS_DEALT: {
          target: 'playing',
          actions: assign({
            gameState: 'playing'
          })
        }
      }
    },
    playing: {
      entry: assign({
        gameState: 'playing'
      }),
      on: {
        SELECT_CARD: {
          actions: assign({
            selectedCardId: ({ event }) => event.cardId
          })
        },
        FLIP_CARD: {
          actions: assign(({ context, event }) => ({
            flippedCardId: context.selectedCardId === event.cardId 
              ? (context.flippedCardId === event.cardId ? undefined : event.cardId)
              : context.flippedCardId
          }))
        },
        PLAY_CARD: {
          actions: assign(({ context }) => ({
            // Remove played card from current player's hand
            cards: context.cards.map((playerCards, index) => 
              index === context.currentTurn 
                ? playerCards.filter(card => card !== context.selectedCardId)
                : playerCards
            ) as [string[], string[]],
            selectedCardId: undefined,
            flippedCardId: undefined,
            // Switch turns
            currentTurn: context.currentTurn === 0 ? 1 : 0
          }))
        },
        END_GAME: {
          target: 'finished'
        }
      }
    },
    finished: {
      entry: assign({
        gameState: 'finished'
      }),
      on: {
        RESTART: {
          target: 'idle',
          actions: assign({
            score: [0, 0],
            cards: [
              ['01_E.svg', '07_C.svg', '12_O.svg'],
              ['02_B.svg', '05_C.svg', '11_O.svg']
            ],
            selectedCardId: undefined,
            flippedCardId: undefined,
            currentTurn: 0,
            gameState: 'idle'
          })
        }
      }
    }
  },
});
