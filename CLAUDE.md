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

All game rules live in a modular XState v5 machine under `src/machines/truco/`. `App.tsx` consumes it via `useMachine(trucoStateMachine)`.

- **`trucoST.ts`** — the machine itself. States: `idle → dealing → playing → envido_betting | truco_betting → trick_complete → round_complete → game_over`. First to 30 points wins.
- **`types.ts`** — `GameContext`, `TrucoEvent`, `Player`, `Trick`, `Board`, `EnvidoBet`, `TrucoBet`, `TrucoState`. The `GameContext` shape is player/adversary (objects, not arrays), `board.cardsInPlay.{player,adversary}`, `board.currentTrick`, `tricks: [Trick, Trick, Trick]`, plus `trucoState`, `envidoState`, `roundStake`, `envidoStake`, `betInitiator`, `awaitingResponse`.
- **`deck.ts`** — Spanish deck generation (`generateFullDeck`), seeded Fisher-Yates shuffle (`shuffleDeck`), `dealCards`, `generateMatchId`. Cards are `NN_S` strings (no `.svg`).
- **`cardRules.ts`** — `CARD_HIERARCHY`, `compareCards`, `getCardValue`, `getCardSuit`, `isCartaBrava`. ⚠ Known deviation from real Truco: the hierarchy sub-orders cards of the same rank by suit, so two 3s are not parda. Any gameplay fix should update the hierarchy or the comparator.
- **`envido.ts`** — `calculateEnvidoPoints` (same-suit pair = top two values + 20; face cards 10/11/12 = 0), `resolveEnvido`, `canCallEnvido` (guard used in both the machine and `App.tsx`).
- **`tricks.ts`** — `resolveTrick`, `determineRoundWinner`, `getNextTrickLeader` with "primera vale doble" tie handling.
- **`index.ts`** — public entry point (barrel re-exports).
- **`test.ts`** — hand-rolled debug script (not a Vitest file). Excluded from the tsconfig build.

The canonical Vitest suite is `test/game.test.ts` — it runs against `trucoStateMachine` and exercises initialization, dealing, card hierarchy, envido calc, and envido/truco flows.

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
