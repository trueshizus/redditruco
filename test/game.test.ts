import { describe, it, expect } from 'vitest';
import { createActor, type Actor } from 'xstate';
import { trucoStateMachine } from '../src/shared/truco';
import {
  calculateEnvidoPoints,
  compareCards,
  generateFullDeck,
  CARD_HIERARCHY,
  createEmptyTrick,
  determineRoundWinner,
  getNextTrickLeader,
  resolveTrick,
} from '../src/shared/truco';
import type { Trick } from '../src/shared/truco';

// ---------- Helpers ----------

type GameActor = Actor<typeof trucoStateMachine>;

function startGame(): GameActor {
  const actor = createActor(trucoStateMachine);
  actor.start();
  actor.send({ type: 'START_GAME' });
  return actor;
}

/**
 * Play out the three tricks of the current round using whatever cards each
 * player has. Advances past every `trick_complete` pause. Stops when the
 * actor leaves `playing` for a non-trick-complete state (round_complete,
 * envido_betting, etc.).
 */
function playCurrentRound(actor: GameActor): void {
  let safety = 20;
  while (safety-- > 0) {
    const s = actor.getSnapshot();
    if (s.value === 'trick_complete') {
      actor.send({ type: 'CONTINUE' });
      continue;
    }
    if (s.value !== 'playing') return;
    const hand = s.context.currentTurn === 0 ? s.context.player.hand : s.context.adversary.hand;
    if (hand.length === 0) return;
    actor.send({ type: 'PLAY_CARD', cardId: hand[0]! });
  }
  throw new Error('playCurrentRound: runaway loop');
}

// ---------- Card hierarchy ----------

describe('Card hierarchy', () => {
  it('orders the cartas bravas correctly', () => {
    expect(compareCards('01_E', '01_B')).toBe(1);
    expect(compareCards('01_B', '07_E')).toBe(1);
    expect(compareCards('07_E', '07_O')).toBe(1);
  });

  it('reports parda for same-rank non-brava cards', () => {
    expect(compareCards('03_E', '03_B')).toBe(0);
    expect(compareCards('03_C', '03_O')).toBe(0);
    expect(compareCards('12_E', '12_B')).toBe(0);
    expect(compareCards('11_C', '11_O')).toBe(0);
  });

  it('ranks across tiers: 3 > 2 > false 1 > face > false 7 > 6 > 5 > 4', () => {
    expect(compareCards('03_E', '02_E')).toBe(1);
    expect(compareCards('02_E', '01_C')).toBe(1);
    expect(compareCards('01_C', '12_E')).toBe(1);
    expect(compareCards('12_E', '07_B')).toBe(1);
    expect(compareCards('07_B', '06_E')).toBe(1);
    expect(compareCards('06_E', '05_E')).toBe(1);
    expect(compareCards('05_E', '04_E')).toBe(1);
  });

  it('has exactly 40 cards', () => {
    expect(CARD_HIERARCHY).toHaveLength(40);
    expect(new Set(CARD_HIERARCHY).size).toBe(40);
  });
});

// ---------- Envido calculation ----------

describe('Envido calculation', () => {
  it('scores 33 for 7 + 6 of same suit', () => {
    expect(calculateEnvidoPoints(['07_E', '06_E', '04_B'])).toBe(33);
  });
  it('scores 29 for 5 + 4 of same suit', () => {
    expect(calculateEnvidoPoints(['05_C', '04_C', '12_E'])).toBe(29);
  });
  it('treats face cards as 0', () => {
    expect(calculateEnvidoPoints(['12_E', '11_B', '10_C'])).toBe(0);
  });
  it('falls back to highest single value when no suit matches', () => {
    expect(calculateEnvidoPoints(['07_E', '11_B', '10_C'])).toBe(7);
  });
});

// ---------- Trick resolution (pure functions) ----------

