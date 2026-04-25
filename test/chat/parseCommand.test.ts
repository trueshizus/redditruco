import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../src/client/chat/parseCommand';

const idle = { value: 'idle', context: {} } as never;
const playing = {
  value: 'playing',
  context: {
    player: { hand: ['01_E', '07_C'] },
    trucoState: 'none',
    awaitingResponse: false,
    trucoHolder: null,
    currentTurn: 0,
  },
} as never;
const trucoBet = {
  value: 'truco_betting',
  context: { trucoState: 'truco', awaitingResponse: true, trucoHolder: null, currentTurn: 0 },
} as never;
const trickDone = { value: 'trick_complete', context: { roundWinner: null } } as never;
const roundDone = { value: 'round_complete', context: { roundWinner: 0 } } as never;

describe('parseCommand', () => {
  it('/start → START_GAME at idle', () => {
    expect(parseCommand('/start', idle)).toEqual({ kind: 'event', event: { type: 'START_GAME' } });
    expect(parseCommand('/empezar', idle)).toEqual({ kind: 'event', event: { type: 'START_GAME' } });
  });

  it('/start at playing → invalid', () => {
    const r = parseCommand('/start', playing);
    expect(r.kind).toBe('invalid');
  });

  it('/play 1e → PLAY_CARD with cardId 01_E', () => {
    expect(parseCommand('/play 1e', playing)).toEqual({
      kind: 'event',
      event: { type: 'PLAY_CARD', cardId: '01_E' },
    });
  });

  it('/play with no arg → invalid hint', () => {
    const r = parseCommand('/play', playing);
    expect(r.kind).toBe('invalid');
  });

  it('/play 99x → invalid hint (unknown card)', () => {
    const r = parseCommand('/play 99x', playing);
    expect(r.kind).toBe('invalid');
  });

  it('/quiero → QUIERO when awaiting response', () => {
    expect(parseCommand('/quiero', trucoBet)).toEqual({ kind: 'event', event: { type: 'QUIERO' } });
    expect(parseCommand('/q', trucoBet)).toEqual({ kind: 'event', event: { type: 'QUIERO' } });
    expect(parseCommand('/si', trucoBet)).toEqual({ kind: 'event', event: { type: 'QUIERO' } });
  });

  it('/noquiero → NO_QUIERO', () => {
    expect(parseCommand('/noquiero', trucoBet)).toEqual({ kind: 'event', event: { type: 'NO_QUIERO' } });
    expect(parseCommand('/no', trucoBet)).toEqual({ kind: 'event', event: { type: 'NO_QUIERO' } });
  });

  it('/quiero retruco → CALL_RETRUCO when in truco_betting', () => {
    expect(parseCommand('/quiero retruco', trucoBet)).toEqual({
      kind: 'event', event: { type: 'CALL_RETRUCO' },
    });
    expect(parseCommand('/retruco', trucoBet)).toEqual({
      kind: 'event', event: { type: 'CALL_RETRUCO' },
    });
  });

  it('/seguir picks CONTINUE in trick_complete', () => {
    expect(parseCommand('/seguir', trickDone)).toEqual({
      kind: 'event', event: { type: 'CONTINUE' },
    });
  });

  it('/seguir picks NEXT_ROUND in round_complete', () => {
    expect(parseCommand('/seguir', roundDone)).toEqual({
      kind: 'event', event: { type: 'NEXT_ROUND' },
    });
  });

  it('/help → kind:help', () => {
    expect(parseCommand('/help', idle).kind).toBe('help');
    expect(parseCommand('/?', idle).kind).toBe('help');
    expect(parseCommand('/ayuda', idle).kind).toBe('help');
  });

  it('/clear → kind:clear', () => {
    expect(parseCommand('/clear', idle)).toEqual({ kind: 'clear' });
  });

  it('free text → kind:banter', () => {
    expect(parseCommand('hola che', playing)).toEqual({ kind: 'banter', text: 'hola che' });
    expect(parseCommand('  uff que mano  ', playing)).toEqual({ kind: 'banter', text: 'uff que mano' });
  });

  it('unknown slash command → kind:invalid', () => {
    const r = parseCommand('/xyzzy', idle);
    expect(r.kind).toBe('invalid');
  });
});
