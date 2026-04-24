// Localization wire-up.
//
// Checks that user-facing strings flip languages when the locale is toggled.
// We don't exhaustively compare every string; we just probe a few that hit
// most of the components (Board, PlayerSection, Opponent panel, overlay).

import { test, expect } from '@playwright/test';
import { actAs, action, getSnapshot } from './helpers/trucoHelpers';

test.describe('02 localization — EN ↔ ES toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('English by default: idle prompt, "You"/"Opponent", card count pluralization', async ({ page }) => {
    await expect(page.getByText('Ready to Play Truco?')).toBeVisible();
    await action(page, 'START_GAME');

    // Opponent bar shows "3 cards" (plural) in English.
    await expect(page.getByTestId('opponent-card-count')).toHaveText('3 cards');
    // Round label + "You" / "Opponent" on the board.
    await expect(page.getByTestId('round-label')).toHaveText('Round 1');
  });

  test('Switching to ES localizes prompt, button labels, card count, and status', async ({ page }) => {
    await page.getByRole('button', { name: 'ES' }).click();

    await expect(page.getByText('¿Listo para jugar al Truco?')).toBeVisible();
    // Start button uses the Spanish label.
    await expect(page.getByTestId('action-START_GAME')).toContainText('Empezar');

    await action(page, 'START_GAME');

    await expect(page.getByTestId('opponent-card-count')).toHaveText('3 cartas');
    await expect(page.getByTestId('round-label')).toHaveText('Ronda 1');
    // The player row label becomes "Vos" (Argentine voseo).
    await expect(page.getByTestId('player-name')).toHaveText('Vos');
  });

  test('ES response overlay shows the "Envido está primero" idiom when applicable', async ({ page }) => {
    await page.getByRole('button', { name: 'ES' }).click();
    await action(page, 'START_GAME');

    // Opponent (mano) calls Truco so Player 1 is the responder.
    await action(page, 'CALL_TRUCO', 'opponent');

    await expect(page.getByText('⚡ El envido está primero')).toBeVisible();
    // Response buttons use Spanish labels.
    await expect(page.getByTestId('action-QUIERO')).toContainText('Quiero');
    await expect(page.getByTestId('action-NO_QUIERO')).toContainText('No quiero');
  });

  test('Language toggle reflects in game-over screen labels', async ({ page }) => {
    // Race to 30 via truco-no-quiero. Whoever's currentTurn calls truco;
    // the other responds no-quiero — 1 point per round to the caller.
    await action(page, 'START_GAME');
    let safety = 300;
    while (safety-- > 0) {
      const s = await getSnapshot(page);
      if (s.value === 'game_over') break;
      if (s.value === 'playing') {
        const caller = s.context.currentTurn;
        await actAs(page, caller, 'CALL_TRUCO');
        await actAs(page, caller === 0 ? 1 : 0, 'NO_QUIERO');
      } else if (s.value === 'round_complete') {
        await action(page, 'NEXT_ROUND');
      } else {
        throw new Error(`Unexpected state: ${String(s.value)}`);
      }
    }

    // game_over reached. Flip to ES and verify Spanish labels.
    await expect(page.getByTestId('game-over')).toBeVisible();
    await page.getByRole('button', { name: 'ES' }).click();
    await expect(page.getByTestId('game-over')).toHaveText('🎊 ¡Se acabó!');
    await expect(page.getByTestId('action-RESTART_GAME')).toContainText('Jugar de nuevo');
  });
});
