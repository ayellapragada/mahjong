# Slice 6: Win Detection & Scoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate win detection into game flow, display scoring at round end, handle draws, and support multi-round play.

**Architecture:** Win detection via call window (discard) or self-draw check. Score transfers use simplified HK rules (winner takes from all). Modal overlay shows results with scoring breakdown. Multi-round with dealer rotation.

**Tech Stack:** TypeScript, Svelte 5, Vitest, PartyKit/Cloudflare Workers

---

## Task 1: Add Win Check to Call Detection

**Files:**
- Modify: `src/game/calls.ts:113-150`
- Test: `src/game/calls.test.ts`

**Step 1: Write the failing test**

Add to `src/game/calls.test.ts`:

```typescript
describe('getAvailableCallsForPlayer - win detection', () => {
  it('should return win call when player can win on discard', () => {
    // Hand has 13 tiles that form 3 melds + pair, needs one more tile to complete 4th meld
    // Hand: 111 222 333 55 (dots) - needs 4,5, or 6 dots to complete
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1],
      ['dots', 5, 0], ['dots', 5, 1],
    );
    const discard = makeSuitedTile('dots', 4, 2); // Completes 444 triplet

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset
    );

    expect(calls.some(c => c.type === 'win')).toBe(true);
  });

  it('should not return win call when hand is not winning', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 2),
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

    expect(calls.some(c => c.type === 'win')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: FAIL - win check not implemented yet

**Step 3: Add makeTiles helper to test file (if needed)**

Add at top of `src/game/calls.test.ts` if not present:

```typescript
function makeTiles(...specs: Array<[Suit, number, number?]>): TileInstance[] {
  return specs.map(([suit, value, copy]) => makeSuitedTile(suit, value, copy ?? 0));
}
```

**Step 4: Implement win check in getAvailableCallsForPlayer**

Modify `src/game/calls.ts` - add import at top:

```typescript
import { getRuleset } from './rulesets';
```

Add win check in `getAvailableCallsForPlayer` function (after the gang check, before return):

```typescript
  // Check for win
  const testHand = [...hand, discard];
  const winContext = {
    winningTile: discard,
    isSelfDrawn: false,
    seatWind: (['east', 'south', 'west', 'north'] as const)[playerSeat],
    roundWind: 'east' as const, // Will be passed in properly later
    isLastTile: false,
    isReplacementTile: false,
    isRobbingKong: false,
  };

  if (ruleset.isWinningHand(testHand, [], winContext)) {
    calls.push({ type: 'win' });
  }
```

**Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/game/calls.ts src/game/calls.test.ts
git commit -m "feat: add win detection to call system"
```

---

## Task 2: Add Win Check with Melds Support

**Files:**
- Modify: `src/game/calls.ts`
- Test: `src/game/calls.test.ts`

**Step 1: Write the failing test**

Add to `src/game/calls.test.ts`:

```typescript
it('should detect win with exposed melds', () => {
  // Hand has 10 tiles (3 melds worth) + pair, plus 1 exposed meld
  // Hand: 111 222 55 (dots) - needs tile to complete 3rd meld
  const hand = makeTiles(
    ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
    ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
    ['dots', 3, 0], ['dots', 3, 1],
    ['dots', 5, 0], ['dots', 5, 1],
  );
  const discard = makeSuitedTile('dots', 3, 2); // Completes 333 triplet

  // Need to pass melds info somehow - update function signature
  const calls = getAvailableCallsForPlayer(
    hand,
    discard,
    1 as Seat,
    0 as Seat,
    hongKongRuleset,
    [{ type: 'peng', tiles: makeTiles(['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2]), fromPlayer: 0 as Seat }]
  );

  expect(calls.some(c => c.type === 'win')).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: FAIL - function doesn't accept melds parameter

**Step 3: Update function signature**

Modify `src/game/calls.ts`:

```typescript
export function getAvailableCallsForPlayer(
  hand: TileInstance[],
  discard: TileInstance,
  playerSeat: Seat,
  discarderSeat: Seat,
  ruleset: Ruleset,
  melds: Meld[] = []  // Add this parameter with default
): AvailableCall[] {
```

**Step 4: Update win check to use melds**

```typescript
  // Check for win
  const testHand = [...hand, discard];
  const winContext = {
    winningTile: discard,
    isSelfDrawn: false,
    seatWind: (['east', 'south', 'west', 'north'] as const)[playerSeat],
    roundWind: 'east' as const,
    isLastTile: false,
    isReplacementTile: false,
    isRobbingKong: false,
  };

  if (ruleset.isWinningHand(testHand, melds, winContext)) {
    calls.push({ type: 'win' });
  }
```

**Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/game/calls.test.ts`
Expected: PASS

**Step 6: Update all callers to pass melds**

In `src/game/engine.ts`, update `getPlayersWithCalls`:

```typescript
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
      ruleset,
      player.melds  // Add melds parameter
    );

    if (calls.length > 0) {
      seats.push(player.seat);
    }
  }

  return seats;
}
```

Also update `getClientState` in `src/game/engine.ts`:

```typescript
    availableCalls = getAvailableCallsForPlayer(
      player.hand,
      state.lastDiscard.tile,
      player.seat,
      state.lastDiscard.from,
      ruleset,
      player.melds  // Add melds parameter
    );
```

**Step 7: Commit**

```bash
git add src/game/calls.ts src/game/calls.test.ts src/game/engine.ts
git commit -m "feat: support melds in win detection"
```

---

## Task 3: Create Score Transfer Logic

**Files:**
- Create: `src/game/scoring.ts`
- Test: `src/game/scoring.test.ts`

**Step 1: Write the failing test**

Create `src/game/scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateScoreTransfer } from './scoring';
import type { Seat, ScoreBreakdown } from './types';

describe('calculateScoreTransfer', () => {
  const baseBreakdown: ScoreBreakdown = {
    fan: 3,
    items: [{ name: 'All Triplets', fan: 3 }],
    basePoints: 8,
    totalPoints: 8,
  };

  it('should calculate transfer for self-draw win', () => {
    const transfer = calculateScoreTransfer(
      0 as Seat, // winner
      baseBreakdown,
      true, // self-drawn
      undefined // no discarder
    );

    // Winner gets 8 * 3 = 24 (each opponent pays 8)
    expect(transfer[0]).toBe(24);
    expect(transfer[1]).toBe(-8);
    expect(transfer[2]).toBe(-8);
    expect(transfer[3]).toBe(-8);
  });

  it('should calculate transfer for discard win', () => {
    const transfer = calculateScoreTransfer(
      0 as Seat, // winner
      baseBreakdown,
      false, // not self-drawn
      1 as Seat // discarder
    );

    // Discarder pays double (16), others pay single (8 each)
    // Winner gets 16 + 8 + 8 = 32
    expect(transfer[0]).toBe(32);
    expect(transfer[1]).toBe(-16); // discarder pays double
    expect(transfer[2]).toBe(-8);
    expect(transfer[3]).toBe(-8);
  });

  it('should handle zero fan (chicken hand)', () => {
    const chickenBreakdown: ScoreBreakdown = {
      fan: 0,
      items: [{ name: 'Chicken Hand', fan: 0 }],
      basePoints: 1,
      totalPoints: 1,
    };

    const transfer = calculateScoreTransfer(
      2 as Seat,
      chickenBreakdown,
      false,
      3 as Seat
    );

    expect(transfer[2]).toBe(4); // 2 + 1 + 1
    expect(transfer[3]).toBe(-2); // discarder pays double
    expect(transfer[0]).toBe(-1);
    expect(transfer[1]).toBe(-1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/game/scoring.test.ts`
Expected: FAIL - module not found

**Step 3: Implement calculateScoreTransfer**

Create `src/game/scoring.ts`:

```typescript
import type { Seat, ScoreBreakdown } from './types';

/**
 * Calculate score transfers for a winning hand.
 *
 * HK Simplified Rules:
 * - Self-draw: all 3 opponents pay base points
 * - Discard win: discarder pays double, others pay single
 *
 * @returns Record of score changes per seat (positive = gain, negative = loss)
 */
export function calculateScoreTransfer(
  winner: Seat,
  breakdown: ScoreBreakdown,
  isSelfDrawn: boolean,
  discarder?: Seat
): Record<Seat, number> {
  const base = breakdown.totalPoints;
  const transfer: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

  const seats: Seat[] = [0, 1, 2, 3];
  const losers = seats.filter(s => s !== winner);

  if (isSelfDrawn) {
    // All opponents pay equally
    for (const loser of losers) {
      transfer[loser] = -base;
      transfer[winner] += base;
    }
  } else {
    // Discarder pays double, others pay single
    for (const loser of losers) {
      const payment = loser === discarder ? base * 2 : base;
      transfer[loser] = -payment;
      transfer[winner] += payment;
    }
  }

  return transfer;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/game/scoring.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/scoring.ts src/game/scoring.test.ts
git commit -m "feat: add score transfer calculation"
```

---

## Task 4: Add Self-Draw Win Check to Engine

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/game/types.ts`

**Step 1: Add canWin to ClientGameState type**

Modify `src/game/types.ts`, in `ClientGameState` interface:

```typescript
export interface ClientGameState {
  // ... existing fields ...

  // Win detection
  canWin: boolean;
}
```

**Step 2: Create canDeclareWin function in engine**

Add to `src/game/engine.ts`:

```typescript
/**
 * Check if the current player can declare a win (self-draw).
 */
export function canDeclareWin(state: GameState, ruleset: Ruleset): boolean {
  if (state.phase !== 'playing') return false;
  if (state.turnPhase !== 'discarding') return false;

  const player = state.players.find(p => p.seat === state.currentTurn);
  if (!player) return false;

  // Need 14 tiles in hand (13 + just drawn)
  const expectedHandSize = 14 - (player.melds.length * 3);
  if (player.hand.length !== expectedHandSize) return false;

  const winContext = {
    winningTile: player.hand[player.hand.length - 1], // Last drawn tile
    isSelfDrawn: true,
    seatWind: (['east', 'south', 'west', 'north'] as const)[player.seat],
    roundWind: state.roundWind,
    isLastTile: state.wall.length === 0,
    isReplacementTile: false, // TODO: track this
    isRobbingKong: false,
  };

  return ruleset.isWinningHand(player.hand, player.melds, winContext);
}
```

**Step 3: Update getClientState to include canWin**

In `src/game/engine.ts`, modify `getClientState`:

```typescript
export function getClientState(state: GameState, playerId: string): ClientGameState | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;

  // ... existing code ...

  const ruleset = getRuleset(state.rulesetId);

  // Check if current player can win (self-draw)
  const canWin = player.seat === state.currentTurn &&
                 state.turnPhase === 'discarding' &&
                 canDeclareWin(state, ruleset);

  return {
    // ... existing fields ...
    canWin,
  };
}
```

**Step 4: Update getTableState similarly**

```typescript
export function getTableState(state: GameState): /* ... type ... */ {
  // ... existing code ...

  return {
    // ... existing fields ...
    canWin: false, // Spectators can't win
  };
}
```

**Step 5: Run type check**

Run: `npm run check`
Expected: PASS (or fix any type errors)

**Step 6: Commit**

```bash
git add src/game/engine.ts src/game/types.ts
git commit -m "feat: add self-draw win detection to engine"
```

---

## Task 5: Add DECLARE_WIN Action and Handler

**Files:**
- Modify: `src/game/types.ts`
- Modify: `party/index.ts`
- Create: `src/game/win.ts`

**Step 1: Add declareWin function**

Create `src/game/win.ts`:

```typescript
import type { GameState, Seat, Ruleset, WinContext, ScoreBreakdown } from './types';
import { calculateScoreTransfer } from './scoring';

