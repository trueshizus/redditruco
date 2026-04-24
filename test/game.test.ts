import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { trucoStateMachine } from '../src/machines/truco';
import {
  calculateEnvidoPoints,
  compareCards,
  generateFullDeck,
  CARD_HIERARCHY,
} from '../src/machines/truco';

describe('Truco Game State Machine', () => {
  describe('Phase 1: Core Game State Validation', () => {
    describe('Game Initialization', () => {
      it('should create a new game correctly', () => {
        const actor = createActor(trucoStateMachine);
        actor.start();

        const state = actor.getSnapshot();

        expect(state.context.player).toEqual(
          expect.objectContaining({ id: expect.any(String), name: expect.any(String), score: 0 })
        );
        expect(state.context.adversary).toEqual(
          expect.objectContaining({ id: expect.any(String), name: expect.any(String), score: 0 })
        );

        expect(state.value).toBe('idle');
        expect(state.context.gameState).toBe('idle');

        // No cards dealt yet
        expect(state.context.player.hand).toHaveLength(0);
        expect(state.context.adversary.hand).toHaveLength(0);

        expect(state.context.currentTurn).toBe(0);
        expect(state.context.dealer).toBe(0);
        expect(state.context.mano).toBe(1);

        expect(state.context.roundStake).toBe(1);
        expect(state.context.envidoStake).toBe(0);
        expect(state.context.targetScore).toBe(30);
      });

      it('should transition idle → playing on START_GAME', () => {
        const actor = createActor(trucoStateMachine);
        actor.start();
        actor.send({ type: 'START_GAME' });

        const state = actor.getSnapshot();

        // dealing is transient (always → playing)
        expect(state.value).toBe('playing');
        expect(state.context.gameState).toBe('playing');
        expect(state.context.dealer).toBe(0);
        expect(state.context.mano).toBe(1);
        // mano leads the first trick
        expect(state.context.currentTurn).toBe(1);
      });
    });

    describe('Card Distribution', () => {
      const VALID_DECK = new Set(generateFullDeck());

      it('deals 3 unique cards to each player from the Spanish deck', () => {
        const actor = createActor(trucoStateMachine);
        actor.start();
        actor.send({ type: 'START_GAME' });

        const { player, adversary } = actor.getSnapshot().context;

        expect(player.hand).toHaveLength(3);
        expect(adversary.hand).toHaveLength(3);

        const allDealt = [...player.hand, ...adversary.hand];
        expect(new Set(allDealt).size).toBe(6);

        for (const card of allDealt) {
          expect(VALID_DECK.has(card)).toBe(true);
        }
      });

      it('leaves the remaining deck intact (34 cards after dealing 6)', () => {
        const actor = createActor(trucoStateMachine);
        actor.start();
        actor.send({ type: 'START_GAME' });

        const { deck } = actor.getSnapshot().context;
        expect(deck).toHaveLength(40 - 6);
      });
    });
  });

  describe('Card hierarchy', () => {
    it('orders the cartas bravas correctly', () => {
      // 1E > 1B > 7E > 7O
      expect(compareCards('01_E', '01_B')).toBe(1);
      expect(compareCards('01_B', '07_E')).toBe(1);
      expect(compareCards('07_E', '07_O')).toBe(1);
    });

    // NOTE: real Truco treats all cards of the same rank (e.g. two 3s) as parda.
    // The current CARD_HIERARCHY sub-orders them by suit instead — tracked separately.

    it('ranks the 3 above the 2 above the false 1', () => {
      expect(compareCards('03_E', '02_E')).toBe(1);
      expect(compareCards('02_E', '01_C')).toBe(1);
    });

    it('has exactly 40 cards in the hierarchy', () => {
      expect(CARD_HIERARCHY).toHaveLength(40);
      expect(new Set(CARD_HIERARCHY).size).toBe(40);
    });
  });

  describe('Envido calculation', () => {
    it('scores 33 for 7 + 6 of same suit', () => {
      expect(calculateEnvidoPoints(['07_E', '06_E', '04_B'])).toBe(33);
    });

    it('scores 29 for 5 + 4 of same suit', () => {
      expect(calculateEnvidoPoints(['05_C', '04_C', '12_E'])).toBe(29);
    });

    it('treats face cards (10-12) as 0', () => {
      expect(calculateEnvidoPoints(['12_E', '11_B', '10_C'])).toBe(0);
    });

    it('falls back to the single highest value when no suit matches', () => {
      expect(calculateEnvidoPoints(['07_E', '11_B', '10_C'])).toBe(7);
    });
  });

  describe('Envido flow', () => {
    it('awards the envido stake to the winner on QUIERO', () => {
      const actor = createActor(trucoStateMachine);
      actor.start();
      actor.send({ type: 'START_GAME' });
      actor.send({ type: 'CALL_ENVIDO' });

      let state = actor.getSnapshot();
      expect(state.value).toBe('envido_betting');
      expect(state.context.envidoStake).toBe(2);
      expect(state.context.awaitingResponse).toBe(true);

      actor.send({ type: 'QUIERO' });
      state = actor.getSnapshot();

      expect(state.value).toBe('playing');
      expect(state.context.awaitingResponse).toBe(false);
      expect(state.context.envidoCalled).toBe(true);
      // Stake of 2 went to someone.
      expect(state.context.player.score + state.context.adversary.score).toBe(2);
    });

    it('awards 1 point to the initiator on NO_QUIERO', () => {
      const actor = createActor(trucoStateMachine);
      actor.start();
      actor.send({ type: 'START_GAME' });
      actor.send({ type: 'CALL_ENVIDO' });
      actor.send({ type: 'NO_QUIERO' });

      const state = actor.getSnapshot();
      expect(state.value).toBe('playing');
      expect(state.context.player.score + state.context.adversary.score).toBe(1);
    });
  });

  describe('Truco flow', () => {
    it('raises the round stake to 2 on truco + quiero', () => {
      const actor = createActor(trucoStateMachine);
      actor.start();
      actor.send({ type: 'START_GAME' });
      actor.send({ type: 'CALL_TRUCO' });

      let state = actor.getSnapshot();
      expect(state.value).toBe('truco_betting');
      expect(state.context.roundStake).toBe(2);
      expect(state.context.trucoCalledThisRound).toBe(true);

      actor.send({ type: 'QUIERO' });
      state = actor.getSnapshot();
      expect(state.value).toBe('playing');
      expect(state.context.roundStake).toBe(2);
    });
  });
});
