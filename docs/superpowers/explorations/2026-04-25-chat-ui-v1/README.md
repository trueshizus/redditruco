# Design alternatives considered — chat UI brainstorm (2026-04-25)

This folder captures the directions we explored before settling on **IRC/terminal
chat with CanillitaBot**, which is what `chat-ui-v1` ships. Use this as a starting
menu for the next round of UI work — every alternative below is implementable on
top of the same `trucoStateMachine` (one of the goals we set early in the session).

> **Chosen:** IRC/terminal chat. See `docs/superpowers/specs/2026-04-25-chat-ui-v1-design.md` and the merge commit tagged `chat-ui-v1`.

---

## Track A — Idle-screen redesigns of the existing table UI

These were proposed before the conversation pivoted to "alternative renderings". They reskin/restructure the *current table layout* without changing its information architecture. Useful if a future iteration is "make the table UI feel more like Truco" rather than "build a new surface."

### A1. **Pulpería** *(rural cantina, by lantern light)*
- Surface: dark slate green-black with woodgrain, wood frame, lamp pool top-center.
- Type: chalk-display script for the title; warm humanist serif (Fraunces / IM Fell English) for body.
- Palette: aged leather + cream parchment + brass accents + oxblood for CALLS.
- Motion: lamp flicker, candle-shadow on wood, smoke wisps.
- Cards: rest on worn wood; tricks tracked as stacked chips.
- *Distinctive*. Closest to Truco's actual cultural home (rural Argentine taverns).

### A2. **Café Notable** *(Buenos Aires, ~1930s)*
- Surface: bottle-green felt + cream marble + brass rails.
- Type: Clarendon-style display serif (DM Serif Display); restrained dingbats (◆ ♠ ★) replacing emoji.
- Palette: cream + bottle green + brass.
- Betting state rendered as hand-painted ribbons.
- *Cultured / premium / aspirational*. Tango-era polish.

### A3. **Terraza** *(stadium-albiceleste)*
- Surface: sky-blue + white (albiceleste) base, hot magenta accents, halftone screen-print textures.
- Type: condensed display (Antonio / Bebas Neue), heavy black outlines.
- Calls slammed as chants: `¡TRUCO!` in a red woodblock ribbon.
- *Modern, loud, football-culture crossover*. Maximalist.

---

## Track B — Five "what is this app, really?" metaphors

Each is a different *thesis* about what the app is. Same state machine, different conceptual frame. Visual mood-cards are in `metaphors-mood.html`.

### M1. **Terminal hacker** *(Unix prompt)*
- Background: scanlines, blinking cursor, ASCII rain.
- Controls: typed commands or numbered options.
- Natural medium: TUI.
- *This evolved into the chosen IRC/terminal chat*, but as a TUI it would actually run in the terminal (e.g. via Ink or React-Blessed).

### M2. **Pulpería** *(rural cantina)*
- Same direction as Track A1, but framed as the entire *app metaphor*, not just a skin.
- Background: lamp flicker, smoke, woodgrain.
- Controls: physical-feeling cards, brass buttons, paper score sheet.
- Natural medium: React webview with rich texture work.

### M3. **Chat con un amigo** *(iMessage thread)*
- Background: chat thread scroll, typing indicator.
- Controls: quick-reply chips, message bubbles, attachment cards.
- Natural medium: Mobile / React.
- *Family resemblance to the chosen path* but in modern-bubble register rather than IRC.

### M4. **Arcade attract** *(80s coin-op)*
- Background: pixel-art demo loop, marquee scroll, hi-score table, "INSERT COIN".
- Controls: single START → chord input.
- Natural medium: HTML canvas + CRT shader.
- *Distinctive and memorable*; fits a "casual game" framing well.

### M5. **Carta / invitación** *(paper letter received in the mail)*
- Background: ink seeping, paper grain, wind.
- Controls: open envelope, sign card, RSVP.
- Natural medium: slow, native-feel web.
- *Quiet, ceremonial*. Argentine café register, hand-lettered.

---

## Track C — Four chat-surface aesthetics (only relevant once we'd picked "chat")

Visual side-by-side in `chat-styles.html`. The same conversation rendered four ways.

### C-A. **WhatsApp criollo**
- Familiar to every Argentine user. Dark green outgoing, dark grey incoming, ✓✓ ticks.
- Boring-by-design but reads instantly. Safe shipping default.

### C-B. **iMessage moderno**
- iOS bubble + blue gradient. Premium-modern register.
- Same familiarity as A, different brand register.

### C-C. **IRC / terminal** *(chosen — built and merged as `chat-ui-v1`)*
- Monospace, slash commands, channel topic line, cursor blink.
- Hacker register; free-text first-class because you're already typing.
- See `irc-flow.html` for the developed mockup.

### C-D. **Carta de café**
- Ink on cream paper, italic dashes for messages, hand-drawn buttons.
- Slow and ceremonial. Closest to Truco's actual cultural home.
- *Distinctiveness winner* of the four; not chosen because IRC has cleaner free-text UX.

---

## State-machine extensions sketched but deferred

These were in scope for the original 5-variation brainstorm. Not in v1, will surface again whenever we add multiplayer or ranked.

- **Pre-match group**: `idle → mode_select → matchmaking → waiting_for_opponent → dealing` (today: idle → dealing directly).
- **Connection states**: `opponent_disconnected`, `reconnecting`, `opponent_left`, `solo_resume`.
- **Ranking**: `context.matchesWon` counter, increment on `game_over` if `gameWinner === 0`. Unlocks `?mode=ranked` at 10 wins.
- **Ranked mode**: pyramid (1M → 500K → … → 1 at top), win-rises / loss-falls, first-to-top. Defined in user prompt as a *new game mode*, not a state-machine extension only — would also need its own match flow.

---

## How to use this folder

For the next iteration, pick a track + variant and either:
1. **Skin** — apply Track A directions to the existing `App.tsx` table renderer.
2. **New renderer** — build a new sibling at `src/client/<NewApp>.tsx` and add a `?ui=<name>` branch in `main.tsx`. Same pattern as `ChatApp.tsx`.
3. **New medium** — TUI (M1) or canvas (M4) need their own runtime / build target — separate sub-project.

The visual mockup HTMLs in this folder render standalone; just open them in a browser to remind yourself of any direction.