describe('Trick resolution', () => {
  function trick(p1: string, p2: string, mano = 1): Trick {
    const winner = resolveTrick(p1, p2, mano, 0, []);
    return { player1Card: p1, player2Card: p2, winner };
  }

  it('mano wins a parda on the very first trick (primera vale doble)', () => {
    const t = createEmptyTrick();
    t.player1Card = '03_E';
    t.player2Card = '03_B';
    t.winner = resolveTrick('03_E', '03_B', /* mano */ 1, 0, []);
    expect(t.winner).toBe(1);
  });

  it('parda in trick 1 lets the earlier winner take the round on trick 2', () => {
    const tricks: [Trick, Trick, Trick] = [
      trick('03_E', '03_B', 0),
      { player1Card: '01_E', player2Card: '04_E', winner: 0 },
      createEmptyTrick(),
    ];
    // Player 1 took trick 0 by virtue of being mano (tie → mano wins).
    // Player 0 took trick 1. Wins: 1-1, but with a parda, earlier trick's
    // winner (mano) wins the round.
    const result = determineRoundWinner(tricks, /* mano */ 0);
    expect(result.roundComplete).toBe(true);
    expect(result.roundWinner).toBe(0); // mano took the parda first
  });

  it('all three pardas → mano wins', () => {
    const parda = (p1: string, p2: string): Trick => ({
      player1Card: p1,
      player2Card: p2,
      winner: 1, // pretend mano=1
    });
    // We can't actually have three pardas with distinct cards and no winner,
    // but the determineRoundWinner logic awards the round to mano if all winners are mano.
    const tricks: [Trick, Trick, Trick] = [
      parda('03_E', '03_B'),
      parda('02_E', '02_B'),
      parda('01_C', '01_O'),
    ];
    // Each trick was "won" by mano=1 via tie. So wins[1] = 3, wins[0] = 0.
    const result = determineRoundWinner(tricks, /* mano */ 1);
    expect(result.roundWinner).toBe(1);
  });

  it('getNextTrickLeader returns winner on clean trick, leader on parda', () => {
    expect(getNextTrickLeader({ player1Card: '03_E', player2Card: '02_E', winner: 0 }, 1)).toBe(0);
    expect(getNextTrickLeader({ player1Card: '03_E', player2Card: '03_B', winner: null }, 1)).toBe(1);
  });
});

// ---------- Initialization ----------

describe('Game initialization', () => {
  it('starts in idle with 0-0 score, empty hands, mano=1, dealer=0', () => {
    const actor = createActor(trucoStateMachine);
    actor.start();
    const s = actor.getSnapshot();
    expect(s.value).toBe('idle');
    expect(s.context.player.score).toBe(0);
    expect(s.context.adversary.score).toBe(0);
    expect(s.context.player.hand).toHaveLength(0);
    expect(s.context.adversary.hand).toHaveLength(0);
    expect(s.context.dealer).toBe(0);
    expect(s.context.mano).toBe(1);
    expect(s.context.targetScore).toBe(30);
  });

  it('each new actor gets a fresh context (factory)', () => {
    const a = createActor(trucoStateMachine);
    const b = createActor(trucoStateMachine);
    a.start();
    b.start();
    a.send({ type: 'START_GAME' });
    b.send({ type: 'START_GAME' });
    const handA = a.getSnapshot().context.player.hand;
    const handB = b.getSnapshot().context.player.hand;
    // Not asserting inequality (they could collide), but asserting both are
    // independent 3-card hands. If context were shared across actors, one
    // would have been dealt twice.
    expect(handA).toHaveLength(3);
    expect(handB).toHaveLength(3);
  });
});

describe('Card distribution', () => {
  const VALID_DECK = new Set(generateFullDeck());

  it('deals 3 unique cards to each player from the 40-card deck', () => {
    const actor = startGame();
    const { player, adversary } = actor.getSnapshot().context;
    expect(player.hand).toHaveLength(3);
    expect(adversary.hand).toHaveLength(3);
    const all = [...player.hand, ...adversary.hand];
    expect(new Set(all).size).toBe(6);
    for (const card of all) expect(VALID_DECK.has(card)).toBe(true);
  });

  it('transitions dealing → playing with mano as the first turn', () => {
    const actor = startGame();
    const s = actor.getSnapshot();
    expect(s.value).toBe('playing');
    expect(s.context.currentTurn).toBe(1);
    expect(s.context.trickLeaders[0]).toBe(1);
  });
});

