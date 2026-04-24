# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Reddit Truco is a Devvit (Reddit) app that plays the Argentine card game *Truco*. It runs as a full-screen webview inside a Reddit post. The app bundles three independently built TypeScript projects — client, server, and shared types — that are composed at deploy time via `devvit.json`.

## Commands

- `npm run dev` — runs the three watchers concurrently (`vite build --watch` for client and server, `devvit playtest` for live reload on r/reditruco_dev). This is the normal inner loop.
- `npm run dev:vite` — standalone Vite dev server on port 7474 for pure frontend work without Devvit.
- `npm run build` — builds client then server into `dist/client` and `dist/server` (the artifacts `devvit.json` points at).
- `npm run check` — runs `tsc --build`, `eslint --fix`, then `prettier --write`. Use this before committing.
- `npm test` — Vitest. `vitest.config.ts` excludes `test/playwright/**`. Single test: `npx vitest run test/game.test.ts -t "should create a new game"`.
- `npx playwright test` — E2E suite in `test/playwright/*.spec.ts`. `playwright.config.ts` auto-starts `npm run dev:vite` on `localhost:7474` via its `webServer` block, so you don't need to run the dev server separately. **Not wired into `npm test`** — run explicitly. ⚠ These specs were authored against a prior UI/state shape and may not all pass; treat as a work-in-progress suite until audited.
- `npm run generate:cards` — regenerates the 40 Spanish-deck SVGs in `src/client/public/cards/` via `utils/generate-svg-cards.js`.
- `npm run deploy` / `npm run launch` — `devvit upload` / `devvit upload && devvit publish`. Requires `npm run login` first.

Playtest target (set in `devvit.json` → `dev.subreddit`): `r/reditruco_dev` (private). Live URL: `https://www.reddit.com/r/reditruco_dev/?playtest=reditruco`.

## Architecture

Four TypeScript project references under `src/`, each with its own `tsconfig.json`, composed by the root `tsconfig.json`:

- **`src/client/`** — React 19 + Tailwind 4 webview, built by Vite into `dist/client`. Served as a static bundle by Devvit. Communicates with the server by calling `fetch('/api/...')`. Entry: `main.tsx` → `App.tsx`.
- **`src/server/`** — Express 5 app built by Vite into `dist/server/index.cjs`. Runs on Devvit's serverless runtime. Entry: `src/server/index.ts`. Boots via `createServer(app)` + `getServerPort()` from `@devvit/web/server`.
- **`src/shared/`** — types shared across client and server (e.g. `shared/types/api.ts`). Referenced by both tsconfigs.
- **`src/machines/truco/`** — pure game logic, referenced by the client.

### Truco state machine

All rules live in a modular XState v5 machine under `src/machines/truco/`. `App.tsx` consumes it via `useMachine(trucoStateMachine)`. The machine implements 1v1 Argentine Truco per pagat.com + Wikipedia.

