# Polish Design

Full polish package for the mahjong app: UX improvements, visual consistency, reliability, and juice.

## 1. Mobile Touch Drag-Drop

**Problem:** HTML5 drag-and-drop doesn't work on touch devices. Hand reordering only works on desktop.

**Solution:** Add touch event handlers alongside existing mouse drag events in `Hand.svelte`.

**Events:**
- `touchstart` - Begin drag, store start position, create visual "ghost" tile
- `touchmove` - Track finger, update ghost position, calculate drop target from coordinates
- `touchend` - Complete drop, animate tile into place

**Visual feedback:**
- Lifted tile scales up (1.1x) with enhanced shadow
- Ghost tile follows finger with transparency
- Drop target shows gold insertion indicator (reuse `.drag-over` style)

**Files:** `src/components/Hand.svelte`

## 2. Visual Consistency (SVG Tiles)

**Problem:** `ResultsModal.svelte` uses Unicode tiles (`tileToUnicode()`) while rest of app uses SVGs.

**Solution:** Replace Unicode with SVG images in ResultsModal.

**Changes:**
- Import `tileToSvgPath`
- Replace `<span class="tile">{tileToUnicode()}</span>` with `<img src={tileToSvgPath()} class="tile" />`
- Update CSS for img.tile styling

**Files:** `src/components/ResultsModal.svelte`

## 3. Connection Reliability

**Problem:** No handling for connection drops, no loading feedback.

### Connection States
- `connected` - Normal operation
- `connecting` - Initial connection or reconnecting
- `disconnected` - Lost connection, auto-retrying
- `error` - Failed after max retries

### ConnectionStatus Component
- Green dot when connected (hidden by default)
- Yellow "Reconnecting..." with spinner when disconnected
- Red "Connection lost" with retry button after max retries

### Loading Skeleton
- Pulse animation placeholders during initial load
- Used in LobbyView while waiting for room state

### Reconnection Logic
- Auto-retry with exponential backoff (1s, 2s, 4s, max 30s)
- Preserve room code, attempt to rejoin
- Max 5 retries before showing manual retry option

**Files:**
- `src/lib/connection.ts` - Add reconnection logic
- `src/components/ConnectionStatus.svelte` - New
- `src/views/GameView.svelte` - Integrate status
- `src/views/LobbyView.svelte` - Add loading skeleton

## 4. Essential Sounds

**Problem:** No audio feedback for game actions.

### Sounds
1. **tile-click** - Short, soft click on tile selection
2. **discard** - Satisfying "clack" when tile discarded
3. **call** - Alert sound for chi/peng/gang
4. **win** - Triumphant sound for hu

### Implementation
- `src/lib/sounds.ts` - Sound manager with preload
- `src/assets/sounds/` - Small MP3/OGG files
- `playSound('tile-click' | 'discard' | 'call' | 'win')`
- Respect system sound settings

### Integration Points
- `Hand.svelte` - tile click
- `PlayerHandView.svelte` - discard action
- `CallPrompt.svelte` - call button press
- `GameView.svelte` - win detection

## 5. Error Toasts

**Problem:** No visual feedback for errors.

### Toast Types
- Error (red) - "Failed to discard", "Connection error"
- Warning (yellow) - "Reconnecting..."
- Success (green) - "Rejoined game"

### UI
- Top of screen, slide down animation
- Auto-dismiss after 3-4 seconds
- Stack multiple toasts

### Implementation
- `src/lib/toast.ts` - Toast store and functions
- `src/components/ToastContainer.svelte` - Renders active toasts
- Add to `App.svelte` root

## 6. Haptic Feedback

**Problem:** No tactile feedback on mobile.

### Vibration Patterns
- Light (50ms) - tile select
- Medium (100ms) - discard
- Strong (200ms) - win

### Implementation
- `src/lib/haptics.ts` - `vibrate('light' | 'medium' | 'strong')`
- Uses Navigator Vibration API
- Graceful no-op on unsupported devices

## Out of Scope

- Win confetti animation
- Sound settings/toggle UI
- Tile themes
- Offline detection banner
- Smooth tile movement animations
