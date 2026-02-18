# Session Persistence Design

Make the app resilient to page refreshes by persisting room/player state in URLs and localStorage.

## Problem

Currently:
- URL param `?room=XXXX` is cleared immediately after reading
- No localStorage persistence
- Refreshing the page loses your session completely

## Solution

### URL Routing

**Structure:**
- `/` - Home (create or join)
- `/play/ABCD` - Player view for room ABCD
- `/table/ABCD` - Table view for room ABCD

**Behavior:**
- Creating a room → navigate to `/table/ABCD`
- Joining a room → navigate to `/play/ABCD`
- Disconnecting/leaving → navigate to `/`

**Implementation:** Client-side routing via `window.location.pathname` parsing and `history.pushState()`.

### localStorage Persistence

**Data structure:**
```typescript
interface SessionData {
  roomCode: string;
  viewMode: 'player' | 'table';
  playerName?: string;  // Only for players
  seat?: number;        // Only for players who have taken a seat
  timestamp: number;    // For stale session cleanup
}
```

**Storage key:** `mahjong-session-{roomCode}`

**Lifecycle:**
1. On join/create room: Save session
2. On take seat: Update with name and seat
3. On refresh: Read session, attempt reconnect
4. On leave room: Clear session
5. Ignore sessions older than 24 hours

### Reconnection Flow

1. On mount, parse URL for room code and view mode
2. Check localStorage for matching session
3. Connect to WebSocket
4. Server sends current state (ROOM_INFO or STATE_UPDATE)
5. If game in progress AND we have stored seat → send REJOIN
6. If lobby → show seat selection (pre-fill stored name if available)

### Server Changes

Add `REJOIN` action to PartyKit server:

```typescript
// Client sends:
{ type: "REJOIN", name: string, seat: Seat }

// Server behavior:
// - Validate game is in progress
// - Validate seat matches stored player name
// - Restore player's WebSocket connection to that seat
// - Send STATE_UPDATE to confirm
// - On failure: send ERROR, client falls back to seat selection
```

## Files to Modify

**Client:**
- `src/App.svelte` - URL routing, localStorage integration
- `src/lib/session.ts` - New file for session management
- `src/lib/connection.ts` - Add REJOIN action type

**Server:**
- `party/index.ts` - Handle REJOIN action

## Out of Scope

- Browser back/forward navigation handling
- Multiple tabs detection
- Server-side session tokens
