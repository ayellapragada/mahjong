# Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full polish to the mahjong app: mobile touch drag-drop, SVG consistency, connection reliability, sounds, toasts, and haptics.

**Architecture:** Six independent features that can be implemented in any order. Touch drag-drop modifies Hand.svelte, reliability adds new connection logic + components, sounds/haptics/toasts each add small utility modules with minimal integration points.

**Tech Stack:** Svelte 5 (runes), TypeScript, Web Audio API, Navigator Vibration API, CSS animations

---

## Task 1: Mobile Touch Drag-Drop

**Files:**
- Modify: `src/components/Hand.svelte`

**Step 1: Add touch state variables**

In the `<script>` section, after the existing drag state variables (around line 28), add:

```typescript
// Touch drag state
let touchDragId: string | null = $state(null);
let touchStartX: number = $state(0);
let touchStartY: number = $state(0);
let ghostElement: HTMLDivElement | null = $state(null);
```

**Step 2: Run check**

Run: `npm run check`
Expected: PASS (no type errors)

**Step 3: Add touch event handlers**

After the existing `handleDragEnd` function (around line 113), add these touch handlers:

```typescript
function handleTouchStart(e: TouchEvent, tileId: string) {
  const touch = e.touches[0];
  touchDragId = tileId;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;

  // Create ghost element
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  ghostElement = document.createElement('div');
  ghostElement.className = 'touch-ghost';
  ghostElement.innerHTML = target.innerHTML;
  ghostElement.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    pointer-events: none;
    z-index: 1000;
    opacity: 0.8;
    transform: scale(1.1);
    transition: transform 0.1s ease;
  `;
  document.body.appendChild(ghostElement);
}

