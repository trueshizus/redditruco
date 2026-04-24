import { test, expect } from '@playwright/test';

test.describe('Basic Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('devvit');
  });

  test('should start game and deal cards', async ({ page }) => {
    // Verify initial state
    await expect(page.getByText('Game State: idle')).toBeVisible();
    await expect(page.getByText('Score: 0 - 0')).toBeVisible();
    await expect(page.getByText('Cards Dealt: 0/6')).toBeVisible();

    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click();

    // Verify cards are dealt
    await expect(page.getByText('Game State: playing')).toBeVisible();
    await expect(page.getByText('Cards Dealt: 6/6')).toBeVisible();
    
    // Verify players have cards
    await expect(page.getByText('player1').filter({ hasText: 'Cards: 3' })).toBeVisible();
    await expect(page.getByText('player2').filter({ hasText: 'Cards: 3' })).toBeVisible();
    
    // Verify cards are visible
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    await expect(player1Cards).toHaveCount(3);
    await expect(player2Cards).toHaveCount(3);
  });

  test('should display match log with game initialization', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Check match log is visible
    await expect(page.getByText('Match Log')).toBeVisible();
    
    // Check specific log entries
    await expect(page.getByText(/Game initialized/)).toBeVisible();
    await expect(page.getByText(/Cards dealt to players/)).toBeVisible();
    await expect(page.getByText(/Round 1 begins/)).toBeVisible();
  });

  test('should show current turn and mano correctly', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Verify current turn (mano starts)
    await expect(page.getByText('Current Turn: Player 2')).toBeVisible();
    await expect(page.getByText('Mano: Player 2')).toBeVisible();
    await expect(page.getByText('Dealer: Player 1')).toBeVisible();
  });

  test('should display trick status correctly', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Verify trick display
    await expect(page.getByText('Trick 1/3')).toBeVisible();
    await expect(page.getByText('T1: -')).toBeVisible();
    await expect(page.getByText('T2: -')).toBeVisible();
    await expect(page.getByText('T3: -')).toBeVisible();
  });
});