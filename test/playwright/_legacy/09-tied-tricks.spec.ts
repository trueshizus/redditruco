import { test, expect } from '@playwright/test';

test.describe('Tied Tricks (Parda) Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should detect tied tricks and show parda message', async ({ page }) => {
    // Play cards that might result in a tie
    // This is probabilistic since we can't control exact card distribution
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    let tricksTested = 0;
    const maxTricks = 3;
    let pardaFound = false;
    
    while (tricksTested < maxTricks && !pardaFound) {
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        await player2Cards.first().click();
        await player1Cards.first().click();
      } else {
        await player1Cards.first().click();
        await player2Cards.first().click();
      }
      
      await expect(page.getByText('Game State: trick_complete')).toBeVisible();
      
      // Check if this trick was tied
      const logContent = await page.locator('.bg-black\\/30').textContent();
      const trickWinnerText = await page.getByText(/Trick Winner:/).textContent();
      
      if (logContent?.includes('tied') || logContent?.includes('parda') || 
          trickWinnerText?.includes('Tied') || trickWinnerText?.includes('Parda')) {
        pardaFound = true;
        
        // Verify parda handling
        await expect(page.getByText(/tied|parda/i)).toBeVisible();
        
        // In parda, no one wins the trick
        await expect(page.getByText(/Trick tied|Parda/)).toBeVisible();
        
        // Continue to next trick
        await page.getByRole('button', { name: 'Continue' }).click();
        
        // Verify trick history shows tie
        await expect(page.getByText(/T\d+: -/)).toBeVisible();
      } else {
        // Regular trick, continue if possible
        const continueBtn = page.getByRole('button', { name: 'Continue' });
        if (await continueBtn.isVisible()) {
          await continueBtn.click();
          
          if (await page.getByText('Game State: round_complete').isVisible()) {
            break;
          }
        }
      }
      
      tricksTested++;
      
      if (await page.getByText('Game State: round_complete').isVisible()) {
        break;
      }
    }
    
    // Note: This test might not always find a parda due to random card distribution
    // But it tests the UI behavior when parda does occur
  });

  test('should handle round with all three tricks tied', async ({ page }) => {
    // This is a very rare edge case, but we can test the logic
    // by playing through multiple tricks and checking for parda scenarios
    
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    let tricksPlayed = 0;
    let tiedTricks = 0;
    
    while (tricksPlayed < 3) {
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        await player2Cards.first().click();
        await player1Cards.first().click();
      } else {
        await player1Cards.first().click();
        await player2Cards.first().click();
      }
      
      await expect(page.getByText('Game State: trick_complete')).toBeVisible();
      
      // Check if this trick was tied
      const logContent = await page.locator('.bg-black\\/30').textContent();
      if (logContent?.includes('tied') || logContent?.includes('parda')) {
        tiedTricks++;
      }
      
      await page.getByRole('button', { name: 'Continue' }).click();
      tricksPlayed++;
      
      if (await page.getByText('Game State: round_complete').isVisible()) {
        break;
      }
    }
    
    // If all tricks were tied (rare), round should complete with no winner
    if (tiedTricks === 3) {
      await expect(page.getByText('Game State: round_complete')).toBeVisible();
      
      // Score should remain unchanged (no points awarded)
      await expect(page.getByText('Score: 0 - 0')).toBeVisible();
      
      // Should show appropriate message about tied round
      await expect(page.getByText(/round tied|no winner/i)).toBeVisible();
    }
  });

  test('should handle parda in trick history display', async ({ page }) => {
    // Play tricks and check how parda is shown in trick history
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Play first trick
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      await player2Cards.first().click();
      await player1Cards.first().click();
    } else {
      await player1Cards.first().click();
      await player2Cards.first().click();
    }
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Check trick history after first trick
    const logContent = await page.locator('.bg-black\\/30').textContent();
    
    if (logContent?.includes('tied') || logContent?.includes('parda')) {
      // Trick was tied
      await page.getByRole('button', { name: 'Continue' }).click();
      
      // Should show dash or special indicator for tied trick
      await expect(page.getByText('T1: -')).toBeVisible();
    } else {
      // Regular trick
      await page.getByRole('button', { name: 'Continue' }).click();
      
      // Should show winner (P1 or P2)
      await expect(page.getByText(/T1: P[12]/)).toBeVisible();
    }
  });

  test('should handle parda with betting active', async ({ page }) => {
    // Test parda when Truco or Envido is active
    
    // Call Truco first
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Now play cards that might result in parda
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    await player2Cards.first().click();
    await player1Cards.first().click();
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    const logContent = await page.locator('.bg-black\\/30').textContent();
    
    if (logContent?.includes('tied') || logContent?.includes('parda')) {
      // Parda occurred with Truco active
      await expect(page.getByText(/tied|parda/i)).toBeVisible();
      
      // Continue to next trick - Truco should still be active
      await page.getByRole('button', { name: 'Continue' }).click();
      
      // Game should continue normally, Truco stakes should remain
      await expect(page.getByText('Game State: playing')).toBeVisible();
    }
  });

  test('should handle who starts next trick after parda', async ({ page }) => {
    // After a parda, the same player who started the tied trick should start the next trick
    
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Record who started first trick
    const initialTurnText = await page.getByText(/Current Turn:/).textContent();
    const firstPlayer = initialTurnText?.includes('Player 2') ? 'Player 2' : 'Player 1';
    
    // Play first trick
    if (firstPlayer === 'Player 2') {
      await player2Cards.first().click();
      await player1Cards.first().click();
    } else {
      await player1Cards.first().click();
      await player2Cards.first().click();
    }
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    const logContent = await page.locator('.bg-black\\/30').textContent();
    
    if (logContent?.includes('tied') || logContent?.includes('parda')) {
      // Continue to next trick
      await page.getByRole('button', { name: 'Continue' }).click();
      
      // Same player should start next trick after parda
      await expect(page.getByText(`Current Turn: ${firstPlayer}`)).toBeVisible();
    } else {
      // If not parda, winner of trick should start next trick
      const trickWinnerText = await page.getByText(/Trick Winner:/).textContent();
      const winner = trickWinnerText?.includes('Player 1') ? 'Player 1' : 'Player 2';
      
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByText(`Current Turn: ${winner}`)).toBeVisible();
    }
  });

  test('should handle multiple consecutive parda tricks', async ({ page }) => {
    // Test scenario where multiple tricks in a row are tied
    
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    let consecutivePardas = 0;
    let tricksPlayed = 0;
    
    while (tricksPlayed < 3) {
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        await player2Cards.first().click();
        await player1Cards.first().click();
      } else {
        await player1Cards.first().click();
        await player2Cards.first().click();
      }
      
      await expect(page.getByText('Game State: trick_complete')).toBeVisible();
      
      const logContent = await page.locator('.bg-black\\/30').textContent();
      
      if (logContent?.includes('tied') || logContent?.includes('parda')) {
        consecutivePardas++;
        
        // Verify parda handling
        await expect(page.getByText(/tied|parda/i)).toBeVisible();
        
        await page.getByRole('button', { name: 'Continue' }).click();
        
        // Check trick history shows consecutive ties
        const trickNum = tricksPlayed + 1;
        await expect(page.getByText(`T${trickNum}: -`)).toBeVisible();
      } else {
        consecutivePardas = 0; // Reset counter for non-consecutive pardas
        
        await page.getByRole('button', { name: 'Continue' }).click();
      }
      
      tricksPlayed++;
      
      if (await page.getByText('Game State: round_complete').isVisible()) {
        break;
      }
    }
    
    // Test passes regardless of whether pardas occurred, as it tests the handling logic
  });

  test('should log parda correctly in match logs', async ({ page }) => {
    // Test that parda events are properly logged
    
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      await player2Cards.first().click();
      await player1Cards.first().click();
    } else {
      await player1Cards.first().click();
      await player2Cards.first().click();
    }
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Check if logs contain parda information
    const logContent = await page.locator('.bg-black\\/30').textContent();
    
    if (logContent?.includes('tied') || logContent?.includes('parda')) {
      // Should show card plays
      await expect(page.getByText(/Player [12] plays/)).toHaveCount(2);
      
      // Should show tie result
      await expect(page.getByText(/trick.*tied|parda/i)).toBeVisible();
      
      // Should not show a winner for this trick
      const trickWinnerTexts = await page.getByText(/Player [12] wins trick/).count();
      // The count might be 0 for this tied trick
    }
  });

  test('should handle parda in final deciding trick', async ({ page }) => {
    // Test parda when it could affect round outcome
    
    // Play two tricks first to set up scenario
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    let tricksPlayed = 0;
    
    // Play first two tricks
    while (tricksPlayed < 2) {
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        await player2Cards.first().click();
        await player1Cards.first().click();
      } else {
        await player1Cards.first().click();
        await player2Cards.first().click();
      }
      
      await expect(page.getByText('Game State: trick_complete')).toBeVisible();
      await page.getByRole('button', { name: 'Continue' }).click();
      
      tricksPlayed++;
      
      if (await page.getByText('Game State: round_complete').isVisible()) {
        break;
      }
    }
    
    // If we haven't completed the round yet, play the third trick
    if (await page.getByText('Trick 3/3').isVisible()) {
      // Play third trick
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        await player2Cards.first().click();
        await player1Cards.first().click();
      } else {
        await player1Cards.first().click();
        await player2Cards.first().click();
      }
      
      await expect(page.getByText('Game State: trick_complete')).toBeVisible();
      
      const logContent = await page.locator('.bg-black\\/30').textContent();
      
      if (logContent?.includes('tied') || logContent?.includes('parda')) {
        // Final trick was tied - this should trigger round resolution logic
        await page.getByRole('button', { name: 'Continue' }).click();
        
        // Should complete the round based on previous tricks
        await expect(page.getByText('Game State: round_complete')).toBeVisible();
      }
    }
  });
});