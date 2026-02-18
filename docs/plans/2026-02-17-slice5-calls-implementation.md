# Slice 5: Calls (Peng/Chi/Gang) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement peng, chi, and gang calls so players can claim discarded tiles to form melds.

**Architecture:** Server-side call detection and resolution. When a tile is discarded, the server calculates which players can call, waits for all responses (with optional timeout), resolves by priority (gang > peng > chi), executes the winning call, and updates game state.

**Tech Stack:** TypeScript, Vitest, Svelte 5, PartyKit

---

## Task 1: Add State Types for Call Window

**Files:**
- Modify: `src/game/types.ts`

**Step 1: Add new fields to GameState type**

Add these fields to the `GameState` interface after `pendingCalls`:

```typescript
// In GameState interface, after pendingCalls: PendingCall[];
callTimeout: number;          // 0 = no timeout, else milliseconds
callWindowStart?: number;     // timestamp when waiting started
awaitingCallFrom: Seat[];     // players who haven't responded yet
```

**Step 2: Update createInitialState in engine.ts**

Add default values for new fields:

```typescript
// In createInitialState return object, after pendingCalls: [],
callTimeout: 0,
awaitingCallFrom: [],
```

**Step 3: Verify types compile**

Run: `npm run check`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/game/types.ts src/game/engine.ts
git commit -m "feat(types): add call window state fields"
```

---

## Task 2: Chi Detection - Find Valid Combinations

**Files:**
- Create: `src/game/calls.ts`
- Create: `src/game/calls.test.ts`

**Step 1: Write failing test for chi detection**

Create `src/game/calls.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { findChiCombinations } from './calls';
import type { TileInstance, Suit } from './types';

function makeSuitedTile(suit: Suit, value: number, copy = 0): TileInstance {
  return {
    id: `${suit}-${value}-${copy}`,
    tile: { type: 'suited', suit, value: value as 1|2|3|4|5|6|7|8|9 },
  };
}

