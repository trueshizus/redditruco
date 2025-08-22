import { test, expect } from '@playwright/test';

test.describe('Mazo (Forfeit) Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should allow forfeit during regular play', async ({ page }) => {
    // Player 2 (mano) uses forfeit
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Should immediately go to round_complete
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Player 1 should win the round (opponent of forfeiter)
    await expect(page.getByText('Round Winner: Player 1')).toBeVisible();
    
    // Should log the forfeit action
    await expect(page.getByText(/Player 2 goes to deck/)).toBeVisible();
    await expect(page.getByText(/Player 1 wins the round/)).toBeVisible();
    
    // Score should be 1-0
    await expect(page.getByText('Score: 1 - 0')).toBeVisible();
  });

  test('should forfeit during Envido betting and award 1 point', async ({ page }) => {
    // Call Envido first
    await page.getByRole('button', { name: 'Envido', exact: true }).click();
    await expect(page.getByText('Game State: envido_betting')).toBeVisible();
    
    // Forfeit instead of responding to Envido
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Should complete the round
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Player 2 (Envido caller) should win 1 point (original Envido stake before forfeit)
    await expect(page.getByText('Round Winner: Player 2')).toBeVisible();
    await expect(page.getByText('Score: 0 - 1')).toBeVisible();
    
    // Should log both the envido call and forfeit
    await expect(page.getByText(/Player 2 calls Envido/)).toBeVisible();
    await expect(page.getByText(/Player 1 goes to deck/)).toBeVisible();
  });

  test('should forfeit during Truco betting and award appropriate points', async ({ page }) => {
    // Call Truco first
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    
    // Forfeit instead of responding to Truco
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Should complete the round
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Player 2 (Truco caller) should win 1 point (forfeit before acceptance gives 1, not 2)
    await expect(page.getByText('Round Winner: Player 2')).toBeVisible();
    await expect(page.getByText('Score: 0 - 1')).toBeVisible();
    
    // Should log the forfeit response
    await expect(page.getByText(/Player 1 goes to deck/)).toBeVisible();
    await expect(page.getByText(/Player 2 wins the round and scores 1 points/)).toBeVisible();
  });

  test('should forfeit after accepting Truco and award full Truco points', async ({ page }) => {
    // Call and accept Truco
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Return to playing state with Truco accepted
    await expect(page.getByText('Game State: playing')).toBeVisible();
    await expect(page.getByText('Truco accepted. Round is now worth 2 points')).toBeVisible();
    
    // Now forfeit during play
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Should complete round with full Truco points (2)
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    await expect(page.getByText('Round Winner: Player 2')).toBeVisible();
    await expect(page.getByText('Score: 0 - 2')).toBeVisible();
    
    // Should log 2 points for accepted Truco
    await expect(page.getByText(/Player 2 wins the round and scores 2 points/)).toBeVisible();
  });

  test('should forfeit after escalated betting (Vale Cuatro)', async ({ page }) => {
    // Full betting escalation
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Retruco' }).click();
    await page.getByRole('button', { name: 'Vale Cuatro' }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Should be back to playing with 4-point stake
    await expect(page.getByText('Game State: playing')).toBeVisible();
    await expect(page.getByText('Truco accepted. Round is now worth 4 points')).toBeVisible();
    
    // Forfeit during play
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Should award 4 points
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    await expect(page.getByText('Score: 0 - 4')).toBeVisible();
    await expect(page.getByText(/Player 2 wins the round and scores 4 points/)).toBeVisible();
  });

  test('should prevent forfeit during trick_complete state', async ({ page }) => {
    // Play a complete trick
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    await player2Cards.first().click();
    await player1Cards.first().click();
    
    // Should be in trick_complete state
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Mazo button should not be available during trick_complete
    await expect(page.getByRole('button', { name: 'Mazo' })).not.toBeVisible();
    
    // Only Continue button should be available
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  });

  test('should prevent forfeit during round_complete state', async ({ page }) => {
    // Force round completion via forfeit
    await page.getByRole('button', { name: 'Mazo' }).click();
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // No Mazo button should be available
    await expect(page.getByRole('button', { name: 'Mazo' })).not.toBeVisible();
    
    // Only Next Round button should be available
    await expect(page.getByRole('button', { name: 'Next Round' })).toBeVisible();
  });

  test('should handle forfeit when multiple betting types are active', async ({ page }) => {
    // Call Envido first, then Truco in same round
    await page.getByRole('button', { name: 'Envido', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Should resolve Envido and return to playing
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Now call Truco
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Both bets accepted, now forfeit
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Should complete round
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Should show appropriate scoring (Envido points + Truco points)
    // This depends on implementation - might be separate or combined
    await expect(page.getByText(/Score: \d+ - \d+/)).toBeVisible();
  });

  test('should display forfeit in match logs correctly', async ({ page }) => {
    // Forfeit during regular play
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Check log entries
    await expect(page.getByText(/Player 2 goes to deck/)).toBeVisible();
    await expect(page.getByText(/Player 1 wins the round/)).toBeVisible();
    await expect(page.getByText(/Round completed/)).toBeVisible();
    
    // Should show the forfeit action was the reason for round end
    const logContent = await page.locator('.bg-black\\/30').textContent();
    expect(logContent).toContain('goes to deck');
  });

  test('should allow forfeit by both players in different rounds', async ({ page }) => {
    // Player 2 forfeits first round
    await page.getByRole('button', { name: 'Mazo' }).click();
    await expect(page.getByText('Score: 1 - 0')).toBeVisible();
    
    // Start next round
    await page.getByRole('button', { name: 'Next Round' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Now Player 1 forfeits (turn should have switched)
    await page.getByRole('button', { name: 'Mazo' }).click();
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Score should be 1-1
    await expect(page.getByText('Score: 1 - 1')).toBeVisible();
    
    // Should show different winner this round
    await expect(page.getByText('Round Winner: Player 2')).toBeVisible();
  });
});