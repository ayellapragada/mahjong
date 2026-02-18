# Bot Players Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add server-side bot players that auto-fill empty seats, make random moves with delays, and can be replaced by humans mid-game.

**Architecture:** BotPlayer class encapsulates decision logic. Server maintains a map of active bots and schedules their actions via setTimeout. When humans join occupied bot seats, bots are removed.

**Tech Stack:** PartyKit server, TypeScript, Vitest for testing

---

### Task 1: BotPlayer Class - Core Structure

**Files:**
- Create: `party/bot.ts`
- Create: `party/bot.test.ts`

**Step 1: Write the failing test**

```typescript
// party/bot.test.ts
import { describe, it, expect } from 'vitest';
import { BotPlayer } from './bot';

describe('BotPlayer', () => {
  it('should create a bot with default name based on seat', () => {
    const bot = new BotPlayer(0);
    expect(bot.seat).toBe(0);
    expect(bot.name).toBe('Bot East');
  });

  it('should create bots with correct wind names', () => {
    expect(new BotPlayer(0).name).toBe('Bot East');
    expect(new BotPlayer(1).name).toBe('Bot South');
    expect(new BotPlayer(2).name).toBe('Bot West');
    expect(new BotPlayer(3).name).toBe('Bot North');
  });

  it('should have default thinking delay range', () => {
    const bot = new BotPlayer(0);
    expect(bot.thinkingDelay).toEqual({ min: 500, max: 1500 });
  });

  it('should allow custom thinking delay', () => {
    const bot = new BotPlayer(0, { thinkingDelay: { min: 100, max: 200 } });
    expect(bot.thinkingDelay).toEqual({ min: 100, max: 200 });
  });

  it('should return a delay within configured range', () => {
    const bot = new BotPlayer(0, { thinkingDelay: { min: 100, max: 200 } });
    for (let i = 0; i < 100; i++) {
      const delay = bot.getThinkingDelay();
      expect(delay).toBeGreaterThanOrEqual(100);
      expect(delay).toBeLessThanOrEqual(200);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- party/bot.test.ts`
Expected: FAIL with "Cannot find module './bot'"

**Step 3: Write minimal implementation**

```typescript
// party/bot.ts
import type { Seat } from '../src/game/types';

const SEAT_WIND_NAMES: Record<Seat, string> = {
  0: 'East',
  1: 'South',
  2: 'West',
  3: 'North',
};

export interface BotOptions {
  thinkingDelay?: { min: number; max: number };
}

export class BotPlayer {
  seat: Seat;
  name: string;
  thinkingDelay: { min: number; max: number };

  constructor(seat: Seat, options: BotOptions = {}) {
    this.seat = seat;
    this.name = `Bot ${SEAT_WIND_NAMES[seat]}`;
    this.thinkingDelay = options.thinkingDelay ?? { min: 500, max: 1500 };
  }

  getThinkingDelay(): number {
    const { min, max } = this.thinkingDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- party/bot.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add party/bot.ts party/bot.test.ts
git commit -m "feat(bot): Add BotPlayer class with basic structure"
```

---

### Task 2: BotPlayer Decision Logic - Discard

**Files:**
- Modify: `party/bot.ts`
- Modify: `party/bot.test.ts`

**Step 1: Write the failing test**

Add to `party/bot.test.ts`:

