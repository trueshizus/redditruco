// Card hierarchy and rules for Argentine Truco.
//
// Only the four cartas bravas have a suit-distinguishing order:
//   As de Espadas (01_E) > As de Bastos (01_B) > 7 de Espadas (07_E) > 7 de Oros (07_O)
// Everything below that is ranked by face value only — all cards of the same
// rank tie (parda), regardless of suit.
import type { Card } from './types.js';

// Map card → rank. Lower rank = stronger card. Cards sharing a rank are parda.
const CARD_RANK: Record<Card, number> = {
  // Cartas bravas — unique ranks.
  '01_E': 0,
  '01_B': 1,
  '07_E': 2,
  '07_O': 3,

  // Tres.
  '03_E': 4, '03_B': 4, '03_C': 4, '03_O': 4,
  // Dos.
  '02_E': 5, '02_B': 5, '02_C': 5, '02_O': 5,
  // Ases falsos (the two remaining aces after the bravas).
  '01_C': 6, '01_O': 6,
  // Reyes.
  '12_E': 7, '12_B': 7, '12_C': 7, '12_O': 7,
  // Caballos.
  '11_E': 8, '11_B': 8, '11_C': 8, '11_O': 8,
  // Sotas.
  '10_E': 9, '10_B': 9, '10_C': 9, '10_O': 9,
  // Sietes falsos (the two 7s that aren't bravas).
  '07_B': 10, '07_C': 10,
  // Seis.
  '06_E': 11, '06_B': 11, '06_C': 11, '06_O': 11,
  // Cincos.
  '05_E': 12, '05_B': 12, '05_C': 12, '05_O': 12,
  // Cuatros.
  '04_E': 13, '04_B': 13, '04_C': 13, '04_O': 13,
};

// A canonical, strongest-first listing. Useful for UI and range checks.
// Duplicate ranks produce stable ordering by suit only for display purposes;
// do NOT use index-of into this array for strength comparison — use compareCards.
export const CARD_HIERARCHY: Card[] = Object.entries(CARD_RANK)
  .sort(([, a], [, b]) => a - b)
  .map(([card]) => card);

/**
 * Compare two cards under Argentine Truco rules.
 * Returns 1 if card1 wins, -1 if card2 wins, 0 if parda (tie).
 */
export function compareCards(card1: Card, card2: Card): 1 | -1 | 0 {
  const r1 = CARD_RANK[card1];
  const r2 = CARD_RANK[card2];
  if (r1 === undefined) throw new Error(`Unknown card: ${card1}`);
  if (r2 === undefined) throw new Error(`Unknown card: ${card2}`);
  if (r1 < r2) return 1;
  if (r1 > r2) return -1;
  return 0;
}

/**
 * Card value for envido: face value for 1–7, 0 for face cards (10/11/12).
 */
export function getCardValue(card: Card): number {
  const value = card.split('_')[0];
  if (!value) throw new Error(`Invalid card format: ${card}`);

  const numValue = parseInt(value, 10);
  if (numValue >= 10) return 0;
  return numValue;
}

/**
 * Suit component of a card ("E", "B", "C", "O").
 */
export function getCardSuit(card: Card): string {
  const suit = card.split('_')[1];
  if (!suit) throw new Error(`Invalid card format: ${card}`);
  return suit;
}

export function isCartaBrava(card: Card): boolean {
  return card === '01_E' || card === '01_B' || card === '07_E' || card === '07_O';
}

/**
 * Numeric rank (0 = strongest). Ties are returned when cards share a rank.
 */
export function getCardRank(card: Card): number {
  const rank = CARD_RANK[card];
  if (rank === undefined) throw new Error(`Card not found in hierarchy: ${card}`);
  return rank;
}

export function isValidCard(card: string): card is Card {
  return card in CARD_RANK;
}
