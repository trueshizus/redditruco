# Legacy playwright specs (archived)

These specs were written against a prior, debug-heavy UI (strings like
"Game State: idle", "Cards Dealt: 6/6", "Current Turn: Player 2", a
visible "Match Log", a "Play Card" confirm button, etc.). The current
UI does not render any of those strings, so the specs cannot pass and
were archived here rather than rewritten in bulk.

The new pattern lives in `test/playwright/01-basic-game-flow.spec.ts`
using helpers from `../helpers/trucoHelpers.ts`:

  1. Dispatch an event via `action(page, 'CALL_TRUCO')` — the button's
     `data-testid` matches the XState event name.
  2. Read the snapshot via `getSnapshot(page)` (pulls from
     `window.__trucoState`, exposed by `App.tsx` in dev mode).
  3. Assert both state-machine transition AND DOM rendering.

When rewriting one of these files, the original logic can inform the
scenarios to cover, but the selectors and assertions should all be
updated to the new pattern. Vitest (`test/game.test.ts`) already owns
exhaustive state-machine rule coverage; these specs should focus on
wire-up (UI → event) and visible regressions.

Candidates to restore first:
  - 04-truco-betting — cover retruco/vale cuatro click paths.
  - 03-envido-betting — cover the chain UI.
  - 07-mazo-forfeit — cover mazo from each state (playing, envido_betting, truco_betting).
  - 10-localization — EN/ES toggle in the header.

Files excluded from Playwright runs because they live under `_legacy/`;
`playwright.config.ts` has `testDir: 'test/playwright'` and Playwright
does not recurse into underscore-prefixed directories by convention,
but we also filter explicitly in the config.
