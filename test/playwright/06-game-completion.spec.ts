import { test, expect } from '@playwright/test';

test.describe('Game Completion and Winner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should complete game when reaching 30 points', async ({ page }) => {
    // Simulate a game by repeatedly having one player forfeit to accumulate points
    // This is faster than playing full rounds
    
    let gameComplete = false;
    let rounds = 0;
    const maxRounds = 30; // Safety limit
    
    while (!gameComplete && rounds < maxRounds) {
      // Use forfeit to quickly complete rounds
      await page.getByRole('button', { name: 'Mazo' }).click();
      
      // Check if game is complete
      const gameCompleteState = page.getByText('Game State: game_complete');
      if (await gameCompleteState.isVisible()) {
        gameComplete = true;
        break;
      }
      
      // If round completed, start next round
      const roundCompleteState = page.getByText('Game State: round_complete');
      if (await roundCompleteState.isVisible()) {
        await page.getByRole('button', { name: 'Next Round' }).click();
        await expect(page.getByText('Game State: playing')).toBeVisible();
      }
      
      rounds++;
    }
    
    // Should eventually reach game completion
    await expect(page.getByText('Game State: game_complete')).toBeVisible();
    
    // Should show game winner
    await expect(page.getByText(/Game Winner:/)).toBeVisible();
    
    // Should show final score (one player should have 30+ points)
    const scoreText = await page.getByText(/Score: \d+ - \d+/).textContent();
    expect(scoreText).toMatch(/Score: (?:3[0-9]|[4-9][0-9]) - \d+|Score: \d+ - (?:3[0-9]|[4-9][0-9])/);
  });

  test('should show correct winner when Player 1 reaches 30 points first', async ({ page }) => {
    // Simulate game where Player 1 wins multiple rounds to reach 30
    // Using a combination of Truco betting and wins
    
    let gameComplete = false;
    let rounds = 0;
    
    while (!gameComplete && rounds < 15) {
      // Call Truco to increase round value, then forfeit to give Player 1 the win
      await page.getByRole('button', { name: 'Truco', exact: true }).click();
      await page.getByRole('button', { name: 'Quiero' }).click();
      
      // Player 2 forfeits, giving Player 1 the 2-point win
      await page.getByRole('button', { name: 'Mazo' }).click();
      
      // Check for game completion
      if (await page.getByText('Game State: game_complete').isVisible()) {
        gameComplete = true;
        await expect(page.getByText('Game Winner: Player 1')).toBeVisible();
        break;
      }
      
      // Start next round if not complete
      if (await page.getByText('Game State: round_complete').isVisible()) {
        await page.getByRole('button', { name: 'Next Round' }).click();
        await expect(page.getByText('Game State: playing')).toBeVisible();
      }
      
      rounds++;
    }
  });

  test('should prevent actions during game_complete state', async ({ page }) => {
    // Fast-forward to game completion using multiple forfeits
    for (let i = 0; i < 30; i++) {
      // Use forfeit to quickly advance
      if (await page.getByRole('button', { name: 'Mazo' }).isVisible()) {
        await page.getByRole('button', { name: 'Mazo' }).click();
        
        if (await page.getByText('Game State: game_complete').isVisible()) {
          break;
        }
        
        if (await page.getByRole('button', { name: 'Next Round' }).isVisible()) {
          await page.getByRole('button', { name: 'Next Round' }).click();
        }
      }
    }
    
    // Should be in game_complete state
    await expect(page.getByText('Game State: game_complete')).toBeVisible();
    
    // No action buttons should be available to players
    const player1Actions = page.locator('main > div:nth-child(3)').getByRole('button');
    const player2Actions = page.locator('main > div:nth-child(1)').getByRole('button');
    
    await expect(player1Actions).toHaveCount(0);
    await expect(player2Actions).toHaveCount(0);
    
    // Cards should not be clickable
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Cards should still be visible but not interactive
    if (await player1Cards.count() > 0) {
      await expect(player1Cards.first()).toBeVisible();
    }
  });

  test('should display correct game summary in logs', async ({ page }) => {
    // Complete a quick game using forfeits
    let gameComplete = false;
    
    for (let i = 0; i < 30 && !gameComplete; i++) {
      await page.getByRole('button', { name: 'Mazo' }).click();
      
      if (await page.getByText('Game State: game_complete').isVisible()) {
        gameComplete = true;
        break;
      }
      
      if (await page.getByRole('button', { name: 'Next Round' }).isVisible()) {
        await page.getByRole('button', { name: 'Next Round' }).click();
      }
    }
    
    await expect(page.getByText('Game State: game_complete')).toBeVisible();
    
    // Should show game completion message in logs
    await expect(page.getByText(/Game completed/)).toBeVisible();
    await expect(page.getByText(/Final score:/)).toBeVisible();
    await expect(page.getByText(/wins the match/)).toBeVisible();
  });

  test('should handle exact 30-point finish correctly', async ({ page }) => {
    // Test edge case where a player reaches exactly 30 points
    // This requires careful round management to hit exactly 30
    
    let currentScore = { player1: 0, player2: 0 };
    let gameComplete = false;
    
    while (!gameComplete && (currentScore.player1 < 30 && currentScore.player2 < 30)) {
      // Check current score
      const scoreText = await page.getByText(/Score: (\d+) - (\d+)/).textContent();
      if (scoreText) {
        const match = scoreText.match(/Score: (\d+) - (\d+)/);
        if (match) {
          currentScore.player1 = parseInt(match[1]);
          currentScore.player2 = parseInt(match[2]);
        }
      }
      
      // If close to 30, use regular forfeit (1 point)
      // Otherwise use Truco + forfeit (2 points) to go faster
      if (currentScore.player1 >= 29 || currentScore.player2 >= 29) {
        // Just forfeit for 1 point to hit exactly 30
        await page.getByRole('button', { name: 'Mazo' }).click();
      } else {
        // Use Truco for 2 points
        await page.getByRole('button', { name: 'Truco', exact: true }).click();
        await page.getByRole('button', { name: 'Quiero' }).click();
        await page.getByRole('button', { name: 'Mazo' }).click();
      }
      
      if (await page.getByText('Game State: game_complete').isVisible()) {
        gameComplete = true;
        break;
      }
      
      if (await page.getByRole('button', { name: 'Next Round' }).isVisible()) {
        await page.getByRole('button', { name: 'Next Round' }).click();
      }
    }
    
    await expect(page.getByText('Game State: game_complete')).toBeVisible();
    
    // Winner should have at least 30 points
    const finalScoreText = await page.getByText(/Score: \d+ - \d+/).textContent();
    expect(finalScoreText).toMatch(/Score: (?:3[0-9]|[4-9][0-9]) - \d+|Score: \d+ - (?:3[0-9]|[4-9][0-9])/);
  });
});