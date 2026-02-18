# CLAUDE.md

Project-specific instructions for Claude Code.

## Project Overview

Real-time multiplayer mahjong app using PartyKit (WebSocket backend) + Svelte 5 (frontend).

## Commands

```bash
npm run dev:all      # Run frontend + backend together
npm run test:run     # Run all tests once
npm run check        # TypeScript type checking
npm run dev:party    # Run PartyKit server only
npm run dev          # Run Vite frontend only
```

## Architecture

- `src/game/` - Pure game logic (types, engine, rulesets, calls)
- `src/components/` - Svelte UI components
- `src/views/` - Page-level Svelte components
- `src/lib/` - Utilities (connection, tile display)
- `party/` - PartyKit server (WebSocket handlers)

## Testing Requirements

### Unit Tests (Vitest)

Write unit tests for all game logic as we go:
- `src/game/*.test.ts` - Test pure functions in isolation
- Follow TDD: write failing test first, then implement
- Run with `npm run test:run`

### E2E Testing (Playwright MCP)

Use the Playwright MCP to validate and verify the game works:
- Test full user flows (create room, join, play)
- Verify UI updates correctly after actions
- Test multiplayer interactions across browser contexts

### When to Test

- **Game logic changes**: Always write unit tests first (TDD)
- **UI changes**: Verify with Playwright after implementation
- **Integration points**: Test server<->client communication with Playwright

## Code Style

- TypeScript strict mode
- Pure functions for game logic (no side effects)
- Svelte 5 runes syntax ($state, $derived, $props)

## Git Commits

- Do NOT add "Co-Authored-By" lines to commits

## Planned Features

### Bot Players (for testing)

- Computer players that make random valid moves
- Fill empty seats by default so games can start with <4 humans
- Humans can "bump" (replace) a bot when they join a seat
- Useful for testing game states without needing 4 browser windows
