# Bot Players Design

## Goal

Add server-side bot players that auto-fill empty seats on game start, make random valid moves, and can be replaced ("bumped") by human players joining mid-game.

## Architecture

Bot logic runs entirely server-side in PartyKit. A `BotPlayer` class encapsulates decision-making for each bot seat. Bots observe game state and respond with valid actions after configurable delays. When a human joins an occupied bot seat, the bot is removed and the human takes over.

## Tech Stack

- PartyKit server (party/index.ts)
- Existing game engine (src/game/engine.ts)
- New BotPlayer class (party/bot.ts)

---

## Components

### BotPlayer Class

```typescript
// party/bot.ts
export class BotPlayer {
  seat: Seat;
  name: string;
  thinkingDelay: { min: number; max: number };

  constructor(seat: Seat, options?: { thinkingDelay?: { min: number; max: number } });

  // Decide what to do given current game state
  decideAction(state: GameState): BotAction | null;

  // Get random delay within configured range
  getThinkingDelay(): number;
}

type BotAction =
  | { type: 'discard'; tileId: string }
  | { type: 'call'; callType: CallType; tileIds: string[] }
  | { type: 'pass' };
```

### Decision Logic

1. **During discard phase** (bot's turn): Pick a random tile from hand to discard
2. **During call window** (bot has available calls): 50% chance to make the highest-priority call, 50% chance to pass
3. **Otherwise**: No action needed

### Server Integration

```typescript
// party/index.ts additions
class MahjongServer {
  bots: Map<Seat, BotPlayer> = new Map();
  botTimeouts: Map<Seat, ReturnType<typeof setTimeout>> = new Map();

  // Called when game starts
  fillEmptySeatsWithBots() {
    for (const seat of [0, 1, 2, 3] as Seat[]) {
      if (!this.gameState.players[seat]) {
        const bot = new BotPlayer(seat);
        this.bots.set(seat, bot);
        this.gameState = joinGame(this.gameState, bot.name, seat);
      }
    }
  }

  // Called after state changes to trigger bot actions
  scheduleBotActions() {
    for (const [seat, bot] of this.bots) {
      const action = bot.decideAction(this.gameState);
      if (action) {
        const delay = bot.getThinkingDelay();
        const timeout = setTimeout(() => this.executeBotAction(seat, action), delay);
        this.botTimeouts.set(seat, timeout);
      }
    }
  }

  // Execute a bot's decided action
  executeBotAction(seat: Seat, action: BotAction) {
    // Apply action to game state, broadcast updates
  }

  // Called when human takes a bot's seat
  bumpBot(seat: Seat) {
    const timeout = this.botTimeouts.get(seat);
    if (timeout) clearTimeout(timeout);
    this.botTimeouts.delete(seat);
    this.bots.delete(seat);
    // Human player state already updated by JOIN handler
  }
}
```

### Human Bumping Flow

1. Human sends JOIN message with seat number
2. Server checks if seat has a bot
3. If bot exists: cancel pending bot timeout, remove bot from bots map
4. Process JOIN as normal (human takes seat)
5. Broadcast updated player list

---

## Data Flow

```
Game Start:
  Host clicks "Start Game"
  → fillEmptySeatsWithBots() adds bots to empty seats
  → dealTiles() distributes hands
  → scheduleBotActions() queues first bot action if needed

Bot Turn:
  currentTurn === bot seat && turnPhase === "discarding"
  → bot.decideAction() returns { type: 'discard', tileId }
  → after delay, executeBotAction() calls discardTile()
  → scheduleBotActions() checks if next action needed

Call Window:
  turnPhase === "waiting_for_calls" && bot in awaitingCallFrom
  → bot.decideAction() returns call or pass
  → after delay, executeBotAction() registers call/pass
  → resolveCallWindow() when all players respond

Human Bumps Bot:
  Human sends { type: "JOIN", seat: 2 }
  → bumpBot(2) cancels bot timeout, removes from map
  → Normal JOIN processing
  → Broadcast updated state
```

---

## Bot Names

Bots use themed names to be clearly identifiable:
- Bot East, Bot South, Bot West, Bot North (matching wind position)

---

## Configuration

Default thinking delay: 500-1500ms (feels natural, not instant)

Future: Could add difficulty levels that affect:
- Call probability (easy = rarely calls, hard = optimal calls)
- Discard strategy (easy = random, hard = avoid dangerous tiles)

---

## Testing

1. Unit tests for BotPlayer.decideAction() with various game states
2. Integration test: start game with 1 human, verify 3 bots fill in
3. Integration test: bot makes discard when it's their turn
4. Integration test: bot responds to call windows
5. Integration test: human bumps bot mid-game

---

## Acceptance Criteria

- [x] Design approved
- [ ] Empty seats auto-fill with bots on game start
- [ ] Bots discard random tiles on their turn
- [ ] Bots respond to call windows (random call or pass)
- [ ] Human can join and replace a bot mid-game
- [ ] Bot actions have natural-feeling delays
- [ ] Bot names clearly identify them as bots
