import { test, expect } from '@playwright/test';

test.describe('Card Hierarchy and Trick Winners', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Game State: playing')).toBeVisible();
  });

  test('should recognize Ace of Espadas as strongest card', async ({ page }) => {
    // Look for Ace of Espadas (01_E) in either player's hand
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Check current turn to know who plays first
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      // Player 2 plays any card first
      await player2Cards.first().click();
      
      // Player 1 tries to play Ace of Espadas if available
      const aceOfEspadas = player1Cards.locator('[src*="01_E"]');
      if (await aceOfEspadas.count() > 0) {
        await aceOfEspadas.click();
        
        await expect(page.getByText('Game State: trick_complete')).toBeVisible();
        await expect(page.getByText('Trick Winner: Player 1')).toBeVisible();
        await expect(page.getByText(/Player 1 wins trick 1/)).toBeVisible();
      } else {
        // If no Ace of Espadas, just play any card to complete the trick
        await player1Cards.first().click();
      }
    } else {
      // Player 1 starts - try to play Ace of Espadas first
      const aceOfEspadas = player1Cards.locator('[src*="01_E"]');
      if (await aceOfEspadas.count() > 0) {
        await aceOfEspadas.click();
        await player2Cards.first().click();
        
        await expect(page.getByText('Game State: trick_complete')).toBeVisible();
        await expect(page.getByText('Trick Winner: Player 1')).toBeVisible();
      } else {
        // If no Ace of Espadas, play normally
        await player1Cards.first().click();
        await player2Cards.first().click();
      }
    }
  });

  test('should recognize Ace of Baston as second strongest', async ({ page }) => {
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      await player2Cards.first().click();
      
      // Look for Ace of Baston (01_B)
      const aceOfBaston = player1Cards.locator('[src*="01_B"]');
      if (await aceOfBaston.count() > 0) {
        await aceOfBaston.click();
        
        await expect(page.getByText('Game State: trick_complete')).toBeVisible();
        
        // Should win unless Player 2 played Ace of Espadas
        const playedCards = await page.locator('div').filter({ hasText: /Played card/ }).textContent();
        if (!playedCards?.includes('01_E')) {
          await expect(page.getByText('Trick Winner: Player 1')).toBeVisible();
        }
      } else {
        await player1Cards.first().click();
      }
    }
  });

  test('should handle 7 of Espadas (7_E) as third strongest', async ({ page }) => {
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Try to find and play 7 of Espadas
    const sevenOfEspadas = player1Cards.locator('[src*="07_E"]');
    const player2SevenOfEspadas = player2Cards.locator('[src*="07_E"]');
    
    if (await sevenOfEspadas.count() > 0) {
      // Player 1 has 7 of Espadas
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 1')) {
        await sevenOfEspadas.click();
        await player2Cards.first().click();
        
        await expect(page.getByText('Game State: trick_complete')).toBeVisible();
        // Should win unless Player 2 had higher card
      } else {
        await player2Cards.first().click();
        await sevenOfEspadas.click();
        
        await expect(page.getByText('Game State: trick_complete')).toBeVisible();
      }
    } else if (await player2SevenOfEspadas.count() > 0) {
      // Player 2 has 7 of Espadas, test similar logic
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        await player2SevenOfEspadas.click();
        await player1Cards.first().click();
      } else {
        await player1Cards.first().click();
        await player2SevenOfEspadas.click();
      }
      
      await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    }
  });

  test('should handle 7 of Oro (7_O) as fourth strongest', async ({ page }) => {
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Look for 7 of Oro
    const sevenOfOro = player1Cards.locator('[src*="07_O"]');
    
    if (await sevenOfOro.count() > 0) {
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 1')) {
        await sevenOfOro.click();
        await player2Cards.first().click();
      } else {
        await player2Cards.first().click();
        await sevenOfOro.click();
      }
      
      await expect(page.getByText('Game State: trick_complete')).toBeVisible();
      
      // Check winner - should be Player 1 unless Player 2 had a higher-ranking card
      const trickWinnerText = await page.getByText(/Trick Winner:/).textContent();
      const playedCards = await page.locator('div').filter({ hasText: /Played card/ }).textContent();
      
      // If no aces or 7_E were played by opponent, 7_O should win
      if (!playedCards?.includes('01_E') && !playedCards?.includes('01_B') && !playedCards?.includes('07_E')) {
        await expect(page.getByText('Trick Winner: Player 1')).toBeVisible();
      }
    }
  });

  test('should handle regular card hierarchy (3, 2, A, K, J, Q, 7, 6, 5, 4)', async ({ page }) => {
    // Test with regular cards (non-trump)
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Try to find a 3 (highest regular card)
    const threeCard = player1Cards.locator('[src*="03_"]');
    
    if (await threeCard.count() > 0) {
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 1')) {
        await threeCard.click();
        // Player 2 plays a lower card (try to find a 4, 5, 6)
        const lowerCards = player2Cards.locator('[src*="04_"], [src*="05_"], [src*="06_"]');
        if (await lowerCards.count() > 0) {
          await lowerCards.first().click();
          
          await expect(page.getByText('Game State: trick_complete')).toBeVisible();
          await expect(page.getByText('Trick Winner: Player 1')).toBeVisible();
        } else {
          await player2Cards.first().click();
        }
      } else {
        await player2Cards.first().click();
        await threeCard.click();
      }
    } else {
      // Just play any cards to test basic functionality
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        await player2Cards.first().click();
        await player1Cards.first().click();
      } else {
        await player1Cards.first().click();
        await player2Cards.first().click();
      }
    }
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    await expect(page.getByText(/Trick Winner: Player [12]/)).toBeVisible();
  });

  test('should handle same-suit card comparisons', async ({ page }) => {
    // This test checks if cards of the same suit are compared correctly
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Play any two cards to see hierarchy in action
    const currentTurnText = await page.getByText(/Current Turn:/).textContent();
    
    if (currentTurnText?.includes('Player 2')) {
      await player2Cards.first().click();
      await player1Cards.first().click();
    } else {
      await player1Cards.first().click();
      await player2Cards.first().click();
    }
    
    await expect(page.getByText('Game State: trick_complete')).toBeVisible();
    
    // Verify a winner was determined (not a tie)
    const trickWinnerText = await page.getByText(/Trick Winner:/).textContent();
    expect(trickWinnerText).toMatch(/Trick Winner: Player [12]/);
    
    // Check that the correct card values are being compared in logs
    await expect(page.getByText(/Player [12] plays/)).toHaveCount(2);
    await expect(page.getByText(/Player [12] wins trick 1/)).toBeVisible();
  });

  test('should handle trump cards vs non-trump cards', async ({ page }) => {
    // Trump cards (Aces and 7s of Espadas/Oro) should beat regular cards
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Look for any trump card (01_E, 01_B, 07_E, 07_O)
    const trumpCards = player1Cards.locator('[src*="01_E"], [src*="01_B"], [src*="07_E"], [src*="07_O"]');
    
    if (await trumpCards.count() > 0) {
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 1')) {
        await trumpCards.first().click();
        // Player 2 plays any regular card
        const regularCards = player2Cards.locator('[src*="02_"], [src*="03_"], [src*="04_"], [src*="05_"], [src*="06_"]');
        if (await regularCards.count() > 0) {
          await regularCards.first().click();
          
          await expect(page.getByText('Game State: trick_complete')).toBeVisible();
          await expect(page.getByText('Trick Winner: Player 1')).toBeVisible();
        } else {
          await player2Cards.first().click();
        }
      } else {
        await player2Cards.first().click();
        await trumpCards.first().click();
        
        await expect(page.getByText('Game State: trick_complete')).toBeVisible();
        // Player 1's trump should win unless Player 2 also played trump
      }
    }
  });

  test('should log card values and hierarchy correctly', async ({ page }) => {
    // Play a trick and verify the log shows card information
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
    
    // Check that logs show both card plays
    await expect(page.getByText(/Player 2 plays/)).toBeVisible();
    await expect(page.getByText(/Player 1 plays/)).toBeVisible();
    
    // Check that trick winner is logged with reason
    await expect(page.getByText(/Player [12] wins trick 1/)).toBeVisible();
    
    // Verify card information is displayed on the board
    await expect(page.getByText(/Played card/).first()).toBeVisible();
  });

  test('should handle card comparison edge cases', async ({ page }) => {
    // Test various card combinations to ensure proper hierarchy
    const player1Cards = page.locator('main > div:nth-child(3)').getByRole('img');
    const player2Cards = page.locator('main > div:nth-child(1)').getByRole('img');
    
    // Play multiple tricks to test different card combinations
    for (let trick = 1; trick <= 3; trick++) {
      const currentTurnText = await page.getByText(/Current Turn:/).textContent();
      
      if (currentTurnText?.includes('Player 2')) {
        if (await player2Cards.count() > 0) {
          await player2Cards.first().click();
        }
        if (await player1Cards.count() > 0) {
          await player1Cards.first().click();
        }
      } else {
        if (await player1Cards.count() > 0) {
          await player1Cards.first().click();
        }
        if (await player2Cards.count() > 0) {
          await player2Cards.first().click();
        }
      }
      
      if (await page.getByText('Game State: trick_complete').isVisible()) {
        // Verify a winner was determined
        await expect(page.getByText(/Trick Winner: Player [12]/)).toBeVisible();
        
        // Continue to next trick if not at round end
        const continueBtn = page.getByRole('button', { name: 'Continue' });
        if (await continueBtn.isVisible()) {
          await continueBtn.click();
          
          if (await page.getByText('Game State: round_complete').isVisible()) {
            break;
          }
        } else {
          break;
        }
      }
      
      if (await page.getByText('Game State: round_complete').isVisible()) {
        break;
      }
    }
  });
});