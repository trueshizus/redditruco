import { test, expect } from '@playwright/test';

test.describe('Truco Betting System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should call Truco and transition to truco_betting state', async ({ page }) => {
    // Player 2 (mano) calls Truco
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    
    // Should transition to truco_betting state
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    
    // Should show truco stake
    await expect(page.getByText('Truco: 2 pts')).toBeVisible();
    
    // Should show response buttons for Player 1
    await expect(page.getByRole('button', { name: 'Quiero' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No Quiero' })).toBeVisible();
    
    // Should log the truco call
    await expect(page.getByText('Player 2 calls Truco (2 points)')).toBeVisible();
  });

  test('should accept Truco and continue playing', async ({ page }) => {
    // Call Truco
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    
    // Accept Truco
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Should return to playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Should show truco acceptance in logs
    await expect(page.getByText('Truco accepted. Round is now worth 2 points')).toBeVisible();
    
    // Round stake should be updated
    await expect(page.getByText('Truco: 2 pts')).not.toBeVisible(); // Should clear betting display
  });

  test('should reject Truco and award points to caller', async ({ page }) => {
    // Call Truco
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    
    // Reject Truco
    await page.getByRole('button', { name: 'No Quiero' }).click();
    
    // Should go to round_complete state
    await expect(page.getByText('Game State: round_complete')).toBeVisible();
    
    // Should show truco declined in logs
    await expect(page.getByText('Truco declined. Player 2 wins the round and scores 1 points')).toBeVisible();
    
    // Should show round winner
    await expect(page.getByText('Round Winner: Player 2')).toBeVisible();
    
    // Score should be updated (Player 2 gets 1 point)
    await expect(page.getByText('Score: 0 - 1')).toBeVisible();
  });

  test('should escalate Truco to Retruco', async ({ page }) => {
    // Call Truco
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    
    // Instead of accepting, call Retruco
    await page.getByRole('button', { name: 'Retruco' }).click();
    
    // Should still be in truco_betting state but with higher stake
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    await expect(page.getByText('Truco: 3 pts')).toBeVisible();
    
    // Should log the retruco call
    await expect(page.getByText('Player 1 calls Retruco (3 points)')).toBeVisible();
    
    // Now Player 2 should have response options
    await expect(page.getByRole('button', { name: 'Quiero' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No Quiero' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vale Cuatro' })).toBeVisible();
  });

  test('should escalate Retruco to Vale Cuatro', async ({ page }) => {
    // Call Truco
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    
    // Call Retruco
    await page.getByRole('button', { name: 'Retruco' }).click();
    await expect(page.getByText('Truco: 3 pts')).toBeVisible();
    
    // Call Vale Cuatro
    await page.getByRole('button', { name: 'Vale Cuatro' }).click();
    
    // Should have maximum stake
    await expect(page.getByText('Truco: 4 pts')).toBeVisible();
    
    // Should log the vale cuatro call
    await expect(page.getByText('Player 2 calls Vale Cuatro (4 points)')).toBeVisible();
    
    // Now only Quiero/No Quiero should be available (no more escalation)
    await expect(page.getByRole('button', { name: 'Quiero' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No Quiero' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vale Cuatro' })).not.toBeVisible();
  });

  test('should allow Truco calls during any trick', async ({ page }) => {
    // Play first trick partially
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    await player2Cards.first().click();
    
    // Player 1 can call Truco instead of playing a card
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Should return to playing state where Player 1 still needs to play
    await expect(page.getByText('Game State: playing')).toBeVisible();
    await expect(page.getByText('Current Turn: Player 1')).toBeVisible();
  });

  test('should handle complete betting sequence', async ({ page }) => {
    // Full escalation: Truco → Retruco → Vale Cuatro → Accept
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    
    await page.getByRole('button', { name: 'Retruco' }).click();
    await expect(page.getByText('Player 1 calls Retruco (3 points)')).toBeVisible();
    
    await page.getByRole('button', { name: 'Vale Cuatro' }).click();
    await expect(page.getByText('Player 2 calls Vale Cuatro (4 points)')).toBeVisible();
    
    await page.getByRole('button', { name: 'Quiero' }).click();
    await expect(page.getByText('Truco accepted. Round is now worth 4 points')).toBeVisible();
    
    // Should return to playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // When round completes, should award 4 points to winner
    // Let's play out the round to test this
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    // Play remaining cards to complete a trick
    await player2Cards.first().click();
    await player1Cards.first().click();
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Continue playing until round ends (this is a simplified test)
    // In a real scenario, we'd need to play strategically to win
  });

  test('should prevent double betting by same player', async ({ page }) => {
    // Player 2 calls Truco
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    
    // Player 2 should not see betting buttons anymore (awaiting response)
    const player2TrucoBtn = page.locator('main > div:nth-child(1)').getByRole('button', { name: 'Truco', exact: true });
    await expect(player2TrucoBtn).not.toBeVisible();
    
    // Only Player 1 should see response options
    await expect(page.locator('main > div:nth-child(3)').getByRole('button', { name: 'Quiero' })).toBeVisible();
    await expect(page.locator('main > div:nth-child(3)').getByRole('button', { name: 'No Quiero' })).toBeVisible();
  });
});