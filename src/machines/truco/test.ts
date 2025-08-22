// Basic test file for Truco state machine
// This tests the core functionality of the state machine

import { createActor } from 'xstate';
import { trucoStateMachine } from './trucoST.js';
import type { GameContext } from './types.js';

// Test function to validate basic game flow
export function testBasicGameFlow(): void {
  console.log('🎮 Testing Truco State Machine...\n');
  
  // Create actor (state machine instance)
  const actor = createActor(trucoStateMachine);
  
  // Start the machine
  actor.start();
  
  // Test initial state
  console.log('📊 Initial state:', actor.getSnapshot().value);
  console.log('🃏 Initial context seed:', actor.getSnapshot().context.seed);
  console.log('👥 Players:', {
    player: actor.getSnapshot().context.player.name,
    adversary: actor.getSnapshot().context.adversary.name,
  });
  
  // Start game
  console.log('\n🚀 Starting game...');
  actor.send({ type: 'START_GAME' });
  
  const snapshot1 = actor.getSnapshot();
  console.log('📊 After START_GAME:', snapshot1.value);
  console.log('🃏 Player hand size:', snapshot1.context.player.hand.length);
  console.log('🃏 Adversary hand size:', snapshot1.context.adversary.hand.length);
  console.log('🎯 Current turn:', snapshot1.context.currentTurn === 0 ? 'Player' : 'Adversary');
  console.log('👑 Mano (hand):', snapshot1.context.mano === 0 ? 'Player' : 'Adversary');
  
  // Play first card (if player's turn)
  const context = snapshot1.context;
  if (context.currentTurn === 0 && context.player.hand.length > 0) {
    const firstCard = context.player.hand[0]!;
    console.log(`\n🎴 Player plays: ${firstCard}`);
    actor.send({ type: 'PLAY_CARD', cardId: firstCard });
    
    const snapshot2 = actor.getSnapshot();
    console.log('📊 After player card:', snapshot2.value);
    console.log('🎯 Current turn:', snapshot2.context.currentTurn === 0 ? 'Player' : 'Adversary');
    console.log('🃏 Card in play (player):', snapshot2.context.board.cardsInPlay.player);
  }
  
  // Test envido call
  if (actor.getSnapshot().context.gameState === 'playing' && 
      actor.getSnapshot().context.board.currentTrick === 0 &&
      !actor.getSnapshot().context.board.cardsInPlay.player &&
      !actor.getSnapshot().context.board.cardsInPlay.adversary) {
    console.log('\n📢 Testing envido call...');
    actor.send({ type: 'CALL_ENVIDO' });
    
    const snapshot3 = actor.getSnapshot();
    console.log('📊 After CALL_ENVIDO:', snapshot3.value);
    console.log('💰 Envido stake:', snapshot3.context.envidoStake);
    console.log('⏳ Awaiting response:', snapshot3.context.awaitingResponse);
    
    // Accept envido
    console.log('\n✅ Accepting envido...');
    actor.send({ type: 'QUIERO' });
    
    const snapshot4 = actor.getSnapshot();
    console.log('📊 After QUIERO:', snapshot4.value);
    console.log('🏆 Player score:', snapshot4.context.player.score);
    console.log('🏆 Adversary score:', snapshot4.context.adversary.score);
  }
  
  // Test truco call
  if (actor.getSnapshot().context.gameState === 'playing') {
    console.log('\n📢 Testing truco call...');
    actor.send({ type: 'CALL_TRUCO' });
    
    const snapshot5 = actor.getSnapshot();
    console.log('📊 After CALL_TRUCO:', snapshot5.value);
    console.log('💰 Round stake:', snapshot5.context.roundStake);
    console.log('⏳ Awaiting response:', snapshot5.context.awaitingResponse);
    
    // Accept truco
    console.log('\n✅ Accepting truco...');
    actor.send({ type: 'QUIERO' });
    
    const snapshot6 = actor.getSnapshot();
    console.log('📊 After QUIERO truco:', snapshot6.value);
    console.log('💰 Final round stake:', snapshot6.context.roundStake);
  }
  
  // Print final logs
  const finalContext = actor.getSnapshot().context;
  console.log('\n📝 Game logs:');
  finalContext.logs.slice(-5).forEach(log => console.log(`  ${log}`));
  
  console.log('\n✅ Test completed!\n');
  
  // Stop actor
  actor.stop();
}

// Test envido calculation
export function testEnvidoCalculation(): void {
  console.log('🧮 Testing Envido Calculations...\n');
  
  const { calculateEnvidoPoints } = require('./envido.js');
  
  // Test cases
  const testCases = [
    {
      name: 'Perfect envido (7 and 6 of same suit)',
      cards: ['07_E', '06_E', '04_B'],
      expected: 33
    },
    {
      name: 'Good envido (5 and 4 of same suit)', 
      cards: ['05_C', '04_C', '12_E'],
      expected: 29
    },
    {
      name: 'Face cards (no suit match)',
      cards: ['12_E', '11_B', '10_C'],
      expected: 0
    },
    {
      name: 'Single high card',
      cards: ['07_E', '11_B', '10_C'],
      expected: 7
    }
  ];
  
  testCases.forEach(testCase => {
    const result = calculateEnvidoPoints(testCase.cards);
    const passed = result === testCase.expected;
    console.log(`${passed ? '✅' : '❌'} ${testCase.name}: ${result} (expected ${testCase.expected})`);
  });
  
  console.log('\n✅ Envido calculation tests completed!\n');
}

// Test card comparison
export function testCardComparison(): void {
  console.log('⚔️  Testing Card Comparisons...\n');
  
  const { compareCards } = require('./cardRules.js');
  
  const testCases = [
    {
      name: 'Ace of Swords vs Ace of Clubs',
      card1: '01_E',
      card2: '01_B', 
      expected: 1 // Ace of Swords wins
    },
    {
      name: '7 of Swords vs 7 of Coins',
      card1: '07_E',
      card2: '07_O',
      expected: 1 // 7 of Swords wins
    },
    {
      name: 'Two 3s (should tie)',
      card1: '03_E',
      card2: '03_B',
      expected: 0 // Tie
    },
    {
      name: '4 vs 3 (3 should win)',
      card1: '04_E',
      card2: '03_E',
      expected: -1 // 3 wins
    }
  ];
  
  testCases.forEach(testCase => {
    const result = compareCards(testCase.card1, testCase.card2);
    const passed = result === testCase.expected;
    const resultText = result === 1 ? `${testCase.card1} wins` 
      : result === -1 ? `${testCase.card2} wins` 
      : 'tie';
    console.log(`${passed ? '✅' : '❌'} ${testCase.name}: ${resultText}`);
  });
  
  console.log('\n✅ Card comparison tests completed!\n');
}

// Run all tests
export function runAllTests(): void {
  console.log('🧪 Running Truco State Machine Tests\n');
  console.log('='.repeat(50));
  
  testEnvidoCalculation();
  testCardComparison(); 
  testBasicGameFlow();
  
  console.log('='.repeat(50));
  console.log('🎉 All tests completed!');
}

// Auto-run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}