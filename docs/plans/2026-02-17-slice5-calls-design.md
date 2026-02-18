# Slice 5: Calls (Peng/Chi/Gang) Design

## Overview

Implement the call system for claiming discarded tiles. Players can call peng (triplet), chi (sequence), or gang (quad) on other players' discards, with server-side resolution of competing calls.

## Approach

Centralized Server Resolution: The server tracks which players can call, waits for all responses (or timeout if configured), then resolves by priority.

## State Changes

### GameState additions

```typescript
callTimeout: number;          // 0 = no timeout, else milliseconds
callWindowStart?: number;     // timestamp when waiting started
awaitingCallFrom: Seat[];     // players who haven't responded yet
```

`pendingCalls` already exists - stores actual responses received.

## Call Detection

### Peng
Player has 2 tiles matching the discard. Any player except discarder can call.

### Gang (exposed)
Player has 3 tiles matching the discard. Any player except discarder can call.

### Chi
Player has 2 tiles that form a sequence with the discard. Only the player to the left of the discarder can call (HK rules). Sequences are only valid for suited tiles.

Chi combinations for a discarded tile with value V:
- V is middle: need V-1 and V+1
- V is low end: need V+1 and V+2
- V is high end: need V-1 and V-2

## Call Resolution Priority

When all responses received (or timeout expires):

1. **Win** (highest priority) - reserved for Slice 6
2. **Gang** - 3 matching tiles in hand
3. **Peng** - 2 matching tiles in hand
4. **Chi** - sequence tiles, left player only

If multiple players want peng/gang for same tile, seat order from discarder wins (next seat has priority).

If everyone passes, next player draws from wall.

## Message Flow

```
Player A discards tile X
    ↓
Server calculates available calls for B, C, D
    ↓
Server sends STATE_UPDATE to each player with their availableCalls
    ↓
Players respond: CALL_PENG, CALL_CHI, CALL_GANG, or PASS
    ↓
Server waits for all responses (or timeout)
    ↓
Server resolves: highest priority call wins
    ↓
Winner's meld created, their turn to discard
```

## New Client Actions

```typescript
| { type: 'CALL_CHI'; tileIds: [string, string] }   // two tiles from hand
| { type: 'CALL_PENG'; tileIds: [string, string] }  // two tiles from hand
| { type: 'CALL_GANG'; tileIds: string[] }          // three tiles from hand
| { type: 'PASS' }                                   // pass on calling
```

## Engine Functions

### Call Detection
- `getAvailableCallsForPlayer(state, seat, discardedTile, ruleset)` → `AvailableCall[]`
- `findChiCombinations(hand, discardedTile)` → `TileInstance[][]`
- `findPengTiles(hand, discardedTile)` → `TileInstance[][]`
- `findGangTiles(hand, discardedTile)` → `TileInstance[][]`

### Call Registration & Resolution
- `registerCall(state, seat, callType, tileIds)` → `GameState`
- `resolveCallWindow(state, ruleset)` → `GameState`
- `allCallsReceived(state)` → `boolean`

### Call Execution
- `executePeng(state, seat, tileIds, discardedTile)` → `GameState`
- `executeChi(state, seat, tileIds, discardedTile)` → `GameState`
- `executeGang(state, seat, tileIds, discardedTile)` → `GameState`

## Server Handler Updates

### New handlers
- `handleCallChi(conn, tileIds)`
- `handleCallPeng(conn, tileIds)`
- `handleCallGang(conn, tileIds)`
- `handlePass(conn)`

### Modified flow
- `handleDiscard`: After discard, check for available calls. If any exist, enter `waiting_for_calls` phase.
- Add timeout handling if `callTimeout > 0`

## UI Changes

### GameView.svelte

When `availableCalls.length > 0` and `turnPhase === 'waiting_for_calls'`:

1. Show call action overlay with buttons:
   - "Peng" (if available)
   - "Chi" (if available)
   - "Gang" (if available)
   - "Pass" (always shown)

2. For chi with multiple valid combinations, show tile selector

3. Highlight the contested discard tile

4. Show countdown timer if timeout configured

### New component: CallPrompt.svelte
- Displays available call options
- Handles chi tile selection
- Emits call actions to parent

## Lobby Changes

Add call timeout configuration to lobby/room creation:
- Default: 0 (no timeout)
- Options: 5s, 10s, 15s, 30s

## Testing

### Unit tests for engine
- Chi combination detection (all 3 positions)
- Peng detection
- Gang detection
- Call priority resolution
- Multiple players with same call type

### Integration tests
- Full call flow: discard → calls → resolution → meld creation
- Timeout behavior
- Pass by all players

## Out of Scope

- Win detection on discard (Slice 6)
- Concealed gang from hand (upgrade existing peng)
- Robbing the kong