export interface WinResult {
  state: GameState;
  winner: Seat;
  breakdown: ScoreBreakdown;
  isSelfDrawn: boolean;
}

/**
 * Process a win declaration (self-draw).
 */
export function declareSelfDrawWin(
  state: GameState,
  seat: Seat,
  ruleset: Ruleset
): WinResult | { error: string } {
  if (state.phase !== 'playing') {
    return { error: 'Game not in progress' };
  }

  if (state.currentTurn !== seat) {
    return { error: 'Not your turn' };
  }

  if (state.turnPhase !== 'discarding') {
    return { error: 'Cannot declare win now' };
  }

  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    return { error: 'Player not found' };
  }

  const winningTile = player.hand[player.hand.length - 1];
  const winContext: WinContext = {
    winningTile,
    isSelfDrawn: true,
    seatWind: (['east', 'south', 'west', 'north'] as const)[seat],
    roundWind: state.roundWind,
    isLastTile: state.wall.length === 0,
    isReplacementTile: false,
    isRobbingKong: false,
  };

  if (!ruleset.isWinningHand(player.hand, player.melds, winContext)) {
    return { error: 'Not a winning hand' };
  }

  const breakdown = ruleset.scoreHand(player.hand, player.melds, winContext);
  const transfer = calculateScoreTransfer(seat, breakdown, true);

  // Update scores
  const newScores = { ...state.scores };
  for (const s of [0, 1, 2, 3] as Seat[]) {
    newScores[s] += transfer[s];
  }

  const newState: GameState = {
    ...state,
    phase: 'finished',
    turnPhase: 'game_over',
    scores: newScores,
  };

  return {
    state: newState,
    winner: seat,
    breakdown,
    isSelfDrawn: true,
  };
}

/**
 * Process a win declaration from call window (discard win).
 */
export function declareDiscardWin(
  state: GameState,
  seat: Seat,
  ruleset: Ruleset
): WinResult | { error: string } {
  if (state.phase !== 'playing') {
    return { error: 'Game not in progress' };
  }

  if (state.turnPhase !== 'waiting_for_calls') {
    return { error: 'Not in call window' };
  }

  if (!state.lastDiscard) {
    return { error: 'No discard to win on' };
  }

  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    return { error: 'Player not found' };
  }

  const winningTile = state.lastDiscard.tile;
  const testHand = [...player.hand, winningTile];
  const winContext: WinContext = {
    winningTile,
    isSelfDrawn: false,
    seatWind: (['east', 'south', 'west', 'north'] as const)[seat],
    roundWind: state.roundWind,
    isLastTile: state.wall.length === 0,
    isReplacementTile: false,
    isRobbingKong: false,
  };

  if (!ruleset.isWinningHand(testHand, player.melds, winContext)) {
    return { error: 'Not a winning hand' };
  }

  const breakdown = ruleset.scoreHand(testHand, player.melds, winContext);
  const discarder = state.lastDiscard.from;
  const transfer = calculateScoreTransfer(seat, breakdown, false, discarder);

  // Update scores
  const newScores = { ...state.scores };
  for (const s of [0, 1, 2, 3] as Seat[]) {
    newScores[s] += transfer[s];
  }

  // Add winning tile to player's hand for display
  const newPlayers = state.players.map(p => {
    if (p.seat === seat) {
      return { ...p, hand: testHand };
    }
    return p;
  });

  const newState: GameState = {
    ...state,
    players: newPlayers,
    phase: 'finished',
    turnPhase: 'game_over',
    scores: newScores,
    pendingCalls: [],
    awaitingCallFrom: [],
  };

  return {
    state: newState,
    winner: seat,
    breakdown,
    isSelfDrawn: false,
  };
}
```

**Step 2: Add DECLARE_WIN handler to server**

Modify `party/index.ts`:

Add import:
```typescript
import { declareSelfDrawWin, declareDiscardWin } from "../src/game/win";
```

Add case in `onMessage` switch:
```typescript
      case "DECLARE_WIN":
        this.handleDeclareWin(sender);
        break;