function handleTouchMove(e: TouchEvent) {
  if (!touchDragId || !ghostElement) return;
  e.preventDefault();

  const touch = e.touches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;

  // Move ghost
  const rect = ghostElement.getBoundingClientRect();
  ghostElement.style.left = `${touch.clientX - rect.width / 2}px`;
  ghostElement.style.top = `${touch.clientY - rect.height / 2}px`;

  // Find drop target
  const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
  const dropTarget = elements.find(el =>
    el.classList.contains('tile-wrapper') &&
    !el.classList.contains('dragging')
  ) as HTMLElement | undefined;

  // Update drop target indicator
  document.querySelectorAll('.tile-wrapper.drag-over').forEach(el =>
    el.classList.remove('drag-over')
  );

  if (dropTarget) {
    const index = Array.from(dropTarget.parentElement?.children || []).indexOf(dropTarget);
    dropTargetIndex = index;
    dropTarget.classList.add('drag-over');
  } else {
    dropTargetIndex = null;
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (!touchDragId) return;

  // Complete the drop if we have a target
  if (dropTargetIndex !== null && touchDragId) {
    const draggedIndex = tileOrder.indexOf(touchDragId);
    if (draggedIndex !== -1 && draggedIndex !== dropTargetIndex) {
      const newOrder = [...tileOrder];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(dropTargetIndex, 0, touchDragId);
      tileOrder = newOrder;
    }
  }

  // Cleanup
  if (ghostElement) {
    ghostElement.remove();
    ghostElement = null;
  }
  document.querySelectorAll('.tile-wrapper.drag-over').forEach(el =>
    el.classList.remove('drag-over')
  );
  touchDragId = null;
  dropTargetIndex = null;
}
```

**Step 4: Add touch events to tile wrapper**

Replace the existing `.tile-wrapper` div (around line 149-167) with:

```svelte
<div
  class="tile-wrapper"
  class:drag-over={dropTargetIndex === index}
  class:dragging={draggedTileId === tile.id || touchDragId === tile.id}
  draggable="true"
  ondragstart={(e) => handleDragStart(e, tile.id)}
  ondragover={(e) => handleDragOver(e, index)}
  ondragleave={handleDragLeave}
  ondrop={(e) => handleDrop(e, index)}
  ondragend={handleDragEnd}
  ontouchstart={(e) => handleTouchStart(e, tile.id)}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  role="listitem"
>
```

**Step 5: Add touch ghost styles**

In the `<style>` section, add:

```css
:global(.touch-ghost) {
  background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
  border: 2px solid var(--gold);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(212, 168, 75, 0.3);
}

:global(.touch-ghost img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

**Step 6: Test manually**

Run: `npm run dev:all`
Test: Open on mobile device or Chrome DevTools mobile emulator, drag tiles with touch
Expected: Tiles can be reordered by touch dragging

**Step 7: Commit**

```bash
git add src/components/Hand.svelte
git commit -m "feat: add touch drag-drop support for mobile hand reordering"
```

---

## Task 2: SVG Tiles in ResultsModal

**Files:**
- Modify: `src/components/ResultsModal.svelte`

**Step 1: Update imports**

Replace line 3:
```typescript
import { SEAT_NAMES, SEAT_WINDS, tileToUnicode } from "../lib/tiles";
```

With:
```typescript
import { SEAT_NAMES, SEAT_WINDS, tileToSvgPath } from "../lib/tiles";
```

**Step 2: Replace Unicode tiles in winning hand**

Replace line 47:
```svelte
<span class="tile">{tileToUnicode(tile.tile)}</span>
```

With:
```svelte
<img src={tileToSvgPath(tile.tile)} alt="" class="tile" />
```

**Step 3: Replace Unicode tiles in melds**

Replace line 55:
```svelte
<span class="tile meld-tile">{tileToUnicode(tile.tile)}</span>
```

With:
```svelte
<img src={tileToSvgPath(tile.tile)} alt="" class="tile meld-tile" />
```

**Step 4: Update CSS for img tiles**

Replace the `.tile` style block (lines 204-210) with:

```css
.tile {
  width: clamp(1.6rem, 5vw, 2rem);
  height: clamp(2.2rem, 7vw, 2.8rem);
  background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
  border-radius: 3px;
  padding: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  object-fit: contain;
}
```

**Step 5: Update meld-tile style**

Replace lines 231-233:
```css
.meld-tile {
  font-size: 1.1rem !important;
  padding: 1px 3px !important;
}
```

With:
```css
.meld-tile {
  width: clamp(1.2rem, 4vw, 1.6rem) !important;
  height: clamp(1.7rem, 5.5vw, 2.2rem) !important;
  padding: 1px !important;
}
```

**Step 6: Update mobile tile styles**

Replace lines 356-362:
```css
.tile {
  font-size: 1.2rem;
  padding: 1px 3px;
}

.meld-tile {
  font-size: 1rem !important;
}
```

With:
```css
.tile {
  width: 1.4rem;
  height: 2rem;
}

.meld-tile {
  width: 1.1rem !important;
  height: 1.5rem !important;
}
```

**Step 7: Run type check**

Run: `npm run check`
Expected: PASS

**Step 8: Commit**

```bash
git add src/components/ResultsModal.svelte
git commit -m "fix: use SVG tiles in ResultsModal for visual consistency"
```

---

## Task 3: Toast Notification System

**Files:**
- Create: `src/lib/toast.ts`
- Create: `src/components/ToastContainer.svelte`
- Modify: `src/App.svelte`

**Step 1: Create toast store**

Create `src/lib/toast.ts`:

```typescript
type ToastType = 'error' | 'warning' | 'success';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toasts: Toast[] = $state([]);
let nextId = 0;

export function showToast(message: string, type: ToastType = 'error', duration = 4000) {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
  }, duration);
}

export function getToasts() {
  return toasts;
}

// Convenience functions
export const toast = {
  error: (msg: string) => showToast(msg, 'error'),
  warning: (msg: string) => showToast(msg, 'warning'),
  success: (msg: string) => showToast(msg, 'success'),
};
```

**Step 2: Run type check**

Run: `npm run check`
Expected: PASS

**Step 3: Create ToastContainer component**

Create `src/components/ToastContainer.svelte`:

```svelte
<script lang="ts">
  import { getToasts } from "../lib/toast";

  let toasts = $derived(getToasts());
</script>

<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}" role="alert">
      {toast.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: env(safe-area-inset-top, 16px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: calc(100vw - 32px);
    pointer-events: none;
  }

  .toast {
    padding: 12px 20px;
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 500;
    text-align: center;
    animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .toast-error {
    background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
    color: white;
  }

  .toast-warning {
    background: linear-gradient(135deg, #d4a84b 0%, #a07830 100%);
    color: #1a0f0a;
  }

  .toast-success {
    background: linear-gradient(135deg, #2d8659 0%, #1a5038 100%);
    color: white;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
```

**Step 4: Add ToastContainer to App.svelte**

Add import at top of `src/App.svelte` (after line 11):

```typescript
import ToastContainer from "./components/ToastContainer.svelte";
```

Add component just inside `<main>` (after line 121):

```svelte
<main>
  <ToastContainer />
```

**Step 5: Run type check**

Run: `npm run check`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/toast.ts src/components/ToastContainer.svelte src/App.svelte
git commit -m "feat: add toast notification system"
```

---

## Task 4: Haptic Feedback

**Files:**
- Create: `src/lib/haptics.ts`
- Modify: `src/components/Hand.svelte`
- Modify: `src/views/PlayerHandView.svelte`

**Step 1: Create haptics utility**

Create `src/lib/haptics.ts`:

```typescript
type HapticIntensity = 'light' | 'medium' | 'strong';

const patterns: Record<HapticIntensity, number | number[]> = {
  light: 50,
  medium: 100,
  strong: 200,
};

export function vibrate(intensity: HapticIntensity = 'light'): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(patterns[intensity]);
    } catch {
      // Silently fail - haptics are optional
    }
  }
}
```

**Step 2: Add haptics to tile selection in Hand.svelte**

Add import at top of `src/components/Hand.svelte`:

```typescript
import { vibrate } from "../lib/haptics";
```

In `handleTileClick` function, add vibrate call at the start:

```typescript
function handleTileClick(tileId: string) {
  if (!canDiscard) return;
  vibrate('light');

  if (selectedTileId === tileId) {
```

**Step 3: Add haptics to discard in PlayerHandView.svelte**

Add import at top of `src/views/PlayerHandView.svelte`:

```typescript
import { vibrate } from "../lib/haptics";
```

Update the `onDiscard` prop passed to Hand to include haptics. Wrap it in the parent component by modifying `handleDiscard` in `App.svelte`.

Actually, simpler: modify `PlayerHandView.svelte` to call haptics when passing the discard. After the existing imports, before the Props interface:

```typescript
import { vibrate } from "../lib/haptics";
```

Then create a wrapper function after line 60:

```typescript
function handleDiscardWithHaptic(tileId: string) {
  vibrate('medium');
  onDiscard(tileId);
}
```

And update the Hand component call (around line 152):

```svelte
<Hand
  tiles={state.myHand}
  {canDiscard}
  onDiscard={handleDiscardWithHaptic}
/>
```

**Step 4: Run type check**

Run: `npm run check`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/haptics.ts src/components/Hand.svelte src/views/PlayerHandView.svelte
git commit -m "feat: add haptic feedback for tile interactions"
```

---

## Task 5: Sound Effects

**Files:**
- Create: `src/lib/sounds.ts`
- Create: `src/assets/sounds/` (directory)
- Modify: `src/components/Hand.svelte`
- Modify: `src/views/PlayerHandView.svelte`
- Modify: `src/components/CallPrompt.svelte`
- Modify: `src/App.svelte`

**Step 1: Create sounds directory and placeholder info**

Run: `mkdir -p src/assets/sounds`

Note: You'll need to add actual sound files. For now, we'll set up the infrastructure. Recommended free sound sources:
- https://freesound.org (search "mahjong tile", "click", "success")
- https://mixkit.co/free-sound-effects/

Sound files needed:
- `tile-click.mp3` - short soft click (~50ms)
- `discard.mp3` - tile hitting table (~100ms)
- `call.mp3` - alert/notification (~200ms)
- `win.mp3` - triumphant sound (~500ms)

**Step 2: Create sounds utility**

Create `src/lib/sounds.ts`:

```typescript
type SoundName = 'tile-click' | 'discard' | 'call' | 'win';

const audioElements: Map<SoundName, HTMLAudioElement> = new Map();
let soundsEnabled = true;

// Preload sounds
export function initSounds(): void {
  const sounds: SoundName[] = ['tile-click', 'discard', 'call', 'win'];

  sounds.forEach(name => {
    try {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audio.preload = 'auto';
      audio.volume = 0.5;
      audioElements.set(name, audio);
    } catch {
      console.warn(`Failed to load sound: ${name}`);
    }
  });
}

export function playSound(name: SoundName): void {
  if (!soundsEnabled) return;

  const audio = audioElements.get(name);
  if (audio) {
    // Reset and play
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay blocked - ignore silently
    });
  }
}

export function setSoundsEnabled(enabled: boolean): void {
  soundsEnabled = enabled;
}
```

**Step 3: Initialize sounds in App.svelte**

Add import at top:

```typescript
import { initSounds, playSound } from "./lib/sounds";
```

Update `onMount` (around line 24):

```typescript
onMount(() => {
  initSounds();

  const params = new URLSearchParams(window.location.search);
```

**Step 4: Add sound to tile click in Hand.svelte**

Add import:

```typescript
import { playSound } from "../lib/sounds";
```

Update `handleTileClick`:

```typescript
function handleTileClick(tileId: string) {
  if (!canDiscard) return;
  playSound('tile-click');
  vibrate('light');
```

**Step 5: Add discard sound in PlayerHandView.svelte**

Add import:

```typescript
import { playSound } from "../lib/sounds";
```

Update `handleDiscardWithHaptic`:

```typescript
function handleDiscardWithHaptic(tileId: string) {
  playSound('discard');
  vibrate('medium');
  onDiscard(tileId);
}
```

**Step 6: Add call sound in CallPrompt.svelte**

Add import after line 3:

```typescript
import { playSound } from "../lib/sounds";
```

Update `handleChi`, `handlePeng`, `handleGang`, `handleWin` to play sound. Add at the start of each:

```typescript
function handleChi() {
  if (!chiCall?.tiles) return;
  playSound('call');
  // ... rest of function
```

```typescript
function handlePeng() {
  if (!pengCall?.tiles?.[0]) return;
  playSound('call');
  onCall("peng", pengCall.tiles[0].map(t => t.id));
}

function handleGang() {
  if (!gangCall?.tiles?.[0]) return;
  playSound('call');
  onCall("gang", gangCall.tiles[0].map(t => t.id));
}

function handleWin() {
  playSound('win');
  onCall("win", []);
}
```

**Step 7: Copy sound files to public directory**

Sound files should be in `public/sounds/` for Vite to serve them:

Run: `mkdir -p public/sounds`

Note: Add your actual sound files here. For testing, you can create silent placeholder files or skip sounds initially.

**Step 8: Run type check**

Run: `npm run check`
Expected: PASS

**Step 9: Commit**

```bash
git add src/lib/sounds.ts src/components/Hand.svelte src/views/PlayerHandView.svelte src/components/CallPrompt.svelte src/App.svelte public/sounds
git commit -m "feat: add sound effects for tile interactions"
```

---

## Task 6: Connection Reliability

**Files:**
- Modify: `src/lib/connection.ts`
- Create: `src/components/ConnectionStatus.svelte`
- Modify: `src/App.svelte`

**Step 1: Add reconnection state to connection.ts**

Update the `ConnectionState` type (line 5-9) to include reconnection info:

```typescript
export type ConnectionState =
  | { status: "disconnected" }
  | { status: "connecting"; attempt?: number }
  | { status: "reconnecting"; attempt: number; maxAttempts: number }
  | { status: "connected"; roomCode: string; players: Array<{ name: string; seat: Seat }> }
  | { status: "playing"; state: ClientGameState; gameOver?: { winner: Seat | -1; scores: Record<Seat, number>; breakdown: ScoreBreakdown; winnerName: string; winningHand: TileInstance[]; winningMelds: Meld[]; isSelfDrawn: boolean } };
```

**Step 2: Add reconnection logic to connection.ts**

Replace the entire `createConnection` function with this enhanced version:

```typescript
export function createConnection(onUpdate: (state: ConnectionState) => void): ConnectionStore {
  let socket: WebSocket | null = null;
  let currentState: ConnectionState = { status: "disconnected" };
  let currentViewMode: ViewMode = "player";
  let currentRoomId: string | null = null;
  let reconnectAttempt = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 30000];

  function setState(newState: ConnectionState) {
    currentState = newState;
    onUpdate(newState);
  }

  function getReconnectDelay(attempt: number): number {
    return RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
  }

  function scheduleReconnect() {
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      setState({ status: "disconnected" });
      return;
    }

    const delay = getReconnectDelay(reconnectAttempt);
    reconnectAttempt++;

    setState({
      status: "reconnecting",
      attempt: reconnectAttempt,
      maxAttempts: MAX_RECONNECT_ATTEMPTS
    });

    reconnectTimeout = setTimeout(() => {
      if (currentRoomId) {
        connectInternal(currentRoomId, currentViewMode, true);
      }
    }, delay);
  }

  function clearReconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }

  function connectInternal(roomId: string, viewMode: ViewMode, isReconnect: boolean) {
    if (socket) {
      socket.close();
    }

    currentViewMode = viewMode;
    currentRoomId = roomId;

    if (!isReconnect) {
      reconnectAttempt = 0;
      setState({ status: "connecting" });
    }

    const baseUrl = import.meta.env.DEV
      ? "ws://localhost:8787"
      : "wss://mahjong.ayellapragada.workers.dev";

    const wsUrl = `${baseUrl}/parties/mahjong-room/${roomId}?mode=${viewMode}`;
    socket = new WebSocket(wsUrl);

    socket.addEventListener("open", () => {
      console.log("Connected to room:", roomId);
      reconnectAttempt = 0;
      clearReconnect();
    });

    socket.addEventListener("message", (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      console.log("Received:", message.type);

      switch (message.type) {
        case "ROOM_INFO":
          setState({
            status: "connected",
            roomCode: message.roomCode,
            players: message.players,
          });
          break;
        case "STATE_UPDATE":
          setState({
            status: "playing",
            state: message.state,
          });
          break;
        case "GAME_OVER":
          if (currentState.status === "playing") {
            setState({
              ...currentState,
              gameOver: {
                winner: message.winner,
                scores: message.scores,
                breakdown: message.breakdown,
                winnerName: message.winnerName,
                winningHand: message.winningHand,
                winningMelds: message.winningMelds,
                isSelfDrawn: message.isSelfDrawn,
              },
            });
          }
          break;
        case "ERROR":
          console.error("Server error:", message.message);
          break;
      }
    });

    socket.addEventListener("close", (event) => {
      console.log("Disconnected", event.code, event.reason);

      // Only auto-reconnect if we were previously connected and it wasn't intentional
      if (currentRoomId && currentState.status !== "disconnected") {
        scheduleReconnect();
      } else {
        setState({ status: "disconnected" });
      }
    });

    socket.addEventListener("error", (e) => {
      console.error("Connection error:", e);
    });
  }

  function connect(roomId: string, viewMode: ViewMode = "player") {
    clearReconnect();
    connectInternal(roomId, viewMode, false);
  }

  function disconnect() {
    clearReconnect();
    currentRoomId = null;
    if (socket) {
      socket.close();
      socket = null;
    }
    setState({ status: "disconnected" });
  }

  function send(action: ClientAction) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(action));
    } else {
      console.error("Cannot send: not connected");
    }
  }

  function retry() {
    if (currentRoomId) {
      reconnectAttempt = 0;
      clearReconnect();
      connectInternal(currentRoomId, currentViewMode, false);
    }
  }

  return {
    get state() { return currentState; },
    get viewMode() { return currentViewMode; },
    connect,
    disconnect,
    send,
    retry,
  };
}
```

**Step 3: Update ConnectionStore type**

Update the type definition (around line 11-17):

```typescript
export type ConnectionStore = {
  state: ConnectionState;
  viewMode: ViewMode;
  connect: (roomId: string, viewMode?: ViewMode) => void;
  disconnect: () => void;
  send: (action: ClientAction) => void;
  retry: () => void;
};
```

**Step 4: Create ConnectionStatus component**

Create `src/components/ConnectionStatus.svelte`:

```svelte
<script lang="ts">
  import type { ConnectionState } from "../lib/connection";

  interface Props {
    state: ConnectionState;
    onRetry: () => void;
  }

  let { state, onRetry }: Props = $props();

  let isReconnecting = $derived(state.status === "reconnecting");
  let showStatus = $derived(state.status === "reconnecting" || state.status === "connecting");
</script>

{#if showStatus}
  <div class="connection-status" class:reconnecting={isReconnecting}>
    <div class="status-content">
      {#if state.status === "reconnecting"}
        <div class="spinner"></div>
        <span>Reconnecting... ({state.attempt}/{state.maxAttempts})</span>
      {:else if state.status === "connecting"}
        <div class="spinner"></div>
        <span>Connecting...</span>
      {/if}
    </div>
    {#if isReconnecting}
      <button class="retry-btn" onclick={onRetry}>Retry Now</button>
    {/if}
  </div>
{/if}

<style>
  .connection-status {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 9998;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: slideDown 0.3s ease;
  }

  .connection-status.reconnecting {
    border-color: var(--gold-dim);
  }

  .status-content {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .retry-btn {
    padding: 4px 10px;
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gold);
    background: transparent;
    border: 1px solid var(--gold-dim);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-btn:hover {
    background: rgba(212, 168, 75, 0.15);
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
```

**Step 5: Add ConnectionStatus to App.svelte**

Add import:

```typescript
import ConnectionStatus from "./components/ConnectionStatus.svelte";
```

Add component after ToastContainer (after line ~122):

```svelte
<main>
  <ToastContainer />
  <ConnectionStatus state={connectionState} onRetry={() => connection.retry()} />
```

**Step 6: Add toast for reconnection**

Import toast in App.svelte:

```typescript
import { toast } from "./lib/toast";
```

Update the connection callback to show toasts:

```typescript
let previousStatus = "disconnected";

const connection = createConnection((newState) => {
  // Show toast when reconnection succeeds
  if (previousStatus === "reconnecting" &&
      (newState.status === "connected" || newState.status === "playing")) {
    toast.success("Reconnected!");
  }

  previousStatus = newState.status;
  connectionState = newState;
});
```

**Step 7: Run type check**

Run: `npm run check`
Expected: PASS

**Step 8: Test manually**

Run: `npm run dev:all`
Test:
1. Connect to a room
2. Stop the PartyKit server (Ctrl+C on dev:party)
3. Observe reconnection attempts
4. Restart server, confirm auto-reconnect
Expected: Status shows "Reconnecting...", eventually reconnects or shows retry button

**Step 9: Commit**

```bash
git add src/lib/connection.ts src/components/ConnectionStatus.svelte src/App.svelte
git commit -m "feat: add connection reliability with auto-reconnect"
```

---

## Task 7: Loading Skeleton for Lobby

**Files:**
- Modify: `src/views/LobbyView.svelte`

**Step 1: Add loading prop**

Update the Props interface:

```typescript
interface Props {
  roomCode: string;
  players: Array<{ name: string; seat: Seat }>;
  loading?: boolean;
  onTakeSeat: (name: string, seat: Seat) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

let { roomCode, players, loading = false, onTakeSeat, onStartGame, onLeave }: Props = $props();
```

**Step 2: Add skeleton styles**

Add to `<style>` section:

```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-seat {
  height: 80px;
}

.skeleton-input {
  height: 48px;
  width: 100%;
}

.skeleton-button {
  height: 44px;
  width: 100%;
}
```

**Step 3: Add skeleton conditional rendering**

Wrap the main content in a conditional. After the `<h1>`:

```svelte
{#if loading}
  <div class="join-section">
    <div class="skeleton skeleton-input"></div>
  </div>
  <div class="seats-grid">
    {#each [0, 1, 2, 3] as _}
      <div class="seat-slot skeleton skeleton-seat"></div>
    {/each}
  </div>
  <div class="actions">
    <div class="skeleton skeleton-button"></div>
    <div class="skeleton skeleton-button"></div>
  </div>
{:else}
  <!-- existing content here -->
{/if}
```

**Step 4: Run type check**

Run: `npm run check`
Expected: PASS

**Step 5: Commit**

```bash
git add src/views/LobbyView.svelte
git commit -m "feat: add loading skeleton to lobby view"
```

---

## Final Step: Integration Test

**Step 1: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass

**Step 2: Run type check**

Run: `npm run check`
Expected: No errors

**Step 3: Manual testing checklist**

- [ ] Touch drag-drop works on mobile
- [ ] ResultsModal shows SVG tiles
- [ ] Toast notifications appear
- [ ] Haptic feedback on mobile
- [ ] Sounds play (if files added)
- [ ] Connection status shows during reconnect
- [ ] Auto-reconnect works after disconnect

**Step 4: Final commit**

If any fixes needed, make them, then:

```bash
git add -A
git commit -m "chore: polish integration and cleanup"
```

---

Plan complete and saved to `docs/plans/2026-02-18-polish-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