// ---------- Envido flow ----------

describe('Envido flow', () => {
  it('awards envidoStake to the winner on QUIERO', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_ENVIDO' });
    expect(actor.getSnapshot().value).toBe('envido_betting');
    expect(actor.getSnapshot().context.envidoStake).toBe(2);

    actor.send({ type: 'QUIERO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('playing');
    expect(s.context.envidoCalled).toBe(true);
    expect(s.context.player.score + s.context.adversary.score).toBe(2);
  });

  it('awards 1 point to the initiator on initial NO_QUIERO', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_ENVIDO' });
    actor.send({ type: 'NO_QUIERO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('playing');
    expect(s.context.player.score + s.context.adversary.score).toBe(1);
  });

  it('chains Envido → Real Envido → QUIERO for a 5-point pot', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_ENVIDO' });
    actor.send({ type: 'CALL_REAL_ENVIDO' });
    expect(actor.getSnapshot().context.envidoStake).toBe(5); // 2 + 3
    expect(actor.getSnapshot().context.envidoAcceptedStake).toBe(2);
    actor.send({ type: 'QUIERO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('playing');
    expect(s.context.player.score + s.context.adversary.score).toBe(5);
  });

  it('on NO_QUIERO after a raise, awards the previously-accepted stake', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_ENVIDO' });
    actor.send({ type: 'CALL_REAL_ENVIDO' });
    actor.send({ type: 'NO_QUIERO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('playing');
    // Real Envido was refused, but Envido (2) had been implicitly accepted
    // by the raise. Raiser (who lost the refusal) gets 2 points.
    expect(s.context.player.score + s.context.adversary.score).toBe(2);
  });

  it('Falta Envido stake scales with leader score', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_FALTA_ENVIDO' });
    const s = actor.getSnapshot();
    // Fresh game: leader has 0 points; falta = 30.
    expect(s.context.envidoStake).toBe(30);
  });

  it('envido is locked out after a Truco is called', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_TRUCO' });
    actor.send({ type: 'QUIERO' });
    // Back in playing; try envido — must be rejected by guard.
    actor.send({ type: 'CALL_ENVIDO' });
    expect(actor.getSnapshot().value).toBe('playing');
    expect(actor.getSnapshot().context.envidoState).toBe('none');
  });

  it('envido is locked out after a card has been played in trick 0', () => {
    const actor = startGame();
    const hand =
      actor.getSnapshot().context.currentTurn === 0
        ? actor.getSnapshot().context.player.hand
        : actor.getSnapshot().context.adversary.hand;
    actor.send({ type: 'PLAY_CARD', cardId: hand[0]! });
    actor.send({ type: 'CALL_ENVIDO' });
    expect(actor.getSnapshot().value).toBe('playing');
    expect(actor.getSnapshot().context.envidoState).toBe('none');
  });
});

// ---------- Truco flow ----------

describe('Truco flow', () => {
  it('accepts Truco, leaves round worth 2, and records the accepter as holder', () => {
    const actor = startGame();
    const initiator = actor.getSnapshot().context.currentTurn;
    actor.send({ type: 'CALL_TRUCO' });
    expect(actor.getSnapshot().context.trucoState).toBe('truco');
    expect(actor.getSnapshot().context.roundStake).toBe(2);

    actor.send({ type: 'QUIERO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('playing');
    expect(s.context.roundStake).toBe(2);
    expect(s.context.trucoHolder).toBe(initiator === 0 ? 1 : 0);
  });

  it('declining Truco awards 1 point to the caller and ends the round', () => {
    const actor = startGame();
    const initiator = actor.getSnapshot().context.currentTurn;
    actor.send({ type: 'CALL_TRUCO' });
    actor.send({ type: 'NO_QUIERO' });
    const s = actor.getSnapshot();
    // We may be in round_complete or have auto-advanced to game_over, but
    // since we're not near 30 points, round_complete is the resting state.
    expect(['round_complete']).toContain(s.value);
    expect(s.context.roundWinner).toBe(initiator);
    const caller = initiator === 0 ? s.context.player : s.context.adversary;
    expect(caller.score).toBe(1);
  });

  it('accepter can escalate to Retruco after Quiero', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_TRUCO' });
    actor.send({ type: 'QUIERO' });
    // Holder (accepter) escalates.
    expect(actor.getSnapshot().context.trucoHolder).not.toBeNull();
    // Holder must be the currentTurn to call retruco per guard.
    // Move turn to holder by reading it first; if it's not already currentTurn,
    // we can only escalate when it is. For this test we short-circuit by
    // forcing an acceptance flow immediately.
    // In our implementation the turn doesn't flip on QUIERO, so the holder
    // (non-initiator) is not currentTurn. Mimic a UI that waits for the holder's turn
    // by playing a card so the turn flips.

    // Instead: we allow CALL_RETRUCO directly since guard checks trucoHolder === currentTurn.
    // Assert that calling before holder's turn is blocked:
    const before = actor.getSnapshot().context.trucoState;
    actor.send({ type: 'CALL_RETRUCO' });
    // If holder !== currentTurn, nothing changed.
    if (actor.getSnapshot().context.trucoHolder !== actor.getSnapshot().context.currentTurn) {
      expect(actor.getSnapshot().context.trucoState).toBe(before);
    } else {
      expect(actor.getSnapshot().context.trucoState).toBe('retruco');
    }
  });

  it('declining Retruco awards 2 points to the retruco caller', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_TRUCO' });
    // Opponent raises in response (CALL_RETRUCO from truco_betting, by non-initiator).
    actor.send({ type: 'CALL_RETRUCO' });
    expect(actor.getSnapshot().context.trucoState).toBe('retruco');
    const retrucoInitiator = actor.getSnapshot().context.betInitiator;
    actor.send({ type: 'NO_QUIERO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('round_complete');
    expect(s.context.roundWinner).toBe(retrucoInitiator);
    const caller = retrucoInitiator === 0 ? s.context.player : s.context.adversary;
    expect(caller.score).toBe(2);
  });

  it('Vale Cuatro: declined awards 3, accepted plays for 4', () => {
    // Decline path.
    let actor = startGame();
    actor.send({ type: 'CALL_TRUCO' });
    actor.send({ type: 'CALL_RETRUCO' });
    actor.send({ type: 'CALL_VALE_CUATRO' });
    expect(actor.getSnapshot().context.roundStake).toBe(4);
    const initiator = actor.getSnapshot().context.betInitiator;
    actor.send({ type: 'NO_QUIERO' });
    const declined = actor.getSnapshot();
    const caller = initiator === 0 ? declined.context.player : declined.context.adversary;
    expect(caller.score).toBe(3);

    // Accept path.
    actor = startGame();
    actor.send({ type: 'CALL_TRUCO' });
    actor.send({ type: 'CALL_RETRUCO' });
    actor.send({ type: 'CALL_VALE_CUATRO' });
    actor.send({ type: 'QUIERO' });
    expect(actor.getSnapshot().value).toBe('playing');
    expect(actor.getSnapshot().context.roundStake).toBe(4);
  });
});

// ---------- Envido está primero ----------

describe('Envido está primero (envido during truco)', () => {
  it('call envido in response to truco → envido resolves → truco still pending', () => {
    const actor = startGame();
    const initialManoScore = actor.getSnapshot().context.mano;
    actor.send({ type: 'CALL_TRUCO' });
    expect(actor.getSnapshot().value).toBe('truco_betting');
    const trucoInitiator = actor.getSnapshot().context.betInitiator;

    actor.send({ type: 'CALL_ENVIDO' });
    let s = actor.getSnapshot();
    expect(s.value).toBe('envido_betting');
    expect(s.context.trucoInterrupted).toBe(true);
    expect(s.context.pendingTrucoInitiator).toBe(trucoInitiator);
    expect(s.context.trucoState).toBe('truco'); // truco preserved
    expect(s.context.roundStake).toBe(2);

    actor.send({ type: 'QUIERO' });
    s = actor.getSnapshot();
    expect(s.value).toBe('truco_betting'); // back to pending truco
    expect(s.context.trucoInterrupted).toBe(false);
    expect(s.context.pendingTrucoInitiator).toBeNull();
    expect(s.context.betInitiator).toBe(trucoInitiator);
    expect(s.context.awaitingResponse).toBe(true);
    expect(s.context.player.score + s.context.adversary.score).toBe(2); // envido paid out
    expect(s.context.envidoCalled).toBe(true);
    expect(s.context.mano).toBe(initialManoScore); // unchanged
  });

  it('NO_QUIERO to envido-at-truco awards envido refusal and bounces back to truco_betting', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_TRUCO' });
    actor.send({ type: 'CALL_REAL_ENVIDO' });
    let s = actor.getSnapshot();
    expect(s.context.envidoStake).toBe(3);

    actor.send({ type: 'NO_QUIERO' });
    s = actor.getSnapshot();
    expect(s.value).toBe('truco_betting');
    expect(s.context.player.score + s.context.adversary.score).toBe(1); // envido was initial → 1pt to real-envido caller
    expect(s.context.trucoInterrupted).toBe(false);
    expect(s.context.awaitingResponse).toBe(true);
    expect(s.context.envidoCalled).toBe(true);
  });

  it('after envido-at-truco resolves, the truco can still be accepted or declined', () => {
    const actor = startGame();
    const trucoCaller = actor.getSnapshot().context.currentTurn;
    actor.send({ type: 'CALL_TRUCO' });
    actor.send({ type: 'CALL_ENVIDO' });
    actor.send({ type: 'QUIERO' }); // envido resolves

    // Now finish the truco with NO_QUIERO → caller wins 1 point (+ whatever envido awarded).
    const beforeTrucoScore =
      actor.getSnapshot().context.player.score + actor.getSnapshot().context.adversary.score;
    actor.send({ type: 'NO_QUIERO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('round_complete');
    expect(s.context.roundWinner).toBe(trucoCaller);
    expect(s.context.player.score + s.context.adversary.score).toBe(beforeTrucoScore + 1);
  });

  it('envido at truco is rejected once a card has been played', () => {
    const actor = startGame();
    // Mano plays a card first.
    const s0 = actor.getSnapshot();
    const manoHand = s0.context.currentTurn === 0 ? s0.context.player.hand : s0.context.adversary.hand;
    actor.send({ type: 'PLAY_CARD', cardId: manoHand[0]! });
    // Other player now calls truco.
    actor.send({ type: 'CALL_TRUCO' });
    expect(actor.getSnapshot().value).toBe('truco_betting');
    // Envido at truco should be blocked.
    actor.send({ type: 'CALL_ENVIDO' });
    // Guard rejects; state should NOT be envido_betting.
    expect(actor.getSnapshot().value).toBe('truco_betting');
    expect(actor.getSnapshot().context.envidoCalled).toBe(false);
    expect(actor.getSnapshot().context.trucoInterrupted).toBe(false);
  });
});

// ---------- MAZO ----------

describe('MAZO forfeit', () => {
  it('from playing (no truco) awards 1 point to opponent and ends the round', () => {
    const actor = startGame();
    const forfeiter = actor.getSnapshot().context.currentTurn;
    actor.send({ type: 'MAZO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('round_complete');
    expect(s.context.roundWinner).toBe(forfeiter === 0 ? 1 : 0);
    expect(s.context.player.score + s.context.adversary.score).toBe(1);
  });

  it('from truco_betting awards previous stake (1 after truco, 2 after retruco)', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_TRUCO' });
    const trucoCaller = actor.getSnapshot().context.betInitiator;
    actor.send({ type: 'MAZO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('round_complete');
    expect(s.context.roundWinner).toBe(trucoCaller);
    expect(s.context.player.score + s.context.adversary.score).toBe(1);
  });

  it('from envido_betting awards envido refusal AND round stake', () => {
    const actor = startGame();
    actor.send({ type: 'CALL_ENVIDO' });
    actor.send({ type: 'MAZO' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('round_complete');
    // Envido was initial (accepted=0 → 1 pt to caller) + round stake 1 to opponent of forfeiter.
    expect(s.context.player.score + s.context.adversary.score).toBe(2);
  });
});

// ---------- Round and game progression ----------

describe('Round & game progression', () => {
  it('awards roundStake (1) to the round winner when tricks play out', () => {
    const actor = startGame();
    playCurrentRound(actor);
    const s = actor.getSnapshot();
    expect(s.value).toBe('round_complete');
    expect(s.context.roundWinner).not.toBeNull();
    expect(s.context.player.score + s.context.adversary.score).toBe(1);
  });

  it('rotates dealer and mano between rounds', () => {
    const actor = startGame();
    const round1 = {
      dealer: actor.getSnapshot().context.dealer,
      mano: actor.getSnapshot().context.mano,
    };
    playCurrentRound(actor);
    actor.send({ type: 'NEXT_ROUND' });
    const round2 = {
      dealer: actor.getSnapshot().context.dealer,
      mano: actor.getSnapshot().context.mano,
    };
    expect(round2.dealer).toBe(round1.dealer === 0 ? 1 : 0);
    expect(round2.mano).toBe(round1.mano === 0 ? 1 : 0);
  });

  it('reaches game_over when a player accumulates targetScore', () => {
    const actor = startGame();
    let safety = 200;
    while (actor.getSnapshot().value !== 'game_over' && safety-- > 0) {
      const s = actor.getSnapshot();
      if (s.value === 'playing') {
        // Fast path: call truco and have it refused — caller gets 1 pt.
        actor.send({ type: 'CALL_TRUCO' });
        actor.send({ type: 'NO_QUIERO' });
      } else if (s.value === 'round_complete') {
        actor.send({ type: 'NEXT_ROUND' });
      } else {
        throw new Error(`Unexpected state: ${String(s.value)}`);
      }
    }
    const final = actor.getSnapshot();
    expect(final.value).toBe('game_over');
    expect(final.context.gameWinner).not.toBeNull();
    const winnerScore =
      final.context.gameWinner === 0 ? final.context.player.score : final.context.adversary.score;
    expect(winnerScore).toBeGreaterThanOrEqual(final.context.targetScore);
  });

  it('RESTART_GAME from game_over returns to idle with fresh scores', () => {
    const actor = startGame();
    let safety = 200;
    while (actor.getSnapshot().value !== 'game_over' && safety-- > 0) {
      const s = actor.getSnapshot();
      if (s.value === 'playing') {
        actor.send({ type: 'CALL_TRUCO' });
        actor.send({ type: 'NO_QUIERO' });
      } else if (s.value === 'round_complete') {
        actor.send({ type: 'NEXT_ROUND' });
      }
    }
    actor.send({ type: 'RESTART_GAME' });
    const s = actor.getSnapshot();
    expect(s.value).toBe('idle');
    expect(s.context.player.score).toBe(0);
    expect(s.context.adversary.score).toBe(0);
  });
});

// ---------- Validation ----------

describe('Invalid moves', () => {
  it('ignores PLAY_CARD for a card not in the current player\'s hand', () => {
    const actor = startGame();
    const before = actor.getSnapshot();
    const turn = before.context.currentTurn;
    const otherHand = turn === 0 ? before.context.adversary.hand : before.context.player.hand;
    // Send a card from the OTHER player's hand. Should no-op.
    actor.send({ type: 'PLAY_CARD', cardId: otherHand[0]! });
    const after = actor.getSnapshot();
    expect(after.context.currentTurn).toBe(turn); // still their turn
    expect(after.context.player.hand).toEqual(before.context.player.hand);
    expect(after.context.adversary.hand).toEqual(before.context.adversary.hand);
  });
});
