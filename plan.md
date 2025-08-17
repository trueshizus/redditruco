# Reddit Truco Implementation Plan

## Project Overview
Transform the current counter app into a fully functional Truco card game using XState for state management.

## Phase 1: Foundation & State Management

### 1.1 XState Integration
- [ ] Install XState dependencies (`xstate`, `@xstate/react`)
- [ ] Create game state machine structure
- [ ] Replace `useCounter` hook with XState machine
- [ ] Set up state persistence via Redis

### 1.2 Game Core Types
- [ ] Define card types (Spanish deck: 1-7, 10-12 for each suit)
- [ ] Create player interfaces
- [ ] Define game round/hand structures
- [ ] Add scoring system types

## Phase 2: Game Logic Implementation

### 2.1 Card System
- [ ] Implement 40-card Spanish deck
- [ ] Card hierarchy for Truco (strength order)
- [ ] Shuffle and deal mechanics
- [ ] Card comparison logic

### 2.2 Game State Machine (XState)
```
States:
- waiting_for_players
- dealing_cards  
- round_in_progress
  - waiting_for_play
  - evaluating_trick
  - envido_phase
  - truco_phase
- round_complete
- game_complete
```

### 2.3 Core Game Mechanics
- [ ] Three tricks per hand
- [ ] Envido scoring (point calculation from cards)
- [ ] Truco calls and responses (truco/retruco/vale4)
- [ ] Hand winner determination
- [ ] Score tracking (first to 30 points)

## Phase 3: User Interface

### 3.1 Game Board
- [ ] Player hand display
- [ ] Played cards area
- [ ] Score display
- [ ] Current trick status

### 3.2 Interaction System
- [ ] Card selection and playing
- [ ] Call buttons (envido, truco, mazo)
- [ ] Response buttons (quiero, no quiero, retruco)
- [ ] Game status messages

### 3.3 Visual Design
- [ ] Card graphics/representations
- [ ] Game table layout
- [ ] Score board
- [ ] Call indicators

## Phase 4: Multiplayer & Persistence

### 4.1 Player Management
- [ ] Room creation/joining
- [ ] Player matching
- [ ] Turn management
- [ ] Disconnection handling

### 4.2 Data Persistence
- [ ] Game state storage in Redis
- [ ] Player statistics
- [ ] Game history
- [ ] Leaderboards

## Phase 5: Advanced Features

### 5.1 Game Variants
- [ ] 2-player Truco
- [ ] 4-player team Truco
- [ ] 6-player team Truco

### 5.2 Social Features
- [ ] Spectator mode
- [ ] Chat system
- [ ] Friend challenges
- [ ] Tournament system

## Technical Considerations

### State Management Strategy
- Use XState to model complex game states and transitions
- Handle asynchronous player actions
- Manage timeouts for player responses
- State persistence across browser refreshes

### API Design
- RESTful endpoints for game actions
- WebSocket consideration for real-time updates
- Error handling for invalid moves
- Rate limiting for API calls

### Security
- Validate all game moves server-side
- Prevent cheating and manipulation
- Secure player authentication
- Input sanitization

## Dependencies to Add
```json
{
  "xstate": "^5.0.0",
  "@xstate/react": "^4.0.0"
}
```

## File Structure After Implementation
```
src/
├── client/
│   ├── components/
│   │   ├── GameBoard.tsx
│   │   ├── PlayerHand.tsx
│   │   ├── Card.tsx
│   │   └── ScoreBoard.tsx
│   ├── hooks/
│   │   ├── useGameMachine.ts
│   │   └── useMultiplayer.ts
│   ├── machines/
│   │   ├── gameMachine.ts
│   │   └── playerMachine.ts
│   └── utils/
│       ├── cardUtils.ts
│       └── gameRules.ts
├── server/
│   ├── core/
│   │   ├── game.ts
│   │   ├── cards.ts
│   │   └── scoring.ts
│   └── routes/
│       ├── game.ts
│       └── player.ts
└── shared/
    └── types/
        ├── game.ts
        ├── cards.ts
        └── player.ts
```

## Success Metrics
- [ ] Functional 2-player Truco game
- [ ] Proper Envido and Truco call system
- [ ] Score tracking to 30 points
- [ ] State persistence across sessions
- [ ] Responsive UI for mobile/desktop