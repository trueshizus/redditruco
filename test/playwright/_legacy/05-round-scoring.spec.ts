import { test, expect } from '@playwright/test';

test.describe('Round Completion and Scoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should complete round when player wins 2 tricks', async ({ page }) => {
    // This test simulates a round where we try to get one player to win 2 tricks
    let tricksWon = { player1: 0, player2: 0 };
    
    for (let trick = 1; trick <= 3; trick++) {
      // Play a complete trick
      const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
      const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
      
      // Check current turn and play accordingly
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        await player2Cards.first().click();
        await player1Cards.first().click();
      } else {
        await player1Cards.first().click();
        await player2Cards.first().click();
      }
      
      // Wait for trick completion
      await expect(page.getByText('Game State: trick_complete')).toBeVisible();
      
      // Check who won this trick
      const trickWinnerText = await page.getByText(/Trick Winner:/).textContent();
      if (trickWinnerText?.includes('Player 1')) {
        tricksWon.player1++;
      } else if (trickWinnerText?.includes('Player 2')) {
        tricksWon.player2++;
      }
      
      // Continue to next state
      await page.getByRole('button', { name: 'Continue' }).click();
      
      // If someone won 2 tricks, round should end
      if (tricksWon.player1 >= 2 || tricksWon.player2 >= 2) {
        await expect(page.getByText('Game State: round_complete')).toBeVisible();
        
        if (tricksWon.player1 >= 2) {
          await expect(page.getByText('Round Winner: Player 1')).toBeVisible();
        } else {
          await expect(page.getByText('Round Winner: Player 2')).toBeVisible();
        }
        
        // Should show Next Round button
        await expect(page.getByRole('button', { name: 'Next Round' })).toBeVisible();
        break;
      }
      
      // Otherwise continue to next trick
      await expect(page.getByText(`Trick ${trick + 1}/3`)).toBeVisible();
    }
  });

  test('should update score correctly after round completion', async ({ page }) => {
    // Force a round completion by using Mazo (forfeit)
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Should go to round_complete
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Should show round winner (opponent of who used Mazo)
    // Player 2 is current turn initially, so if Player 2 uses Mazo, Player 1 wins
    await expect(page.getByText('Round Winner: Player 1')).toBeVisible();
    
    // Score should be updated to 1-0
    await expect(page.getByText('Score: 1 - 0')).toBeVisible();
    
    // Should show correct log
    await expect(page.getByText(/goes to deck.*wins the round/)).toBeVisible();
  });

  test('should start next round with correct dealer rotation', async ({ page }) => {
    // Complete first round using forfeit
    await page.getByRole('button', { name: 'Mazo' }).click();
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Start next round
    await page.getByRole('button', { name: 'Next Round' }).click();
    
    // Should be in playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Dealer and mano should have switched
    await expect(page.getByText('Dealer: Player 2')).toBeVisible();
    await expect(page.getByText('Mano: Player 1')).toBeVisible();
    
    // Current turn should be the new mano
    await expect(page.getByText('Current Turn: Player 1')).toBeVisible();
    
    // Should show new round in logs
    await expect(page.getByText('--- Starting new round ---')).toBeVisible();
  });

  test('should track trick history correctly', async ({ page }) => {
    // Play first trick
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    await player2Cards.first().click();
    await player1Cards.first().click();
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Check trick winner is recorded
    const trickWinnerText = await page.getByText(/Trick Winner:/).textContent();
    const expectedWinner = trickWinnerText?.includes('Player 1') ? 'P1' : 'P2';
    
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Should show trick history
    await expect(page.getByText(`T1: ${expectedWinner}`)).toBeVisible();
    await expect(page.getByText('T2: -')).toBeVisible();
    await expect(page.getByText('T3: -')).toBeVisible();
  });

  test('should handle tied tricks (parda)', async ({ page }) => {
    // This is harder to test deterministically since card hierarchy determines winners
    // But we can test the UI behavior when tricks are tied
    
    // Play cards and check for parda in logs
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    await player2Cards.first().click();
    await player1Cards.first().click();
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Check if this was a tied trick
    const trickWinnerText = await page.getByText(/Trick Winner:/).textContent();
    const logText = await page.locator('.bg-black\\/30').textContent();
    
    if (logText?.includes('tied') || logText?.includes('parda')) {
      await expect(page.getByText('Trick Tied (Parda)')).toBeVisible();
    } else {
      await expect(page.getByText(/Trick Winner: Player [12]/)).toBeVisible();
    }
  });

  test('should award correct points for different round stakes', async ({ page }) => {
    // Test with Truco accepted (2 points)
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Use forfeit to quickly end round
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Winner should get 2 points (Truco stake)
    await expect(page.getByText('Score: 2 - 0')).toBeVisible();
    
    // Log should mention the correct points
    await expect(page.getByText(/wins the round.*2 points/)).toBeVisible();
  });

  test('should prevent actions during round_complete state', async ({ page }) => {
    // Complete a round
    await page.getByRole('button', { name: 'Mazo' }).click();
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Players should not have action buttons visible
    const player1Actions = page.locator('main > div:nth-child(3)').getByRole('button').filter({ hasNotText: 'Next Round' });
    const player2Actions = page.locator('main > div:nth-child(1)').getByRole('button').filter({ hasNotText: 'Next Round' });
    
    // Only Next Round button should be available
    await expect(page.getByRole('button', { name: 'Next Round' })).toBeVisible();
    await expect(player1Actions).toHaveCount(0);
    await expect(player2Actions).toHaveCount(0);
  });
});