describe('findChiCombinations', () => {
  it('should find chi when discard is middle of sequence', () => {
    // Hand has 1 and 3, discard is 2
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 3),
      makeSuitedTile('dots', 7),
    ];
    const discard = makeSuitedTile('dots', 2);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(1);
    expect(combos[0].map(t => (t.tile as any).value).sort()).toEqual([1, 3]);
  });

  it('should find chi when discard is low end of sequence', () => {
    // Hand has 2 and 3, discard is 1
    const hand = [
      makeSuitedTile('dots', 2),
      makeSuitedTile('dots', 3),
    ];
    const discard = makeSuitedTile('dots', 1);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(1);
    expect(combos[0].map(t => (t.tile as any).value).sort()).toEqual([2, 3]);
  });

  it('should find chi when discard is high end of sequence', () => {
    // Hand has 7 and 8, discard is 9
    const hand = [
      makeSuitedTile('dots', 7),
      makeSuitedTile('dots', 8),
    ];
    const discard = makeSuitedTile('dots', 9);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(1);
    expect(combos[0].map(t => (t.tile as any).value).sort()).toEqual([7, 8]);
  });

  it('should find multiple chi combinations', () => {
    // Hand has 1,2,3,4 - discard is 3 - can form 1-2-3 or 2-3-4 or 3-4-5(no 5)
    // Actually: discard 3 with 1,2,4,5 -> 1-2-3, 2-3-4, 3-4-5
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 2),
      makeSuitedTile('dots', 4),
      makeSuitedTile('dots', 5),
    ];
    const discard = makeSuitedTile('dots', 3);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(3);
  });

  it('should return empty for honor tiles', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 2),
    ];
    const discard: TileInstance = {
      id: 'wind-east-0',
      tile: { type: 'wind', direction: 'east' },
    };

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(0);
  });

  it('should return empty when no valid sequence exists', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 5),
    ];
    const discard = makeSuitedTile('dots', 3);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(0);
  });

  it('should only match same suit', () => {
    const hand = [
      makeSuitedTile('bamboo', 1),
      makeSuitedTile('bamboo', 3),
    ];
    const discard = makeSuitedTile('dots', 2);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: FAIL - module not found

**Step 3: Write chi detection implementation**

Create `src/game/calls.ts`:

```typescript
import type { TileInstance, SuitedTile } from './types';
import { isSuitedTile } from './types';

/**
 * Find all valid chi (sequence) combinations from hand tiles with a discarded tile.
 * Returns array of tile pairs from the hand that would form a sequence with the discard.
 */
export function findChiCombinations(
  hand: TileInstance[],
  discard: TileInstance
): TileInstance[][] {
  // Chi only works with suited tiles
  if (!isSuitedTile(discard.tile)) {
    return [];
  }

  const discardTile = discard.tile;
  const suit = discardTile.suit;
  const value = discardTile.value;

  // Get all suited tiles of same suit from hand, indexed by value
  const suitedByValue = new Map<number, TileInstance[]>();
  for (const ti of hand) {
    if (isSuitedTile(ti.tile) && ti.tile.suit === suit) {
      const v = ti.tile.value;
      const existing = suitedByValue.get(v) || [];
      existing.push(ti);
      suitedByValue.set(v, existing);
    }
  }

  const combinations: TileInstance[][] = [];

  // Check all three possible sequence positions for the discarded tile:

  // 1. Discard is LOW (need value+1 and value+2)
  if (value <= 7) {
    const mid = suitedByValue.get(value + 1);
    const high = suitedByValue.get(value + 2);
    if (mid && mid.length > 0 && high && high.length > 0) {
      combinations.push([mid[0], high[0]]);
    }
  }

  // 2. Discard is MIDDLE (need value-1 and value+1)
  if (value >= 2 && value <= 8) {
    const low = suitedByValue.get(value - 1);
    const high = suitedByValue.get(value + 1);
    if (low && low.length > 0 && high && high.length > 0) {
      combinations.push([low[0], high[0]]);
    }
  }

  // 3. Discard is HIGH (need value-2 and value-1)
  if (value >= 3) {
    const low = suitedByValue.get(value - 2);
    const mid = suitedByValue.get(value - 1);
    if (low && low.length > 0 && mid && mid.length > 0) {
      combinations.push([low[0], mid[0]]);
    }
  }

  return combinations;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/game/calls.ts src/game/calls.test.ts
git commit -m "feat(calls): add chi combination detection"
```

---

## Task 3: Peng and Gang Detection

**Files:**
- Modify: `src/game/calls.ts`
- Modify: `src/game/calls.test.ts`

**Step 1: Write failing tests for peng and gang**

Add to `src/game/calls.test.ts`:

```typescript
import { findChiCombinations, findPengTiles, findGangTiles } from './calls';

// ... existing tests ...

describe('findPengTiles', () => {
  it('should find peng when hand has 2 matching tiles', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 7, 0),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const result = findPengTiles(hand, discard);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
  });

  it('should return null when hand has only 1 matching tile', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 7, 0),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const result = findPengTiles(hand, discard);

    expect(result).toBeNull();
  });

  it('should work with honor tiles', () => {
    const hand: TileInstance[] = [
      { id: 'wind-east-0', tile: { type: 'wind', direction: 'east' } },
      { id: 'wind-east-1', tile: { type: 'wind', direction: 'east' } },
    ];
    const discard: TileInstance = {
      id: 'wind-east-2',
      tile: { type: 'wind', direction: 'east' },
    };

    const result = findPengTiles(hand, discard);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
  });
});

describe('findGangTiles', () => {
  it('should find gang when hand has 3 matching tiles', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 5, 2),
      makeSuitedTile('dots', 7, 0),
    ];
    const discard = makeSuitedTile('dots', 5, 3);

    const result = findGangTiles(hand, discard);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
  });

  it('should return null when hand has only 2 matching tiles', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 7, 0),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const result = findGangTiles(hand, discard);

    expect(result).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: FAIL - findPengTiles and findGangTiles not exported

**Step 3: Implement peng and gang detection**

Add to `src/game/calls.ts`:

```typescript
import { isSuitedTile, tilesEqual } from './types';

// ... existing findChiCombinations ...

/**
 * Find tiles in hand that can form a peng (triplet) with the discarded tile.
 * Returns 2 tiles from hand, or null if not enough matching tiles.
 */
export function findPengTiles(
  hand: TileInstance[],
  discard: TileInstance
): TileInstance[] | null {
  const matching = hand.filter(t => tilesEqual(t.tile, discard.tile));

  if (matching.length >= 2) {
    return matching.slice(0, 2);
  }

  return null;
}

/**
 * Find tiles in hand that can form a gang (quad) with the discarded tile.
 * Returns 3 tiles from hand, or null if not enough matching tiles.
 */
export function findGangTiles(
  hand: TileInstance[],
  discard: TileInstance
): TileInstance[] | null {
  const matching = hand.filter(t => tilesEqual(t.tile, discard.tile));

  if (matching.length >= 3) {
    return matching.slice(0, 3);
  }

  return null;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/game/calls.ts src/game/calls.test.ts
git commit -m "feat(calls): add peng and gang detection"
```

---

## Task 4: Available Calls for Player

**Files:**
- Modify: `src/game/calls.ts`
- Modify: `src/game/calls.test.ts`

**Step 1: Write failing test for getAvailableCallsForPlayer**

Add to `src/game/calls.test.ts`:

```typescript
import {
  findChiCombinations,
  findPengTiles,
  findGangTiles,
  getAvailableCallsForPlayer
} from './calls';
import type { TileInstance, Suit, Seat, GameState } from './types';
import { hongKongRuleset } from './rulesets/hongkong';

// ... existing helper and tests ...

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    roomCode: 'TEST',
    rulesetId: 'hongkong',
    players: [],
    wall: [],
    deadWall: [],
    discardPiles: { 0: { tiles: [] }, 1: { tiles: [] }, 2: { tiles: [] }, 3: { tiles: [] } },
    currentTurn: 0,
    turnPhase: 'waiting_for_calls',
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

describe('getAvailableCallsForPlayer', () => {
  it('should return peng when player has 2 matching tiles', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,  // player seat
      0 as Seat,  // discarder seat
      hongKongRuleset
    );

    expect(calls.some(c => c.type === 'peng')).toBe(true);
  });

  it('should return chi only for left player in HK rules', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 3),
    ];
    const discard = makeSuitedTile('dots', 2);

    // Seat 1 is to the left of seat 0 (discarder)
    const callsLeft = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset
    );
    expect(callsLeft.some(c => c.type === 'chi')).toBe(true);

    // Seat 2 is NOT to the left of seat 0
    const callsNotLeft = getAvailableCallsForPlayer(
      hand,
      discard,
      2 as Seat,
      0 as Seat,
      hongKongRuleset
    );
    expect(callsNotLeft.some(c => c.type === 'chi')).toBe(false);
  });

  it('should return empty array when no calls available', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('bamboo', 5),
    ];
    const discard = makeSuitedTile('characters', 9);

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset
    );

    expect(calls).toHaveLength(0);
  });

  it('should return both peng and gang when player has 3 matching', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 5, 2),
    ];
    const discard = makeSuitedTile('dots', 5, 3);

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset
    );

    expect(calls.some(c => c.type === 'peng')).toBe(true);
    expect(calls.some(c => c.type === 'gang')).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: FAIL - getAvailableCallsForPlayer not exported

