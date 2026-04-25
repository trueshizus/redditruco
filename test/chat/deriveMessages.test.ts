import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { trucoStateMachine } from '../../src/machines/truco';
import { deriveMessages } from '../../src/client/chat/deriveMessages';

function snapshotsAfter(events: string[]) {
  const actor = createActor(trucoStateMachine);
  actor.start();
  const out = [actor.getSnapshot()];
  for (const e of events) {
    actor.send({ type: e } as never);
    out.push(actor.getSnapshot());
  }
  return out;
}

describe('deriveMessages', () => {
  it('emits topic + system messages on idle → playing transition', () => {
    const [prev, curr] = snapshotsAfter(['START_GAME']);
    const msgs = deriveMessages(prev as never, curr as never, 1);
    const kinds = msgs.map((m) => m.kind);
    expect(kinds).toContain('system');
    expect(msgs.some((m) => m.kind === 'system' && /empezó/.test(m.text))).toBe(true);
  });

  it('emits a card-played message when a card lands on the board', () => {
    const actor = createActor(trucoStateMachine);
    actor.start();
    actor.send({ type: 'START_GAME' });
    const before = actor.getSnapshot();
    const ctx = before.context;
    const hand = ctx.currentTurn === 0 ? ctx.player.hand : ctx.adversary.hand;
    const cardId = hand[0]!;
    actor.send({ type: 'PLAY_CARD', cardId });
    const after = actor.getSnapshot();
    const msgs = deriveMessages(before as never, after as never, 1);
    expect(msgs.some((m) => m.kind === 'card-played' && m.cardId === cardId)).toBe(true);
  });

  it('emits a bet-called message when truco fires', () => {
    const actor = createActor(trucoStateMachine);
    actor.start();
    actor.send({ type: 'START_GAME' });
    const before = actor.getSnapshot();
    actor.send({ type: 'CALL_TRUCO' });
    const after = actor.getSnapshot();
    const msgs = deriveMessages(before as never, after as never, 1);
    expect(msgs.some((m) => m.kind === 'bet-called' && m.bet === 'truco')).toBe(true);
  });
});
