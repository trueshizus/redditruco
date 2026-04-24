// Card hierarchy and rules for Argentinian Truco
import type { Card } from './types.js';

// Truco card hierarchy (highest to lowest) according to PDF specification
// The four top cards (cartas bravas) in descending order are:
// 1♠ (Ace of Swords), 1♣ (Ace of Clubs), 7♠ (7 of Swords), 7♦ (7 of Coins)
// Then: 3, 2, 1♥/♦ (false aces), 12 (King), 11 (Knight), 10 (Jack), 7♥/♣ (false 7s), 6, 5, 4
export const CARD_HIERARCHY: Card[] = [
  // Cartas bravas (top 4 cards)
  '01_E', // 1♠ - Ace of Swords (highest)
  '01_B', // 1♣ - Ace of Clubs  
  '07_E', // 7♠ - 7 of Swords
  '07_O', // 7♦ - 7 of Coins
  
  // Regular cards (highest to lowest)
  '03_E', '03_B', '03_C', '03_O', // Tres (3s)
  '02_E', '02_B', '02_C', '02_O', // Dos (2s)
  '01_C', '01_O', // Ace of Cups/Coins (false aces)
  '12_E', '12_B', '12_C', '12_O', // Rey (Kings)
  '11_E', '11_B', '11_C', '11_O', // Caballo (Knights)
  '10_E', '10_B', '10_C', '10_O', // Sota (Jacks)
  '07_B', '07_C', // 7 of Clubs/Cups (false 7s)
  '06_E', '06_B', '06_C', '06_O', // Seis (6s)
  '05_E', '05_B', '05_C', '05_O', // Cinco (5s)
  '04_E', '04_B', '04_C', '04_O', // Cuatro (4s) - lowest
];

/**
 * Compare two cards according to Truco rules
 * @param card1 First card
 * @param card2 Second card
 * @returns 1 if card1 wins, -1 if card2 wins, 0 if tie (parda)
 */
export function compareCards(card1: Card, card2: Card): number {
  const index1 = CARD_HIERARCHY.indexOf(card1);
  const index2 = CARD_HIERARCHY.indexOf(card2);
  
  // Lower index = higher value in hierarchy
  if (index1 < index2) return 1; // card1 wins
  if (index1 > index2) return -1; // card2 wins
  return 0; // tie (parda)
}

/**
 * Extract card value (number) from card string
 * Used for envido calculations
 */
export function getCardValue(card: Card): number {
  const value = card.split('_')[0];
  if (!value) throw new Error(`Invalid card format: ${card}`);
  
  const numValue = parseInt(value, 10);
  
  // Face cards (10, 11, 12) = 0 points for Envido
  if (numValue >= 10) return 0;
  
  // Cards 1-7 have face value for Envido
  return numValue;
}

/**
 * Extract card suit from card string
 */
export function getCardSuit(card: Card): string {
  const suit = card.split('_')[1];
  if (!suit) throw new Error(`Invalid card format: ${card}`);
  
  return suit;
}

/**
 * Check if a card is one of the top 4 cards (cartas bravas)
 */
export function isCartaBrava(card: Card): boolean {
  return ['01_E', '01_B', '07_E', '07_O'].includes(card);
}

/**
 * Get the rank of a card in the hierarchy (0 = highest)
 */
export function getCardRank(card: Card): number {
  const rank = CARD_HIERARCHY.indexOf(card);
  if (rank === -1) {
    throw new Error(`Card not found in hierarchy: ${card}`);
  }
  return rank;
}

/**
 * Check if card format is valid
 */
export function isValidCard(card: string): card is Card {
  return CARD_HIERARCHY.includes(card as Card);
}