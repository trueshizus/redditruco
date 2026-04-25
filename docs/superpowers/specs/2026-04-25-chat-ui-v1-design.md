# Truco chat UI — v1 design

**Status:** Approved 2026-04-25
**Author:** brainstormed in collaboration; assistant drafted
**Supersedes:** none
**Defers to:** sub-project B (state machine multiplayer extensions); sub-project F (Ranking Mode)

## Goal

Ship a second renderer for the existing Truco state machine: an IRC/terminal–style chat surface where the player and an AI bot (`CanillitaBot`) play a match. Slash commands and quick-reply chips both fire state-machine events; free text is posted as banter and ignored by the machine. The chat ships *alongside* the existing table UI; users opt in via `?ui=chat`.

The design proves out the wider thesis the project is converging on: **one state machine, many renderers**. The chat is the first concrete sibling renderer.

## Scope

### In scope (v1)
- New top-level component `ChatApp` (sibling to `App.tsx`).
- URL routing: `?ui=chat` → mount `<ChatApp />`; otherwise mount `<App />` (table renderer, untouched).
- Renders any `trucoStateMachine` state as a stream of IRC-style messages.
- Quick-reply chips for the *currently legal* commands.
- Slash-command parser; free text falls through as banter.
- `CanillitaBot` plays the opponent role in single-player. Deterministic, weak-heuristic strategy.
- Full match end-to-end: idle → deal → play → envido / truco / mazo → trick / round / game complete → restart.
- EN + AR-ES translations reused via `useTranslation`; new `chat.*` keys added in parallel for both locales.
- Vitest coverage of new pure modules; one Playwright spec covering the full chat flow.

### Out of scope (deferred)
- **Multiplayer** (sub-project B). Reddit Realtime channels, matchmaking, `opponent_disconnected`, `reconnecting`, `opponent_left`. State-machine extensions for any of it.
- **Ranking section + Ranking Mode** (sub-project F). The pyramid mechanic and the "win 10 matches to unlock" gating.
- **Settings menu / profile / history.**
- The other 4 metaphors from the earlier mood-board (pulpería, arcade, letter, chat-friend). Parked.

### Non-goals
- Replacing the existing table UI. v1 is purely additive.
- Any change to the state machine itself.
- A serious AI for `CanillitaBot`. v1 is "plays legal moves correctly," not "challenges a strong player."
- Persisting chat history.

## Architecture

### Routing
`main.tsx` reads `new URLSearchParams(location.search).get('ui')` once at boot:
- `'chat'` → mount `<ChatApp />`
- otherwise → mount existing `<App />`

No global toggle, no settings panel, no localStorage. Switching surfaces is a URL change. Devvit webviews preserve query strings on the post URL → this works inside Reddit.

### State-machine sharing
Each renderer instantiates its own `useMachine(trucoStateMachine)` actor. They don't share runtime state — they're alternative renderings of the same machine *definition*. The machine remains the one source of truth for game rules.

### Bot integration
`useCanillitaBot(state, send)` is a hook inside `ChatApp`. It subscribes to state changes via `useEffect`. When it's the opponent's turn or a response is awaited from the opponent, it dispatches the appropriate event after a small "thinking" delay (see Section: Bot strategy / timing). The bot lives **outside** the machine — it's a renderer-side actor that pretends to be a human typing into the channel.

This boundary lets us swap bot for network in multiplayer (sub-project B): replace `useCanillitaBot` with `useRemotePlayer`, same interface, same machine.

### Chat log derivation
`useChatLog(state)` computes the IRC-style message stream from machine snapshots. Stores message history in a `useRef`-backed array, appends on every meaningful state transition. The state machine knows nothing about chat messages.

### Input pipeline
1. User types into `CommandInput` (or clicks a quick-reply chip → fills the input → submits).
2. `parseCommand(text, state)` returns one of:
   - `{kind: 'event', event: TrucoEvent}` → `send(event)`; post `<vos>` line.
   - `{kind: 'banter', text}` → post `<vos>` chat message; no state change.
   - `{kind: 'help', topic}` → post system reply.
   - `{kind: 'invalid', reason}` → post `[hint]` line.
3. Quick-reply chips render from `legalCommands(state)`.

### Dependencies added
- `use-stick-to-bottom` (~3 KB, MIT) — auto-scroll behavior on the message log only when the user is at-bottom. Everything else is hand-rolled.

## File layout

```
src/client/
  main.tsx                  ← modified: 5-line URL-param branch
  App.tsx                   ← unchanged
  ChatApp.tsx               ← NEW: top-level chat renderer
  chat/
    ChatLayout.tsx          ← shell: header + log + chip-bar + input
    ChannelHeader.tsx       ← topic strip (channel name, score, mano, points)
    MessageLog.tsx          ← scrollable, sticks to bottom
    Message.tsx             ← single-message dispatch (by kind)
    QuickReplyBar.tsx       ← chips for legal commands in current state
    CommandInput.tsx        ← prompt, history (↑/↓), tab-complete, submit
    parseCommand.ts         ← pure: text + state → event | banter | help | invalid
    useChatLog.ts           ← hook: state diffs → ChatMessage[] in a ref
    useCanillitaBot.ts      ← hook: drives opponent events with timing
    canillitaStrategy.ts    ← pure: card pick + response decisions
    cardGlyph.ts            ← pure: "01_E" → "[1♠]"; parser: "1e" → "01_E"
    types.ts                ← ChatMessage discriminated union
  translations/
    en.ts                   ← + chat.* keys
    es.ts                   ← + chat.* keys
test/
  chat/
    parseCommand.test.ts
    canillitaStrategy.test.ts
    useChatLog.test.ts
    cardGlyph.test.ts
test/playwright/
  03-chat.spec.ts
```

