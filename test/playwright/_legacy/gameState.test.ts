import { test, expect } from '@playwright/test';

// Test for validating state transitions in the game
test.describe('Game State Transitions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local development server
    await page.goto('http://localhost:7474/');
  });

  test('should start in idle state', async ({ page }) => {
    // Check initial state is idle
    await expect(page.getByText('Game State: idle')).toBeVisible();
    
    // Start button should be visible
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
  });

  test('should transition from idle to playing when starting game', async ({ page }) => {
    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Verify we're in playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Verify cards have been dealt (6 total)
    await expect(page.getByText(/Cards dealt: 6/)).toBeVisible();
  });

  test('should not allow envido after a card has been played', async ({ page }) => {
    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Wait for the game to be in playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Check if player 0 is the current turn
    const currentTurnElement = await page.getByText(/Current Turn:/);
    const turnText = await currentTurnElement.textContent();
    
    // Select a card from the current player
    const cards = page.locator('.card');
    await cards.first().click();
    
    // Play the card
    await page.getByRole('button', { name: 'Play Card' }).click();
    
    // Verify envido buttons are not visible for the other player
    // Assuming the turn has switched to the other player
    await expect(page.getByRole('button', { name: 'Envido' })).not.toBeVisible();
  });

  test('should not allow retruco without truco being called first', async ({ page }) => {
    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Wait for the game to be in playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Verify if retruco is visible (it shouldn't be unless truco was called)
    const retrucoButton = page.getByRole('button', { name: 'Retruco' });
    
    // Check if it's visible - should not be
    await expect(retrucoButton).not.toBeVisible();
  });

  test('should allow envido only in the first trick before any cards are played', async ({ page }) => {
    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Wait for the game to be in playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Find the current player
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    const currentPlayerName = currentTurnText?.split(':')[1]?.trim();
    
    // Check if Envido button is visible for the current player
    const envidoButton = page.getByRole('button', { name: 'Envido' });
    if (currentPlayerName === 'Darkening') {
      // Should be visible for player 1
      await expect(envidoButton).toBeVisible();
    } else {
      // Should be visible for player 2
      await expect(envidoButton).toBeVisible();
    }
    
    // Play a card to verify Envido becomes unavailable
    const cards = page.locator('.card');
    await cards.first().click();
    await page.getByRole('button', { name: 'Play Card' }).click();
    
    // Envido should not be available after playing a card
    await expect(page.getByRole('button', { name: 'Envido' })).not.toBeVisible();
  });
  
  test('should handle truco betting state transition correctly', async ({ page }) => {
    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Wait for the game to be in playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Call truco
    await page.getByRole('button', { name: 'Truco' }).click();
    
    // Verify we're in truco_betting state
    await expect(page.getByText('Game State: truco_betting')).toBeVisible();
    
    // Verify response buttons are visible
    await expect(page.getByRole('button', { name: 'Quiero' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No Quiero' })).toBeVisible();
  });
});
