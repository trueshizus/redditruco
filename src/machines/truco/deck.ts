// Deck generation and shuffling utilities for Truco
import type { Card } from './types.js';

// Spanish deck: 1-7, 10-12 for each suit (E=Espadas/Swords, B=Bastos/Clubs, C=Copas/Cups, O=Oros/Coins)
// Excluding 8s and 9s as per Spanish deck rules
const SUITS = ['E', 'B', 'C', 'O'] as const;
const VALUES = ['01', '02', '03', '04', '05', '06', '07', '10', '11', '12'] as const;

export function generateFullDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push(`${value}_${suit}`);
    }
  }
  
  return deck;
}

// Seeded random number generator for reproducible shuffles
export function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return function() {
    hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
    return hash / 0x80000000;
  };
}

// Fisher-Yates shuffle with seeded random
export function shuffleDeck(deck: Card[], seed: string): Card[] {
  const shuffled = [...deck];
  const random = seededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  
  return shuffled;
}

// Generate a shuffled deck using a seed
export function createShuffledDeck(seed: string): Card[] {
  const fullDeck = generateFullDeck();
  return shuffleDeck(fullDeck, seed);
}

// Deal cards for two players (3 cards each)
export function dealCards(deck: Card[]): { player1Hand: Card[], player2Hand: Card[], remainingDeck: Card[] } {
  if (deck.length < 6) {
    throw new Error('Not enough cards in deck to deal');
  }
  
  const player1Hand = deck.slice(0, 3);
  const player2Hand = deck.slice(3, 6);
  const remainingDeck = deck.slice(6);
  
  return {
    player1Hand,
    player2Hand,
    remainingDeck
  };
}

// Generate a unique match ID
export function generateMatchId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}