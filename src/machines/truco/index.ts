// Truco State Machine - Main exports
// This file provides a clean interface to the Truco game state machine implementation

export { trucoStateMachine } from './trucoST.js';
export type { 
  GameContext, 
  TrucoEvent, 
  Card, 
  Player, 
  Trick, 
  Board, 
  TrucoState,
  EnvidoBet,
  TrucoBet,
  EnvidoResult,
  TrickResult,
  ActionValidation
} from './types.js';

export { 
  generateFullDeck, 
  createShuffledDeck, 
  dealCards, 
  generateMatchId,
  seededRandom,
  shuffleDeck
} from './deck.js';

export { 
  compareCards, 
  getCardValue, 
  getCardSuit, 
  isCartaBrava, 
  getCardRank, 
  isValidCard,
  CARD_HIERARCHY
} from './cardRules.js';

export { 
  calculateEnvidoPoints, 
  resolveEnvido, 
  canCallEnvido,
  calculateEnvidoStake,
  calculateEnvidoRefusalPoints,
  getMaxEnvidoPoints
} from './envido.js';

export { 
  createEmptyTrick, 
  resolveTrick, 
  determineRoundWinner, 
  getNextTrickLeader, 
  isTrickComplete, 
  getTrickCards, 
  countTrickWins
} from './tricks.js';