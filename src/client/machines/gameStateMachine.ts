import { createMachine, assign } from 'xstate';

interface GameContext {
  selectedCardId: string | null;
  flippedCardId: string | null;
}

export const gameStateMachine = createMachine({
  id: 'gameState',
  initial: 'playing',
  context: {
    selectedCardId: null,
    flippedCardId: null
  } as GameContext,
  states: {
    playing: {
      on: {
        SELECT_CARD: {
          actions: assign({
            selectedCardId: ({ event }) => event.cardId
          })
        },
        FLIP_CARD: {
          actions: assign({
            flippedCardId: ({ context, event }) => 
              context.flippedCardId === event.cardId ? null : event.cardId
          })
        }
      }
    }
  }
});