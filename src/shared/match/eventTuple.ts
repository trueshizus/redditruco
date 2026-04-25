// Compact encoding of player actions to/from event-log tuples.
// Tuple form: [seq, ts, slot, type, ...payload]

import type { MatchAction, MatchEventTuple, MatchSlot } from './types.js';

export function actionToTuple(
  seq: number,
  ts: number,
  slot: MatchSlot,
  action: MatchAction,
): MatchEventTuple {
  if (action.type === 'PLAY_CARD') {
    return [seq, ts, slot, 'PLAY_CARD', action.cardId];
  }
  return [seq, ts, slot, action.type];
}

export function tupleToAction(tuple: MatchEventTuple): MatchAction {
  const type = tuple[3];
  if (type === 'PLAY_CARD') {
    return { type: 'PLAY_CARD', cardId: tuple[4] };
  }
  return { type };
}

export function tupleSeq(tuple: MatchEventTuple): number {
  return tuple[0];
}

export function tupleSlot(tuple: MatchEventTuple): MatchSlot {
  return tuple[2];
}
