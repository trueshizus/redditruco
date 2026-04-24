import { test, expect } from '@playwright/test';

test.describe('Edge Cases and Invalid Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should prevent playing cards when not your turn', async ({ page }) => {
    // Determine whose turn it is
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      // Player 2's turn - Player 1 cards should not be clickable
      const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
      const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
      
      // Try clicking Player 1's card (should not work)
      const initialGameState = await page.getByText(/Game State:/).textContent();
      if (await player1Cards.count() > 0) {
        await player1Cards.first().click();
        
        // Game state should not change, still Player 2's turn
        await expect(page.getByText('Current Turn: Player 2')).toBeVisible();
        
        // Cards dealt should remain the same
        await expect(page.getByText('Cards Dealt: 6/6')).toBeVisible();
      }
      
      // Now Player 2 should be able to play
      if (await player2Cards.count() > 0) {
        await player2Cards.first().click();
        
        // Turn should switch to Player 1
        await expect(page.getByText('Current Turn: Player 1')).toBeVisible();
        await expect(page.getByText('Cards Dealt: 5/6')).toBeVisible();
      }
    } else {
      // Same logic but reversed for Player 1's turn
      const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
      const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
      
      // Try clicking Player 2's card when it's Player 1's turn
      if (await player2Cards.count() > 0) {
        await player2Cards.first().click();
        
        // Should still be Player 1's turn
        await expect(page.getByText('Current Turn: Player 1')).toBeVisible();
        await expect(page.getByText('Cards Dealt: 6/6')).toBeVisible();
      }
    }
  });

  test('should prevent betting actions when not your turn', async ({ page }) => {
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      // Player 2's turn - Player 1 betting buttons should not be functional
      const player1TrucoBtn = page.locator('main > div:nth-child(3)').getByRole('button', { name: 'Truco', exact: true });
      const player1EnvidoBtn = page.locator('main > div:nth-child(3)').getByRole('button', { name: 'Envido', exact: true });
      
      // These might not be visible or clickable when it's not Player 1's turn
      if (await player1TrucoBtn.isVisible()) {
        await player1TrucoBtn.click();
        
        // Should not enter betting state
        await expect(page.getByText('Game State: playing')).toBeVisible();
        await expect(page.getByText('Current Turn: Player 2')).toBeVisible();
      }
      
      // Player 2 should be able to bet
      const player2TrucoBtn = page.locator('main > div:nth-child(1)').getByRole('button', { name: 'Truco', exact: true });
      if (await player2TrucoBtn.isVisible()) {
        await player2TrucoBtn.click();
        await expect(page.getByText('Game State: truco_betting')).toBeVisible();
      }
    }
  });

  test('should prevent double betting by same player', async ({ page }) => {
    // Player calls Truco
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    
    // Same player should not be able to call Truco again
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      // Player 2 called Truco, Player 2 should not see Truco button anymore
      const player2TrucoBtn = page.locator('main > div:nth-child(1)').getByRole('button', { name: 'Truco', exact: true });
      await expect(player2TrucoBtn).not.toBeVisible();
      
      // Only Player 1 should see response buttons
      await expect(page.locator('main > div:nth-child(3)').getByRole('button', { name: 'Quiero' })).toBeVisible();
      await expect(page.locator('main > div:nth-child(3)').getByRole('button', { name: 'No Quiero' })).toBeVisible();
    } else {
      // Player 1 called Truco, Player 1 should not see Truco button anymore
      const player1TrucoBtn = page.locator('main > div:nth-child(3)').getByRole('button', { name: 'Truco', exact: true });
      await expect(player1TrucoBtn).not.toBeVisible();
      
      // Only Player 2 should see response buttons
      await expect(page.locator('main > div:nth-child(1)').getByRole('button', { name: 'Quiero' })).toBeVisible();
    }
  });

  test('should prevent Envido after cards are played', async ({ page }) => {
    // Play one card to start a trick
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      await player2Cards.first().click();
      
      // Player 1 should not be able to call Envido after Player 2 played a card
      const player1EnvidoBtn = page.locator('main > div:nth-child(3)').getByRole('button', { name: 'Envido', exact: true });
      
      if (await player1EnvidoBtn.isVisible()) {
        await player1EnvidoBtn.click();
        
        // Should not enter envido_betting state
        await expect(page.getByText('Game State: playing')).toBeVisible();
        await expect(page.getByText(/envido_betting/)).not.toBeVisible();
      }
    }
  });

  test('should prevent Envido after Truco is resolved', async ({ page }) => {
    // Call and accept Truco first
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Should return to playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Envido buttons should not be available anymore
    const player1EnvidoBtn = page.locator('main > div:nth-child(3)').getByRole('button', { name: 'Envido', exact: true });
    const player2EnvidoBtn = page.locator('main > div:nth-child(1)').getByRole('button', { name: 'Envido', exact: true });
    
    await expect(player1EnvidoBtn).not.toBeVisible();
    await expect(player2EnvidoBtn).not.toBeVisible();
  });

  test('should handle rapid clicking without breaking game state', async ({ page }) => {
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    // Rapid click the same card multiple times
    if (await player2Cards.count() > 0) {
      const firstCard = player2Cards.first();
      
      // Click rapidly
      for (let i = 0; i < 5; i++) {
        await firstCard.click({ delay: 50 });
      }
      
      // Should only register one card play
      await expect(page.getByText('Current Turn: Player 1')).toBeVisible();
      await expect(page.getByText('Cards Dealt: 5/6')).toBeVisible();
      
      // Game state should be consistent
      await expect(page.getByText('Game State: playing')).toBeVisible();
    }
  });

  test('should prevent actions during trick_complete state', async ({ page }) => {
    // Complete a trick
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      await player2Cards.first().click();
      await player1Cards.first().click();
    } else {
      await player1Cards.first().click();
      await player2Cards.first().click();
    }
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Players should not be able to play cards during trick_complete
    if (await player1Cards.count() > 0) {
      await player1Cards.first().click();
      
      // Should still be in trick_complete state
      await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    }
    
    // Betting buttons should not be available
    await expect(page.getByRole('button', { name: 'Truco', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Envido', exact: true })).not.toBeVisible();
    
    // Only Continue button should work
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  });

  test('should handle invalid escalation attempts', async ({ page }) => {
    // Test trying to escalate beyond Vale Cuatro
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Retruco' }).click();
    await page.getByRole('button', { name: 'Vale Cuatro' }).click();
    
    // Should be at maximum escalation
    await expect(page.getByText('Truco: 4 pts')).toBeVisible();
    
    // Only Quiero/No Quiero should be available
    await expect(page.getByRole('button', { name: 'Quiero' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No Quiero' })).toBeVisible();
    
    // No further escalation buttons should be visible
    await expect(page.getByRole('button', { name: 'Vale Cuatro' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Retruco' })).not.toBeVisible();
  });

  test('should prevent playing with no cards left', async ({ page }) => {
    // Play all cards in hand (3 tricks)
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    let tricksPlayed = 0;
    
    while (tricksPlayed < 3) {
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        if (await player2Cards.count() > 0) {
          await player2Cards.first().click();
        }
        if (await player1Cards.count() > 0) {
          await player1Cards.first().click();
        }
      } else {
        if (await player1Cards.count() > 0) {
          await player1Cards.first().click();
        }
        if (await player2Cards.count() > 0) {
          await player2Cards.first().click();
        }
      }
      
      if (await page.getByText('Game State: trick_complete').isVisible()) {
        await page.getByRole('button', { name: 'Continue' }).click();
        tricksPlayed++;
      }
      
      if (await page.getByText('Game State: round_complete').isVisible()) {
        break;
      }
    }
    
    // Should complete round when cards are exhausted
    if (!await page.getByText('Game State: round_complete').isVisible()) {
      await expect(page.getByText('Game State: round_complete')).toBeVisible();
    }
    
    // Players should have 0 cards
    await expect(page.getByText('Cards: 0')).toHaveCount(2);
  });

  test('should handle attempting to continue when round is not complete', async ({ page }) => {
    // Try to find and click continue button when not in trick_complete state
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    
    // Should not be visible during normal play
    await expect(continueBtn).not.toBeVisible();
    
    // Play one card to ensure we're still in playing state
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    if (await player2Cards.count() > 0) {
      await player2Cards.first().click();
      
      // Still playing, continue should not be available
      await expect(page.getByText('Game State: playing')).toBeVisible();
      await expect(continueBtn).not.toBeVisible();
    }
  });

  test('should prevent starting new round before current round is complete', async ({ page }) => {
    // Next Round button should not be available during play
    const nextRoundBtn = page.getByRole('button', { name: 'Next Round' });
    await expect(nextRoundBtn).not.toBeVisible();
    
    // Complete trick but not round
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      await player2Cards.first().click();
      await player1Cards.first().click();
    } else {
      await player1Cards.first().click();
      await player2Cards.first().click();
    }
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Next Round should still not be available
    await expect(nextRoundBtn).not.toBeVisible();
    
    // Only Continue should be available
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  });

  test('should handle browser refresh during game', async ({ page }) => {
    // Play some actions
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    if (await player2Cards.count() > 0) {
      await player2Cards.first().click();
    }
    
    // Refresh the page
    await page.reload();
    
    // Should return to initial state (or handle gracefully)
    await expect(page.getByText('Game State: idle')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
  });

  test('should prevent multiple simultaneous betting calls', async ({ page }) => {
    // Try to call both Envido and Truco quickly
    const envidoBtn = page.getByRole('button', { name: 'Envido', exact: true });
    const trucoBtn = page.getByRole('button', { name: 'Truco', exact: true });
    
    if (await envidoBtn.isVisible() && await trucoBtn.isVisible()) {
      // Click both rapidly
      await Promise.all([
        envidoBtn.click(),
        trucoBtn.click({ delay: 50 })
      ]);
      
      // Should only process one betting action
      const gameState = await page.getByText(/Game State:/).textContent();
      
      // Should be in either envido_betting or truco_betting, not both
      expect(gameState).toMatch(/envido_betting|truco_betting/);
      
      // Should not be in some invalid combined state
      await expect(page.getByText('envido_betting truco_betting')).not.toBeVisible();
    }
  });

  test('should handle edge case scoring scenarios', async ({ page }) => {
    // Test score near 30 points
    
    // Use multiple high-value rounds to approach 30 points
    let gameComplete = false;
    let rounds = 0;
    
    while (!gameComplete && rounds < 10) {
      // Call Vale Cuatro for maximum points
      await page.getByRole('button', { name: 'Truco', exact: true }).click();
      await page.getByRole('button', { name: 'Retruco' }).click();
      await page.getByRole('button', { name: 'Vale Cuatro' }).click();
      await page.getByRole('button', { name: 'Quiero' }).click();
      
      // Forfeit to complete round with 4 points
      await page.getByRole('button', { name: 'Mazo' }).click();
      
      // Check if game completed
      if (await page.getByText('Game State: game_complete').isVisible()) {
        gameComplete = true;
        
        // Verify winner and final score
        await expect(page.getByText(/Game Winner:/)).toBeVisible();
        
        const scoreText = await page.getByText(/Score: \d+ - \d+/).textContent();
        expect(scoreText).toMatch(/Score: (?:3[0-9]|[4-9][0-9]) - \d+|Score: \d+ - (?:3[0-9]|[4-9][0-9])/);
      } else {
        // Continue to next round
        await page.getByRole('button', { name: 'Next Round' }).click();
      }
      
      rounds++;
    }
    
    // Should eventually complete the game
    await expect(page.getByText('Game State: game_complete')).toBeVisible();
  });
});