import { createMachine } from 'xstate';

export const cardMachine = createMachine({
  id: 'card',
  initial: 'idle',
  states: {
    idle: {
      on: {
        SELECT: 'selected',
        FLIP: 'flipped'
      }
    },
    selected: {
      on: {
        DESELECT: 'idle',
        FLIP: 'flipped'
      }
    },
    flipped: {
      on: {
        UNFLIP: {
          target: 'idle'
        }
      }
    }
  }
});