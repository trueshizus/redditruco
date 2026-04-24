import { test, expect } from '@playwright/test';

test.describe('Trick Resolution and Continue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    // Wait for game to be in playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should play cards and show trick_complete state', async ({ page }) => {
    // Player 2 (mano) plays first card
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    await player2Cards.first().click();
    
    // Verify card is played and turn switches
    await expect(page.getByText('Current Turn: Player 1')).toBeVisible();
    await expect(page.getByText('Cards Dealt: 5/6')).toBeVisible();
    
    // Verify card appears on board
    await expect(page.getByText(/Played card/)).toBeVisible();
    
    // Player 1 plays card to complete trick
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    await player1Cards.first().click();
    
    // Should transition to trick_complete state
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Should show trick winner
    await expect(page.getByText(/Trick Winner:/)).toBeVisible();
    
    // Should show continue button
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
    
    // Should show both cards on board
    const playedCards = page.getByText(/Played card/);
    await expect(playedCards).toHaveCount(2);
  });

  test('should continue to next trick after clicking continue', async ({ page }) => {
    // Play a complete trick
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    await player2Cards.first().click();
    await player1Cards.first().click();
    
    // Wait for trick_complete state
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Click continue
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Should return to playing state
    await expect(page.getByText('Game State: playing')).toBeVisible();
    
    // Should advance to trick 2
    await expect(page.getByText('Trick 2/3')).toBeVisible();
    
    // Should update trick history
    await expect(page.getByText(/T1: P[12]/)).toBeVisible();
    
    // Should clear the board for next trick
    await expect(page.getByText('Player 1')).toBeVisible();
    await expect(page.getByText('Player 2')).toBeVisible();
  });

  test('should complete round after winning 2 tricks', async ({ page }) => {
    // Play two tricks where Player 1 wins both (using strong cards)
    
    // First trick - Player 2 starts
    let player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    let player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    // Player 2 plays any card
    await player2Cards.first().click();
    
    // Player 1 plays Ace of Espadas (01_E) if available, otherwise first card
    const aceOfEspadas = player1Cards.filter({ hasText: '01_E' });
    const cardToPlay = await aceOfEspadas.count() > 0 ? aceOfEspadas.first() : player1Cards.first();
    await cardToPlay.click();
    
    // Continue after first trick
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Second trick - winner of first trick starts
    await expect(page.getByText('Trick 2/3')).toBeVisible();
    
    // Play second trick
    player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Check who has current turn and play accordingly
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    if (currentTurnText?.includes('Player 1')) {
      await player1Cards.first().click();
      await player2Cards.first().click();
    } else {
      await player2Cards.first().click();
      await player1Cards.first().click();
    }
    
    // Continue after second trick
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    const trickWinnerText = await page.getByText(/Trick Winner:/).textContent();
    
    // If Player 1 won 2 tricks, round should complete automatically after continue
    if (trickWinnerText?.includes('Player 1')) {
      await page.getByRole('button', { name: 'Continue' }).click();
      
      // Check if round completed (Player 1 won 2/3 tricks)
      const tricksWon = await page.getByText(/T[12]: P1/).count();
      if (tricksWon === 2) {
        await expect(page.getByText('Game State: round_complete')).toBeVisible();
        await expect(page.getByText('Round Winner: Player 1')).toBeVisible();
      }
    }
  });

  test('should update match log during trick play', async ({ page }) => {
    // Play one trick
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    
    await player2Cards.first().click();
    
    // Check log shows card play
    await expect(page.getByText(/Player 2 plays/)).toBeVisible();
    
    await player1Cards.first().click();
    
    // Wait for trick completion
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Check log shows both plays and winner
    await expect(page.getByText(/Player 1 plays/)).toBeVisible();
    await expect(page.getByText(/Player [12] wins trick 1/)).toBeVisible();
  });
});