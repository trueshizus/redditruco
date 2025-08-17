# Test Plan for Truco State Machine

This document outlines the comprehensive test plan for implementing a Truco game state machine using TypeScript and XState. We follow a Behavior-Driven Development (BDD) approach with incremental phases, starting from basic state validation and gradually incorporating complex game mechanics.

## Phase 1: Core Game State Validation

### 1.1 Game Initialization

#### Scenario: Creating a new game
**Given** no game exists  
**When** a new game is initialized  
**Then** the game should have exactly 2 players  
**And** the score should be 0-0  
**And** the game should be in 'idle' state  
**And** no cards should be dealt yet  

#### Scenario: Starting a new round
**Given** a game is initialized with 2 players  
**When** a new round starts  
**Then** the game should transition to 'dealing' state  
**And** a dealer should be assigned  
**And** the 'mano' (hand) player should be determined  

### 1.2 Card Distribution

#### Scenario: Dealing cards to players
**Given** the game is in 'dealing' state  
**When** cards are dealt  
**Then** each player should receive exactly 3 cards  
**And** all cards should be unique  
**And** cards should come from a Spanish deck (40 cards)  
**And** the game should transition to 'round:ready' state  

#### Scenario: Validating dealt cards
**Given** cards have been dealt  
**When** validating the game state  
**Then** no player should have duplicate cards  
**And** total dealt cards should equal 6  
**And** all cards should be valid Spanish deck cards  

## Phase 2: Turn Management and Basic Flow

### 2.1 Turn Order

#### Scenario: Initial turn assignment
**Given** the game is in 'round:ready' state  
**When** the round begins  
**Then** it should be the 'mano' player's turn  
**And** the other player should be marked as 'pie'  
**And** the game should transition to 'round:playing' state  

#### Scenario: Turn alternation in tricks
**Given** a player has played a card  
**When** the trick continues  
**Then** it should be the other player's turn  
**And** the current player should not be able to play  

### 2.2 Card Playing Mechanics

#### Scenario: Playing the first card of a trick
**Given** it is a player's turn  
**And** no cards have been played in the current trick  
**When** the player plays a valid card  
**Then** the card should be placed on the table  
**And** the card should be removed from the player's hand  
**And** it should become the other player's turn  

#### Scenario: Completing a trick
**Given** one card is already played in the current trick  
**When** the second player plays a card  
**Then** both cards should be on the table  
**And** the trick winner should be determined  
**And** the trick should be marked as complete  
**And** cards should be moved to the winner's won tricks pile  

#### Scenario: Invalid card play attempt
**Given** it is not a player's turn  
**When** that player attempts to play a card  
**Then** the action should be rejected  
**And** the game state should remain unchanged  
**And** an error should be indicated  

## Phase 3: Envido System

### 3.1 Envido Initiation

#### Scenario: Singing "Envido" in first trick
**Given** the game is in 'round:playing' state  
**And** no cards have been played yet  
**And** it is a player's turn  
**When** the player sings "Envido"  
**Then** the game should transition to 'envido:waiting-response' state  
**And** the envido value should be 2 points  
**And** the other player should be prompted to respond  

#### Scenario: Invalid Envido timing
**Given** the first trick has been completed  
**When** a player attempts to sing "Envido"  
**Then** the action should be rejected  
**And** an error indicating "Envido can only be sung in the first trick" should be shown  

### 3.2 Envido Responses

#### Scenario: Accepting Envido ("Quiero")
**Given** the game is in 'envido:waiting-response' state  
**When** the responding player says "Quiero"  
**Then** the game should transition to 'envido:showing-points' state  
**And** both players' envido points should be calculated  
**And** the winner should receive 2 points  

#### Scenario: Rejecting Envido ("No Quiero")
**Given** the game is in 'envido:waiting-response' state  
**When** the responding player says "No Quiero"  
**Then** the singing player should receive 1 point  
**And** the game should return to 'round:playing' state  
**And** play should continue with the first trick  

#### Scenario: Raising with "Real Envido"
**Given** the game is in 'envido:waiting-response' state  
**When** the responding player says "Real Envido"  
**Then** the stake should increase to 3 points  
**And** the game should wait for the original singer's response  

### 3.3 Envido Chains

#### Scenario: Multiple envido raises
**Given** "Envido" has been sung  
**When** the chain "Envido" → "Envido" → "Real Envido" occurs  
**Then** the total stake should be 7 points  
**And** each raise should alternate between players  

#### Scenario: Falta Envido
**Given** any envido has been sung  
**When** a player says "Falta Envido"  
**Then** the stake should be the points needed to win the game  
**And** no further envido raises should be allowed  

## Phase 4: Truco System

### 4.1 Truco Initiation

#### Scenario: Singing "Truco" during play
**Given** the game is in 'round:playing' state  
**And** it is a player's turn  
**When** the player sings "Truco"  
**Then** the game should transition to 'truco:waiting-response' state  
**And** the round value should be marked as 2 points  
**And** the other player should be prompted to respond  

