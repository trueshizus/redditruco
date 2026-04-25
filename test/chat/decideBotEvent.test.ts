import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { trucoStateMachine } from '../../src/shared/truco';
import { decideBotEvent } from '../../src/client/chat/decideBotEvent';

describe('decideBotEvent', () => {
  it('returns null when it is not the bot turn', () => {
    const actor = createActor(trucoStateMachine);
    actor.start();
    actor.send({ type: 'START_GAME' });
    let snap = actor.getSnapshot();
    snap = { ...snap, context: { ...snap.context, currentTurn: 0 } } as never;
    expect(decideBotEvent(snap)).toBeNull();
  });

  it('returns PLAY_CARD when playing and currentTurn is bot', () => {
    const actor = createActor(trucoStateMachine);
    actor.start();
    actor.send({ type: 'START_GAME' });
    const snap = actor.getSnapshot();
    if (snap.context.currentTurn === 1) {
      const ev = decideBotEvent(snap as never);
      expect(ev?.type).toBe('PLAY_CARD');
      expect(typeof (ev as { cardId?: string }).cardId).toBe('string');
    }
  });

  it('returns QUIERO/NO_QUIERO when bot must respond to envido', () => {
    const actor = createActor(trucoStateMachine);
    actor.start();
    actor.send({ type: 'START_GAME' });
    actor.send({ type: 'CALL_ENVIDO' });
    let snap = actor.getSnapshot();
    expect(snap.value).toBe('envido_betting');
    // Simulate the player (index 0) being the one who called envido,
    // so the bot (index 1) is the one awaiting response.
    snap = {
      ...snap,
      context: { ...snap.context, betInitiator: 0, awaitingResponse: true },
    } as never;
    const ev = decideBotEvent(snap);
    expect(['QUIERO', 'NO_QUIERO']).toContain(ev?.type);
  });
});
