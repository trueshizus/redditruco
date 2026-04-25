// Envido calculation logic for Truco
import type { Card, EnvidoResult } from './types.js';
import { getCardValue, getCardSuit } from './cardRules.js';

/**
 * Calculate envido points for a hand of cards
 * Envido score is the sum of two cards of the same suit plus 20 points,
 * or just the highest card value if no suited pair exists
 * Face cards (10-12) count as 0 for envido
 */
export function calculateEnvidoPoints(cards: Card[]): number {
  const cardsBySuit: { [suit: string]: number[] } = {};
  
  // Group cards by suit and get their envido values
  cards.forEach((card) => {
    const suit = getCardSuit(card);
    const value = getCardValue(card);
    
    if (!cardsBySuit[suit]) {
      cardsBySuit[suit] = [];
    }
    cardsBySuit[suit]!.push(value);
  });
  
  let maxPoints = 0;
  
  // Check each suit for envido points
  Object.values(cardsBySuit).forEach((suitCards) => {
    if (suitCards.length >= 2) {
      // Sort descending and take top 2 cards
      suitCards.sort((a, b) => b - a);
      const points = suitCards[0]! + suitCards[1]! + 20;
      maxPoints = Math.max(maxPoints, points);
    } else if (suitCards.length === 1) {
      // Single card value (no +20 bonus)
      maxPoints = Math.max(maxPoints, suitCards[0]!);
    }
  });
  
  return maxPoints;
}

/**
 * Compare envido points between two players
 * Returns the winner (0 or 1) or mano player in case of tie
 */
export function resolveEnvido(
  player1Cards: Card[], 
  player2Cards: Card[], 
  mano: number
): EnvidoResult {
  const player1Points = calculateEnvidoPoints(player1Cards);
  const player2Points = calculateEnvidoPoints(player2Cards);
  
  let winner: number;
  
  if (player1Points > player2Points) {
    winner = 0; // Player 1 wins
  } else if (player2Points > player1Points) {
    winner = 1; // Player 2 wins
  } else {
    // Tie: mano (hand) player wins by default
    winner = mano;
  }
  
  return {
    player1Points,
    player2Points,
    winner
  };
}

/**
 * Get the maximum possible envido points (7 and 6 of the same suit = 33)
 */
export function getMaxEnvidoPoints(): number {
  return 7 + 6 + 20; // 33 points
}

/**
 * Calculate envido stake based on bet type
 * - envido: 2 points
 * - real_envido: 3 points  
 * - falta_envido: points needed to reach target score
 */
export function calculateEnvidoStake(
  betType: 'envido' | 'real_envido' | 'falta_envido',
  playerScores: [number, number],
  targetScore: number = 30
): number {
  switch (betType) {
    case 'envido':
      return 2;
    case 'real_envido':
      return 3;
    case 'falta_envido':
      // Falta envido: enough points for the leading player to win the match
      return Math.max(targetScore - Math.max(...playerScores), 1);
    default:
      return 0;
  }
}

/**
 * Calculate the points awarded when envido is refused
 * - First envido call refused: 1 point
 * - If there were raises and then refused: value of last accepted bet
 */
export function calculateEnvidoRefusalPoints(
  raisesCount: number,
  lastAcceptedStake: number
): number {
  if (raisesCount === 0) {
    // Just the initial envido was called and refused
    return 1;
  } else {
    // There were raises, award the last accepted stake
    return lastAcceptedStake;
  }
}

/**
 * Whether envido can still be called this round.
 *
 * Rules (1v1 Argentine Truco):
 *   - only during the playing state,
 *   - only in the first trick,
 *   - only before ANY card has been played this round (including a card sitting
 *     on the board that hasn't yet completed the trick),
 *   - only if envido hasn't already been resolved,
 *   - only if truco hasn't been called (truco locks envido out).
 */
export function canCallEnvido(
  currentTrick: number,
  trick1Player1Card: Card | null,
  trick1Player2Card: Card | null,
  envidoCalled: boolean,
  _currentBet: string,
  trucoCalledThisRound: boolean,
  gameState: string,
  boardPlayerCard: Card | null = null,
  boardAdversaryCard: Card | null = null,
): boolean {
  return (
    gameState === 'playing' &&
    currentTrick === 0 &&
    !trick1Player1Card &&
    !trick1Player2Card &&
    !boardPlayerCard &&
    !boardAdversaryCard &&
    !envidoCalled &&
    !trucoCalledThisRound
  );
}