```typescript
import type { GameState, TileInstance, Seat, Player } from '../src/game/types';

// Helper to create minimal game state
function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    roomCode: 'TEST',
    rulesetId: 'hongkong',
    players: [],
    wall: [],
    deadWall: [],
    discardPiles: { 0: { tiles: [] }, 1: { tiles: [] }, 2: { tiles: [] }, 3: { tiles: [] } },
    currentTurn: 0,
    turnPhase: 'discarding',
    roundWind: 'east',
    dealerSeat: 0,
    pendingCalls: [],
    callTimeout: 0,
    awaitingCallFrom: [],
    scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
    roundNumber: 1,
    handNumber: 1,
    ...overrides,
  };
}

function makeTile(id: string): TileInstance {
  return { id, tile: { type: 'suited', suit: 'dots', value: 1 } };
}

function makePlayer(seat: Seat, hand: TileInstance[]): Player {
  return {
    id: `bot-${seat}`,
    name: `Bot ${seat}`,
    seat,
    hand,
    melds: [],
    bonusTiles: [],
    isDealer: seat === 0,
  };
}

describe('BotPlayer.decideAction', () => {
  it('should return discard action when it is bots turn to discard', () => {
    const bot = new BotPlayer(0);
    const hand = [makeTile('tile-1'), makeTile('tile-2'), makeTile('tile-3')];
    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'discarding',
      players: [makePlayer(0, hand)],
    });

    const action = bot.decideAction(state);

    expect(action).not.toBeNull();
    expect(action!.type).toBe('discard');
    expect(hand.map(t => t.id)).toContain((action as any).tileId);
  });

  it('should return null when it is not bots turn', () => {
    const bot = new BotPlayer(0);
    const state = makeGameState({
      currentTurn: 1, // Not bot's turn
      turnPhase: 'discarding',
      players: [makePlayer(0, [makeTile('tile-1')])],
    });

    const action = bot.decideAction(state);

    expect(action).toBeNull();
  });

  it('should return null when not in discarding phase', () => {
    const bot = new BotPlayer(0);
    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'drawing', // Not discarding
      players: [makePlayer(0, [makeTile('tile-1')])],
    });

    const action = bot.decideAction(state);

    expect(action).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- party/bot.test.ts`
Expected: FAIL with "decideAction is not a function" or similar

**Step 3: Write minimal implementation**

Add to `party/bot.ts`:

```typescript
import type { Seat, GameState } from '../src/game/types';

export type BotAction =
  | { type: 'discard'; tileId: string }
  | { type: 'call'; callType: 'chi' | 'peng' | 'gang'; tileIds: string[] }
  | { type: 'pass' };

// Inside BotPlayer class:
decideAction(state: GameState): BotAction | null {
  // Find the bot's player data
  const player = state.players.find(p => p.seat === this.seat);
  if (!player) return null;

  // Check if it's our turn to discard
  if (state.currentTurn === this.seat && state.turnPhase === 'discarding') {
    // Pick a random tile to discard
    const randomIndex = Math.floor(Math.random() * player.hand.length);
    return { type: 'discard', tileId: player.hand[randomIndex].id };
  }

  return null;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- party/bot.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add party/bot.ts party/bot.test.ts
git commit -m "feat(bot): Add discard decision logic"
```

---

### Task 3: BotPlayer Decision Logic - Call Window

**Files:**
- Modify: `party/bot.ts`
- Modify: `party/bot.test.ts`

**Step 1: Write the failing test**

Add to `party/bot.test.ts`:

```typescript
describe('BotPlayer.decideAction - calls', () => {
  it('should return pass when in call window with no available calls', () => {
    const bot = new BotPlayer(1);
    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      awaitingCallFrom: [1],
      players: [makePlayer(1, [makeTile('tile-1')])],
    });

    const action = bot.decideAction(state);

    expect(action).toEqual({ type: 'pass' });
  });

  it('should return null when not awaited for call', () => {
    const bot = new BotPlayer(1);
    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      awaitingCallFrom: [2], // Not awaiting bot 1
      players: [makePlayer(1, [makeTile('tile-1')])],
    });

    const action = bot.decideAction(state);

    expect(action).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- party/bot.test.ts`
Expected: FAIL - bot doesn't handle call window yet

**Step 3: Write minimal implementation**

Update `decideAction` in `party/bot.ts`:

```typescript
decideAction(state: GameState): BotAction | null {
  const player = state.players.find(p => p.seat === this.seat);
  if (!player) return null;

  // Check if it's our turn to discard
  if (state.currentTurn === this.seat && state.turnPhase === 'discarding') {
    const randomIndex = Math.floor(Math.random() * player.hand.length);
    return { type: 'discard', tileId: player.hand[randomIndex].id };
  }

  // Check if we're in a call window and expected to respond
  if (state.turnPhase === 'waiting_for_calls' && state.awaitingCallFrom.includes(this.seat)) {
    // For now, always pass (we'll add call logic later)
    return { type: 'pass' };
  }

  return null;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- party/bot.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add party/bot.ts party/bot.test.ts
git commit -m "feat(bot): Add call window handling (always pass)"
```

---

