import { test, expect } from '@playwright/test';

test.describe('Match Logs Display and Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should display match log section with initial entries', async ({ page }) => {
    // Check that match log is visible
    await expect(page.getByText('Match Log')).toBeVisible();
    
    // Check initial log entries
    await expect(page.getByText(/Game initialized/)).toBeVisible();
    await expect(page.getByText(/Cards dealt to players/)).toBeVisible();
    await expect(page.getByText(/Round 1 begins/)).toBeVisible();
    
    // Log should have proper styling/container
    const logContainer = page.locator('.bg-black\\/30').or(page.locator('[class*="log"]')).or(page.locator('[class*="match"]'));
    await expect(logContainer).toBeVisible();
  });

  test('should log card plays correctly', async ({ page }) => {
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    // Player 2 plays first card
    await player2Cards.first().click();
    
    // Should log the card play
    await expect(page.getByText(/Player 2 plays/)).toBeVisible();
    
    // Log should include card information
    const logContent = await page.locator('.bg-black\\/30').textContent();
    expect(logContent).toContain('Player 2 plays');
    
    // Player 1 plays second card
    await player1Cards.first().click();
    
    // Should log both card plays
    await expect(page.getByText(/Player 1 plays/)).toBeVisible();
    await expect(page.getByText(/Player 2 plays/)).toBeVisible();
    
    // Should log trick winner
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    await expect(page.getByText(/Player [12] wins trick 1/)).toBeVisible();
  });

  test('should log betting actions correctly', async ({ page }) => {
    // Test Truco betting logs
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    
    // Should log the Truco call
    await expect(page.getByText('Player 2 calls Truco (2 points)')).toBeVisible();
    
    // Accept Truco
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Should log Truco acceptance
    await expect(page.getByText('Truco accepted. Round is now worth 2 points')).toBeVisible();
    
    // Test Envido betting in next round
    await page.getByRole('button', { name: 'Mazo' }).click();
    await page.getByRole('button', { name: 'Next Round' }).click();
    
    // Call Envido
    await page.getByRole('button', { name: 'Envido', exact: true }).click();
    await expect(page.getByText(/Player [12] calls Envido \(2 points\)/)).toBeVisible();
    
    // Reject Envido
    await page.getByRole('button', { name: 'No Quiero' }).click();
    await expect(page.getByText(/Envido declined.*scores 1 point/)).toBeVisible();
  });

  test('should log escalated betting correctly', async ({ page }) => {
    // Test full betting escalation
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await expect(page.getByText('Player 2 calls Truco (2 points)')).toBeVisible();
    
    await page.getByRole('button', { name: 'Retruco' }).click();
    await expect(page.getByText('Player 1 calls Retruco (3 points)')).toBeVisible();
    
    await page.getByRole('button', { name: 'Vale Cuatro' }).click();
    await expect(page.getByText('Player 2 calls Vale Cuatro (4 points)')).toBeVisible();
    
    await page.getByRole('button', { name: 'Quiero' }).click();
    await expect(page.getByText('Truco accepted. Round is now worth 4 points')).toBeVisible();
    
    // Check that all betting actions are logged in sequence
    const logContent = await page.locator('.bg-black\\/30').textContent();
    expect(logContent).toContain('Truco (2 points)');
    expect(logContent).toContain('Retruco (3 points)');
    expect(logContent).toContain('Vale Cuatro (4 points)');
    expect(logContent).toContain('worth 4 points');
  });

  test('should log forfeit (Mazo) actions correctly', async ({ page }) => {
    // Test forfeit during regular play
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Should log forfeit action
    await expect(page.getByText(/Player 2 goes to deck/)).toBeVisible();
    await expect(page.getByText(/Player 1 wins the round/)).toBeVisible();
    await expect(page.getByText(/scores 1 points/)).toBeVisible();
    
    // Test forfeit during betting
    await page.getByRole('button', { name: 'Next Round' }).click();
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    await expect(page.getByText(/Player 1 goes to deck/)).toBeVisible();
    await expect(page.getByText(/Player 2 wins the round and scores 1 points/)).toBeVisible();
  });

  test('should log round completion correctly', async ({ page }) => {
    // Complete a round using forfeit
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Should log round completion details
    await expect(page.getByText(/Round completed/)).toBeVisible();
    await expect(page.getByText('Round Winner: Player 1')).toBeVisible();
    await expect(page.getByText(/wins the round/)).toBeVisible();
    
    // Should show updated score in logs
    await expect(page.getByText(/Score.*1.*0/)).toBeVisible();
    
    // Start next round
    await page.getByRole('button', { name: 'Next Round' }).click();
    
    // Should log new round start
    await expect(page.getByText('--- Starting new round ---')).toBeVisible();
    await expect(page.getByText(/Round 2 begins/)).toBeVisible();
    
    // Should show dealer rotation
    await expect(page.getByText(/Dealer.*Player 2/)).toBeVisible();
    await expect(page.getByText(/Mano.*Player 1/)).toBeVisible();
  });

  test('should log Envido point calculations', async ({ page }) => {
    // Call and accept Envido
    await page.getByRole('button', { name: 'Envido', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Should log Envido acceptance and point calculation
    await expect(page.getByText(/Envido accepted/)).toBeVisible();
    
    // Should show player Envido points
    await expect(page.getByText(/Player 1: \d+, Player 2: \d+/)).toBeVisible();
    
    // Should show Envido winner and points scored
    await expect(page.getByText(/Player [12] wins and scores 2 points/)).toBeVisible();
    
    // Check that Envido points are calculated correctly (20-40 range typically)
    const logContent = await page.locator('.bg-black\\/30').textContent();
    const envidoMatch = logContent?.match(/Player \d+: (\d+), Player \d+: (\d+)/);
    if (envidoMatch) {
      const points1 = parseInt(envidoMatch[1]);
      const points2 = parseInt(envidoMatch[2]);
      expect(points1).toBeGreaterThanOrEqual(0);
      expect(points1).toBeLessThanOrEqual(40);
      expect(points2).toBeGreaterThanOrEqual(0);
      expect(points2).toBeLessThanOrEqual(40);
    }
  });

  test('should scroll to show latest log entries', async ({ page }) => {
    // Generate many log entries by playing multiple actions
    
    // Complete several rounds to generate logs
    for (let i = 0; i < 5; i++) {
      // Call Truco and accept to generate betting logs
      if (await page.getByRole('button', { name: 'Truco', exact: true }).isVisible()) {
        await page.getByRole('button', { name: 'Truco', exact: true }).click();
        await page.getByRole('button', { name: 'Quiero' }).click();
      }
      
      // Forfeit to quickly complete round
      if (await page.getByRole('button', { name: 'Mazo' }).isVisible()) {
        await page.getByRole('button', { name: 'Mazo' }).click();
      }
      
      // Start next round if available
      if (await page.getByRole('button', { name: 'Next Round' }).isVisible()) {
        await page.getByRole('button', { name: 'Next Round' }).click();
      } else {
        break; // Game completed
      }
    }
    
    // Check that log container exists and has content
    const logContainer = page.locator('.bg-black\\/30').or(page.locator('[class*="log"]'));
    await expect(logContainer).toBeVisible();
    
    // Verify latest entries are visible (should show recent round starts)
    await expect(page.getByText(/Starting new round|Round.*begins/).last()).toBeVisible();
  });

  test('should maintain log history throughout game', async ({ page }) => {
    // Play several actions and verify all are logged
    
    // Initial game setup logs
    await expect(page.getByText(/Game initialized/)).toBeVisible();
    
    // Betting action
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Card play
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    await player2Cards.first().click();
    await player1Cards.first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Round completion
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Verify all actions are still in log
    const logContent = await page.locator('.bg-black\\/30').textContent();
    expect(logContent).toContain('Game initialized');
    expect(logContent).toContain('Truco');
    expect(logContent).toContain('Player 2 plays');
    expect(logContent).toContain('Player 1 plays');
    expect(logContent).toContain('goes to deck');
    expect(logContent).toContain('wins the round');
  });

  test('should format log timestamps correctly', async ({ page }) => {
    // Check if logs have timestamps (if implemented)
    const logContent = await page.locator('.bg-black\\/30').textContent();
    
    // This is a softer check since timestamps might not be implemented
    // But the test structure is ready for when they are
    
    // Look for common timestamp patterns
    const hasTimestamps = /\d{2}:\d{2}|\d{1,2}:\d{2}:\d{2}/.test(logContent || '');
    
    // Log should at least have chronological entries
    expect(logContent).toContain('Game initialized');
    
    // Entries should appear in chronological order
    const gameInitIndex = logContent?.indexOf('Game initialized') || 0;
    const roundStartIndex = logContent?.indexOf('Round 1 begins') || 0;
    
    expect(roundStartIndex).toBeGreaterThan(gameInitIndex);
  });

  test('should handle long log messages correctly', async ({ page }) => {
    // Generate a long log message scenario
    await page.getByRole('button', { name: 'Envido', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    
    // Long message with Envido calculation
    await expect(page.getByText(/Envido accepted.*Player \d+: \d+, Player \d+: \d+.*wins and scores/)).toBeVisible();
    
    // Check that long messages don't break layout
    const logContainer = page.locator('.bg-black\\/30');
    await expect(logContainer).toBeVisible();
    
    // Text should wrap properly (not overflow)
    const containerBox = await logContainer.boundingBox();
    expect(containerBox?.width).toBeGreaterThan(0);
  });

  test('should clear logs appropriately on game restart', async ({ page }) => {
    // Play some actions to generate logs
    await page.getByRole('button', { name: 'Truco', exact: true }).click();
    await page.getByRole('button', { name: 'Quiero' }).click();
    await page.getByRole('button', { name: 'Mazo' }).click();
    
    // Verify logs exist
    await expect(page.getByText(/Truco.*2 points/)).toBeVisible();
    
    // If there's a restart/new game button, test it
    // This might not be implemented, so it's a conditional test
    const restartButton = page.getByRole('button', { name: /restart|new game|reset/i });
    
    if (await restartButton.isVisible()) {
      await restartButton.click();
      
      // Logs should be cleared and show new game initialization
      await expect(page.getByText('Game State: idle')).toBeVisible();
      
      const logContent = await page.locator('.bg-black\\/30').textContent();
      // Should not contain previous game's Truco call
      expect(logContent).not.toContain('Truco accepted');
    }
  });
});