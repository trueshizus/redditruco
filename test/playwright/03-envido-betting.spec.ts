import { test, expect } from '@playwright/test';

test.describe('Envido Betting System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should call Envido and transition to envido_betting state', async ({ page }) => {
    // Player 2 (mano) calls Envido
    await page.getByRole('button', { name: 'Envido', exact: true }).click();
    
    // Should transition to envido_betting state
    await expect(page.getByText('Game State: envido_betting')).toBeVisible();
    
    // Should show envido stake
    await expect(page.getByText('Envido: 2 pts')).toBeVisible();
    
    // Should show response buttons for Player 1
    await expect(page.getByRole('button', { name: 'Quiero' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No Quiero' })).toBeVisible();
    
    // Should log the envido call
    await expect(page.getByText('Player 2 calls Envido (2 points)')).toBeVisible();
  });

  test('should accept Envido and calculate points correctly', async ({ page }) => {
    // Call Envido
    await page.getByRole('button', { name: 'Envido', exact: true }).click();
    await expect(page.getByText('Game State: envido_betting')).toBeVisible();
    
    // Accept Envido
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Should return to playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Should show envido resolution in logs
    await expect(page.getByText(/Envido accepted/)).toBeVisible();
    await expect(page.getByText(/Player [12]: \d+, Player [12]: \d+/)).toBeVisible();
    await expect(page.getByText(/Player [12] wins and scores 2 points/)).toBeVisible();
    
    // Score should be updated (either 2-0 or 0-2)
    const scoreText = await page.getByText(/Score: \d+ - \d+/).textContent();
    expect(scoreText).toMatch(/Score: [02] - [02]/);
  });

  test('should reject Envido and award 1 point to caller', async ({ page }) => {
    // Call Envido
    await page.getByRole('button', { name: 'Envido', exact: true }).click();
    await expect(page.getByText('Game State: envido_betting')).toBeVisible();
    
    // Reject Envido
    await page.getByRole('button', { name: 'No Quiero' }).click();
    
    // Should return to playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Should show envido declined in logs
    await expect(page.getByText('Envido declined. Player 2 scores 1 point')).toBeVisible();
    
    // Score should be 0-1 (Player 2 gets 1 point)
    await expect(page.getByText('Score: 0 - 1')).toBeVisible();
  });

  test('should call Real Envido with correct stake', async ({ page }) => {
    // Call Real Envido
    await page.getByRole('button', { name: 'Real Envido' }).click();
    
    // Should transition to envido_betting state
    await expect(page.getByText('Game State: envido_betting')).toBeVisible();
    
    // Should show correct stake
    await expect(page.getByText('Envido: 3 pts')).toBeVisible();
    
    // Should log the call
    await expect(page.getByText('Player 2 calls Real Envido (3 points)')).toBeVisible();
  });

  test('should call Falta Envido with calculated stake', async ({ page }) => {
    // Call Falta Envido
    await page.getByRole('button', { name: 'Falta Envido' }).click();
    
    // Should transition to envido_betting state
    await expect(page.getByText('Game State: envido_betting')).toBeVisible();
    
    // Should show falta envido stake (30 points - max current score)
    await expect(page.getByText(/Envido: \d+ pts/)).toBeVisible();
    
    // Should log the call with calculated points
    await expect(page.getByText(/Player 2 calls Falta Envido \(\d+ points\)/)).toBeVisible();
  });

  test('should only allow Envido calls before first trick', async ({ page }) => {
    // Play one card to start the trick
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    await player2Cards.first().click();
    
    // Envido buttons should still be available for Player 1 (before any cards in play)
    // But once a card is played, envido should not be callable in next state
    
    // Complete the trick
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    await player1Cards.first().click();
    
    // Continue to next trick
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // In trick 2, envido should not be available since trick 1 had cards played
    await expect(page.getByText('Trick 2/3')).toBeVisible();
    
    // Envido buttons should not be visible for current player
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    if (currentTurnText?.includes('Player 1')) {
      const envidoButton = page.locator('main > div:nth-child(3)').getByRole('button', { name: 'Envido', exact: true });
      await expect(envidoButton).not.toBeVisible();
    } else {
      const envidoButton = page.locator('main > div:nth-child(1)').getByRole('button', { name: 'Envido', exact: true });
      await expect(envidoButton).not.toBeVisible();
    }
  });

  test('should prevent Envido after Truco is called', async ({ page }) => {
    // Call Truco first
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    if (currentTurnText?.includes('Player 2')) {
      await page.getByRole('button', { name: 'Truco', exact: true }).click();
    } else {
      // If Player 1 is current, we need to wait or switch turns
      // For this test, let's assume Player 2 is mano and calls Truco
      await page.getByRole('button', { name: 'Truco', exact: true }).click();
    }
    
    // Should be in truco_betting state
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    
    // Accept Truco to return to playing
    await page.getByRole('button', { name: 'Quiero' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Now Envido should not be callable by either player
    // Check that envido buttons are not visible
    const player1EnvidoBtn = page.locator('main > div:nth-child(3)').getByRole('button', { name: 'Envido', exact: true });
    const player2EnvidoBtn = page.locator('main > div:nth-child(1)').getByRole('button', { name: 'Envido', exact: true });
    
    await expect(player1EnvidoBtn).not.toBeVisible();
    await expect(player2EnvidoBtn).not.toBeVisible();
  });
});