### Task 4: BotPlayer Decision Logic - Making Calls

**Files:**
- Modify: `party/bot.ts`
- Modify: `party/bot.test.ts`

**Step 1: Write the failing test**

Add to `party/bot.test.ts`:

```typescript
import { getAvailableCallsForPlayer } from '../src/game/calls';
import { hongKongRuleset } from '../src/game/rulesets/hongkong';

function makeSuitedTile(suit: 'dots' | 'bamboo' | 'characters', value: number, copy = 0): TileInstance {
  return {
    id: `${suit}-${value}-${copy}`,
    tile: { type: 'suited', suit, value: value as 1|2|3|4|5|6|7|8|9 },
  };
}

describe('BotPlayer.decideAction - making calls', () => {
  it('should sometimes make a peng call when available', () => {
    const bot = new BotPlayer(1);
    // Hand has two 5-dots, discard is 5-dots
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 7),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      awaitingCallFrom: [1],
      lastDiscard: { tile: discard, from: 0 },
      players: [
        makePlayer(0, []),
        makePlayer(1, hand),
      ],
    });

    // Run multiple times to check randomness
    let madeCall = false;
    let passed = false;
    for (let i = 0; i < 100; i++) {
      const action = bot.decideAction(state);
      if (action?.type === 'call' && action.callType === 'peng') {
        madeCall = true;
      } else if (action?.type === 'pass') {
        passed = true;
      }
    }

    // Should sometimes call, sometimes pass (50/50)
    expect(madeCall).toBe(true);
    expect(passed).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- party/bot.test.ts`
Expected: FAIL - bot always passes, never makes calls

**Step 3: Write minimal implementation**

Update `party/bot.ts`:

```typescript
import type { Seat, GameState, CallType } from '../src/game/types';
import { getAvailableCallsForPlayer } from '../src/game/calls';
import { getRuleset } from '../src/game/rulesets';

// Inside BotPlayer class, update decideAction:
decideAction(state: GameState): BotAction | null {
  const player = state.players.find(p => p.seat === this.seat);
  if (!player) return null;

  // Check if it's our turn to discard
  if (state.currentTurn === this.seat && state.turnPhase === 'discarding') {
    const randomIndex = Math.floor(Math.random() * player.hand.length);
    return { type: 'discard', tileId: player.hand[randomIndex].id };
  }

  // Check if we're in a call window and expected to respond
  if (state.turnPhase === 'waiting_for_calls' &&
      state.awaitingCallFrom.includes(this.seat) &&
      state.lastDiscard) {

    const ruleset = getRuleset(state.rulesetId);
    const availableCalls = getAvailableCallsForPlayer(
      player.hand,
      state.lastDiscard.tile,
      this.seat,
      state.lastDiscard.from,
      ruleset
    );

    // Filter out 'pass' - that's always available
    const realCalls = availableCalls.filter(c => c.type !== 'pass');

    if (realCalls.length > 0 && Math.random() < 0.5) {
      // 50% chance to make the highest priority call
      // Priority: gang > peng > chi
      const priorityOrder: CallType[] = ['gang', 'peng', 'chi'];
      for (const callType of priorityOrder) {
        const call = realCalls.find(c => c.type === callType);
        if (call && call.tiles && call.tiles.length > 0) {
          // Use first available combination
          return {
            type: 'call',
            callType: callType as 'chi' | 'peng' | 'gang',
            tileIds: call.tiles[0].map(t => t.id),
          };
        }
      }
    }

    return { type: 'pass' };
  }

  return null;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- party/bot.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add party/bot.ts party/bot.test.ts
git commit -m "feat(bot): Add random call decision logic (50% call rate)"
```

---

### Task 5: Server Integration - Bot Map and Fill Empty Seats

**Files:**
- Modify: `party/index.ts`

**Step 1: Add bot imports and properties**

At the top of `party/index.ts`, add:

```typescript
import { BotPlayer, type BotAction } from "./bot";
```

Inside the `MahjongRoom` class, add properties:

```typescript
bots: Map<Seat, BotPlayer> = new Map();
botTimeouts: Map<Seat, ReturnType<typeof setTimeout>> = new Map();
```

**Step 2: Add fillEmptySeatsWithBots method**

