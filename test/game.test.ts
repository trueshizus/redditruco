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
            name: expect.any(String),
          })
        );
        expect(state.context.players[1]).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
          })
        );

        // And: the score should be 0-0
        expect(state.context.score).toEqual([0, 0]);

        // And: the game should be in 'idle' state
        expect(state.value).toBe('idle');

        // And: no cards should be dealt yet
        expect(state.context.cards).toHaveLength(2);
        expect(state.context.cards[0]).toHaveLength(0);
        expect(state.context.cards[1]).toHaveLength(0);

        // Additional context checks for the new properties
        expect(state.context.selectedCardId).toBeUndefined();
        expect(state.context.flippedCardId).toBeUndefined();
        expect(state.context.currentTurn).toBe(0);
        expect(state.context.gameState).toBe('idle');
        expect(state.context.dealer).toBe(0);
        expect(state.context.mano).toBe(1);
      });

      it('should start a new round correctly', () => {
        // Given: a game is initialized with 2 players
        const actor = createActor(gameStateMachine);
        actor.start();

        // When: a new round starts
        actor.send({ type: 'START_GAME' });

        const state = actor.getSnapshot();

        // Then: the game should transition to 'dealing' state
        // (Note: due to always transition, it goes to 'playing' immediately)
        expect(state.value).toBe('playing');

        // And: a dealer should be assigned
        expect(state.context.dealer).toBe(0);

        // And: the 'mano' (hand) player should be determined
        expect(state.context.mano).toBe(1);
      });
    });

    describe('Card Distribution', () => {
      it('should deal cards to players correctly', () => {
        // Given: the game is in 'dealing' state
        const actor = createActor(gameStateMachine);
        actor.start();

        // When: cards are dealt (automatically when START_GAME is sent)
        actor.send({ type: 'START_GAME' });

        const state = actor.getSnapshot();

        // Then: each player should receive exactly 3 cards
        expect(state.context.cards[0]).toHaveLength(3);
        expect(state.context.cards[1]).toHaveLength(3);

        // And: all cards should be unique
        const allCards = [...state.context.cards[0], ...state.context.cards[1]];
        const uniqueCards = new Set(allCards);
        expect(uniqueCards.size).toBe(6);

        // And: cards should come from a Spanish deck (40 cards)
        const validCards = [
          '01_E.svg',
          '02_E.svg',
          '03_E.svg',
          '04_E.svg',
          '05_E.svg',
          '06_E.svg',
          '07_E.svg',
          '10_E.svg',
          '11_E.svg',
          '12_E.svg',
          '01_B.svg',
          '02_B.svg',
          '03_B.svg',
          '04_B.svg',
          '05_B.svg',
          '06_B.svg',
          '07_B.svg',
          '10_B.svg',
          '11_B.svg',
          '12_B.svg',
          '01_C.svg',
          '02_C.svg',
          '03_C.svg',
          '04_C.svg',
          '05_C.svg',
          '06_C.svg',
          '07_C.svg',
          '10_C.svg',
          '11_C.svg',
          '12_C.svg',
          '01_O.svg',
          '02_O.svg',
          '03_O.svg',
          '04_O.svg',
          '05_O.svg',
          '06_O.svg',
          '07_O.svg',
          '10_O.svg',
          '11_O.svg',
          '12_O.svg',
        ];

        allCards.forEach((card) => {
          expect(validCards).toContain(card);
        });

        // And: the game should transition to 'playing' state
        expect(state.value).toBe('playing');
      });

      it('should validate dealt cards correctly', () => {
        // Given: cards have been dealt
        const actor = createActor(gameStateMachine);
        actor.start();
        actor.send({ type: 'START_GAME' });

        const state = actor.getSnapshot();

        // When: validating the game state
        const player1Cards = state.context.cards[0];
        const player2Cards = state.context.cards[1];
        const allCards = [...player1Cards, ...player2Cards];

        // Then: no player should have duplicate cards
        const player1Unique = new Set(player1Cards);
        const player2Unique = new Set(player2Cards);
        expect(player1Unique.size).toBe(player1Cards.length);
        expect(player2Unique.size).toBe(player2Cards.length);

        // And: total dealt cards should equal 6
        expect(allCards).toHaveLength(6);

        // And: all cards should be valid Spanish deck cards
        const validCards = [
          '01_E.svg',
          '02_E.svg',
          '03_E.svg',
          '04_E.svg',
          '05_E.svg',
          '06_E.svg',
          '07_E.svg',
          '10_E.svg',
          '11_E.svg',
          '12_E.svg',
          '01_B.svg',
          '02_B.svg',
          '03_B.svg',
          '04_B.svg',
          '05_B.svg',
          '06_B.svg',
          '07_B.svg',
          '10_B.svg',
          '11_B.svg',
          '12_B.svg',
          '01_C.svg',
          '02_C.svg',
          '03_C.svg',
          '04_C.svg',
          '05_C.svg',
          '06_C.svg',
          '07_C.svg',
          '10_C.svg',
          '11_C.svg',
          '12_C.svg',
          '01_O.svg',
          '02_O.svg',
          '03_O.svg',
          '04_O.svg',
          '05_O.svg',
          '06_O.svg',
          '07_O.svg',
          '10_O.svg',
          '11_O.svg',
          '12_O.svg',
        ];

        allCards.forEach((card) => {
          expect(validCards).toContain(card);
        });
      });
    });
  });
});