- **`trucoST.ts`** — the machine. States: `idle → dealing → playing ↔ envido_betting | truco_betting → trick_complete → round_complete → game_over`. First to `targetScore` (30) wins.
- **`types.ts`** — context shape. Key fields beyond the obvious: `trucoHolder` (who can raise next, = last accepter), `envidoAcceptedStake` (for correct NO_QUIERO refunds during a chain), `trickLeaders` (who led each trick, used for parda continuation), `trucoCalledThisRound` (locks out envido once truco enters a round), `betInitiator` + `awaitingResponse` (who's being responded to).
- **`cardRules.ts`** — rank-based comparator. **Only the 4 cartas bravas are suit-distinct** (`01_E > 01_B > 07_E > 07_O`); every other same-rank pair is **parda** (tie). Uses a `CARD_RANK` map internally — do not use `indexOf(CARD_HIERARCHY)` for strength comparisons.
- **`envido.ts`** — `calculateEnvidoPoints` (same-suit pair = top two values + 20; face cards 10–12 count as 0), `resolveEnvido`, and `canCallEnvido`. Envido window: first trick, before any card is played (including cards sitting on the board mid-trick), envido not yet resolved, truco not yet called this round.
- **`tricks.ts`** — `resolveTrick`, `determineRoundWinner` (handles parda + "earlier trick wins" + "all pardas → mano"), `getNextTrickLeader` (winner leads next trick; parda → same leader continues).
- **`deck.ts`** — Spanish 40-card generator, seeded Fisher–Yates shuffle, `dealCards`, `generateMatchId`. Cards are `NN_S` strings without `.svg`. The machine reshuffles per round with a seed of `${matchId}#${roundIdx}` for reproducibility.
- **`index.ts`** — barrel re-exports.

**Betting semantics to know when editing:**
- **Envido chain**: raising with Envido adds +2, Real Envido adds +3, Falta Envido sets stake to whatever wins the match. `envidoAcceptedStake` tracks the last implicitly-accepted value; NO_QUIERO awards that to the raiser (or 1 if it was the opening call).
- **Truco chain**: Truco=2, Retruco=3, Vale Cuatro=4. On QUIERO, the accepter becomes `trucoHolder` and the round continues. Only the holder can escalate (`CALL_RETRUCO`/`CALL_VALE_CUATRO`) from `playing`; inside `truco_betting` the responder can counter-raise instead of answering. NO_QUIERO awards `max(roundStake - 1, 1)` to the caller.
- **MAZO**: in `playing` awards `roundStake` to the opponent. In `envido_betting` it's "no quiero to envido + forfeit round" (opponent gets envido refusal points *and* the round stake). In `truco_betting` it's equivalent to NO_QUIERO.
- **Point award path**: all paths award points inline (MAZO / NO_QUIERO / the final PLAY_CARD resolving the round). `round_complete.entry` only awards `roundStake` for the *natural trick-play* path (triggered by `CONTINUE` from `trick_complete`) and computes `gameWinner`. Do not also award in the handler that reaches `round_complete`, or you'll double-count.
- **Response eligibility**: response guards (`QUIERO`/`NO_QUIERO`/raise in betting) only check `awaitingResponse`. The machine trusts the caller (UI) to send the event on the right player's behalf — 1v1 makes the responder unambiguous.

**Test suite** (`test/game.test.ts`, Vitest): 36 tests covering card hierarchy (bravas + parda), trick resolution, envido calc, envido chains (accept & decline with refund), truco chain (truco → retruco → vale cuatro accept/decline), MAZO in all three contexts, round progression, dealer/mano rotation, game-over at 30, RESTART, and invalid-move rejection.

**Known simplifications / not implemented:**
- Flor (optional variant) — not modeled.
- 2v2 / 4-player team play.
- "Quiero" required before declaring a raise verbally — we treat the raise event as implicit acceptance of the prior level.
- Response-side-identity is implicit (see "Response eligibility" above); a malicious client could send a response event pretending to be the other player. The webview trusts the send.

### Server is currently a stub

`src/server/index.ts` has only the Devvit boilerplate: `/api/init`, `/api/increment`, `/api/decrement` (leftover counter), plus `/internal/on-app-install` and `/internal/menu/post-create` which call `createPost()` from `core/post.ts`. **No Truco endpoints exist yet** — adding multiplayer means designing them here and promoting the machine (or its pure helpers) into `src/shared/` so both sides can reason about the same state.

### Devvit runtime constraints

From `.cursor/rules/` — these are hard limits, not preferences:

- **Server** (`src/server/**`) runs on a serverless, read-only filesystem. **No `fs`, `http`, `https`, `net`**. Use `fetch` instead of `http`/`https`. No WebSockets, no HTTP streaming, no SQLite, no stateful in-memory processes. Redis is the only persistence: `import { redis } from '@devvit/web/server'`. For real-time, search Devvit docs for their realtime service — do *not* reach for WS.
- **Client** (`src/client/**`) is a standard browser environment, but also cannot use WebSockets. Only web-compatible npm deps. Follow the rules of hooks.
- Prefer `type` aliases over `interface` in TypeScript (project-wide).

### i18n

Translations live in `src/client/translations/{en,es}.ts` behind the `useTranslation` hook + `TranslationProvider`. Every user-facing string in `App.tsx` reads from `t.*`; keep both locales in sync when adding keys — `Translations` is typed off `en`, so missing `es` keys will type-check as broken.

### Testing

- **Vitest** (`test/game.test.ts`) — drives `trucoStateMachine` via `createActor`. `npm test` runs this. `vitest.config.ts` uses `include: test/**/*.test.ts` and excludes `test/playwright/**` so Playwright specs don't get picked up by Vitest.
- **Playwright** (`test/playwright/*.spec.ts`) — E2E suite. Runs against the Vite dev server on `localhost:7474`, auto-started by `playwright.config.ts`. Invoke with `npx playwright test`. Not part of `npm test`.

### Card assets

SVGs live in `src/client/public/cards/` (served by Devvit — the path *must* be under `public/`). Naming is `NN_S.svg` (e.g. `01_B.svg` = As de Bastos). `card-back.svg` is the shared back. Regenerate with `npm run generate:cards`; don't hand-edit the individual SVGs.
