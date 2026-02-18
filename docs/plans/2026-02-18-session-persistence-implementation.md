# Session Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the app resilient to page refreshes by persisting room/player state in URLs and localStorage.

**Architecture:** Client-side routing with `history.pushState()` for URL management, localStorage for session data, and a REJOIN server action for restoring mid-game seats.

**Tech Stack:** Svelte 5, PartyKit, localStorage API, History API

---

## Task 1: Create Session Management Module

**Files:**
- Create: `src/lib/session.ts`

**Step 1: Write the session management module**

```typescript
// src/lib/session.ts

export interface SessionData {
  roomCode: string;
  viewMode: 'player' | 'table';
  playerName?: string;
  seat?: number;
  timestamp: number;
}

const STORAGE_PREFIX = 'mahjong-session-';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function saveSession(data: Omit<SessionData, 'timestamp'>): void {
  const session: SessionData = {
    ...data,
    timestamp: Date.now(),
  };
  localStorage.setItem(`${STORAGE_PREFIX}${data.roomCode}`, JSON.stringify(session));
}

export function getSession(roomCode: string): SessionData | null {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${roomCode}`);
  if (!raw) return null;

  try {
    const session: SessionData = JSON.parse(raw);
    // Ignore stale sessions
    if (Date.now() - session.timestamp > SESSION_MAX_AGE_MS) {
      clearSession(roomCode);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(roomCode: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${roomCode}`);
}

export function updateSession(roomCode: string, updates: Partial<Omit<SessionData, 'timestamp' | 'roomCode'>>): void {
  const existing = getSession(roomCode);
  if (existing) {
    saveSession({ ...existing, ...updates });
  }
}
```

**Step 2: Verify the file was created correctly**

Run: `npm run check`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/session.ts
git commit -m "feat: add session management module for localStorage persistence"
```

---

## Task 2: Create URL Routing Utilities

**Files:**
- Create: `src/lib/router.ts`

**Step 1: Write the URL routing utilities**

```typescript
// src/lib/router.ts

export type Route =
  | { type: 'home' }
  | { type: 'play'; roomCode: string }
  | { type: 'table'; roomCode: string };

export function parseRoute(): Route {
  const path = window.location.pathname;

  const playMatch = path.match(/^\/play\/([A-Za-z0-9]{4})$/);
  if (playMatch) {
    return { type: 'play', roomCode: playMatch[1].toUpperCase() };
  }

  const tableMatch = path.match(/^\/table\/([A-Za-z0-9]{4})$/);
  if (tableMatch) {
    return { type: 'table', roomCode: tableMatch[1].toUpperCase() };
  }

  return { type: 'home' };
}

export function navigateTo(route: Route): void {
  let path: string;
  switch (route.type) {
    case 'home':
      path = '/';
      break;
    case 'play':
      path = `/play/${route.roomCode}`;
      break;
    case 'table':
      path = `/table/${route.roomCode}`;
      break;
  }

  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
}

export function replaceRoute(route: Route): void {
  let path: string;
  switch (route.type) {
    case 'home':
      path = '/';
      break;
    case 'play':
      path = `/play/${route.roomCode}`;
      break;
    case 'table':
      path = `/table/${route.roomCode}`;
      break;
  }

  if (window.location.pathname !== path) {
    window.history.replaceState({}, '', path);
  }
}
```

**Step 2: Verify the file was created correctly**

Run: `npm run check`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/router.ts
git commit -m "feat: add URL routing utilities for path-based navigation"
```

---

## Task 3: Add REJOIN Action to Type Definitions

**Files:**
- Modify: `src/game/types.ts`

**Step 1: Find the ClientAction type and add REJOIN**

Search for `ClientAction` type in `src/game/types.ts` and add the REJOIN action:

```typescript
| { type: "REJOIN"; name: string; seat: Seat }
```

**Step 2: Verify the types compile**

Run: `npm run check`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat: add REJOIN action type for session restoration"
```

---

## Task 4: Implement REJOIN Handler on Server

**Files:**
- Modify: `party/index.ts`

**Step 1: Find the message handler switch statement and add REJOIN case**

Add after the existing action handlers (JOIN, START_GAME, etc.):

```typescript
case "REJOIN": {
  // Only allow rejoin during active game
  if (this.gameState?.phase === "waiting") {
    connection.send(JSON.stringify({
      type: "ERROR",
      message: "Cannot rejoin during lobby - please take a seat normally"
    }));
    return;
  }

  // Validate the seat belongs to this player
  const seatPlayer = this.gameState?.players[action.seat];
  if (!seatPlayer || seatPlayer.name !== action.name) {
    connection.send(JSON.stringify({
      type: "ERROR",
      message: "Invalid rejoin - seat mismatch"
    }));
    return;
  }

  // Restore the connection for this seat
  this.connections.set(connection.id, {
    mode: "player",
    seat: action.seat
  });

  // Send current state to the rejoined player
  this.broadcastState();
  break;
}
```

**Step 2: Verify the server compiles**

Run: `npm run check`
Expected: No type errors

**Step 3: Commit**

```bash
git add party/index.ts
git commit -m "feat: add REJOIN handler for mid-game session restoration"
```

---

## Task 5: Integrate Session and Routing in App.svelte

**Files:**
- Modify: `src/App.svelte`

**Step 1: Import the new modules**

Add to the imports at the top:

```typescript
import { saveSession, getSession, clearSession, updateSession } from "./lib/session";
import { parseRoute, navigateTo, replaceRoute, type Route } from "./lib/router";
```

**Step 2: Replace the onMount logic with route-based initialization**

Replace the existing onMount:

```typescript
onMount(() => {
  initSounds();

  const route = parseRoute();

  // Handle legacy ?room= URLs by redirecting to /play/XXXX
  const params = new URLSearchParams(window.location.search);
  const legacyRoomCode = params.get("room");
  if (legacyRoomCode && legacyRoomCode.length === 4) {
    replaceRoute({ type: 'play', roomCode: legacyRoomCode.toUpperCase() });
    viewMode = "player";
    connection.connect(legacyRoomCode.toUpperCase(), "player");
    saveSession({ roomCode: legacyRoomCode.toUpperCase(), viewMode: "player" });
    return;
  }

  // Route-based initialization
  if (route.type === 'play' || route.type === 'table') {
    viewMode = route.type === 'play' ? 'player' : 'table';
    const session = getSession(route.roomCode);

    connection.connect(route.roomCode, viewMode);

    // Save session if we don't have one
    if (!session) {
      saveSession({ roomCode: route.roomCode, viewMode });
    }
  }
});
```

**Step 3: Update handleCreateRoom to use routing**

```typescript
async function handleCreateRoom() {
  viewMode = "table";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let roomId = "";
  for (let i = 0; i < 4; i++) {
    roomId += chars[Math.floor(Math.random() * chars.length)];
  }

  // Navigate to table URL
  navigateTo({ type: 'table', roomCode: roomId });
  saveSession({ roomCode: roomId, viewMode: 'table' });

  connection.connect(roomId, "table");

  // Generate QR code for joining - use /play/ URL
  joinUrl = `${window.location.origin}/play/${roomId}`;
  qrCodeUrl = await QRCode.toDataURL(joinUrl, {
    width: 200,
    margin: 2,
    color: { dark: "#1a0f0a", light: "#faf6e9" }
  });
}
```

**Step 4: Update handleJoinRoom to use routing**

```typescript
function handleJoinRoom(roomCode: string) {
  viewMode = "player";
  navigateTo({ type: 'play', roomCode });
  saveSession({ roomCode, viewMode: 'player' });
  connection.connect(roomCode, "player");
}
```

**Step 5: Update handleTakeSeat to save player info**

```typescript
function handleTakeSeat(name: string, seat: Seat) {
  // Get current room code from connection state
  if (connectionState.status === 'connected') {
    updateSession(connectionState.roomCode, { playerName: name, seat });
  }
  connection.send({ type: "JOIN", name, seat });
}
```

**Step 6: Update handleLeave to clear session and navigate home**

```typescript
function handleLeave() {
  // Clear session for current room
  if (connectionState.status === 'connected' || connectionState.status === 'playing') {
    const roomCode = connectionState.status === 'connected'
      ? connectionState.roomCode
      : connectionState.state.roomCode;
    clearSession(roomCode);
  }
  navigateTo({ type: 'home' });
  connection.disconnect();
}
```

**Step 7: Verify the changes compile**

Run: `npm run check`
Expected: No type errors

**Step 8: Commit**

```bash
git add src/App.svelte
git commit -m "feat: integrate session persistence and URL routing in App"
```

---

## Task 6: Add REJOIN Logic for Mid-Game Restoration

**Files:**
- Modify: `src/App.svelte`

**Step 1: Add effect to handle reconnection with stored session**

Add after the existing connection state handling, inside the script section:

```typescript
// Track if we've attempted rejoin for this session
let rejoinAttempted = false;

// Effect to handle rejoin when we reconnect to an active game
$effect(() => {
  // Only attempt rejoin once per session and when we have a stored session with seat
  if (rejoinAttempted) return;

  const route = parseRoute();
  if (route.type !== 'play') return;

  const session = getSession(route.roomCode);
  if (!session?.playerName || session.seat === undefined) return;

  // If we're in playing state but server doesn't know us (we got STATE_UPDATE, not personalized)
  // This means we need to rejoin
  if (connectionState.status === 'playing') {
    rejoinAttempted = true;
    connection.send({ type: "REJOIN", name: session.playerName, seat: session.seat as Seat });
  }
});

// Reset rejoin flag when disconnecting
$effect(() => {
  if (connectionState.status === 'disconnected') {
    rejoinAttempted = false;
  }
});
```

**Step 2: Verify the changes compile**

Run: `npm run check`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/App.svelte
git commit -m "feat: add REJOIN logic for mid-game session restoration"
```

---

## Task 7: Test the Full Flow

**Step 1: Run the dev server**

Run: `npm run dev:all`

**Step 2: Manual testing checklist**

1. **Create room flow:**
   - Go to `/`
   - Click "Create Room"
   - Verify URL changes to `/table/XXXX`
   - Refresh page - should stay in table view

2. **Join room flow:**
   - Open `/play/XXXX` in another browser/tab
   - Take a seat
   - Refresh page - should return to lobby

3. **Mid-game rejoin:**
   - Start a game with 4 players
   - Refresh a player's page
   - Should rejoin their seat automatically

4. **Legacy URL redirect:**
   - Visit `/?room=XXXX`
   - Should redirect to `/play/XXXX`

**Step 3: Commit final verification**

```bash
git add -A
git commit -m "feat: complete session persistence implementation"
```

---

## Summary

After completing all tasks:
- URLs reflect current state (`/`, `/play/XXXX`, `/table/XXXX`)
- Sessions persist in localStorage
- Page refresh doesn't lose your place
- Mid-game disconnects can rejoin their seat
- Legacy `?room=` URLs still work via redirect
