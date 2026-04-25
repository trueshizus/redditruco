import type { TrucoSnapshot } from './types-state';
import { parseCardArg } from './cardGlyph';
import { legalCommands, type LegalCommand } from './legalCommands';

export type ParseResult =
  | { kind: 'event'; event: { type: string; cardId?: string } }
  | { kind: 'banter'; text: string }
  | { kind: 'help'; topic?: string }
  | { kind: 'clear' }
  | { kind: 'invalid'; reason: string };

const ALIASES: Record<string, LegalCommand> = {
  start: 'start', empezar: 'start',
  play: 'play', p: 'play', jugar: 'play',
  envido: 'envido',
  real: 'real', realenvido: 'real',
  falta: 'falta', faltaenvido: 'falta',
  truco: 'truco',
  retruco: 'retruco',
  vale4: 'vale4', valecuatro: 'vale4',
  quiero: 'quiero', q: 'quiero', si: 'quiero',
  noquiero: 'noquiero', nq: 'noquiero', no: 'noquiero',
  mazo: 'mazo', m: 'mazo', mevoy: 'mazo',
  seguir: 'seguir', next: 'seguir', continuar: 'seguir',
  restart: 'restart',
  help: 'help', '?': 'help', ayuda: 'help',
  clear: 'clear',
};

const COMMAND_TO_EVENT: Record<Exclude<LegalCommand, 'play' | 'seguir' | 'help' | 'clear'>, string> = {
  start: 'START_GAME',
  envido: 'CALL_ENVIDO',
  real: 'CALL_REAL_ENVIDO',
  falta: 'CALL_FALTA_ENVIDO',
  truco: 'CALL_TRUCO',
  retruco: 'CALL_RETRUCO',
  vale4: 'CALL_VALE_CUATRO',
  quiero: 'QUIERO',
  noquiero: 'NO_QUIERO',
  mazo: 'MAZO',
  restart: 'RESTART_GAME',
};

export function parseCommand(rawInput: string, state: TrucoSnapshot): ParseResult {
  const input = rawInput.trim();
  if (!input) return { kind: 'banter', text: '' };

  if (!input.startsWith('/')) {
    return { kind: 'banter', text: input };
  }

  const stripped = input.slice(1).trim();
  const lower = stripped.toLowerCase();

  if (lower === 'quiero retruco') {
    return resolveCommand('retruco', '', state);
  }
  if (lower === 'quiero valecuatro' || lower === 'quiero vale4' || lower === 'quiero vale cuatro') {
    return resolveCommand('vale4', '', state);
  }
  if (lower === 'jugar otra' || lower === 'jugar de nuevo') {
    return resolveCommand('restart', '', state);
  }

  const [head, ...rest] = lower.split(/\s+/);
  const argText = rest.join(' ').trim();
  const canonical = ALIASES[head!];

  if (!canonical) {
    return { kind: 'invalid', reason: `comando desconocido: /${head} — probá /help` };
  }

  return resolveCommand(canonical, argText, state);
}

function resolveCommand(cmd: LegalCommand, argText: string, state: TrucoSnapshot): ParseResult {
  if (cmd === 'help') return { kind: 'help' };
  if (cmd === 'clear') return { kind: 'clear' };

  const allowed = legalCommands(state as never);
  if (!allowed.has(cmd)) {
    return { kind: 'invalid', reason: `no podés usar /${cmd} en este momento` };
  }

  if (cmd === 'play') {
    if (!argText) return { kind: 'invalid', reason: 'usá: /play <carta>, ej. /play 1e' };
    const cardId = parseCardArg(argText);
    if (!cardId) return { kind: 'invalid', reason: `no entiendo la carta "${argText}"` };
    return { kind: 'event', event: { type: 'PLAY_CARD', cardId } };
  }

  if (cmd === 'seguir') {
    const eventType = state.value === 'round_complete' ? 'NEXT_ROUND' : 'CONTINUE';
    return { kind: 'event', event: { type: eventType } };
  }

  return { kind: 'event', event: { type: COMMAND_TO_EVENT[cmd as Exclude<LegalCommand, 'play' | 'seguir' | 'help' | 'clear'>] } };
}
