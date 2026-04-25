import { test, expect } from '@playwright/test';
import { getSnapshot, chatSend, chatMessages } from './helpers/trucoHelpers';

test.describe('03 chat UI — IRC surface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?ui=chat');
  });

  test('boots in idle with channel header visible', async ({ page }) => {
    await expect(page.locator('[data-testid="chat-channel-header"]')).toBeVisible();
    const s = await getSnapshot(page);
    expect(s.value).toBe('idle');
  });

  test('/start triggers START_GAME and emits system messages', async ({ page }) => {
    await chatSend(page, '/start');
    const s = await getSnapshot(page);
    expect(s.value).toBe('playing');
    const msgs = await chatMessages(page);
    expect(msgs.some((m) => m.text.includes('empezó la partida'))).toBe(true);
    expect(msgs.some((m) => m.text.includes('mano:'))).toBe(true);
  });

  test('CanillitaBot plays automatically when it leads', async ({ page }) => {
    await chatSend(page, '/start');
    // mano = rival by default; bot should play within ~1s
    await page.waitForFunction(
      () => {
        const s = (window as unknown as {
          __trucoState: { context: { board: { cardsInPlay: { adversary: string | null } } } };
        }).__trucoState;
        return !!s?.context.board.cardsInPlay.adversary;
      },
      { timeout: 3000 },
    );
    const msgs = await chatMessages(page);
    expect(msgs.some((m) => m.text.includes('<rival>') && m.text.includes('tiró'))).toBe(true);
  });

  test('user can play a card via /play and trick resolves', async ({ page }) => {
    await chatSend(page, '/start');
    await page.waitForFunction(
      () => {
        const s = (window as unknown as {
          __trucoState: { context: { board: { cardsInPlay: { adversary: string | null } } } };
        }).__trucoState;
        return !!s?.context.board.cardsInPlay.adversary;
      },
      { timeout: 3000 },
    );

    const s = await getSnapshot(page);
    const myCard = s.context.player.hand[0]!;
    const rank = myCard.split('_')[0]!.replace(/^0/, '');
    const suit = myCard.split('_')[1]!.toLowerCase();
    await chatSend(page, `/play ${rank}${suit}`);

    await page.waitForFunction(
      () => (window as unknown as { __trucoState: { value: string } }).__trucoState.value === 'trick_complete',
      { timeout: 3000 },
    );
    // Wait for the rendered <vos> tiró message (deriveMessages runs in useEffect
    // after the state transition, so the DOM may lag one tick behind the snapshot).
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('[data-testid="chat-message"][data-kind="card-played"]')).some((el) =>
          (el as HTMLElement).innerText.includes('<vos>'),
        ),
      { timeout: 2000 },
    );
    const msgs = await chatMessages(page);
    expect(msgs.some((m) => m.text.includes('<vos>') && m.text.includes('tiró'))).toBe(true);
  });

  test('truco call surfaces a bet message and bot responds', async ({ page }) => {
    await chatSend(page, '/start');
    // Wait until it's the user's turn (bot has already led a card).
    await page.waitForFunction(
      () => {
        const s = (window as unknown as {
          __trucoState: { value: string; context: { currentTurn: number } };
        }).__trucoState;
        return s?.value === 'playing' && s.context.currentTurn === 0;
      },
      { timeout: 3000 },
    );

    await chatSend(page, '/truco');
    const s1 = await getSnapshot(page);
    expect(s1.value).toBe('truco_betting');
    // Bot should accept/reject within ~1.5s (1200ms±250ms).
    await page.waitForFunction(
      () => (window as unknown as { __trucoState: { value: string } }).__trucoState.value !== 'truco_betting',
      { timeout: 3000 },
    );
    const msgs = await chatMessages(page);
    expect(msgs.some((m) => m.kind === 'bet' && m.text.includes('truco'))).toBe(true);
    const s2 = await getSnapshot(page);
    expect(typeof s2.context.player.score).toBe('number');
  });

  test('free text becomes a banter message', async ({ page }) => {
    await chatSend(page, 'hola che');
    const msgs = await chatMessages(page);
    expect(msgs.some((m) => m.kind === 'user' && m.text.includes('hola che'))).toBe(true);
  });

  test('/help posts a hint listing commands', async ({ page }) => {
    await chatSend(page, '/help');
    const msgs = await chatMessages(page);
    expect(msgs.some((m) => m.kind === 'hint' && m.text.includes('/start'))).toBe(true);
  });
});