```

Add handler method:
```typescript
  handleDeclareWin(conn: Connection) {
    const player = this.state.players.find(p => p.id === conn.id);
    if (!player) {
      this.sendError(conn, "You are not in this game");
      return;
    }

    const ruleset = getRuleset(this.state.rulesetId);

    // Determine if self-draw or discard win
    let result;
    if (this.state.turnPhase === 'discarding' && this.state.currentTurn === player.seat) {
      result = declareSelfDrawWin(this.state, player.seat, ruleset);
    } else if (this.state.turnPhase === 'waiting_for_calls') {
      result = declareDiscardWin(this.state, player.seat, ruleset);
    } else {
      this.sendError(conn, "Cannot declare win now");
      return;
    }

    if ("error" in result) {
      this.sendError(conn, result.error);
      return;
    }

    this.state = result.state;

    // Broadcast game over with winner info
    const winnerPlayer = this.state.players.find(p => p.seat === result.winner);
    for (const c of this.getConnections()) {
      this.sendToConnection(c, {
        type: "GAME_OVER",
        winner: result.winner,
        scores: this.state.scores,
        breakdown: result.breakdown,
      });
    }

    // Also send final state
    this.broadcastGameState();
  }
```

**Step 3: Run type check**

Run: `npm run check`
Expected: PASS

**Step 4: Commit**

```bash
git add src/game/win.ts src/game/types.ts party/index.ts
git commit -m "feat: add DECLARE_WIN action handler"
```

---

## Task 6: Handle Win in Call Window Resolution

**Files:**
- Modify: `src/game/calls.ts`

**Step 1: Update executeCall to handle win type**

Modify `executeCall` in `src/game/calls.ts`:

```typescript
function executeCall(
  state: GameState,
  call: PendingCall,
  ruleset: Ruleset
): GameState {
  const { seat, callType, tiles } = call;

  // Win is handled separately - just mark the winner
  if (callType === 'win') {
    // Return state with winner flag - actual win processing happens in server
    return {
      ...state,
      pendingCalls: [call], // Keep the win call for server to process
      awaitingCallFrom: [],
      turnPhase: 'waiting_for_calls', // Keep in this phase for server
    };
  }

  // ... rest of existing code for chi/peng/gang ...
}
```

**Step 2: Update server to check for win in call resolution**

Modify `handleCall` in `party/index.ts`:

```typescript
  handleCall(conn: Connection, callType: "chi" | "peng" | "gang" | "pass" | "win", tileIds: string[]) {
    // ... existing validation ...

    // Handle win separately
    if (callType === 'win') {
      // Register and resolve
      this.state = registerCall(this.state, player.seat, 'win', []);

      const ruleset = getRuleset(this.state.rulesetId);
      const resolved = resolveCallWindow(this.state, ruleset);

      // Check if win was the winning call
      if (resolved.pendingCalls.length > 0 && resolved.pendingCalls[0].callType === 'win') {
        // Process the win
        const result = declareDiscardWin(this.state, player.seat, ruleset);
        if (!("error" in result)) {
          this.state = result.state;

          for (const c of this.getConnections()) {
            this.sendToConnection(c, {
              type: "GAME_OVER",
              winner: result.winner,
              scores: this.state.scores,
              breakdown: result.breakdown,
            });
          }
        }
      }

      this.broadcastGameState();
      return;
    }

    // ... rest of existing code ...
  }
```

Also add 'win' to the type union in method signature.

**Step 3: Commit**

```bash
git add src/game/calls.ts party/index.ts
git commit -m "feat: handle win call in call window"
```

---

## Task 7: Add Win Option to CallPrompt UI

**Files:**
- Modify: `src/components/CallPrompt.svelte`

**Step 1: Read current CallPrompt**

The component already handles chi/peng/gang. Add win button.

**Step 2: Add win button**

Modify `src/components/CallPrompt.svelte`:

```svelte
<script lang="ts">
  import type { AvailableCall } from "../game/types";

  interface Props {
    calls: AvailableCall[];
    onCall: (type: string, tileIds: string[]) => void;
  }

  let { calls, onCall }: Props = $props();

  let hasWin = $derived(calls.some(c => c.type === 'win'));
  let hasPeng = $derived(calls.some(c => c.type === 'peng'));
  let hasGang = $derived(calls.some(c => c.type === 'gang'));
  let chiCall = $derived(calls.find(c => c.type === 'chi'));
</script>