**Step 3: Implement getAvailableCallsForPlayer**

Add to `src/game/calls.ts`:

```typescript
import type { TileInstance, SuitedTile, Seat, AvailableCall, Ruleset } from './types';

// ... existing functions ...

/**
 * Get all available calls for a specific player given a discarded tile.
 */
export function getAvailableCallsForPlayer(
  hand: TileInstance[],
  discard: TileInstance,
  playerSeat: Seat,
  discarderSeat: Seat,
  ruleset: Ruleset
): AvailableCall[] {
  const calls: AvailableCall[] = [];

  // Check for peng
  if (ruleset.allowPeng) {
    const pengTiles = findPengTiles(hand, discard);
    if (pengTiles) {
      calls.push({ type: 'peng', tiles: [pengTiles] });
    }
  }

  // Check for gang
  if (ruleset.allowGang) {
    const gangTiles = findGangTiles(hand, discard);
    if (gangTiles) {
      calls.push({ type: 'gang', tiles: [gangTiles] });
    }
  }

  // Check for chi (sequence) - only if allowed and from correct position
  if (ruleset.allowChi) {
    const isLeftOfDiscarder = ((discarderSeat + 1) % 4) === playerSeat;
    if (!ruleset.chiFromLeftOnly || isLeftOfDiscarder) {
      const chiCombos = findChiCombinations(hand, discard);
      if (chiCombos.length > 0) {
        calls.push({ type: 'chi', tiles: chiCombos });
      }
    }
  }

  return calls;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/game/calls.ts src/game/calls.test.ts
git commit -m "feat(calls): add getAvailableCallsForPlayer"
```

---

## Task 5: Call Registration and Resolution

**Files:**
- Modify: `src/game/calls.ts`
- Modify: `src/game/calls.test.ts`

**Step 1: Write failing tests for call registration and resolution**

Add to `src/game/calls.test.ts`:

