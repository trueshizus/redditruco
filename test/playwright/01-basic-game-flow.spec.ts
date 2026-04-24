// Reference E2E spec for the new testing pattern.
//
// Each test follows three steps:
//   1. Dispatch an event through the UI (via data-testid="action-<EVENT>").
//   2. Assert the state machine reached the expected value + context.
//   3. Assert the DOM renders consistently with that state.
//
// The Vitest suite (`test/game.test.ts`) owns exhaustive state-machine
// coverage; this suite is about wiring — making sure each click reaches
// the correct event and the UI shows what the state says.

import { test, expect } from '@playwright/test';
import {
  action,
  actAs,
  getSnapshot,
  playCurrentTurnCard,
} from './helpers/trucoHelpers';

test.describe('01 basic game flow — UI ↔ state machine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('window.__trucoState is exposed in dev mode', async ({ page }) => {
    const snap = await getSnapshot(page);
    expect(snap.value).toBe('idle');
    expect(snap.context.targetScore).toBe(30);
  });

  test('game-root mirrors state via data-game-state attribute', async ({ page }) => {
    const root = page.locator('[data-testid="game-root"]');
    await expect(root).toHaveAttribute('data-game-state', 'idle');

    await action(page, 'START_GAME');
    await expect(root).toHaveAttribute('data-game-state', 'playing');
  });

  test('START_GAME transitions idle → playing and deals six cards', async ({ page }) => {
    let s = await getSnapshot(page);
    expect(s.value).toBe('idle');
    expect(s.context.player.hand).toHaveLength(0);

    await action(page, 'START_GAME');

    s = await getSnapshot(page);
    expect(s.value).toBe('playing');
    expect(s.context.player.hand).toHaveLength(3);
    expect(s.context.adversary.hand).toHaveLength(3);
    expect(s.context.currentTurn).toBe(s.context.mano);

    await expect(page.locator('[data-testid="player-card"]')).toHaveCount(3);
  });

  test('score row reflects context after envido resolution', async ({ page }) => {
    await action(page, 'START_GAME');

    // Mano calls envido; opponent accepts. The total awarded is envidoStake=2.
    let s = await getSnapshot(page);
    await actAs(page, s.context.currentTurn, 'CALL_ENVIDO');
    s = await getSnapshot(page);
    expect(s.value).toBe('envido_betting');
    expect(s.context.envidoStake).toBe(2);

    await actAs(page, s.context.currentTurn === 0 ? 1 : 0, 'QUIERO');
    s = await getSnapshot(page);
    expect(s.value).toBe('playing');
    expect(s.context.player.score + s.context.adversary.score).toBe(2);

    const playerScoreText = await page.locator('[data-testid="score-player"]').innerText();
    const adversaryScoreText = await page.locator('[data-testid="score-adversary"]').innerText();
    expect(parseInt(playerScoreText, 10)).toBe(s.context.player.score);
    expect(parseInt(adversaryScoreText, 10)).toBe(s.context.adversary.score);
  });

  test('truco accepted: state + betting banner + holder match', async ({ page }) => {
    await action(page, 'START_GAME');
    let s = await getSnapshot(page);
    const caller = s.context.currentTurn;

    await actAs(page, caller, 'CALL_TRUCO');
    s = await getSnapshot(page);
    expect(s.value).toBe('truco_betting');
    expect(s.context.trucoState).toBe('truco');
    expect(s.context.roundStake).toBe(2);
    expect(s.context.betInitiator).toBe(caller);

    // Non-caller accepts.
    await actAs(page, caller === 0 ? 1 : 0, 'QUIERO');
    s = await getSnapshot(page);
    expect(s.value).toBe('playing');
    expect(s.context.trucoHolder).toBe(caller === 0 ? 1 : 0);

    await expect(page.locator('[data-testid="betting-banner"]')).toBeVisible();
  });

  test('mazo from playing ends the round and banner disappears', async ({ page }) => {
    await action(page, 'START_GAME');
    let s = await getSnapshot(page);
    const forfeiter = s.context.currentTurn;

    await actAs(page, forfeiter, 'MAZO');

    s = await getSnapshot(page);
    expect(s.value).toBe('round_complete');
    expect(s.context.roundWinner).toBe(forfeiter === 0 ? 1 : 0);

    // Banner must be hidden outside betting/playing states.
    await expect(page.locator('[data-testid="betting-banner"]')).toHaveCount(0);
    // UI shows the round result.
    await expect(page.locator('[data-testid="round-result"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-NEXT_ROUND"]')).toBeVisible();
  });

  test('one full trick: first play stays in playing, second completes the trick', async ({ page }) => {
    await action(page, 'START_GAME');
    let s = await getSnapshot(page);

    // Mano plays first.
    const mano = s.context.mano;
    const manoHand = mano === 0 ? s.context.player.hand : s.context.adversary.hand;
    await playCurrentTurnCard(page, manoHand[0]!);
    s = await getSnapshot(page);
    expect(s.value).toBe('playing');
    expect(s.context.currentTurn).toBe(mano === 0 ? 1 : 0);

    // Responder plays; trick resolves to trick_complete.
    const responderHand =
      s.context.currentTurn === 0 ? s.context.player.hand : s.context.adversary.hand;
    await playCurrentTurnCard(page, responderHand[0]!);

    s = await getSnapshot(page);
    expect(s.value).toBe('trick_complete');
    expect(s.context.tricks[0]?.player1Card).not.toBeNull();
    expect(s.context.tricks[0]?.player2Card).not.toBeNull();

    await expect(page.locator('[data-testid="trick-result"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-CONTINUE"]')).toBeVisible();
  });
});