### Component ownership

| File | Owns | Depends on |
|---|---|---|
| `main.tsx` | renderer choice at boot | URL param |
| `ChatApp.tsx` | wiring `useMachine` + `useChatLog` + `useCanillitaBot` | machine, the three hooks, `<ChatLayout>` |
| `ChatLayout.tsx` | visual shell only — no state | children |
| `ChannelHeader.tsx` | reads `{score, mano, currentTurn, gameState}` | machine state |
| `MessageLog.tsx` | scroll behavior + `<Message>` per item | `use-stick-to-bottom`, message array |
| `Message.tsx` | per-kind styling + glyphs | `ChatMessage`, `cardGlyph` |
| `QuickReplyBar.tsx` | `legalCommands(state) → chips` | state, command map |
| `CommandInput.tsx` | input UX (history, hints, tab-complete) | `parseCommand`, `send` |
| `parseCommand.ts` | grammar + free-text fallthrough | machine event types |
| `useChatLog.ts` | state-transition → message append | machine snapshot |
| `useCanillitaBot.ts` | auto-dispatch opponent events with delay | strategy |
| `canillitaStrategy.ts` | bot decisions (pure, deterministic) | machine context shape |
| `cardGlyph.ts` | `01_E` ↔ `[1♠]` | nothing |

## Slash-command grammar

| Command | Aliases | Event | Notes |
|---|---|---|---|
| `/start` | `/empezar` | `START_GAME` | only at `idle` |
| `/play <card>` | `/p`, `/jugar` | `PLAY_CARD` | parser maps `1e`, `01_E`, `1 espadas`, `as de espadas` → `01_E` |
| `/envido` | — | `CALL_ENVIDO` | |
| `/real` | `/realenvido` | `CALL_REAL_ENVIDO` | |
| `/falta` | `/faltaenvido` | `CALL_FALTA_ENVIDO` | |
| `/truco` | — | `CALL_TRUCO` | |
| `/retruco` | `/quiero retruco` | `CALL_RETRUCO` | accept-and-raise idiom |
| `/vale4` | `/quiero valecuatro` | `CALL_VALE_CUATRO` | accept-and-raise idiom |
| `/quiero` | `/q`, `/si` | `QUIERO` | |
| `/noquiero` | `/nq`, `/no` | `NO_QUIERO` | |
| `/mazo` | `/m`, `/mevoy` | `MAZO` | |
| `/seguir` | `/next`, `/continuar` | `CONTINUE` *or* `NEXT_ROUND` | parser picks based on state value |
| `/restart` | `/jugar otra` | `RESTART_GAME` | only at `game_over` |
| `/help [topic]` | `/?`, `/ayuda` | — | system reply, no event |
| `/clear` | — | — | clears local log only |
| *anything else* | — | — | posted as `<vos>` banter |

### Card parser
- ranks: `1`, `2`, …, `7`, `10`/`sota`, `11`/`caballo`, `12`/`rey`
- suits: `e`/`espada(s)` → `E`, `b`/`basto(s)` → `B`, `c`/`copa(s)` → `C`, `o`/`oro(s)` → `O`
- ambiguity (`/play 1`) → `[hint] ¿de qué palo? probá /play 1e`

### Hints fired on invalid
- card not in hand → `[hint] no tenés [3♣]. mano: [1♠] [7♥] [3♣]`
- bet not legal in current state → `[hint] no podés cantar truco ahora`
- unknown command → `[hint] comando desconocido — probá /help`

## CanillitaBot v1 strategy

Pure functions in `canillitaStrategy.ts`. Deterministic given identical input.

