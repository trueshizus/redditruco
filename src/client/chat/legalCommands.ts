export type LegalCommand =
  | 'start' | 'play' | 'envido' | 'real' | 'falta'
  | 'truco' | 'retruco' | 'vale4'
  | 'quiero' | 'noquiero' | 'mazo'
  | 'seguir' | 'restart' | 'help' | 'clear';

interface SnapshotLike {
  value: string;
  context: {
    trucoState: 'none' | 'truco' | 'retruco' | 'vale_cuatro';
    awaitingResponse: boolean;
    trucoHolder: number | null;
    currentTurn: number;
  };
}

export function legalCommands(state: SnapshotLike): Set<LegalCommand> {
  const out = new Set<LegalCommand>(['help', 'clear']);
  const v = state.value;
  const c = state.context;

  if (v === 'idle') {
    out.add('start');
    return out;
  }

  if (v === 'game_over') {
    out.add('restart');
    return out;
  }

  if (v === 'trick_complete' || v === 'round_complete') {
    out.add('seguir');
    return out;
  }

  if (v === 'playing') {
    out.add('play');
    out.add('mazo');
    if (c.trucoState === 'none' && !c.awaitingResponse) out.add('truco');
    if (c.trucoState === 'truco' && c.trucoHolder === c.currentTurn) out.add('retruco');
    if (c.trucoState === 'retruco' && c.trucoHolder === c.currentTurn) out.add('vale4');
    out.add('envido');
    out.add('real');
    out.add('falta');
    return out;
  }

  if (v === 'envido_betting' || v === 'truco_betting') {
    out.add('quiero');
    out.add('noquiero');
    if (v === 'truco_betting') {
      if (c.trucoState === 'truco') out.add('retruco');
      if (c.trucoState === 'retruco') out.add('vale4');
      out.add('envido');
      out.add('real');
      out.add('falta');
    }
    out.add('mazo');
    return out;
  }

  return out;
}
