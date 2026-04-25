import { compareCards, calculateEnvidoPoints, getCardRank } from '../../shared/truco';

export type EnvidoResponse = 'quiero' | 'no_quiero';
export type TrucoResponse = 'quiero' | 'no_quiero' | 'retruco';

export interface PlayCtx {
  /** The card the opponent led the trick with, or null if we're leading. */
  lead: string | null;
}

export function pickCard(hand: string[], ctx: PlayCtx): string {
  if (hand.length === 0) throw new Error('empty hand');

  if (ctx.lead === null) {
    const sorted = [...hand].sort((a, b) => getCardRank(a) - getCardRank(b));
    const median = sorted[Math.floor(sorted.length / 2)]!;
    return median;
  }

  const winners = hand
    .filter((c) => compareCards(c, ctx.lead!) === 1)
    .sort((a, b) => getCardRank(b) - getCardRank(a));
  if (winners.length > 0) return winners[0]!;

  return [...hand].sort((a, b) => getCardRank(b) - getCardRank(a))[0]!;
}

export function respondToEnvido(hand: string[], proposedStake: number): EnvidoResponse {
  const points = calculateEnvidoPoints(hand);
  if (points >= 28) return 'quiero';
  if (points >= 23 && proposedStake <= 2) return 'quiero';
  return 'no_quiero';
}

export function respondToTruco(
  hand: string[],
  ctx: { trucoState: 'truco' | 'retruco' | 'vale_cuatro' },
): TrucoResponse {
  const strong = hand.filter((c) => getCardRank(c) <= 4).length;

  if (strong === 0) return 'no_quiero';

  if (ctx.trucoState === 'truco') {
    if (strong >= 3) {
      const sumRanks = hand.reduce((s, c) => s + getCardRank(c), 0);
      return sumRanks % 2 === 0 ? 'retruco' : 'quiero';
    }
    return 'quiero';
  }

  if (ctx.trucoState === 'retruco') {
    return strong >= 2 ? 'quiero' : 'no_quiero';
  }

  return strong >= 2 ? 'quiero' : 'no_quiero';
}

export const shouldCallTruco = (): boolean => false;
export const shouldCallEnvido = (): boolean => false;
export const shouldMazo = (): boolean => false;
