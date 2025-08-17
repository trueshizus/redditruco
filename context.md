# Context: Accessing Reddit Devvit Playtest

## Overview

This document provides the necessary context for an LLM to quickly access and test the reditruco Devvit app in the Reddit playtest environment.

## Project Details

- **App Name**: reditruco
- **Subreddit**: r/reditruco_dev (private)
- **Playtest URL**: https://www.reddit.com/r/reditruco_dev/?playtest=reditruco
- **Repository**: /Users/shizus/projects/redditruco

## Prerequisites

1. Playwright is already installed as a dependency in package.json
2. User must be logged into Reddit with access to r/reditruco_dev subreddit
3. The subreddit is private and requires moderator approval

## Quick Access Steps

### 1. Navigate to Playtest URL

```
mcp__playwright__browser_navigate: https://www.reddit.com/r/reditruco_dev/?playtest=reditruco
```

### 2. Handle Cookie Consent (if appears)

- Look for "Accept all" button in cookie dialog
- Click to accept cookies

### 3. Access the App

- Scroll down to find the "reditruco" post in the feed (marked with green "APP" tag)
- Look for the blue "Launch App" button within the post content area
- Click "Launch App" to open the UI simulator dialog

### 4. Dismiss Initial Dialog (if appears)

- If device preview help appears, click "Got it" button to dismiss

### 5. Development Workflow

- Make changes to `src/client/App.tsx` (or other source files)
- Changes auto-build via `npm run dev` running in VS Code
- Refresh Reddit page (`mcp__playwright__browser_navigate` to same URL)
- Click "Launch App" again to see updated version
- App version increments automatically (e.g., 0.0.1.3 → 0.0.1.5)

## Expected Result

The Devvit app will load in an iframe within a dialog showing:

- Single Spanish playing card (As de Bastos) with XState integration
- Card displays current state (idle/selected/flipped) below
- Interactive card that responds to clicks with state transitions
- UI simulator controls (Mobile/Desktop/Fullscreen toggle)

## Tech Stack

- **Frontend**: React 19.1.0, TailwindCSS 4.1.6, Vite 6.2.4
- **Backend**: Express 5.1.0, Devvit 0.12.0
- **Database**: Redis (via Devvit)
- **Testing**: Playwright 1.54.2
- **Language**: TypeScript 5.8.2
- **State Management**: XState 5.20.2 with @xstate/react 6.0.0

## Project Structure

```
src/
├── client/               # React frontend
│   ├── App.tsx          # Main app component (displays single card)
│   ├── components/      # React components
│   │   └── Card.tsx     # Parametrized card component with XState
│   ├── machines/        # XState state machines
│   │   └── cardMachine.ts # Card state machine (idle/selected/flipped)
│   ├── hooks/           # React hooks
│   └── public/          # Static assets served by Devvit
│       └── cards/       # Spanish deck SVG assets (40 cards + back)
├── server/              # Express backend
│   ├── index.ts         # API routes
│   └── core/            # Business logic
├── shared/              # Shared types
│   └── types/           # API interfaces
└── utils/               # Build tools
    └── generate-svg-cards.js # CLI tool for generating card assets
```

## Current Implementation

- Spanish deck card game foundation (40 cards: 1-7, 10-12 for E/B/C/O suits)
- XState-powered card component with visual state feedback
- SVG card assets with Argentine-inspired design and card back
- Interactive card flipping functionality
- CLI card generation system

## Card Assets

- **Naming**: `NN_S.svg` format (e.g., `01_B.svg` for As de Bastos)
- **Location**: `src/client/public/cards/` (required for Devvit asset serving)
- **Design**: Cream gradient background, suit-colored text, decorative elements
- **Back Design**: Blue ornate pattern in `card-back.svg`
- **Generation**: `npm run generate:cards` to regenerate all assets

## Development Commands

- `npm run dev`: Start development with file watching
- `npm run build`: Build client and server
- `npm run deploy`: Upload new version
- `npm run check`: Type check, lint, and format
- `npm run generate:cards`: Generate Spanish deck SVG assets
- `devvit playtest`: Local playtest command