```typescript
import {
  findChiCombinations,
  findPengTiles,
  findGangTiles,
  getAvailableCallsForPlayer,
  registerCall,
  resolveCallWindow,
} from './calls';

// ... existing tests ...

describe('registerCall', () => {
  it('should add call to pendingCalls and remove from awaitingCallFrom', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [1, 2, 3],
      pendingCalls: [],
    });

    const newState = registerCall(state, 1 as Seat, 'peng', ['dots-5-0', 'dots-5-1']);

    expect(newState.pendingCalls).toHaveLength(1);
    expect(newState.pendingCalls[0]).toEqual({
      seat: 1,
      callType: 'peng',
      tiles: [{ id: 'dots-5-0' }, { id: 'dots-5-1' }],
    });
    expect(newState.awaitingCallFrom).toEqual([2, 3]);
  });

  it('should handle pass call', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [1, 2],
      pendingCalls: [],
    });

    const newState = registerCall(state, 1 as Seat, 'pass', []);

    expect(newState.pendingCalls).toHaveLength(1);
    expect(newState.pendingCalls[0].callType).toBe('pass');
    expect(newState.awaitingCallFrom).toEqual([2]);
  });
});

describe('resolveCallWindow', () => {
  it('should return state unchanged if still awaiting responses', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [2],
      pendingCalls: [{ seat: 1, callType: 'pass' }],
    });

    const result = resolveCallWindow(state, hongKongRuleset);

    expect(result).toEqual(state);
  });

  it('should pick gang over peng', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [],
      pendingCalls: [
        { seat: 1, callType: 'peng', tiles: [{ id: 'dots-5-0', tile: { type: 'suited', suit: 'dots', value: 5 } }, { id: 'dots-5-1', tile: { type: 'suited', suit: 'dots', value: 5 } }] },
        { seat: 2, callType: 'gang', tiles: [{ id: 'dots-5-0', tile: { type: 'suited', suit: 'dots', value: 5 } }, { id: 'dots-5-1', tile: { type: 'suited', suit: 'dots', value: 5 } }, { id: 'dots-5-2', tile: { type: 'suited', suit: 'dots', value: 5 } }] },
      ],
      lastDiscard: { tile: makeSuitedTile('dots', 5, 3), from: 0 as Seat },
      players: [
        { id: 'p0', name: 'P0', seat: 0 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: true },
        { id: 'p1', name: 'P1', seat: 1 as Seat, hand: [makeSuitedTile('dots', 5, 0), makeSuitedTile('dots', 5, 1), makeSuitedTile('dots', 9)], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p2', name: 'P2', seat: 2 as Seat, hand: [makeSuitedTile('dots', 5, 0), makeSuitedTile('dots', 5, 1), makeSuitedTile('dots', 5, 2)], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p3', name: 'P3', seat: 3 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
      ],
    });

    const result = resolveCallWindow(state, hongKongRuleset);

    expect(result.currentTurn).toBe(2); // Gang winner's turn
  });

  it('should pick peng over chi', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [],
      pendingCalls: [
        { seat: 1, callType: 'chi', tiles: [{ id: 'dots-1-0', tile: { type: 'suited', suit: 'dots', value: 1 } }, { id: 'dots-3-0', tile: { type: 'suited', suit: 'dots', value: 3 } }] },
        { seat: 2, callType: 'peng', tiles: [{ id: 'dots-2-0', tile: { type: 'suited', suit: 'dots', value: 2 } }, { id: 'dots-2-1', tile: { type: 'suited', suit: 'dots', value: 2 } }] },
      ],
      lastDiscard: { tile: makeSuitedTile('dots', 2, 2), from: 0 as Seat },
      players: [
        { id: 'p0', name: 'P0', seat: 0 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: true },
        { id: 'p1', name: 'P1', seat: 1 as Seat, hand: [makeSuitedTile('dots', 1), makeSuitedTile('dots', 3)], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p2', name: 'P2', seat: 2 as Seat, hand: [makeSuitedTile('dots', 2, 0), makeSuitedTile('dots', 2, 1)], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p3', name: 'P3', seat: 3 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
      ],
    });

    const result = resolveCallWindow(state, hongKongRuleset);

    expect(result.currentTurn).toBe(2); // Peng winner's turn
  });

  it('should advance to next player when all pass', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [],
      pendingCalls: [
        { seat: 1, callType: 'pass' },
        { seat: 2, callType: 'pass' },
        { seat: 3, callType: 'pass' },
      ],
      lastDiscard: { tile: makeSuitedTile('dots', 5, 0), from: 0 as Seat },
      currentTurn: 0,
      players: [
        { id: 'p0', name: 'P0', seat: 0 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: true },
        { id: 'p1', name: 'P1', seat: 1 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p2', name: 'P2', seat: 2 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p3', name: 'P3', seat: 3 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
      ],
    });

    const result = resolveCallWindow(state, hongKongRuleset);

    expect(result.currentTurn).toBe(1); // Next player after discarder
    expect(result.turnPhase).toBe('drawing');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: FAIL - registerCall and resolveCallWindow not exported

**Step 3: Implement registerCall and resolveCallWindow**

Add to `src/game/calls.ts`:

```typescript
import type {
  TileInstance,
  SuitedTile,
  Seat,
  AvailableCall,
  Ruleset,
  GameState,
  PendingCall,
  CallType,
  Meld,
} from './types';

// ... existing functions ...

/**
 * Register a player's call response.
 */