### `pickCard(hand, ctx) → cardId`
- If leading the trick: play the **median-rank** card (save bravas, don't waste).
- If responding: play the lowest card that beats the opponent's; if can't beat, play the weakest (sacrifice).
- Tie-break: lex-first card-id.

### `respondToEnvido(hand, currentEnvido) → 'quiero' | 'no_quiero'`
- Compute own envido (`calculateEnvidoPoints`).
- ≥ 28 → `quiero`
- 23–27 → `quiero` if proposed = base envido (2); else `no_quiero`
- < 23 → `no_quiero`

### `respondToTruco(hand, ctx) → 'quiero' | 'no_quiero' | 'retruco'`
- Count strong cards (rank ≤ 4: bravas + threes).
- 0 → `no_quiero`
- 1 → `quiero` to truco only; refuse retruco/vale4
- 2 → `quiero` to anything
- 3 → on `truco`, sometimes raise to `retruco` (deterministic seed via `matchId` hash)

### `shouldCallTruco(state)` / `shouldCallEnvido(state)` / `shouldMazo(state)`
- v1: all return `false`. Bot is reactive; player drives the calls.
- v2 candidates documented but not implemented.

### Timing (in `useCanillitaBot`)
- Card play: 600 ms ± 150 ms
- Envido / truco response: 1200 ms ± 250 ms
- Randomness from a seeded RNG for deterministic tests; in browser, `Math.random` is fine.

## Visual register

```
font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace
```

Self-host JetBrains Mono (Apache 2.0), weights 400 + 700, subset to Latin + box-drawing + suit glyphs. ~80 KB total.

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0c0c0c` | full background |
| `panel` | `#101010` | header + chip bar |
| `border` | `#1f1f1f` | thin separators |
| `fg-default` | `#bdbdb0` | default text |
| `fg-dim` | `#5a5a5a` | timestamps, hints |
| `cyan` | `#7afff7` | system messages, `<vos>` |
| `orange` | `#ff9351` | `<rival>` |
| `yellow` | `#ffd166` | card glyphs |
| `green` | `#9aff8b` | cursor, accept chip |
| `red` | `#ff5470` | truco / danger |

### Behaviors
- `use-stick-to-bottom` on the message log; auto-scrolls only when user is at-bottom.
- Cursor blinks (CSS keyframe, 1 s steps).
- Bot ephemeral indicator: `<rival> está pensando…` shows during the bot's delay; replaced when the action lands.
- Input history: `↑` / `↓` cycle through the user's previous submitted lines (in-memory, reset on reload).
- `Tab` autocompletes from the chip set when the input begins with `/`.
- Keyboard-first; clicks supported but never required.

## State machine

**No v1 changes.** All v1 events are existing `TrucoEvent` types.

Deferred extensions (for sub-project B's plan, listed here for completeness):
- `pre_match` group: `idle` → `mode_select` → `matchmaking` → `waiting_for_opponent` → `dealing` (today: `idle` → `dealing` directly).
- Connection: `opponent_disconnected`, `reconnecting`, `opponent_left`, `solo_resume`.
- Ranking: `context.matchesWon` counter, incremented on `game_over` if `gameWinner === 0`. Unlocks `?mode=ranked` at 10.
- Ranked-mode pyramid layer + position in `context.ranking`.

These do not touch v1.

## Testing

### Vitest (extends current 40)
- `parseCommand.test.ts` — every command, every alias, card-parser edge cases, banter passthrough, invalid-input hints.
- `canillitaStrategy.test.ts` — fixed `(hand, ctx)` → expected card / response.
- `useChatLog.test.ts` — pairs of state transitions → expected message stream.
- `cardGlyph.test.ts` — formatting + parsing roundtrip on all 40 cards.

### Playwright (extends current 12)
- `03-chat.spec.ts` — visit `/?ui=chat`, see channel header, `/start`, observe deal messages, type `/play 1e`, observe trick result, type `/truco`, bot responds, finish a round.
- New helpers: `chatSend(page, text)`, `chatLog(page)` reading from `[data-testid="chat-log"]`.

Both suites must stay green; **no regression in the table-UI tests**.

## Risks and assumptions

- **Devvit URL params.** Assumption: `?ui=chat` survives inside the Devvit webview iframe. If it doesn't (Devvit may strip query strings), we fall back to a localStorage flag with a small `<a href="?ui=chat">` link in the table UI's settings, but this is a workaround.
- **Bot timing.** A user typing fast can submit a command while the bot's `setTimeout` is in flight. The hook must clear pending timers on state change to avoid double-dispatching stale events.
- **Free-text "banter" is local-only.** With no opponent voice, banter is dead air. Acceptable for v1; multiplayer makes it real.
- **Input focus inside Devvit.** Reddit's webview embedding is known to occasionally steal focus. Test that the input is reachable and persists focus.
- **Bundle size.** Adding `use-stick-to-bottom` (~3 KB) + JetBrains Mono subset (~80 KB) is within budget. The current client bundle is ~290 KB minified.

## Open questions

- *(none blocking — `10 rounds = 10 full matches` decision noted; revisit during sub-project F.)*

## Implementation order (high level — `writing-plans` will detail)

1. **Foundation:** `cardGlyph`, `parseCommand`, `types`. Pure, independently testable.
2. **Bot:** `canillitaStrategy` (pure) + `useCanillitaBot` (hook).
3. **Log derivation:** `useChatLog`.
4. **Visual surface:** `ChatLayout`, `ChannelHeader`, `MessageLog`, `Message`, `CommandInput`, `QuickReplyBar`.
5. **Wire-up:** `ChatApp.tsx`, then `main.tsx` URL branch.
6. **Translations:** EN + AR-ES `chat.*` keys.
7. **Tests:** Vitest unit specs as each pure module lands; Playwright spec at the end.
8. **Verify:** existing 40 Vitest + 12 Playwright stay green.