<div class="call-prompt">
  <div class="prompt-title">Declare:</div>
  <div class="call-buttons">
    {#if hasWin}
      <button class="call-btn win" onclick={() => onCall('win', [])}>
        胡 Hu
      </button>
    {/if}
    {#if hasGang}
      <button class="call-btn gang" onclick={() => {
        const gangCall = calls.find(c => c.type === 'gang');
        if (gangCall?.tiles?.[0]) {
          onCall('gang', gangCall.tiles[0].map(t => t.id));
        }
      }}>
        槓 Gang
      </button>
    {/if}
    {#if hasPeng}
      <button class="call-btn peng" onclick={() => {
        const pengCall = calls.find(c => c.type === 'peng');
        if (pengCall?.tiles?.[0]) {
          onCall('peng', pengCall.tiles[0].map(t => t.id));
        }
      }}>
        碰 Peng
      </button>
    {/if}
    {#if chiCall?.tiles && chiCall.tiles.length > 0}
      {#each chiCall.tiles as combo, i}
        <button class="call-btn chi" onclick={() => onCall('chi', combo.map(t => t.id))}>
          吃 Chi {i + 1}
        </button>
      {/each}
    {/if}
    <button class="call-btn pass" onclick={() => onCall('pass', [])}>
      Pass
    </button>
  </div>
</div>

<style>
  /* ... existing styles ... */

  .call-btn.win {
    background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
    animation: winPulse 1s ease-in-out infinite;
  }

  @keyframes winPulse {
    0%, 100% { box-shadow: 0 0 10px rgba(196, 30, 58, 0.5); }
    50% { box-shadow: 0 0 20px rgba(196, 30, 58, 0.8); }
  }
</style>
```

**Step 3: Commit**

```bash
git add src/components/CallPrompt.svelte
git commit -m "feat: add win button to call prompt"
```

---

## Task 8: Add Hu Button for Self-Draw Win

**Files:**
- Modify: `src/views/GameView.svelte`

**Step 1: Add Hu button to GameView**

Add in the `my-area` section, after the turn indicator:

```svelte
{#if state.canWin}
  <button class="hu-button" onclick={() => onCall('win', [])}>
    胡 Hu!
  </button>
{/if}
```

**Step 2: Add styles**

```css
.hu-button {
  display: block;
  margin: var(--space-sm) auto;
  padding: var(--space-sm) var(--space-lg);
  background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-family: var(--font-display);
  font-size: 1.5rem;
  cursor: pointer;
  animation: huPulse 1s ease-in-out infinite;
  box-shadow: 0 4px 15px rgba(196, 30, 58, 0.4);
}

@keyframes huPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

**Step 3: Commit**

```bash
git add src/views/GameView.svelte
git commit -m "feat: add Hu button for self-draw win"
```

---

## Task 9: Create ResultsModal Component

**Files:**
- Create: `src/components/ResultsModal.svelte`

**Step 1: Create the component**

Create `src/components/ResultsModal.svelte`:

```svelte
<script lang="ts">
  import type { Seat, ScoreBreakdown, TileInstance, Meld } from "../game/types";
  import { SEAT_NAMES, SEAT_WINDS, tileToUnicode } from "../lib/tiles";

  interface Props {
    winner: Seat;
    winnerName: string;
    breakdown: ScoreBreakdown;
    scores: Record<Seat, number>;
    winningHand: TileInstance[];
    winningMelds: Meld[];
    isSelfDrawn: boolean;
    onNextRound: () => void;
  }

  let {
    winner,
    winnerName,
    breakdown,
    scores,
    winningHand,
    winningMelds,
    isSelfDrawn,
    onNextRound,
  }: Props = $props();
</script>

<div class="modal-overlay">
  <div class="modal">
    <div class="winner-banner">
      <span class="wind">{SEAT_WINDS[winner]}</span>
      <span class="name">{winnerName}</span>
      <span class="win-type">{isSelfDrawn ? '自摸 Self-Draw!' : '胡 Hu!'}</span>
    </div>

    <div class="winning-hand">
      <div class="hand-tiles">
        {#each winningHand as tile}
          <span class="tile">{tileToUnicode(tile.tile)}</span>
        {/each}
      </div>
      {#if winningMelds.length > 0}
        <div class="melds">
          {#each winningMelds as meld}
            <div class="meld">
              {#each meld.tiles as tile}
                <span class="tile meld-tile">{tileToUnicode(tile.tile)}</span>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="scoring">
      <h3>Scoring</h3>
      <table>
        <tbody>
          {#each breakdown.items as item}
            <tr>
              <td class="item-name">{item.name}</td>
              <td class="item-fan">{item.fan} fan</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr class="total">
            <td>Total</td>
            <td>{breakdown.fan} fan = {breakdown.totalPoints} pts</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="scores">
      <h3>Scores</h3>
      <div class="score-grid">
        {#each [0, 1, 2, 3] as seat}
          <div class="score-item" class:winner={seat === winner}>
            <span class="seat">{SEAT_WINDS[seat as Seat]}</span>
            <span class="score" class:positive={scores[seat as Seat] > 0} class:negative={scores[seat as Seat] < 0}>
              {scores[seat as Seat] > 0 ? '+' : ''}{scores[seat as Seat]}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <button class="next-round-btn" onclick={onNextRound}>
      Next Round
    </button>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: linear-gradient(145deg, var(--bg-table) 0%, var(--bg-felt) 100%);
    border: 2px solid var(--gold);
    border-radius: var(--radius-xl);
    padding: var(--space-lg);
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 0 40px rgba(212, 168, 75, 0.3);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .winner-banner {
    text-align: center;
    margin-bottom: var(--space-lg);
    padding: var(--space-md);
    background: linear-gradient(135deg, rgba(196, 30, 58, 0.3) 0%, rgba(139, 0, 0, 0.3) 100%);
    border-radius: var(--radius-lg);
  }

  .winner-banner .wind {
    font-size: 2rem;
    margin-right: var(--space-sm);
  }

  .winner-banner .name {
    font-family: var(--font-display);
    font-size: 1.5rem;
    color: var(--gold);
  }

  .winner-banner .win-type {
    display: block;
    font-size: 1.2rem;
    color: var(--crimson);
    margin-top: var(--space-xs);
  }

  .winning-hand {
    text-align: center;
    margin-bottom: var(--space-lg);
  }

  .hand-tiles {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: var(--space-sm);
  }

  .tile {
    font-size: 2rem;
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.3rem;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
  }

  .melds {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    margin-top: var(--space-sm);
  }

  .meld {
    display: flex;
    gap: 2px;
    padding: var(--space-xs);
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm);
  }

  .meld-tile {
    font-size: 1.5rem;
  }

  .scoring {
    margin-bottom: var(--space-lg);
  }

  .scoring h3, .scores h3 {
    font-family: var(--font-display);
    color: var(--gold);
    margin-bottom: var(--space-sm);
    text-align: center;
  }

  .scoring table {
    width: 100%;
    border-collapse: collapse;
  }

  .scoring td {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .item-name {
    color: var(--text-primary);
  }

  .item-fan {
    text-align: right;
    color: var(--jade);
  }

  .total {
    font-weight: bold;
  }

  .total td {
    border-top: 2px solid var(--gold);
    color: var(--gold);
  }

  .score-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
  }

  .score-item {
    text-align: center;
    padding: var(--space-sm);
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
  }

  .score-item.winner {
    background: rgba(212, 168, 75, 0.2);
    border: 1px solid var(--gold);
  }

  .seat {
    display: block;
    font-size: 1.2rem;
    margin-bottom: var(--space-xs);
  }

  .score {
    font-family: var(--font-display);
    font-size: 1.1rem;
  }

  .score.positive {
    color: var(--jade);
  }

  .score.negative {
    color: var(--crimson);
  }

  .next-round-btn {
    display: block;
    width: 100%;
    padding: var(--space-md);
    margin-top: var(--space-lg);
    background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
    color: var(--bg-dark);
    border: none;
    border-radius: var(--radius-lg);
    font-family: var(--font-display);
    font-size: 1.2rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .next-round-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(212, 168, 75, 0.4);
  }

  @media (max-width: 600px) {
    .modal {
      padding: var(--space-md);
    }

    .tile {
      font-size: 1.5rem;
    }

    .meld-tile {
      font-size: 1.2rem;
    }

    .score-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/ResultsModal.svelte
git commit -m "feat: add ResultsModal component"
```

---

## Task 10: Integrate ResultsModal into App

**Files:**
- Modify: `src/App.svelte`

**Step 1: Read current App.svelte structure**

Check how state is managed and where to add game over handling.

**Step 2: Add game over state and modal**

Add state variables:
```svelte
let gameOverData = $state<{
  winner: Seat;
  scores: Record<Seat, number>;
  breakdown: ScoreBreakdown;
} | null>(null);
```

Handle GAME_OVER message:
```typescript
case 'GAME_OVER':
  gameOverData = {
    winner: msg.winner,
    scores: msg.scores,
    breakdown: msg.breakdown,
  };
  break;
```

Render modal when game over:
```svelte
{#if gameOverData && gameState}
  <ResultsModal
    winner={gameOverData.winner}
    winnerName={/* get from players */}
    breakdown={gameOverData.breakdown}
    scores={gameOverData.scores}
    winningHand={/* get from state */}
    winningMelds={/* get from state */}
    isSelfDrawn={/* determine from breakdown */}
    onNextRound={handleNextRound}
  />
{/if}
```

**Step 3: Add handleNextRound function**

```typescript
function handleNextRound() {
  connection?.send(JSON.stringify({ type: 'START_NEXT_ROUND' }));
  gameOverData = null;
}
```

**Step 4: Commit**

```bash
git add src/App.svelte
git commit -m "feat: integrate ResultsModal into App"
```

---

## Task 11: Add START_NEXT_ROUND Handler

**Files:**
- Modify: `src/game/types.ts`
- Modify: `party/index.ts`

**Step 1: Add action type**

In `src/game/types.ts`, update `ClientAction`:
```typescript
export type ClientAction =
  // ... existing ...
  | { type: 'START_NEXT_ROUND' };
```

**Step 2: Add handler in server**

Add case in `onMessage`:
```typescript
      case "START_NEXT_ROUND":
        this.handleStartNextRound(sender);
        break;
```

Add handler method:
```typescript
  handleStartNextRound(conn: Connection) {
    if (this.state.phase !== 'finished') {
      this.sendError(conn, "Game not finished");
      return;
    }

    // Determine dealer rotation
    // If dealer won, dealer stays. Otherwise, rotate.
    const currentDealer = this.state.dealerSeat;
    let newDealer = currentDealer;
    let newRoundNumber = this.state.roundNumber;
    let newHandNumber = this.state.handNumber;

    // For now, simple rotation - dealer always rotates for MVP
    newDealer = ((currentDealer + 1) % 4) as Seat;
    newHandNumber += 1;

    // If we've gone around once, new round
    if (newDealer === 0) {
      newRoundNumber += 1;
      newHandNumber = 1;
    }

    // Check if game is completely over (4 full rounds)
    if (newRoundNumber > 4) {
      // Game completely finished - could show final standings
      // For now, just restart at round 1
      newRoundNumber = 1;
    }

    // Reset state for new round, keeping scores
    this.state = {
      ...createInitialState(this.state.roomCode, this.state.rulesetId),
      players: this.state.players.map(p => ({
        ...p,
        hand: [],
        melds: [],
        bonusTiles: [],
        isDealer: p.seat === newDealer,
      })),
      scores: this.state.scores,
      dealerSeat: newDealer,
      roundNumber: newRoundNumber,
      handNumber: newHandNumber,
      roundWind: (['east', 'south', 'west', 'north'] as const)[Math.floor((newRoundNumber - 1))],
      phase: 'waiting',
    };

    // Re-fill bots if needed
    this.fillEmptySeatsWithBots();

    // Start the game
    const ruleset = getRuleset(this.state.rulesetId);
    const startResult = startGame(this.state, ruleset);
    if (!("error" in startResult)) {
      this.state = startResult;

      // Dealer draws first
      const drawResult = drawTile(this.state, ruleset);
      if (!("error" in drawResult)) {
        this.state = drawResult;
      }
    }

    this.broadcastGameState();
    this.scheduleBotActions();
  }
```

**Step 3: Commit**

```bash
git add src/game/types.ts party/index.ts
git commit -m "feat: add START_NEXT_ROUND handler"
```

---

## Task 12: Update Bot to Declare Wins

**Files:**
- Modify: `party/bot.ts`

**Step 1: Update bot to always win when possible**

Modify `decideAction` in `party/bot.ts`:

```typescript
  decideAction(state: GameState): BotAction | null {
    const player = state.players.find(p => p.seat === this.seat);
    if (!player) return null;
    if (player.hand.length === 0) return null;

    // Check if it's our turn to discard
    if (state.currentTurn === this.seat && state.turnPhase === 'discarding') {
      // Check if we can win (self-draw)
      const ruleset = getRuleset(state.rulesetId);
      const winContext = {
        winningTile: player.hand[player.hand.length - 1],
        isSelfDrawn: true,
        seatWind: (['east', 'south', 'west', 'north'] as const)[this.seat],
        roundWind: state.roundWind,
        isLastTile: state.wall.length === 0,
        isReplacementTile: false,
        isRobbingKong: false,
      };

      if (ruleset.isWinningHand(player.hand, player.melds, winContext)) {
        return { type: 'win' };
      }

      // Otherwise discard random tile
      const randomIndex = Math.floor(Math.random() * player.hand.length);
      return { type: 'discard', tileId: player.hand[randomIndex].id };
    }

    // Check if we're in a call window
    if (state.turnPhase === 'waiting_for_calls' && state.awaitingCallFrom.includes(this.seat)) {
      if (!state.lastDiscard) {
        return { type: 'pass' };
      }

      const ruleset = getRuleset(state.rulesetId);
      const availableCalls = getAvailableCallsForPlayer(
        player.hand,
        state.lastDiscard.tile,
        this.seat,
        state.lastDiscard.from,
        ruleset,
        player.melds
      );

      // Always win if possible
      if (availableCalls.some(c => c.type === 'win')) {
        return { type: 'win' };
      }

      // 50% chance for other calls
      const realCalls = availableCalls.filter(c => c.type !== 'pass' && c.type !== 'win');
      if (realCalls.length > 0 && Math.random() < 0.5) {
        // ... existing call logic ...
      }

      return { type: 'pass' };
    }

    return null;
  }
```

**Step 2: Add win type to BotAction**

```typescript
export type BotAction =
  | { type: 'discard'; tileId: string }
  | { type: 'call'; callType: 'chi' | 'peng' | 'gang'; tileIds: string[] }
  | { type: 'pass' }
  | { type: 'win' };
```

**Step 3: Handle bot win in server**

Update `executeBotAction` in `party/index.ts`:

```typescript
  executeBotAction(seat: Seat, action: BotAction) {
    if (!this.bots.has(seat)) return;

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
      case 'win':
        this.handleBotWin(seat);
        break;
    }
  }

  handleBotWin(seat: Seat) {
    const ruleset = getRuleset(this.state.rulesetId);

    let result;
    if (this.state.turnPhase === 'discarding') {
      result = declareSelfDrawWin(this.state, seat, ruleset);
    } else if (this.state.turnPhase === 'waiting_for_calls') {
      result = declareDiscardWin(this.state, seat, ruleset);
    } else {
      return;
    }

    if ("error" in result) {
      console.error(`Bot win error:`, result.error);
      return;
    }

    this.state = result.state;

    for (const c of this.getConnections()) {
      this.sendToConnection(c, {
        type: "GAME_OVER",
        winner: result.winner,
        scores: this.state.scores,
        breakdown: result.breakdown,
      });
    }

    this.broadcastGameState();
  }
```

**Step 4: Commit**

```bash
git add party/bot.ts party/index.ts
git commit -m "feat: update bot to declare wins"
```

---

## Task 13: Handle Draw (Wall Exhaustion)

**Files:**
- Modify: `party/index.ts`
- Modify: `src/components/ResultsModal.svelte`

**Step 1: Update draw handling in server**

When `drawTile` returns game_over state, broadcast appropriately:

```typescript
// In handleDiscard and other places where drawTile is called:
if (this.state.phase === 'finished' && this.state.turnPhase === 'game_over') {
  // Wall exhausted - it's a draw
  for (const c of this.getConnections()) {
    this.sendToConnection(c, {
      type: "GAME_OVER",
      winner: -1 as Seat, // -1 indicates draw
      scores: this.state.scores,
      breakdown: { fan: 0, items: [], basePoints: 0, totalPoints: 0 },
    });
  }
}
```

**Step 2: Handle draw in ResultsModal**

Add draw case:
```svelte
{#if winner === -1}
  <div class="draw-banner">
    流局 Draw - Wall Exhausted
  </div>
{:else}
  <!-- existing winner banner -->
{/if}
```

**Step 3: Commit**

```bash
git add party/index.ts src/components/ResultsModal.svelte
git commit -m "feat: handle draw on wall exhaustion"
```

---

## Task 14: Add Unit Tests for Win Flow

**Files:**
- Create: `src/game/win.test.ts`

**Step 1: Write tests**

Create `src/game/win.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { declareSelfDrawWin, declareDiscardWin } from './win';
import { hongKongRuleset } from './rulesets/hongkong';
import type { GameState, Seat, TileInstance, Meld } from './types';

function makeTile(suit: string, value: number, copy = 0): TileInstance {
  return {
    id: `${suit}-${value}-${copy}`,
    tile: { type: 'suited', suit: suit as any, value: value as any },
  };
}

function makeTiles(...specs: [string, number, number?][]): TileInstance[] {
  return specs.map(([suit, value, copy]) => makeTile(suit, value, copy ?? 0));
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    roomCode: 'TEST',
    rulesetId: 'hongkong',
    players: [
      { id: 'p0', name: 'P0', seat: 0 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: true },
      { id: 'p1', name: 'P1', seat: 1 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
      { id: 'p2', name: 'P2', seat: 2 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
      { id: 'p3', name: 'P3', seat: 3 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
    ],
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

describe('declareSelfDrawWin', () => {
  it('should process valid self-draw win', () => {
    const winningHand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], ['dots', 5, 1],
    );

    const state = makeGameState({
      players: [
        { id: 'p0', name: 'P0', seat: 0 as Seat, hand: winningHand, melds: [], bonusTiles: [], isDealer: true },
        { id: 'p1', name: 'P1', seat: 1 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p2', name: 'P2', seat: 2 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p3', name: 'P3', seat: 3 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
      ],
      currentTurn: 0,
      turnPhase: 'discarding',
    });

    const result = declareSelfDrawWin(state, 0 as Seat, hongKongRuleset);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.winner).toBe(0);
      expect(result.isSelfDrawn).toBe(true);
      expect(result.state.phase).toBe('finished');
      expect(result.breakdown.items.some(i => i.name.includes('Self-Draw'))).toBe(true);
    }
  });

  it('should reject non-winning hand', () => {
    const nonWinningHand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['bamboo', 3, 0],
    );

    const state = makeGameState({
      players: [
        { id: 'p0', name: 'P0', seat: 0 as Seat, hand: nonWinningHand, melds: [], bonusTiles: [], isDealer: true },
      ],
      currentTurn: 0,
      turnPhase: 'discarding',
    });

    const result = declareSelfDrawWin(state, 0 as Seat, hongKongRuleset);

    expect('error' in result).toBe(true);
  });
});

describe('declareDiscardWin', () => {
  it('should process valid discard win', () => {
    // Hand needs one tile to complete
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1],
      ['dots', 5, 0], ['dots', 5, 1],
    );
    const discard = makeTile('dots', 4, 2);

    const state = makeGameState({
      players: [
        { id: 'p0', name: 'P0', seat: 0 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: true },
        { id: 'p1', name: 'P1', seat: 1 as Seat, hand: hand, melds: [], bonusTiles: [], isDealer: false },
      ],
      turnPhase: 'waiting_for_calls',
      lastDiscard: { tile: discard, from: 0 as Seat },
    });

    const result = declareDiscardWin(state, 1 as Seat, hongKongRuleset);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.winner).toBe(1);
      expect(result.isSelfDrawn).toBe(false);
      expect(result.state.phase).toBe('finished');
    }
  });
});
```

**Step 2: Run tests**

Run: `npm run test:run -- src/game/win.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/game/win.test.ts
git commit -m "test: add unit tests for win flow"
```

---

## Task 15: Update PLAN.md

**Files:**
- Modify: `PLAN.md`

**Step 1: Update status**

Mark Slice 6 items as complete:

```markdown
### Slice 6: Win detection + scoring UI
- [x] Integrate win detection into game flow
- [x] Scoring display at end of round
- [x] Handle draws (exhausted wall)
- [x] Multi-round game tracking
```

Update Current Status section.

**Step 2: Commit**

```bash
git add PLAN.md
git commit -m "docs: update PLAN.md with Slice 6 completion"
```

---

## Task 16: Run Full Test Suite and Type Check

**Step 1: Run all tests**

Run: `npm run test:run`
Expected: All tests PASS

**Step 2: Run type check**

Run: `npm run check`
Expected: No errors

**Step 3: Fix any issues found**

**Step 4: Final commit if needed**

```bash
git add -A
git commit -m "fix: address test/type issues"
```

---

## Summary

This plan implements Slice 6 in 16 incremental tasks:

1. **Tasks 1-2**: Add win detection to call system
2. **Task 3**: Score transfer calculation
3. **Tasks 4-6**: Self-draw win and DECLARE_WIN handler
4. **Tasks 7-8**: UI buttons for win declaration
5. **Tasks 9-10**: ResultsModal component
6. **Task 11**: Next round handling
7. **Task 12**: Bot win behavior
8. **Task 13**: Draw handling
9. **Tasks 14-16**: Testing and documentation

Each task is a single commit, following TDD where applicable.
