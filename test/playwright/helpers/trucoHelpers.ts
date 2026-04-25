// Test helpers for driving the Truco game through its UI and asserting
// state-machine transitions in lockstep.
//
// The app exposes its XState snapshot on `window.__trucoState` in dev mode
// (see App.tsx). Playwright tests read from it to verify state transitions
// match the semantic event dispatched via the UI.
//
// Every actionable button in the UI has `data-testid="action-<EVENT>"`
// (or `opponent-action-<EVENT>` for controls in the opponent's debug panel),
// so `action(page, 'CALL_TRUCO')` reliably dispatches `{type: 'CALL_TRUCO'}`.

import type { Page } from '@playwright/test';

export type TrucoState =
  | 'idle'
  | 'dealing'
  | 'playing'
  | 'envido_betting'
  | 'truco_betting'
  | 'trick_complete'
  | 'round_complete'
  | 'game_over';

export interface TrucoSnapshot {
  value: TrucoState;
  context: {
    player: { id: string; name: string; hand: string[]; score: number; wonTricks: number };
    adversary: { id: string; name: string; hand: string[]; score: number; wonTricks: number };
    currentTurn: number;
    mano: number;
    dealer: number;
    roundStake: number;
    envidoStake: number;
    envidoAcceptedStake: number;
    envidoCalled: boolean;
    trucoState: 'none' | 'truco' | 'retruco' | 'vale_cuatro';
    envidoState: 'none' | 'envido' | 'real_envido' | 'falta_envido';
    trucoCalledThisRound: boolean;
    trucoHolder: number | null;
    trucoInterrupted: boolean;
    pendingTrucoInitiator: number | null;
    gameState: TrucoState;
    betInitiator: number | null;
    awaitingResponse: boolean;
    board: {
      currentTrick: number;
      cardsInPlay: { player: string | null; adversary: string | null };
      trickWinner: number | null;
    };
    tricks: Array<{
      player1Card: string | null;
      player2Card: string | null;
      winner: number | null;
    }>;
    trickLeaders: Array<number | null>;
    roundWinner: number | null;
    gameWinner: number | null;
    targetScore: number;
    logs: string[];
  };
}

/** Read the current state machine snapshot exposed by the app. */
export async function getSnapshot(page: Page): Promise<TrucoSnapshot> {
  const snap = await page.evaluate(() => (window as unknown as { __trucoState: unknown }).__trucoState);
  if (!snap) throw new Error('window.__trucoState is not set — is the app running in dev mode?');
  return snap as TrucoSnapshot;
}

/** Which player will act next on the current turn (or respond to a bet). */
export type Owner = 'player' | 'opponent';

/**
 * Click the button that dispatches the given state-machine event.
 * `owner` picks between the bottom player's controls and the opponent
 * debug panel's mirrored controls.
 *
 * Filters to the enabled element because the same testid can appear on a
 * disabled twin (e.g. PlayerSection's Envido buttons are disabled while the
 * SlidingResponseOverlay's envido-at-truco buttons are active).
 */
export async function action(page: Page, event: string, owner: Owner = 'player'): Promise<void> {
  const prefix = owner === 'opponent' ? 'opponent-action' : 'action';
  await page.locator(`[data-testid="${prefix}-${event}"]:not([disabled])`).click();
}

/**
 * Play a specific card from the given side's hand.
 */
export async function playCard(page: Page, cardId: string, owner: Owner = 'player'): Promise<void> {
  const testid = owner === 'opponent' ? 'opponent-play-card' : 'player-card';
  await page.locator(`[data-testid="${testid}"][data-card-id="${cardId}"]`).click();
}

/** Route an event to the `currentTurn` owner automatically. */
export async function actAs(
  page: Page,
  whoIsActing: number,
  event: string,
): Promise<void> {
  const owner: Owner = whoIsActing === 0 ? 'player' : 'opponent';
  await action(page, event, owner);
}

/** Play a card from whoever has the turn. */
export async function playCurrentTurnCard(page: Page, cardId: string): Promise<void> {
  const s = await getSnapshot(page);
  const owner: Owner = s.context.currentTurn === 0 ? 'player' : 'opponent';
  await playCard(page, cardId, owner);
}

/** Type a command into the chat input and press Enter. */
export async function chatSend(page: Page, text: string): Promise<void> {
  const input = page.locator('[data-testid="chat-input"]');
  await input.fill(text);
  await input.press('Enter');
}

/** Read all chat messages currently rendered. */
export async function chatMessages(page: Page): Promise<Array<{ kind: string; text: string }>> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid="chat-message"]')).map((el) => ({
      kind: el.getAttribute('data-kind') ?? '',
      text: (el as HTMLElement).innerText,
    })),
  );
}
