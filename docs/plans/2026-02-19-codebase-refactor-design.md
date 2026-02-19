# Codebase Refactor Design

**Date**: 2026-02-19
**Goal**: Make the codebase modular, readable, and maintainable without changing functionality.

## Problem Statement

The codebase has grown organically with several pain points:
- **CSS bloat**: Components have 200-400 lines of duplicated styles
- **Server monolith**: `party/index.ts` (726 lines) handles action routing, bot management, and broadcasting
- **Mixed concerns**: Components combine UI, business logic, and interaction handling

## Design

### 1. CSS Extraction

Create shared stylesheets to eliminate duplication across components.

**New structure**:
```
src/styles/
├── tiles.css          # Tile face, border, shadow, sizing
├── buttons.css        # Action buttons (discard, sort, call)
├── breakpoints.css    # Shared responsive patterns (600px, 375px, landscape)
└── components/
    └── modal.css      # Overlay/modal patterns
```

**Components affected**:
- `Hand.svelte` - tile styling, button styles
- `PlayerHandView.svelte` - extensive mobile breakpoints
- `CallPrompt.svelte` - button styles, modal patterns
- `ResultsModal.svelte` - modal patterns

### 2. Server Modularization

Split `party/index.ts` into focused modules.

**New structure**:
```
party/
├── index.ts           # MahjongRoom class - thin coordinator
├── handlers/
│   ├── lobby.ts       # JOIN, REJOIN, START_GAME
│   ├── gameplay.ts    # DISCARD, CALL_CHI, CALL_PENG, CALL_GANG, DECLARE_WIN, PASS
│   └── rounds.ts      # START_NEXT_ROUND, DECLARE_BONUS
├── bot/
│   ├── bot.ts         # BotPlayer class (existing)
│   ├── manager.ts     # fillEmptySeats, scheduleBotActions, bumpBot
│   └── actions.ts     # Bot decision logic (discard, call, pass)
└── broadcast.ts       # broadcastRoomInfo, broadcastGameState, sendStateToConnection
```

**Handler signature pattern**:
```typescript
type Handler = (
  state: GameState,
  action: ClientAction,
  playerId: string,
  seat: Seat
) => { state: GameState } | { error: string };
```

### 3. Component Logic Extraction

Extract drag-drop logic from `Hand.svelte` into a reusable utility.

**New file**:
```
src/lib/drag-drop.ts
```

**Interface**:
```typescript
interface DragDropState<T> {
  draggedId: string | null;
  dropTargetIndex: number | null;
  orderedItems: T[];
  handlers: {
    handleDragStart: (e: DragEvent, id: string) => void;
    handleDragOver: (e: DragEvent, index: number) => void;
    handleDrop: (e: DragEvent, index: number) => void;
    handleDragEnd: () => void;
    handleTouchStart: (e: TouchEvent, id: string) => void;
    handleTouchMove: (e: TouchEvent) => void;
    handleTouchEnd: (e: TouchEvent) => void;
  };
  reorder: (ids: string[]) => void;
}
```

## Verification Strategy

Each phase is independently verifiable:

1. **After CSS extraction**:
   - `npm run check` - TypeScript passes
   - `npm run dev` - Visual inspection, styles identical

2. **After server modularization**:
   - `npm run check` - TypeScript passes
   - `npm run dev:all` - Create room, join, play game, bot actions work

3. **After component extraction**:
   - `npm run check` - TypeScript passes
   - `npm run dev` - Drag-drop tile reordering works on desktop and mobile

## Out of Scope

- Functionality changes
- New features
- Game logic modifications
- Test additions (can be done separately)

## Success Criteria

- No file exceeds 300 lines (excluding generated/vendored code)
- Server action handling is in dedicated handler files
- Bot logic is isolated in `party/bot/`
- Shared CSS patterns are in `src/styles/`
- All existing functionality preserved
