# Truco State Machine Implementation

This directory contains a complete implementation of Argentinian Truco game logic using XState state machines, based on the comprehensive specification provided in the PDF document.

## Overview

Truco is a popular Argentine card game played with a 40-card Spanish deck. This implementation supports:
- 1v1 gameplay (2 vs 2 team play can be added later)
- Complete Truco card hierarchy and rules
- Envido betting system (including Real Envido and Falta Envido)
- Truco betting system (Truco → Retruco → Vale Cuatro)
- Proper trick resolution with tie-breaking rules
- Comprehensive game logging
- Seeded random deck shuffling for reproducible games

## Architecture

### Core Files

- **`trucoST.ts`** - Main XState state machine implementing game flow
- **`types.ts`** - TypeScript interfaces and type definitions
- **`deck.ts`** - Deck generation, shuffling, and card dealing utilities
- **`cardRules.ts`** - Card hierarchy and comparison logic
- **`envido.ts`** - Envido betting and point calculation logic
- **`tricks.ts`** - Trick resolution and round winner determination
- **`index.ts`** - Main exports for the module
- **`test.ts`** - Basic test suite for validation

### Game State Structure

The game context follows the JSON structure specified in the PDF:

```typescript
interface GameContext {
  // Game identification
  seed: string;              // Reproducible shuffle seed
  matchId: string;           // Unique game identifier
  
  // Deck and cards
  deck: Card[];              // Remaining cards in deck
  discarded: Card[];         // Played cards
  logs: string[];            // Game event log
  
  // Board state
  board: Board;              // Current trick state
  
  // Players
  player: Player;            // Player 1
  adversary: Player;         // Player 2
  
  // Game flow state
  currentTurn: number;       // Whose turn (0/1)
  mano: number;             // Who starts (hand player)
  dealer: number;           // Who deals
  
  // Betting state
  roundStake: number;        // Points at stake (1-4)
  envidoStake: number;       // Envido points at stake
  
  // Round/game completion
  tricks: [Trick, Trick, Trick]; // Three tricks per round
  roundWinner: number | null;
  gameWinner: number | null;
  targetScore: number;       // Usually 30
}
```

## Card System

### Spanish Deck
- 40 cards: values 1-7 and 10-12 in four suits
- Suits: E (Espadas/Swords), B (Bastos/Clubs), C (Copas/Cups), O (Oros/Coins)  
- Card format: `"01_E"`, `"07_O"`, `"12_C"`, etc.
- Missing: 8s and 9s (Spanish deck standard)

### Truco Hierarchy
Cards ranked from highest to lowest:
1. **Cartas Bravas** (Top 4):
   - `01_E` - Ace of Swords (highest)
   - `01_B` - Ace of Clubs
   - `07_E` - 7 of Swords  
   - `07_O` - 7 of Coins
2. **Regular cards**: 3, 2, 1♥/♦, 12, 11, 10, 7♥/♣, 6, 5, 4 (lowest)

## Game Flow

### States
1. **idle** - Initial state, waiting to start
2. **dealing** - Distributing 3 cards to each player
3. **playing** - Main game state for card play and betting
4. **envido_betting** - Handling envido bets and responses
5. **truco_betting** - Handling truco bets and responses
6. **round_complete** - Round finished, scoring points
7. **game_over** - Match complete, declare winner

### Round Structure
- Each round consists of up to 3 tricks
- Each trick is one card played by each player
- Win 2 out of 3 tricks to win the round
- Special tie-breaking rules ("primera vale doble")

## Betting Systems

### Envido
- Called before first trick is played
- Based on best combination of 2 same-suit cards + 20
- Betting sequence: Envido (2) → Real Envido (3) → Falta Envido (remaining to win)
- Face cards (10-12) count as 0

### Truco  
- Can be called at any time during card play
- Raises the stakes of the current round
- Sequence: Truco (2) → Retruco (3) → Vale Cuatro (4)
- Refusing a bet gives opponent the previous stake level

## Usage

### Basic Setup
```typescript
import { createActor } from 'xstate';
import { trucoStateMachine } from './src/machines/truco';

// Create and start the game
const actor = createActor(trucoStateMachine);
actor.start();

// Start a new game
actor.send({ type: 'START_GAME' });
```

### Playing Cards
```typescript
// Play a card (must be in current player's hand)
actor.send({ type: 'PLAY_CARD', cardId: '07_E' });
```

### Betting
```typescript
// Call envido (before any cards played)
actor.send({ type: 'CALL_ENVIDO' });

// Accept or decline bets
actor.send({ type: 'QUIERO' });    // Accept
actor.send({ type: 'NO_QUIERO' }); // Decline

// Call truco during play
actor.send({ type: 'CALL_TRUCO' });
```

### Game Events
```typescript
// Forfeit round
actor.send({ type: 'MAZO' });

// Start next round
actor.send({ type: 'NEXT_ROUND' });

// Restart game
actor.send({ type: 'RESTART_GAME' });
```

## Implementation Features

### ✅ Completed Features
- [x] Complete game state structure per PDF spec
- [x] Seeded deck shuffling for reproducible games  
- [x] Proper Truco card hierarchy and comparison
- [x] Envido calculation (including Real/Falta Envido)
- [x] Trick resolution with tie-breaking rules
- [x] Full betting system (Envido + Truco lines)
- [x] Round completion and scoring
- [x] Game end conditions (first to 30 points)
- [x] Comprehensive event logging
- [x] XState integration with proper typing

### 🔄 Future Enhancements
- [ ] 2v2 team play support
- [ ] Flor betting (optional variant)
- [ ] Advanced AI opponent
- [ ] Game replay system
- [ ] Tournament mode
- [ ] Multiplayer networking

## Testing

Run the basic test suite:
```bash
npm run test:truco  # If added to package.json
# or
node src/machines/truco/test.ts
```

Tests validate:
- Envido point calculations
- Card comparison logic
- Basic game flow
- State machine transitions

## Integration

The state machine can be integrated with:
- React components using `@xstate/react`
- Browser-based UI for card visualization  
- Server-side game rooms for multiplayer
- Discord/Reddit bots for text-based play
- Mobile apps using React Native

This implementation follows the incremental steps outlined in the PDF specification and provides a solid foundation for a complete Truco game experience.