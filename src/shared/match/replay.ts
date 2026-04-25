// Rebuild a match snapshot from an initial state + sequence of events.
// Used for: replay viewer, recovery from snapshot loss, and tests.

import { applyAction, initMatchSnapshot } from './applyAction.js';
import { tupleToAction } from './eventTuple.js';
import type { MatchEventTuple, PersistedMatchSnapshot } from './types.js';

export type ReplayResult = {
  snapshot: PersistedMatchSnapshot;
  appliedCount: number;
  /** First event seq that failed to apply, if any. Subsequent events are skipped. */
  failedAt: number | null;
  failureReason: string | null;
};

export function replayEvents(opts: {
  matchId: string;
  p1Name: string;
  p2Name: string;
  events: MatchEventTuple[];
}): ReplayResult {
  let { snapshot } = initMatchSnapshot({
    matchId: opts.matchId,
    p1Name: opts.p1Name,
    p2Name: opts.p2Name,
  });

  let applied = 0;
  for (const tuple of opts.events) {
    const slot = tuple[2];
    const action = tupleToAction(tuple);
    const result = applyAction(snapshot, slot, action);
    if (!result.ok) {
      return {
        snapshot,
        appliedCount: applied,
        failedAt: tuple[0],
        failureReason: result.reason,
      };
    }
    snapshot = result.snapshot;
    applied += 1;
  }

  return { snapshot, appliedCount: applied, failedAt: null, failureReason: null };
}