export function registerCall(
  state: GameState,
  seat: Seat,
  callType: CallType,
  tileIds: string[]
): GameState {
  const tiles = tileIds.map(id => ({ id })) as TileInstance[];

  const pendingCall: PendingCall = {
    seat,
    callType,
    tiles: tiles.length > 0 ? tiles : undefined,
  };

  return {
    ...state,
    pendingCalls: [...state.pendingCalls, pendingCall],
    awaitingCallFrom: state.awaitingCallFrom.filter(s => s !== seat),
  };
}

/**
 * Resolve the call window once all players have responded.
 * Returns updated state with winning call executed, or advances to next player if all passed.
 */
export function resolveCallWindow(
  state: GameState,
  ruleset: Ruleset
): GameState {
  // Still waiting for responses
  if (state.awaitingCallFrom.length > 0) {
    return state;
  }

  // Priority order: win > gang > peng > chi > pass
  const priorityOrder: CallType[] = ['win', 'gang', 'peng', 'chi', 'pass'];

  // Sort calls by priority
  const sortedCalls = [...state.pendingCalls].sort((a, b) => {
    const priorityA = priorityOrder.indexOf(a.callType);
    const priorityB = priorityOrder.indexOf(b.callType);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Same priority - closer to discarder wins (seat order)
    const discarderSeat = state.lastDiscard?.from ?? 0;
    const distA = (a.seat - discarderSeat + 4) % 4;
    const distB = (b.seat - discarderSeat + 4) % 4;
    return distA - distB;
  });

  const winningCall = sortedCalls[0];

  // All passed - advance to next player
  if (winningCall.callType === 'pass') {
    const discarderSeat = state.lastDiscard?.from ?? 0;
    const nextSeat = ((discarderSeat + 1) % 4) as Seat;
    return {
      ...state,
      currentTurn: nextSeat,
      turnPhase: 'drawing',
      pendingCalls: [],
    };
  }

  // Execute the winning call
  return executeCall(state, winningCall, ruleset);
}

/**
 * Execute a call: create meld, update hands, set turn.
 */
