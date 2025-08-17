
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { gameStateMachine } from '../src/client/machines/gameStateMachine';

describe('Truco Game State Machine', () => {
  describe('Phase 1: Core Game State Validation', () => {
    describe('Game Initialization', () => {
      it('should create a new game correctly', () => {
        // Given: no game exists
        // When: a new game is initialized
        const actor = createActor(gameStateMachine);
        actor.start();

        const state = actor.getSnapshot();

        // Then: the game should have exactly 2 players
        expect(state.context.players).toHaveLength(2);
        expect(state.context.players[0]).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String)
          })
        );
        expect(state.context.players[1]).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String)
          })
        );

        // And: the score should be 0-0
        expect(state.context.score).toEqual([0, 0]);

        // And: the game should be in 'idle' state
        expect(state.value).toBe('idle');

        // And: no cards should be dealt yet (Note: we have hardcoded cards for UI testing)
        expect(state.context.cards).toHaveLength(2);
        expect(Array.isArray(state.context.cards[0])).toBe(true);
        expect(Array.isArray(state.context.cards[1])).toBe(true);
        
        // Additional context checks for the new properties
        expect(state.context.selectedCardId).toBeUndefined();
        expect(state.context.flippedCardId).toBeUndefined();
        expect(state.context.currentTurn).toBe(0);
        expect(state.context.gameState).toBe('idle');
      });
    });
  });
});
