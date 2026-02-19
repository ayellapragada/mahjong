# Fullscreen Button Design

**Date**: 2026-02-19
**Goal**: Add a fullscreen toggle button to both TableView and PlayerHandView.

## Requirements

- Toggle button in header area near room code
- Works on both TableView (iPad) and PlayerHandView (phone)
- Shows enter/exit icon based on current state
- Gracefully hidden if browser doesn't support Fullscreen API

## Design

### New Component: `src/components/FullscreenButton.svelte`

Self-contained component that:
- Uses `document.documentElement.requestFullscreen()` to enter
- Uses `document.exitFullscreen()` to exit
- Listens to `fullscreenchange` event to sync state
- Checks `document.fullscreenEnabled` for browser support

**State:**
```typescript
let isFullscreen = $state(false);
let isSupported = $state(true);
```

**Icons:**
- Enter: ⛶ (expand arrows via CSS/SVG)
- Exit: ⛷ (compress arrows via CSS/SVG)

### Integration

**TableView.svelte** header:
```svelte
<header>
  <div class="room-badge">{state.roomCode}</div>
  <FullscreenButton />
  <div class="wall-count">{state.wallCount} tiles remaining</div>
</header>
```

**PlayerHandView.svelte** header:
```svelte
<header>
  <div class="room-badge">{gameState.roomCode}</div>
  <FullscreenButton />
  <!-- existing header content -->
</header>
```

### Styling

- Small icon button matching existing theme
- Gold border with dark background
- Hover state with gold glow
- Consistent with existing button styles in the app

## Verification

1. `npm run check` - TypeScript passes
2. `npm run dev:all` - Manual testing:
   - Button appears in both views
   - Clicking enters fullscreen
   - Icon changes to exit
   - Clicking again exits fullscreen
   - Button hidden on unsupported browsers