#### Scenario: Singing "Truco" after envido
**Given** envido has been resolved  
**And** the game has returned to 'round:playing' state  
**When** a player sings "Truco"  
**Then** the game should transition to 'truco:waiting-response' state  
**And** both envido points and truco points should be tracked separately  

### 4.2 Truco Responses

#### Scenario: Accepting Truco ("Quiero")
**Given** the game is in 'truco:waiting-response' state  
**When** the responding player says "Quiero"  
**Then** the round should be worth 2 points  
**And** the game should return to 'round:playing' state  
**And** play should continue  

#### Scenario: Rejecting Truco ("No Quiero")
**Given** the game is in 'truco:waiting-response' state  
**When** the responding player says "No Quiero"  
**Then** the singing player should receive 1 point immediately  
**And** the round should end  
**And** a new round should begin  

#### Scenario: Raising to "Retruco"
**Given** the game is in 'truco:waiting-response' state  
**When** the responding player says "Retruco"  
**Then** the stake should increase to 3 points  
**And** the game should wait for the original singer's response  

### 4.3 Truco Escalation Chain

#### Scenario: Full truco escalation
**Given** "Truco" has been sung  
**When** the escalation "Truco" → "Retruco" → "Vale Cuatro" occurs  
**Then** the round should be worth 4 points  
**And** no further truco raises should be allowed  

## Phase 5: Trick Resolution and Scoring

### 5.1 Trick Winners

#### Scenario: Determining trick winner by card value
**Given** both players have played cards in a trick  
**When** comparing card values  
**Then** the higher card should win the trick  
**And** the winner should lead the next trick  

#### Scenario: Handling "pardas" (ties)
**Given** both players have played cards of equal value  
**When** the trick is evaluated  
**Then** the trick should be marked as "parda"  
**And** the 'mano' player should win in the first trick  
**And** the previous trick winner should win in subsequent tricks  

### 5.2 Round Completion

#### Scenario: Winning by best of three tricks
**Given** three tricks have been played  
**When** a player has won 2 tricks  
**Then** that player should win the round  
**And** appropriate points should be awarded  

#### Scenario: Early round win
**Given** a player has won the first two tricks  
**When** the second trick is completed  
**Then** the round should end immediately  
**And** the third trick should not be played  

## Phase 6: Game Completion

### 6.1 Winning Conditions

#### Scenario: Reaching winning score (30 points)
**Given** a player has 28 points  
**When** they win a 2-point round  
**Then** their score should be 30  
**And** the game should transition to 'finished' state  
**And** that player should be declared the winner  

#### Scenario: Winning with "Falta Envido"
**Given** a player needs 5 points to win  
**When** they win a "Falta Envido" worth 5 or more points  
**Then** the game should end immediately  
**And** that player should be declared the winner  

### 6.2 Match Management

#### Scenario: Bad points (malas)
**Given** a team has reached 15 points  
**When** checking game state  
**Then** they should be marked as having "malas"  
**And** they cannot sing certain envidos first  

#### Scenario: Good points (buenas)
**Given** both teams have "malas"  
**When** checking game state  
**Then** both should be marked as having "buenas"  
**And** all singing restrictions should be lifted  

## Phase 7: Edge Cases and Error Handling

### 7.1 Invalid Actions

#### Scenario: Playing without cards
**Given** a player has no cards in hand  
**When** they attempt to play a card  
**Then** the action should be rejected  
**And** an appropriate error should be returned  

#### Scenario: Singing envido after first trick
**Given** the first trick has been completed  
**When** a player attempts to sing envido  
**Then** the action should be rejected  
**And** the game state should remain unchanged  

### 7.2 State Recovery

#### Scenario: Handling disconnection during envido
**Given** the game is in 'envido:waiting-response' state  
**When** a timeout occurs  
**Then** the envido should be auto-rejected  
**And** the singing player should receive minimum points  
**And** the game should continue  

#### Scenario: Handling invalid state transitions
**Given** the game is in any state  
**When** an invalid state transition is attempted  
**Then** the transition should be blocked  
**And** the game should remain in the current valid state  
**And** an error should be logged  

---

## Implementation Notes

1. **State Machine Structure**: Each major game phase should be a distinct state with clear entry/exit conditions
2. **Event Naming**: Use consistent naming like `DEAL_CARDS`, `PLAY_CARD`, `SING_ENVIDO`, `RESPOND_QUIERO`
3. **Context Data**: Track current round, scores, cards in hand, cards on table, current trick, and singing history
4. **Guards**: Implement guards for valid actions (e.g., `canSingEnvido`, `isPlayerTurn`, `hasCardsInHand`)
5. **Services**: Use services for async operations like shuffling cards or calculating points
6. **Testing Priority**: Start with Phase 1-2 for core functionality, then add complexity incrementally

This test plan provides comprehensive coverage while maintaining an incremental approach suitable for TDD/BDD development with XState and TypeScript.
