// Truco Game Types - Based on PDF specification
// Spanish deck card representation: value_suit format (1-7, 10-12 for E,B,C,O suits)

export type Card = string; // Format: "01_E", "07_O", etc.

export type TrucoState = 
  | 'idle'
  | 'dealing'
  | 'playing'
  | 'envido_betting'
  | 'truco_betting'
  | 'trick_complete'
  | 'round_complete'
  | 'game_over';

export type EnvidoBet = 
  | 'none'
  | 'envido'
  | 'real_envido'
  | 'falta_envido';

export type TrucoBet = 
  | 'none'
  | 'truco'
  | 'retruco'
  | 'vale_cuatro';

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  wonTricks: number;
  score: number;
}

export interface Trick {
  player1Card: Card | null;
  player2Card: Card | null;
  winner: number | null; // 0 for player1, 1 for player2, null for tie/incomplete
}

export interface Board {
  currentTrick: number; // 0, 1, or 2 (three tricks per round)
  cardsInPlay: {
    player: Card | null;
    adversary: Card | null;
  };
  trickWinner: number | null; // Who won the current trick
}

export interface GameContext {
  // Game identification
  seed: string;
  matchId: string;
  
  // Deck and cards
  deck: Card[];
  discarded: Card[];
  
  // Game log for spectators/debugging
  logs: string[];
  
  // Board state
  board: Board;
  
  // Players
  player: Player;
  adversary: Player;
  
  // Game flow
  currentTurn: number; // 0 for player, 1 for adversary
  mano: number; // Who starts (hand player)
  dealer: number; // Who deals
  
  // Betting state
  roundStake: number; // Points value of current round (1, 2, 3, or 4)
  envidoStake: number; // Points at stake for envido
  envidoCalled: boolean; // Whether envido has been called this round
  trucoState: TrucoBet;
  envidoState: EnvidoBet;
  trucoCalledThisRound: boolean; // Track if Truco was called in this round
  
  // Game state
  gameState: TrucoState;
  betInitiator: number | null; // Who initiated current bet
  awaitingResponse: boolean; // Waiting for bet response
  
  // Round completion
  tricks: [Trick, Trick, Trick]; // Three tricks per round
  roundWinner: number | null; // Who won the current round
  gameWinner: number | null; // Who won the match (first to 30)
  
  // Game settings
  targetScore: number; // Usually 30 points
}

// Events that can be sent to the state machine
export type TrucoEvent = 
  | { type: 'START_GAME' }
  | { type: 'DEAL_CARDS' }
  | { type: 'PLAY_CARD'; cardId: Card }
  | { type: 'CALL_ENVIDO' }
  | { type: 'CALL_REAL_ENVIDO' }
  | { type: 'CALL_FALTA_ENVIDO' }
  | { type: 'CALL_TRUCO' }
  | { type: 'CALL_RETRUCO' }
  | { type: 'CALL_VALE_CUATRO' }
  | { type: 'QUIERO' } // Accept bet
  | { type: 'NO_QUIERO' } // Refuse bet
  | { type: 'MAZO' } // Forfeit round
  | { type: 'CONTINUE' } // Continue after trick completion
  | { type: 'NEXT_ROUND' }
  | { type: 'RESTART_GAME' };

// Validation result for actions
export interface ActionValidation {
  valid: boolean;
  reason?: string;
}

// Envido calculation result
export interface EnvidoResult {
  player1Points: number;
  player2Points: number;
  winner: number; // 0, 1, or mano player in case of tie
}

// Trick result
export interface TrickResult {
  winner: number | null; // 0, 1, or null for tie
  roundComplete: boolean;
  roundWinner: number | null;
}