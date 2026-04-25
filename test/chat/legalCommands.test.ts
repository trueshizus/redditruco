import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { trucoStateMachine } from '../../src/machines/truco';
import { legalCommands } from '../../src/client/chat/legalCommands';

function snapshotAt(events: string[]) {
  const actor = createActor(trucoStateMachine);
  actor.start();
  for (const e of events) actor.send({ type: e } as never);
  return actor.getSnapshot();
}

describe('legalCommands', () => {
  it('idle → only /start, /help, /clear', () => {
    const cmds = legalCommands(snapshotAt([]) as never);
    expect(cmds).toContain('start');
    expect(cmds).not.toContain('play');
    expect(cmds).not.toContain('truco');
    expect(cmds).toContain('help');
    expect(cmds).toContain('clear');
  });

  it('playing (after START) includes play, truco, envido, mazo', () => {
    const cmds = legalCommands(snapshotAt(['START_GAME']) as never);
    expect(cmds).toContain('play');
    expect(cmds).toContain('truco');
    expect(cmds).toContain('envido');
    expect(cmds).toContain('mazo');
    expect(cmds).not.toContain('start');
  });

  it('truco_betting includes quiero, noquiero, retruco', () => {
    const cmds = legalCommands(snapshotAt(['START_GAME', 'CALL_TRUCO']) as never);
    expect(cmds).toContain('quiero');
    expect(cmds).toContain('noquiero');
    expect(cmds).toContain('retruco');
  });
});