```typescript
fillEmptySeatsWithBots() {
  const occupiedSeats = new Set(this.state.players.map(p => p.seat));

  for (const seat of [0, 1, 2, 3] as Seat[]) {
    if (!occupiedSeats.has(seat)) {
      const bot = new BotPlayer(seat);
      this.bots.set(seat, bot);

      // Add bot as a player (using seat as a fake connection ID)
      const result = addPlayer(this.state, `bot-${seat}`, bot.name, seat);
      if (!("error" in result)) {
        this.state = result;
      }
    }
  }
}
```

**Step 3: Update handleStartGame to fill bots**

In `handleStartGame`, before `startGame`, add:

```typescript
// Fill empty seats with bots
this.fillEmptySeatsWithBots();
```

**Step 4: Commit**

```bash
git add party/index.ts
git commit -m "feat(server): Add bot map and fillEmptySeatsWithBots"
```

---

### Task 6: Server Integration - Schedule Bot Actions

**Files:**
- Modify: `party/index.ts`

**Step 1: Add scheduleBotActions method**

```typescript
scheduleBotActions() {
  for (const [seat, bot] of this.bots) {
    // Cancel any existing timeout for this bot
    const existingTimeout = this.botTimeouts.get(seat);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const action = bot.decideAction(this.state);
    if (action) {
      const delay = bot.getThinkingDelay();
      const timeout = setTimeout(() => {
        this.executeBotAction(seat, action);
      }, delay);
      this.botTimeouts.set(seat, timeout);
    }
  }
}
```

**Step 2: Add executeBotAction method**

```typescript
executeBotAction(seat: Seat, action: BotAction) {
  console.log(`[${this.state.roomCode}] Bot ${seat} executing:`, action.type);

  switch (action.type) {
    case 'discard':
      this.handleBotDiscard(seat, action.tileId);
      break;
    case 'call':
      this.handleBotCall(seat, action.callType, action.tileIds);
      break;
    case 'pass':
      this.handleBotPass(seat);
      break;
  }
}

handleBotDiscard(seat: Seat, tileId: string) {
  const ruleset = getRuleset(this.state.rulesetId);
  const result = discardTile(this.state, seat, tileId, ruleset);

  if ("error" in result) {
    console.error(`[${this.state.roomCode}] Bot discard error:`, result.error);
    return;
  }

  this.state = result;

  // If no calls pending, next player draws
  if (this.state.turnPhase === "drawing") {
    const drawResult = drawTile(this.state, ruleset);
    if (!("error" in drawResult)) {
      this.state = drawResult;
    }
  }

  this.broadcastGameState();
  this.scheduleBotActions();
}

handleBotCall(seat: Seat, callType: 'chi' | 'peng' | 'gang', tileIds: string[]) {
  if (this.state.turnPhase !== "waiting_for_calls") return;
  if (!this.state.awaitingCallFrom.includes(seat)) return;

  this.state = registerCall(this.state, seat, callType, tileIds);

  const ruleset = getRuleset(this.state.rulesetId);
  const resolved = resolveCallWindow(this.state, ruleset);

  if (resolved !== this.state) {
    this.state = resolved;

    if (this.state.turnPhase === "replacing" || this.state.turnPhase === "drawing") {
      const drawResult = drawTile(this.state, ruleset);
      if (!("error" in drawResult)) {
        this.state = drawResult;
      }
    }
  }

  this.broadcastGameState();
  this.scheduleBotActions();
}

handleBotPass(seat: Seat) {
  if (this.state.turnPhase !== "waiting_for_calls") return;
  if (!this.state.awaitingCallFrom.includes(seat)) return;

  this.state = registerCall(this.state, seat, 'pass', []);

  const ruleset = getRuleset(this.state.rulesetId);
  const resolved = resolveCallWindow(this.state, ruleset);

  if (resolved !== this.state) {
    this.state = resolved;

    if (this.state.turnPhase === "drawing") {
      const drawResult = drawTile(this.state, ruleset);
      if (!("error" in drawResult)) {
        this.state = drawResult;
      }
    }
  }

  this.broadcastGameState();
  this.scheduleBotActions();
}
```

**Step 3: Call scheduleBotActions after game start**

In `handleStartGame`, after `this.broadcastGameState();`, add:

