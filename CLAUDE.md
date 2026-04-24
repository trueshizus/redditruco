# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Reddit Truco is a Devvit (Reddit) app that plays the Argentine card game *Truco*. It runs as a full-screen webview inside a Reddit post. The app bundles three independently built TypeScript projects — client, server, and shared types — that are composed at deploy time via `devvit.json`.

## Commands

- `npm run dev` — runs the three watchers concurrently (`vite build --watch` for client and server, `devvit playtest` for live reload on r/reditruco_dev). This is the normal inner loop.
- `npm run dev:vite` — standalone Vite dev server on port 7474 for pure frontend work without Devvit.
- `npm run build` — builds client then server into `dist/client` and `dist/server` (the artifacts `devvit.json` points at).
- `npm run check` — runs `tsc --build`, `eslint --fix`, then `prettier --write`. Use this before committing.
- `npm test` — Vitest only (`test/game.test.ts`, asserts against the machine at `src/client/machines/gameStateMachine.ts`). Run a single test with `npx vitest run test/game.test.ts -t "should start a new round"`.
- `npx playwright test` — E2E suite in `test/playwright/*.spec.ts`. `playwright.config.ts` auto-starts `npm run dev:vite` on `localhost:7474` via its `webServer` block, so you don't need to run the dev server separately. Not wired into `npm test`.
- `npm run generate:cards` — regenerates the 40 Spanish-deck SVGs in `src/client/public/cards/` via `utils/generate-svg-cards.js`.
- `npm run deploy` / `npm run launch` — `devvit upload` / `devvit upload && devvit publish`. Requires `npm run login` first.

Playtest target (set in `devvit.json` → `dev.subreddit`): `r/reditruco_dev` (private). Live URL: `https://www.reddit.com/r/reditruco_dev/?playtest=reditruco`.

## Architecture

Three TypeScript project references under `src/`, each with its own `tsconfig.json` and `vite.config.ts`, composed by the root `tsconfig.json`:

- **`src/client/`** — React 19 + Tailwind 4 webview, built by Vite into `dist/client`. Served as a static bundle by Devvit. Communicates with the server by calling `fetch('/api/...')`. Entry: `main.tsx` → `App.tsx`.
- **`src/server/`** — Express 5 app built by Vite into `dist/server/index.cjs`. Runs on Devvit's serverless runtime. Entry: `src/server/index.ts`. Boots via `createServer(app)` + `getServerPort()` from `@devvit/web/server`.
- **`src/shared/`** — types shared across client and server (e.g. `shared/types/api.ts`). Referenced by both tsconfigs.

### State machine — two implementations coexist

There are currently **two parallel XState v5 machines** for Truco rules. When making changes, know which one you're touching.

1. **`src/client/machines/gameStateMachine.ts`** — the monolithic (~800-line) machine that is **actually wired into the app**. `App.tsx` consumes it via `useMachine(gameStateMachine)`, and `test/game.test.ts` (Vitest) asserts against it. This is the source of truth for runtime behavior today.

2. **`src/machines/truco/`** — a newer **modular rewrite** broken into `trucoST.ts` (state machine), `deck.ts`, `cardRules.ts`, `envido.ts`, `tricks.ts`, `types.ts`, `index.ts`. Exports `trucoStateMachine`. Has its own `README.md` and a standalone `test.ts`. **Not yet imported by `App.tsx` or the Vitest suite** — it's a migration target, not live code. Before deleting the old machine, migrate `App.tsx`, port `test/game.test.ts`, and confirm the Playwright suite still passes.

Shared concepts (apply to both):

- **Spanish deck** — 40 cards as `NN_S` / `NN_S.svg` strings (suits E/B/C/O, ranks 1–7, 10–12).
- **Card hierarchy** — `01_E` (As de Espadas, highest) down through the *cartas bravas* (`01_B`, `07_E`, `07_O`) to `04_*`. The old machine has `CARD_HIERARCHY` + `compareCards` inline; the new one moves it to `cardRules.ts`.
- **Envido** — same-suit pairs = top two values + 20; otherwise the single highest card value; face cards (10/11/12) count as 0. Old machine: `calculateEnvidoPoints` inline. New machine: `envido.ts`.
- **`gameActions`** (old machine only) — exported helper object (`canCallEnvido`, `canCallTruco`, `canCallRetruco`, `canCallValeCuatro`, `canRespond`, `canPlayCard`). `App.tsx` calls these to gate UI buttons.
- **State graph** — old: `idle → playing → envido_betting | truco_betting → playing → hand_complete → finished`. New: adds an explicit `dealing` state and `round_complete`/`game_over`. First to 30 points either way.
- **Seeded shuffle** — both use a deterministic LCG keyed by `matchId`/`seed`, so a match ID fully reproduces a deal. Useful for tests and any future server-authoritative rewrite.

`test/game.test.ts` demonstrates the BDD-style shape (Given/When/Then with `createActor`) against the old machine. The new machine has its own ad-hoc `test.ts` that isn't picked up by Vitest.

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

- **Vitest** (`test/game.test.ts`) — unit tests driving the old `gameStateMachine` via `createActor`. `npm test` runs this.
- **Playwright** (`test/playwright/01-basic-game-flow.spec.ts` through `12-edge-cases.spec.ts`, plus `gameState.test.ts`) — E2E suite. Runs against the Vite dev server at `localhost:7474`, which `playwright.config.ts` auto-starts. Invoke with `npx playwright test`. **Not part of `npm test`**; run it explicitly or add it to CI.
- The modular `src/machines/truco/test.ts` is a hand-rolled script, not a Vitest file. Don't confuse it with the real suite.

### Card assets

SVGs live in `src/client/public/cards/` (served by Devvit — the path *must* be under `public/`). Naming is `NN_S.svg` (e.g. `01_B.svg` = As de Bastos). `card-back.svg` is the shared back. Regenerate with `npm run generate:cards`; don't hand-edit the individual SVGs.
