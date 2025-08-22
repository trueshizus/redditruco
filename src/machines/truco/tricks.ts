// Trick resolution and round winner determination for Truco
import type { Card, Trick, TrickResult } from './types.js';
import { compareCards } from './cardRules.js';

/**
 * Create an empty trick structure
 */
export function createEmptyTrick(): Trick {
  return {
    player1Card: null,
    player2Card: null,
    winner: null,
  };
}

/**
 * Resolve a single trick by comparing the two played cards
 * Returns the winner (0, 1) or null for tie (parda)
 */
export function resolveTrick(
  player1Card: Card, 
  player2Card: Card, 
  mano: number,
  trickNumber: number,
  previousTricks: Trick[]
): number | null {
  const comparison = compareCards(player1Card, player2Card);
  
  if (comparison > 0) {
    return 0; // Player 1 wins
  } else if (comparison < 0) {
    return 1; // Player 2 wins
  } else {
    // Parda (tie) - special rules apply
    return resolveTie(mano, trickNumber, previousTricks);
  }
}

/**
 * Handle tie resolution according to Truco rules:
 * - First trick tie: mano wins ("primera vale doble")
 * - Subsequent trick ties: winner of previous non-tied trick wins
 * - If all tricks tie: mano wins
 */
function resolveTie(mano: number, trickNumber: number, previousTricks: Trick[]): number | null {
  if (trickNumber === 0) {
    // First trick tie: mano wins by default
    return mano;
  }
  
  // Find the most recent non-tied trick winner
  for (let i = previousTricks.length - 1; i >= 0; i--) {
    const trick = previousTricks[i];
    if (trick && trick.winner !== null) {
      return trick.winner;
    }
  }
  
  // If no previous winner found (all previous tricks tied), mano wins
  return mano;
}

/**
 * Determine if a round is complete and who won
 * A round is won by:
 * 1. Winning 2 out of 3 tricks
 * 2. Special tie rules (primera vale doble)
 */
export function determineRoundWinner(tricks: [Trick, Trick, Trick], mano: number): TrickResult {
  // Count wins for each player
  const wins = [0, 0]; // [player1Wins, player2Wins]
  let completedTricks = 0;
  
  tricks.forEach((trick) => {
    if (trick.player1Card && trick.player2Card) {
      completedTricks++;
      if (trick.winner !== null) {
        wins[trick.winner]++;
      }
    }
  });
  
  // Check for immediate winner (2 out of 3 tricks)
  if (wins[0] >= 2) {
    return { winner: 0, roundComplete: true, roundWinner: 0 };
  }
  if (wins[1] >= 2) {
    return { winner: 1, roundComplete: true, roundWinner: 1 };
  }
  
  // If all 3 tricks are complete, determine winner based on special rules
  if (completedTricks === 3) {
    const winner = determineComplexRoundWinner(tricks, mano);
    return { winner, roundComplete: true, roundWinner: winner };
  }
  
  // Round not yet complete
  return { winner: null, roundComplete: false, roundWinner: null };
}

/**
 * Determine round winner when all tricks are played but no one has 2 wins
 * This handles complex tie scenarios
 */
function determineComplexRoundWinner(tricks: [Trick, Trick, Trick], mano: number): number | null {
  const wins = [0, 0];
  let ties = 0;
  
  tricks.forEach((trick) => {
    if (trick.winner !== null) {
      wins[trick.winner]++;
    } else {
      ties++;
    }
  });
  
  // If one player has more wins, they win the round
  if (wins[0] > wins[1]) return 0;
  if (wins[1] > wins[0]) return 1;
  
  // Equal wins means tied tricks exist
  if (ties === 3) {
    // All three tricks tied: mano wins
    return mano;
  } else if (ties === 2) {
    // Two tricks tied, one won: the winner of the single won trick wins round
    for (const trick of tricks) {
      if (trick.winner !== null) {
        return trick.winner;
      }
    }
  } else if (ties === 1) {
    // One trick tied, two won: if each player won one, mano wins
    if (wins[0] === 1 && wins[1] === 1) {
      return mano;
    }
  }
  
  return null; // Should not reach here in normal circumstances
}

/**
 * Determine who leads the next trick based on current trick result
 * - Winner of previous trick leads next
 * - If tie (parda), same player who led the tied trick leads again
 */
export function getNextTrickLeader(
  currentTrick: Trick, 
  currentLeader: number
): number {
  if (currentTrick.winner !== null) {
    return currentTrick.winner;
  } else {
    // Tie: same leader continues
    return currentLeader;
  }
}

/**
 * Check if a trick is complete (both cards played)
 */
export function isTrickComplete(trick: Trick): boolean {
  return trick.player1Card !== null && trick.player2Card !== null;
}

/**
 * Get the cards played in a specific trick
 */
export function getTrickCards(trick: Trick): { player1Card: Card | null, player2Card: Card | null } {
  return {
    player1Card: trick.player1Card,
    player2Card: trick.player2Card
  };
}

/**
 * Count how many tricks each player has won so far
 */
export function countTrickWins(tricks: Trick[]): [number, number] {
  const wins: [number, number] = [0, 0];
  
  tricks.forEach(trick => {
    if (trick.winner !== null) {
      wins[trick.winner]++;
    }
  });
  
  return wins;
}