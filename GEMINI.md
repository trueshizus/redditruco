# GEMINI.md

This document provides an overview of the Reddit Truco project, its technical stack, and its current state.

## Project Overview

Reddit Truco is a web application that allows users to play the Argentinian card game "Truco" within the Reddit platform. The application is built using Devvit, Reddit's platform for building apps.

## Tech Stack

- **Frontend:**
  - React 19
  - Vite
  - Tailwind CSS
  - XState for state management

- **Backend:**
  - Node.js with Express
  - Devvit (Reddit's app platform)
  - Redis for data storage

- **Tooling:**
  - TypeScript
  - ESLint for linting
  - Prettier for code formatting
  - Concurrently for running multiple processes

## Project Structure

The project is organized into the following main directories:

- `src/client`: Contains the frontend code for the React application.
  - `src/client/components`: Reusable React components.
  - `src/client/machines`: XState state machines for managing game logic.
- `src/server`: Contains the backend code for the Devvit application.
- `src/shared`: Contains code shared between the client and server, such as types.
- `utils`: Contains scripts for utility tasks, such as generating card assets.

## How to run the project

To run the project in a development environment, use the following command:

```bash
npm run dev
```

This command will start the Vite development server for the client, the Vite build process in watch mode for the server, and the Devvit development environment.

## Game Logic

The game logic is currently in its early stages. It is managed by an XState state machine located in `src/client/machines/gameStateMachine.ts`.

The current implementation includes:

- A single "playing" state.
- Events for selecting and flipping cards.
- The state machine tracks the currently selected card and the currently flipped card.

The actual rules of Truco, such as scoring, rounds, and the different "cantos" (calls), are not yet implemented.

## Next Steps

The following are some suggestions for the next steps in the development of the project:

- **Implement the core game logic:**
  - Create a more detailed state machine that represents the different phases of a Truco game (e.g., dealing cards, "envido", "truco", round end).
  - Implement the rules for scoring and winning a hand.
  - Implement the logic for the different "cantos" (e.g., "envido", "real envido", "falta envido", "truco", "retruco", "vale cuatro").
- **Improve the UI:**
  - Add animations for card movements.
  - Create a more visually appealing game board.
  - Add a scoreboard to display the current score.
- **Backend development:**
  - Implement a system for managing game state on the server.
  - Use WebSockets for real-time communication between players.
  - Implement user authentication and matchmaking.