```typescript
// Schedule bot actions if any bots are playing
this.scheduleBotActions();
```

**Step 4: Call scheduleBotActions after human actions**

In `handleDiscard`, after `this.broadcastGameState();`, add:

```typescript
this.scheduleBotActions();
```

In `handleCall`, after `this.broadcastGameState();`, add:

```typescript
this.scheduleBotActions();
```

**Step 5: Commit**

```bash
git add party/index.ts
git commit -m "feat(server): Add bot action scheduling and execution"
```

---

### Task 7: Server Integration - Human Bumping

**Files:**
- Modify: `party/index.ts`

**Step 1: Add bumpBot method**

```typescript
bumpBot(seat: Seat) {
  // Cancel any pending action
  const timeout = this.botTimeouts.get(seat);
  if (timeout) {
    clearTimeout(timeout);
    this.botTimeouts.delete(seat);
  }

  // Remove from bots map
  this.bots.delete(seat);

  console.log(`[${this.state.roomCode}] Human bumped bot at seat ${seat}`);
}
```

**Step 2: Update handleJoin to bump bots**

Modify `handleJoin`:

```typescript
handleJoin(conn: Party.Connection, name: string, seat: Seat) {
  // Check if a bot occupies this seat
  if (this.bots.has(seat)) {
    // Remove the bot player from state first
    const botId = `bot-${seat}`;
    this.state = removePlayer(this.state, botId);

    // Bump the bot
    this.bumpBot(seat);
  }

  const result = addPlayer(this.state, conn.id, name, seat);

  if ("error" in result) {
    this.sendError(conn, result.error);
    return;
  }

  this.state = result;
  this.broadcastRoomInfo();

  // If game is in progress, send state and schedule bot actions
  if (this.state.phase === 'playing') {
    this.broadcastGameState();
    this.scheduleBotActions();
  }
}
```

**Step 3: Commit**

```bash
git add party/index.ts
git commit -m "feat(server): Add human bumping of bots"
```

---

### Task 8: Cleanup Bot Timeouts on Disconnect

**Files:**
- Modify: `party/index.ts`

**Step 1: Update onClose to cleanup bot timeouts**

```typescript
onClose(conn: Party.Connection) {
  console.log(`[${this.state.roomCode}] Disconnected: ${conn.id}`);

  // Remove player if game hasn't started
  if (this.state.phase === "waiting") {
    this.state = removePlayer(this.state, conn.id);
    this.broadcastRoomInfo();
  }
}

// Add a method to clean up all bots when room closes
clearAllBots() {
  for (const timeout of this.botTimeouts.values()) {
    clearTimeout(timeout);
  }
  this.botTimeouts.clear();
  this.bots.clear();
}
```

**Step 2: Commit**

```bash
git add party/index.ts
git commit -m "feat(server): Add bot timeout cleanup"
```

---

### Task 9: Type Check and Full Test Run

**Files:**
- None (verification only)

**Step 1: Run TypeScript type check**

Run: `npm run build`
Expected: No type errors

**Step 2: Run all tests**

Run: `npm run test:run`
Expected: All tests pass

**Step 3: Commit if any fixes needed**

If there are type errors or test failures, fix them and commit:

```bash
git add -A
git commit -m "fix(bot): Address type errors and test failures"
```

---

### Task 10: Manual Testing

**Step 1: Start dev server**

Run: `npm run dev:all`

**Step 2: Test scenarios**

1. Create a room with 1 player, start game - verify 3 bots join
2. Watch bots take turns discarding
3. Verify bots respond to call windows
4. Join mid-game as second player - verify you bump a bot
5. Check that bot names show correctly (Bot East, Bot South, etc.)

**Step 3: Fix any issues found**

If issues found, fix and commit:

```bash
git add -A
git commit -m "fix(bot): Address issues found in manual testing"
```

---

### Task 11: Update PLAN.md

**Files:**
- Modify: `PLAN.md`

**Step 1: Mark bot players as complete**

Add to the "Next Steps" or "Current Status" section:

```markdown
- [x] Bot players for easier testing (auto-fill empty seats, random moves, human bumping)
```

**Step 2: Commit**

```bash
git add PLAN.md
git commit -m "docs: Mark bot players complete in PLAN.md"
```