function executeCall(
  state: GameState,
  call: PendingCall,
  ruleset: Ruleset
): GameState {
  const { seat, callType, tiles } = call;
  const discard = state.lastDiscard!.tile;
  const discarderSeat = state.lastDiscard!.from;

  // Find the player
  const playerIndex = state.players.findIndex(p => p.seat === seat);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];

  // Get the actual tile instances from the player's hand
  const tileIds = tiles?.map(t => t.id) ?? [];
  const handTiles = player.hand.filter(t => tileIds.includes(t.id));

  // Create the meld
  const meldType = callType === 'chi' ? 'chi' : callType === 'peng' ? 'peng' : 'gang';
  const meld: Meld = {
    type: meldType,
    tiles: [...handTiles, discard],
    fromPlayer: discarderSeat,
  };

  // Remove tiles from hand
  const newHand = player.hand.filter(t => !tileIds.includes(t.id));

  // Remove discard from discard pile
  const newDiscardPile = {
    tiles: state.discardPiles[discarderSeat].tiles.filter(t => t.id !== discard.id),
  };

  // Update player
  const newPlayers = state.players.map((p, i) => {
    if (i === playerIndex) {
      return {
        ...p,
        hand: newHand,
        melds: [...p.melds, meld],
      };
    }
    return p;
  });

  // Gang requires drawing a replacement tile
  const nextPhase = callType === 'gang' ? 'replacing' : 'discarding';

  return {
    ...state,
    players: newPlayers,
    discardPiles: {
      ...state.discardPiles,
      [discarderSeat]: newDiscardPile,
    },
    currentTurn: seat,
    turnPhase: nextPhase,
    pendingCalls: [],
    lastDiscard: undefined,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/game/calls.ts src/game/calls.test.ts
git commit -m "feat(calls): add call registration and resolution"
```

---

## Task 6: Update Engine to Use Call System

**Files:**
- Modify: `src/game/engine.ts`

**Step 1: Update discardTile to use new call detection**

Replace the existing `getAvailableCalls` function call and update `discardTile`:

```typescript
// At top of engine.ts, add import
import { getAvailableCallsForPlayer } from './calls';

// Replace the getAvailableCalls function with this simpler version
function getPlayersWithCalls(
  state: GameState,
  discardedTile: TileInstance,
  fromSeat: Seat,
  ruleset: Ruleset
): Seat[] {
  const seats: Seat[] = [];

  for (const player of state.players) {
    if (player.seat === fromSeat) continue;

    const calls = getAvailableCallsForPlayer(
      player.hand,
      discardedTile,
      player.seat,
      fromSeat,
      ruleset
    );

    if (calls.length > 0) {
      seats.push(player.seat);
    }
  }

  return seats;
}

// In discardTile function, replace the call detection section:
// OLD: const pendingCalls = getAvailableCalls(state, discardedTile, seat, ruleset);
// NEW:
  const playersWithCalls = getPlayersWithCalls(state, discardedTile, seat, ruleset);

  if (playersWithCalls.length > 0) {
    return {
      ...state,
      players,
      discardPiles,
      lastDiscard: { tile: discardedTile, from: seat },
      turnPhase: 'waiting_for_calls',
      pendingCalls: [],
      awaitingCallFrom: playersWithCalls,
      callWindowStart: Date.now(),
    };
  }
```

**Step 2: Update getClientState to include available calls**

In `getClientState`, update the `availableCalls` calculation:

```typescript
// At top of engine.ts, update import
import { getAvailableCallsForPlayer } from './calls';

// In getClientState, replace:
// const availableCalls: AvailableCall[] = [];
// With:
  let availableCalls: AvailableCall[] = [];

  if (state.turnPhase === 'waiting_for_calls' &&
      state.lastDiscard &&
      state.awaitingCallFrom.includes(player.seat)) {
    const ruleset = getRuleset(state.rulesetId);
    availableCalls = getAvailableCallsForPlayer(
      player.hand,
      state.lastDiscard.tile,
      player.seat,
      state.lastDiscard.from,
      ruleset
    );
  }
```

Note: This requires importing `getRuleset` - add at top:
```typescript
import { getRuleset } from './rulesets';
```

**Step 3: Verify build passes**

Run: `npm run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/game/engine.ts
git commit -m "feat(engine): integrate call detection system"
```

---

## Task 7: Server Call Handlers

**Files:**
- Modify: `party/index.ts`

**Step 1: Add call action handlers**

Add imports and new handlers:

```typescript
// Update imports at top
import {
  createInitialState,
  addPlayer,
  removePlayer,
  startGame,
  drawTile,
  discardTile,
  getClientState,
  getTableState,
  generateRoomCode,
} from "../src/game/engine";
import { registerCall, resolveCallWindow } from "../src/game/calls";

// Add new cases to onMessage switch:
      case "CALL_CHI":
        this.handleCall(sender, "chi", action.tileIds);
        break;
      case "CALL_PENG":
        this.handleCall(sender, "peng", action.tileIds);
        break;
      case "CALL_GANG":
        this.handleCall(sender, "gang", action.tileIds);
        break;
      case "PASS":
        this.handleCall(sender, "pass", []);
        break;

// Add handleCall method:
  handleCall(conn: Party.Connection, callType: "chi" | "peng" | "gang" | "pass", tileIds: string[]) {
    const player = this.state.players.find(p => p.id === conn.id);
    if (!player) {
      this.sendError(conn, "You are not in this game");
      return;
    }

    if (this.state.turnPhase !== "waiting_for_calls") {
      this.sendError(conn, "Not waiting for calls");
      return;
    }

    if (!this.state.awaitingCallFrom.includes(player.seat)) {
      this.sendError(conn, "Not expecting a call from you");
      return;
    }

    // Register the call
    this.state = registerCall(this.state, player.seat, callType, tileIds);

    // Try to resolve if all responses received
    const ruleset = getRuleset(this.state.rulesetId);
    const resolved = resolveCallWindow(this.state, ruleset);

    if (resolved !== this.state) {
      this.state = resolved;

      // If someone won a call and needs to draw (gang), do it
      if (this.state.turnPhase === "replacing") {
        const drawResult = drawTile(this.state, ruleset);
        if (!("error" in drawResult)) {
          this.state = drawResult;
        }
      }
      // If all passed and next player needs to draw
      else if (this.state.turnPhase === "drawing") {
        const drawResult = drawTile(this.state, ruleset);
        if (!("error" in drawResult)) {
          this.state = drawResult;
        }
      }
    }

    this.broadcastGameState();
  }
```

**Step 2: Verify types compile**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add party/index.ts
git commit -m "feat(server): add call action handlers"
```

---

## Task 8: Call UI Component

**Files:**
- Create: `src/components/CallPrompt.svelte`

**Step 1: Create CallPrompt component**

Create `src/components/CallPrompt.svelte`:

```svelte
<script lang="ts">
  import type { AvailableCall, TileInstance } from "../game/types";
  import { tileToUnicode } from "../lib/tiles";

  interface Props {
    calls: AvailableCall[];
    onCall: (type: string, tileIds: string[]) => void;
  }

  let { calls, onCall }: Props = $props();

  let selectedChiCombo = $state<number | null>(null);

  const hasChi = $derived(calls.some(c => c.type === "chi"));
  const hasPeng = $derived(calls.some(c => c.type === "peng"));
  const hasGang = $derived(calls.some(c => c.type === "gang"));

  const chiCall = $derived(calls.find(c => c.type === "chi"));
  const pengCall = $derived(calls.find(c => c.type === "peng"));
  const gangCall = $derived(calls.find(c => c.type === "gang"));

  function handleChi() {
    if (!chiCall?.tiles) return;

    // If multiple combinations, need to select
    if (chiCall.tiles.length > 1 && selectedChiCombo === null) {
      return; // Must select first
    }

    const combo = chiCall.tiles[selectedChiCombo ?? 0];
    onCall("chi", combo.map(t => t.id));
  }

  function handlePeng() {
    if (!pengCall?.tiles?.[0]) return;
    onCall("peng", pengCall.tiles[0].map(t => t.id));
  }

  function handleGang() {
    if (!gangCall?.tiles?.[0]) return;
    onCall("gang", gangCall.tiles[0].map(t => t.id));
  }

  function handlePass() {
    onCall("pass", []);
  }
</script>

<div class="call-prompt">
  <div class="call-title">A tile was discarded!</div>

  <div class="call-buttons">
    {#if hasGang}
      <button class="call-btn gang" onclick={handleGang}>
        Gang (槓)
      </button>
    {/if}

    {#if hasPeng}
      <button class="call-btn peng" onclick={handlePeng}>
        Peng (碰)
      </button>
    {/if}

    {#if hasChi}
      {#if chiCall?.tiles && chiCall.tiles.length > 1}
        <div class="chi-selector">
          <div class="chi-label">Chi (吃) - select tiles:</div>
          {#each chiCall.tiles as combo, i}
            <button
              class="chi-combo"
              class:selected={selectedChiCombo === i}
              onclick={() => selectedChiCombo = i}
            >
              {#each combo as tile}
                <span class="tile">{tileToUnicode(tile.tile)}</span>
              {/each}
            </button>
          {/each}
          <button
            class="call-btn chi"
            onclick={handleChi}
            disabled={selectedChiCombo === null}
          >
            Confirm Chi
          </button>
        </div>
      {:else}
        <button class="call-btn chi" onclick={handleChi}>
          Chi (吃)
        </button>
      {/if}
    {/if}

    <button class="call-btn pass" onclick={handlePass}>
      Pass
    </button>
  </div>
</div>

<style>
  .call-prompt {
    position: fixed;
    bottom: 200px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    padding: 1rem 1.5rem;
    border-radius: 12px;
    border: 2px solid #ffcc00;
    z-index: 100;
  }

  .call-title {
    text-align: center;
    font-size: 1.1rem;
    margin-bottom: 1rem;
    color: #ffcc00;
  }

  .call-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .call-btn {
    padding: 0.75rem 1.5rem;
    font-size: 1.1rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    transition: transform 0.1s, opacity 0.1s;
  }

  .call-btn:hover:not(:disabled) {
    transform: scale(1.05);
  }

  .call-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .call-btn.gang {
    background: #ff6b6b;
    color: white;
  }

  .call-btn.peng {
    background: #4ecdc4;
    color: white;
  }

  .call-btn.chi {
    background: #95e1d3;
    color: #333;
  }

  .call-btn.pass {
    background: #666;
    color: white;
  }

  .chi-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .chi-label {
    font-size: 0.9rem;
    color: #aaa;
  }

  .chi-combo {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem;
    background: #333;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
  }

  .chi-combo.selected {
    border-color: #95e1d3;
  }

  .chi-combo .tile {
    font-size: 2rem;
    background: #fffef5;
    border-radius: 4px;
    padding: 0.1rem 0.2rem;
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/CallPrompt.svelte
git commit -m "feat(ui): add CallPrompt component"
```

---

## Task 9: Integrate CallPrompt into GameView

**Files:**
- Modify: `src/views/GameView.svelte`

**Step 1: Add CallPrompt to GameView**

Update `src/views/GameView.svelte`:

```svelte
<script lang="ts">
  import type { ClientGameState } from "../game/types";
  import { SEAT_NAMES, SEAT_WINDS, tileToUnicode } from "../lib/tiles";
  import Hand from "../components/Hand.svelte";
  import CallPrompt from "../components/CallPrompt.svelte";

  interface Props {
    state: ClientGameState;
    onDiscard: (tileId: string) => void;
    onCall: (type: string, tileIds: string[]) => void;
  }

  let { state, onDiscard, onCall }: Props = $props();

  let isMyTurn = $derived(state.currentTurn === state.mySeat);
  let canDiscard = $derived(isMyTurn && state.turnPhase === "discarding");
  let showCallPrompt = $derived(
    state.turnPhase === "waiting_for_calls" &&
    state.availableCalls.length > 0
  );
</script>

<!-- Rest of template stays the same, but add before closing </div> of .game: -->

{#if showCallPrompt}
  <CallPrompt
    calls={state.availableCalls}
    {onCall}
  />
{/if}
```

**Step 2: Update App.svelte to pass onCall**

Update `src/App.svelte` to handle call actions. Find where `onDiscard` is defined and add:

```typescript
function handleCall(type: string, tileIds: string[]) {
  if (!connection) return;

  switch (type) {
    case "chi":
      connection.send(JSON.stringify({ type: "CALL_CHI", tileIds }));
      break;
    case "peng":
      connection.send(JSON.stringify({ type: "CALL_PENG", tileIds }));
      break;
    case "gang":
      connection.send(JSON.stringify({ type: "CALL_GANG", tileIds }));
      break;
    case "pass":
      connection.send(JSON.stringify({ type: "PASS" }));
      break;
  }
}
```

And pass it to GameView:
```svelte
<GameView {state} {onDiscard} onCall={handleCall} />
```

**Step 3: Verify build passes**

Run: `npm run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/views/GameView.svelte src/App.svelte
git commit -m "feat(ui): integrate call prompt into game view"
```

---

## Task 10: Display Exposed Melds

**Files:**
- Modify: `src/views/GameView.svelte`

**Step 1: Add meld display for other players**

In `GameView.svelte`, update the other players section to show melds:

```svelte
<!-- In the .other-players section, update player-info div: -->
{#each state.otherPlayers as player}
  <div
    class="player-info"
    class:current-turn={state.currentTurn === player.seat}
  >
    <div class="player-header">
      {SEAT_WINDS[player.seat]} {player.name}
      {#if player.isDealer}
        <span class="dealer-badge">莊</span>
      {/if}
    </div>
    <div class="player-stats">
      {player.handCount} tiles
    </div>
    {#if player.melds.length > 0}
      <div class="melds">
        {#each player.melds as meld}
          <div class="meld">
            {#each meld.tiles as tile}
              <span class="meld-tile">{tileToUnicode(tile.tile)}</span>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
    {#if player.bonusTiles.length > 0}
      <div class="bonus-tiles">
        {#each player.bonusTiles as bonus}
          <span class="bonus">{tileToUnicode(bonus.tile)}</span>
        {/each}
      </div>
    {/if}
  </div>
{/each}
```

Add styles:

```css
.melds {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
  justify-content: center;
}

.meld {
  display: flex;
  gap: 0.1rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.25rem;
  border-radius: 4px;
}

.meld-tile {
  font-size: 1.5rem;
  background: #fffef5;
  border-radius: 3px;
  padding: 0.05rem 0.15rem;
}
```

**Step 2: Add my melds display**

In the .my-area section, add melds display:

```svelte
{#if state.myMelds.length > 0}
  <div class="my-melds">
    {#each state.myMelds as meld}
      <div class="meld">
        {#each meld.tiles as tile}
          <span class="meld-tile">{tileToUnicode(tile.tile)}</span>
        {/each}
      </div>
    {/each}
  </div>
{/if}
```

Add style:

```css
.my-melds {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}
```

**Step 3: Verify build passes**

Run: `npm run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/views/GameView.svelte
git commit -m "feat(ui): display exposed melds for all players"
```

---

## Task 11: Manual Testing

**Step 1: Run the full application**

Run: `npm run dev:all`

**Step 2: Test call flow**

1. Open 4 browser windows/tabs
2. Create a room and have all 4 join
3. Start the game
4. Play until someone can call peng or chi
5. Verify:
   - Call prompt appears for eligible players
   - Buttons work correctly
   - Meld is displayed after call
   - Turn passes to caller

**Step 3: Commit any fixes needed**

If issues found, fix and commit individually.

---

## Task 12: Update PLAN.md

**Files:**
- Modify: `PLAN.md`

**Step 1: Mark Slice 5 items complete**

Update the Slice 5 section:

```markdown
### Slice 5: Calls - Peng/Chi/Gang
- [x] Add call detection in engine
- [x] Add call UI prompts
- [x] Handle call priority (ron > peng/gang > chi)
- [x] Update server to manage call windows
```

Update Current Status:

```markdown
## Current Status

Slices 1-5 complete. Call system works:
- Peng (triplet) from any player
- Chi (sequence) from left player only
- Gang (quad) from any player
- Priority resolution (gang > peng > chi)
- Exposed melds displayed
```

**Step 2: Commit**

```bash
git add PLAN.md
git commit -m "docs: mark Slice 5 complete"
```

---

## Summary

This plan implements the full call system in 12 tasks:

1. **Task 1-5**: Core call logic (types, detection, registration, resolution)
2. **Task 6-7**: Engine and server integration
3. **Task 8-10**: UI components and display
4. **Task 11-12**: Testing and documentation

Each task is self-contained with clear test-first approach and frequent commits.
