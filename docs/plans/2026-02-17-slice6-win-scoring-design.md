# Slice 6: Win Detection & Scoring UI Design

## Overview

Integrate win detection into the game flow, display scoring at round end, handle draws, and support multi-round game tracking.

## Requirements

- **Multi-round play**: Scores accumulate across hands, dealer rotates
- **Win on self-draw or discard**: Standard Hong Kong rules
- **Modal overlay for results**: Show winner's hand, scoring breakdown, "Next Round" button
- **Winner takes from all**: Simple point transfer system

## Architecture

### 1. Win Detection in Call Window

When a discard happens, check if any player can win on that tile. Win has highest priority.

**Changes to `calls.ts`:**
- `getAvailableCallsForPlayer()` already returns `'win'` type - verify it works
- Add win check using `ruleset.isWinningHand()` with the discarded tile added to hand

**Priority order:** win > gang > peng > chi

### 2. Self-Draw Win Check

After drawing a tile, if the player's hand is a winning hand, offer the "Hu" option.

**Changes to `engine.ts`:**
- Add `canDeclareWin()` function to check if current player can win
- Return this in `ClientGameState` so UI can show the button

**Changes to `types.ts`:**
- Add `canWin: boolean` to `ClientGameState`

### 3. Server Action Handlers

**New handler in `party/index.ts`:**
- `DECLARE_WIN` action - validates win, calculates score, ends hand

**Win validation:**
1. Check it's the player's turn (self-draw) OR they're in call window with win available
2. Verify hand + winning tile forms valid winning hand via ruleset
3. Build `WinContext` with all relevant flags
4. Calculate score via `ruleset.scoreHand()`

### 4. Score Transfer Logic

**On discard win:**
- Discarder pays 2x base points
- Other two players pay 1x base points each
- Winner receives total (4x base points)

**On self-draw (zimo):**
- All three opponents pay 1x base points each
- Winner receives 3x base points

**Implementation in new `src/game/scoring.ts`:**
```typescript
function calculateScoreTransfer(
  winner: Seat,
  breakdown: ScoreBreakdown,
  isSelfDrawn: boolean,
  discarder?: Seat
): Record<Seat, number>
```

### 5. Round Management

**After a hand ends (win or draw):**
1. Set `turnPhase: 'game_over'`
2. Broadcast `GAME_OVER` message with winner, scores, breakdown
3. Update cumulative scores in `GameState.scores`

**Starting next round:**
- New `START_NEXT_ROUND` action
- Dealer rotation logic:
  - If dealer wins: dealer stays, increment `handNumber`
  - If non-dealer wins or draw: rotate dealer, reset `handNumber`, possibly increment `roundNumber`
- Re-deal tiles, reset discard piles

**Game completion:**
- After 4 full rounds (East/South/West/North) = 16 hands minimum
- Or when a player reaches a target score (optional, skip for MVP)

### 6. UI Components

**New `ResultsModal.svelte`:**
- Overlay with semi-transparent backdrop
- Winner's name and seat wind
- Winning hand displayed (all tiles revealed)
- Exposed melds shown
- Scoring breakdown table:
  - Item name (e.g., "Self-Draw (自摸)")
  - Fan value
- Total fan and points
- Score changes for each player (+/- points)
- "Next Round" button (only shown to players, not spectators)

**Changes to `GameView.svelte`:**
- Show "Hu" (胡) button when `canWin` is true during discarding phase
- Import and conditionally render `ResultsModal`
- Handle `GAME_OVER` server message

**Changes to `CallPrompt.svelte`:**
- Add "Hu" option when win is available in call window

### 7. Bot Updates

**Changes to `party/bot.ts`:**
- Bots should declare win when available (100% of the time, unlike 50% for other calls)
- Check for self-draw win after drawing

## Data Flow

```
Player discards
    ↓
Check for available calls (including win)
    ↓
If win available → add to pendingCalls with highest priority
    ↓
Player declares win (or bot auto-wins)
    ↓
Server validates win
    ↓
Calculate score via ruleset.scoreHand()
    ↓
Calculate score transfers
    ↓
Update GameState.scores
    ↓
Set turnPhase: 'game_over'
    ↓
Broadcast GAME_OVER message
    ↓
UI shows ResultsModal
    ↓
Player clicks "Next Round"
    ↓
Server re-deals, rotates dealer if needed
    ↓
Game continues
```

## Files to Modify

1. `src/game/types.ts` - Add `canWin` to ClientGameState, `START_NEXT_ROUND` action
2. `src/game/calls.ts` - Ensure win detection works in call window
3. `src/game/engine.ts` - Add `canDeclareWin()`, update `getClientState()`
4. `src/game/scoring.ts` - New file for score transfer logic
5. `party/index.ts` - Add `DECLARE_WIN` and `START_NEXT_ROUND` handlers
6. `party/bot.ts` - Update bot to declare wins
7. `src/components/ResultsModal.svelte` - New component
8. `src/components/CallPrompt.svelte` - Add win option
9. `src/views/GameView.svelte` - Add Hu button, render ResultsModal
10. `src/App.svelte` - Handle GAME_OVER message

## Testing Strategy

**Unit tests:**
- Score transfer calculation (discard win vs self-draw)
- Dealer rotation logic
- Win detection with various hand configurations

**Manual/Playwright tests:**
- Complete a hand by winning on discard
- Complete a hand by self-draw win
- Verify scoring modal displays correctly
- Test "Next Round" flow
- Test draw (wall exhaustion) flow
- Verify bot wins when possible
