# Codebase Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the mahjong codebase into modular, readable files without changing functionality.

**Architecture:** Split server into handlers/bot/broadcast modules, extract shared CSS to stylesheets, extract drag-drop logic to utility. Each phase independently verifiable.

**Tech Stack:** TypeScript, Svelte 5, PartyKit, CSS

---

## Phase 1: Server Modularization

### Task 1: Create broadcast.ts

**Files:**
- Create: `party/broadcast.ts`
- Modify: `party/index.ts`

**Step 1: Create broadcast module with types**

```typescript
// party/broadcast.ts
import type { Connection } from "partyserver";
import type { GameState, ServerMessage, Seat } from "../src/game/types";
import { getClientState, getTableState } from "../src/game/engine";

export interface BroadcastContext {
  getConnections: () => Iterable<Connection>;
  tableConnections: Set<string>;
}

export function sendToConnection(conn: Connection, message: ServerMessage): void {
  conn.send(JSON.stringify(message));
}

export function sendError(conn: Connection, message: string): void {
  sendToConnection(conn, { type: "ERROR", message });
}

export function broadcastRoomInfo(ctx: BroadcastContext, state: GameState): void {
  const message: ServerMessage = {
    type: "ROOM_INFO",
    roomCode: state.roomCode,
    players: state.players.map(p => ({ name: p.name, seat: p.seat })),
  };

  for (const conn of ctx.getConnections()) {
    sendToConnection(conn, message);
  }
}

export function broadcastGameState(ctx: BroadcastContext, state: GameState): void {
  for (const conn of ctx.getConnections()) {
    sendStateToConnection(ctx, conn, state);
  }
}

export function sendStateToConnection(
  ctx: BroadcastContext,
  conn: Connection,
  state: GameState
): void {
  const isTableConnection = ctx.tableConnections.has(conn.id);

  if (isTableConnection) {
    const tableState = getTableState(state);
    sendToConnection(conn, {
      type: "STATE_UPDATE",
      state: {
        ...tableState,
        mySeat: 0 as Seat,
        myHand: [],
        myMelds: [],
        myBonusTiles: [],
      },
    });
  } else {
    const clientState = getClientState(state, conn.id);

    if (clientState) {
      sendToConnection(conn, {
        type: "STATE_UPDATE",
        state: clientState,
      });
    } else {
      const tableState = getTableState(state);
      sendToConnection(conn, {
        type: "STATE_UPDATE",
        state: {
          ...tableState,
          mySeat: 0 as Seat,
          myHand: [],
          myMelds: [],
          myBonusTiles: [],
        },
      });
    }
  }
}

export function broadcastGameOver(
  ctx: BroadcastContext,
  state: GameState,
  winner: Seat | -1,
  breakdown: import("../src/game/types").ScoreBreakdown,
  isSelfDrawn: boolean
): void {
  const winnerPlayer = winner >= 0 ? state.players.find(p => p.seat === winner) : undefined;

  for (const c of ctx.getConnections()) {
    sendToConnection(c, {
      type: "GAME_OVER",
      winner,
      scores: state.scores,
      breakdown,
      winnerName: winnerPlayer?.name ?? '',
      winningHand: winnerPlayer?.hand ?? [],
      winningMelds: winnerPlayer?.melds ?? [],
      isSelfDrawn,
    });
  }
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit party/broadcast.ts`
Expected: No errors (or import resolution issues we'll fix next)

**Step 3: Commit**

```bash
git add party/broadcast.ts
git commit -m "refactor: extract broadcast functions to party/broadcast.ts"
```

---

### Task 2: Create bot/manager.ts

**Files:**
- Create: `party/bot/manager.ts`
- Keep: `party/bot.ts` (rename later)

**Step 1: Create bot manager module**

```typescript
// party/bot/manager.ts
import type { GameState, Seat } from "../../src/game/types";
import { addPlayer, removePlayer } from "../../src/game/engine";
import { BotPlayer, type BotAction } from "./bot";

export interface BotManager {
  bots: Map<Seat, BotPlayer>;
  pendingBotAction?: { seat: Seat; scheduledAt: number };
}

export function createBotManager(): BotManager {
  return {
    bots: new Map(),
    pendingBotAction: undefined,
  };
}

export function fillEmptySeatsWithBots(
  manager: BotManager,
  state: GameState
): GameState {
  const occupiedSeats = new Set(state.players.map(p => p.seat));

  for (const seat of [0, 1, 2, 3] as Seat[]) {
    if (!occupiedSeats.has(seat)) {
      const bot = new BotPlayer(seat);
      manager.bots.set(seat, bot);

      const result = addPlayer(state, `bot-${seat}`, bot.name, seat);
      if (!("error" in result)) {
        state = result;
      }
    }
  }

  return state;
}

export function bumpBot(manager: BotManager, seat: Seat): void {
  if (manager.pendingBotAction?.seat === seat) {
    manager.pendingBotAction = undefined;
  }
  manager.bots.delete(seat);
}

export function clearAllBots(manager: BotManager): void {
  manager.pendingBotAction = undefined;
  manager.bots.clear();
}

export function removeBotPlayer(
  manager: BotManager,
  state: GameState,
  seat: Seat
): GameState {
  const botId = `bot-${seat}`;
  return removePlayer(state, botId);
}

export function getBotNeedingAction(
  manager: BotManager,
  state: GameState
): { seat: Seat; bot: BotPlayer; action: BotAction } | null {
  if (state.phase !== 'playing') return null;

  for (const [seat, bot] of manager.bots) {
    const needsToAct =
      (state.currentTurn === seat && state.turnPhase === 'discarding') ||
      (state.turnPhase === 'waiting_for_calls' && state.awaitingCallFrom.includes(seat));

    if (needsToAct) {
      const action = bot.decideAction(state);
      if (action) {
        return { seat, bot, action };
      }
    }
  }

  return null;
}
```

**Step 2: Move bot.ts to bot/bot.ts**

```bash
mkdir -p party/bot
mv party/bot.ts party/bot/bot.ts
```

**Step 3: Update bot.ts import path** (if needed - check for relative imports)

**Step 4: Commit**

```bash
git add party/bot/
git commit -m "refactor: create bot/manager.ts and move bot.ts to bot/"
```

---

### Task 3: Create handlers/lobby.ts

**Files:**
- Create: `party/handlers/lobby.ts`

**Step 1: Create lobby handlers**

```typescript
// party/handlers/lobby.ts
import type { Connection } from "partyserver";
import type { GameState, Seat } from "../../src/game/types";
import { addPlayer, startGame, drawTile } from "../../src/game/engine";
import { getRuleset } from "../../src/game/rulesets";
import type { BotManager } from "../bot/manager";
import { fillEmptySeatsWithBots, bumpBot, removeBotPlayer } from "../bot/manager";

export interface LobbyContext {
  botManager: BotManager;
}

export type LobbyResult =
  | { state: GameState; shouldBroadcastRoom?: boolean; shouldBroadcastGame?: boolean }
  | { error: string };

export function handleJoin(
  ctx: LobbyContext,
  state: GameState,
  connId: string,
  name: string,
  seat: Seat
): LobbyResult {
  // Check if a bot occupies this seat
  if (ctx.botManager.bots.has(seat)) {
    state = removeBotPlayer(ctx.botManager, state, seat);
    bumpBot(ctx.botManager, seat);
  }

  const result = addPlayer(state, connId, name, seat);

  if ("error" in result) {
    return { error: result.error };
  }

  return {
    state: result,
    shouldBroadcastRoom: true,
    shouldBroadcastGame: state.phase === 'playing'
  };
}

export function handleRejoin(
  state: GameState,
  connId: string,
  name: string,
  seat: Seat
): LobbyResult {
  if (state.phase === "waiting") {
    return { error: "Cannot rejoin during lobby - please take a seat normally" };
  }

  const seatPlayer = state.players.find(p => p.seat === seat);

  if (!seatPlayer) {
    return { error: "No player at that seat" };
  }

  if (seatPlayer.name !== name) {
    return { error: "Name does not match seat" };
  }

  // Update the player's connection ID
  seatPlayer.id = connId;

  return { state, shouldBroadcastGame: true };
}

export function handleStartGame(
  ctx: LobbyContext,
  state: GameState,
  connId: string
): LobbyResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You must join the game first" };
  }

  // Fill empty seats with bots
  state = fillEmptySeatsWithBots(ctx.botManager, state);

  const ruleset = getRuleset(state.rulesetId);
  const result = startGame(state, ruleset);

  if ("error" in result) {
    return { error: result.error };
  }

  state = result;

  // Dealer draws first tile
  const drawResult = drawTile(state, ruleset);
  if (!("error" in drawResult)) {
    state = drawResult;
  }

  return { state, shouldBroadcastGame: true };
}
```

**Step 2: Commit**

```bash
mkdir -p party/handlers
git add party/handlers/lobby.ts
git commit -m "refactor: create handlers/lobby.ts with join/rejoin/start handlers"
```

---

### Task 4: Create handlers/gameplay.ts

**Files:**
- Create: `party/handlers/gameplay.ts`

**Step 1: Create gameplay handlers**

```typescript
// party/handlers/gameplay.ts
import type { GameState, Seat, ScoreBreakdown } from "../../src/game/types";
import { discardTile, drawTile, logAction } from "../../src/game/engine";
import { registerCall, resolveCallWindow } from "../../src/game/calls";
import { getRuleset } from "../../src/game/rulesets";
import { declareSelfDrawWin, declareDiscardWin } from "../../src/game/win";

export type GameplayResult =
  | {
      state: GameState;
      gameOver?: {
        winner: Seat;
        breakdown: ScoreBreakdown;
        isSelfDrawn: boolean;
      };
      isDraw?: boolean;
    }
  | { error: string };

export function handleDiscard(
  state: GameState,
  connId: string,
  tileId: string
): GameplayResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You are not in this game" };
  }

  const discardedTile = player.hand.find(t => t.id === tileId);
  const ruleset = getRuleset(state.rulesetId);
  const result = discardTile(state, player.seat, tileId, ruleset);

  if ("error" in result) {
    return { error: result.error };
  }

  state = result;

  if (discardedTile) {
    state = logAction(state, 'discard', player.seat, discardedTile);
  }

  if (state.turnPhase === "drawing") {
    const drawResult = drawTile(state, ruleset);
    if (!("error" in drawResult)) {
      state = drawResult;
    }
  }

  const isDraw = checkForDraw(state);
  return { state, isDraw };
}

export function handleCall(
  state: GameState,
  connId: string,
  callType: "chi" | "peng" | "gang" | "pass" | "win",
  tileIds: string[]
): GameplayResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You are not in this game" };
  }

  if (state.turnPhase !== "waiting_for_calls") {
    return { error: "Not waiting for calls" };
  }

  if (!state.awaitingCallFrom.includes(player.seat)) {
    return { error: "Not expecting a call from you" };
  }

  const ruleset = getRuleset(state.rulesetId);

  // Handle win call specially
  if (callType === 'win') {
    state = registerCall(state, player.seat, 'win', []);
    const resolved = resolveCallWindow(state, ruleset);

    if (resolved.pendingCalls.length > 0 && resolved.pendingCalls[0].callType === 'win') {
      const result = declareDiscardWin(state, resolved.pendingCalls[0].seat, ruleset);
      if (!("error" in result)) {
        return {
          state: result.state,
          gameOver: {
            winner: result.winner,
            breakdown: result.breakdown,
            isSelfDrawn: result.isSelfDrawn,
          }
        };
      }
    }

    return { state: resolved };
  }

  // Register non-win call
  state = registerCall(state, player.seat, callType, tileIds);
  const resolved = resolveCallWindow(state, ruleset);

  if (resolved !== state) {
    state = resolved;

    if (state.turnPhase === "replacing" || state.turnPhase === "drawing") {
      const drawResult = drawTile(state, ruleset);
      if (!("error" in drawResult)) {
        state = drawResult;
      }
    }
  }

  const isDraw = checkForDraw(state);
  return { state, isDraw };
}

export function handleDeclareWin(
  state: GameState,
  connId: string
): GameplayResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You are not in this game" };
  }

  const ruleset = getRuleset(state.rulesetId);

  let result;
  if (state.turnPhase === 'discarding' && state.currentTurn === player.seat) {
    result = declareSelfDrawWin(state, player.seat, ruleset);
  } else if (state.turnPhase === 'waiting_for_calls') {
    result = declareDiscardWin(state, player.seat, ruleset);
  } else {
    return { error: "Cannot declare win now" };
  }

  if ("error" in result) {
    return { error: result.error };
  }

  return {
    state: result.state,
    gameOver: {
      winner: result.winner,
      breakdown: result.breakdown,
      isSelfDrawn: result.isSelfDrawn,
    }
  };
}

function checkForDraw(state: GameState): boolean {
  return state.phase === 'finished' &&
         state.turnPhase === 'game_over';
}
```

**Step 2: Commit**

```bash
git add party/handlers/gameplay.ts
git commit -m "refactor: create handlers/gameplay.ts with discard/call/win handlers"
```

---

### Task 5: Create handlers/rounds.ts

**Files:**
- Create: `party/handlers/rounds.ts`

**Step 1: Create rounds handler**

```typescript
// party/handlers/rounds.ts
import type { GameState, Seat } from "../../src/game/types";
import { startNextRound, drawTile } from "../../src/game/engine";
import { getRuleset } from "../../src/game/rulesets";

export type RoundsResult =
  | { state: GameState }
  | { error: string };

export function handleStartNextRound(
  state: GameState,
  connId: string,
  lastWinner?: Seat
): RoundsResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You are not in this game" };
  }

  if (state.phase !== 'finished') {
    return { error: "Game not finished" };
  }

  const ruleset = getRuleset(state.rulesetId);
  const result = startNextRound(state, ruleset, lastWinner);

  if ("error" in result) {
    return { error: result.error };
  }

  state = result;

  // Dealer draws first tile
  const drawResult = drawTile(state, ruleset);
  if (!("error" in drawResult)) {
    state = drawResult;
  }

  return { state };
}
```

**Step 2: Commit**

```bash
git add party/handlers/rounds.ts
git commit -m "refactor: create handlers/rounds.ts with next round handler"
```

---

### Task 6: Create bot/actions.ts

**Files:**
- Create: `party/bot/actions.ts`

**Step 1: Create bot actions module**

```typescript
// party/bot/actions.ts
import type { GameState, Seat, ScoreBreakdown } from "../../src/game/types";
import { discardTile, drawTile, logAction } from "../../src/game/engine";
import { registerCall, resolveCallWindow } from "../../src/game/calls";
import { getRuleset } from "../../src/game/rulesets";
import { declareSelfDrawWin, declareDiscardWin } from "../../src/game/win";
import type { BotManager } from "./manager";

export type BotActionResult =
  | {
      state: GameState;
      gameOver?: {
        winner: Seat;
        breakdown: ScoreBreakdown;
        isSelfDrawn: boolean;
      };
      isDraw?: boolean;
    }
  | { error: string };

export function handleBotDiscard(
  manager: BotManager,
  state: GameState,
  seat: Seat,
  tileId: string
): BotActionResult {
  if (!manager.bots.has(seat)) {
    return { error: "Bot not found" };
  }

  const botPlayer = state.players.find(p => p.seat === seat);
  const discardedTile = botPlayer?.hand.find(t => t.id === tileId);

  const ruleset = getRuleset(state.rulesetId);
  const result = discardTile(state, seat, tileId, ruleset);

  if ("error" in result) {
    return { error: result.error };
  }

  state = result;

  if (discardedTile) {
    state = logAction(state, 'discard', seat, discardedTile);
  }

  if (state.turnPhase === "drawing") {
    const drawResult = drawTile(state, ruleset);
    if (!("error" in drawResult)) {
      state = drawResult;
    }
  }

  const isDraw = state.phase === 'finished' && state.turnPhase === 'game_over';
  return { state, isDraw };
}

export function handleBotCall(
  manager: BotManager,
  state: GameState,
  seat: Seat,
  callType: 'chi' | 'peng' | 'gang',
  tileIds: string[]
): BotActionResult {
  if (!manager.bots.has(seat)) {
    return { error: "Bot not found" };
  }

  if (state.turnPhase !== "waiting_for_calls") {
    return { error: "Not waiting for calls" };
  }

  if (!state.awaitingCallFrom.includes(seat)) {
    return { error: "Not expecting call from bot" };
  }

  const calledTile = state.lastDiscard?.tile;
  const fromSeat = state.lastDiscard?.from;

  state = registerCall(state, seat, callType, tileIds);

  const ruleset = getRuleset(state.rulesetId);
  const resolved = resolveCallWindow(state, ruleset);

  if (resolved !== state) {
    state = resolved;

    if (state.currentTurn === seat && calledTile) {
      state = logAction(state, callType, seat, calledTile, fromSeat);
    }

    if (state.turnPhase === "replacing" || state.turnPhase === "drawing") {
      const drawResult = drawTile(state, ruleset);
      if (!("error" in drawResult)) {
        state = drawResult;
      }
    }
  }

  const isDraw = state.phase === 'finished' && state.turnPhase === 'game_over';
  return { state, isDraw };
}

export function handleBotPass(
  manager: BotManager,
  state: GameState,
  seat: Seat
): BotActionResult {
  if (!manager.bots.has(seat)) {
    return { error: "Bot not found" };
  }

  if (state.turnPhase !== "waiting_for_calls") {
    return { error: "Not waiting for calls" };
  }

  if (!state.awaitingCallFrom.includes(seat)) {
    return { error: "Not expecting call from bot" };
  }

  state = registerCall(state, seat, 'pass', []);

  const ruleset = getRuleset(state.rulesetId);
  const resolved = resolveCallWindow(state, ruleset);

  if (resolved !== state) {
    state = resolved;

    if (state.turnPhase === "drawing") {
      const drawResult = drawTile(state, ruleset);
      if (!("error" in drawResult)) {
        state = drawResult;
      }
    }
  }

  const isDraw = state.phase === 'finished' && state.turnPhase === 'game_over';
  return { state, isDraw };
}

export function handleBotWin(
  manager: BotManager,
  state: GameState,
  seat: Seat
): BotActionResult {
  if (!manager.bots.has(seat)) {
    return { error: "Bot not found" };
  }

  const ruleset = getRuleset(state.rulesetId);

  let result;
  if (state.turnPhase === 'discarding' && state.currentTurn === seat) {
    result = declareSelfDrawWin(state, seat, ruleset);
  } else if (state.turnPhase === 'waiting_for_calls') {
    result = declareDiscardWin(state, seat, ruleset);
  } else {
    return { error: "Invalid win timing" };
  }

  if ("error" in result) {
    return { error: result.error };
  }

  return {
    state: result.state,
    gameOver: {
      winner: result.winner,
      breakdown: result.breakdown,
      isSelfDrawn: result.isSelfDrawn,
    }
  };
}
```

**Step 2: Commit**

```bash
git add party/bot/actions.ts
git commit -m "refactor: create bot/actions.ts with bot action handlers"
```

---

### Task 7: Refactor party/index.ts to use modules

**Files:**
- Modify: `party/index.ts`

**Step 1: Update imports and use new modules**

Replace the entire file with the refactored version that uses the new modules. The file should be under 200 lines now.

```typescript
// party/index.ts
import { routePartykitRequest, Server } from "partyserver";
import type { Connection, ConnectionContext } from "partyserver";
import type { GameState, ClientAction, Seat } from "../src/game/types";
import { createInitialState, removePlayer, generateRoomCode } from "../src/game/engine";

// Import modules
import {
  sendToConnection,
  sendError,
  broadcastRoomInfo,
  broadcastGameState,
  sendStateToConnection,
  broadcastGameOver,
  type BroadcastContext,
} from "./broadcast";
import {
  createBotManager,
  getBotNeedingAction,
  type BotManager,
} from "./bot/manager";
import {
  handleBotDiscard,
  handleBotCall,
  handleBotPass,
  handleBotWin,
} from "./bot/actions";
import {
  handleJoin,
  handleRejoin,
  handleStartGame,
} from "./handlers/lobby";
import {
  handleDiscard,
  handleCall,
  handleDeclareWin,
} from "./handlers/gameplay";
import { handleStartNextRound } from "./handlers/rounds";

export class MahjongRoom extends Server {
  state!: GameState;
  botManager: BotManager = createBotManager();
  lastWinner?: Seat;
  tableConnections: Set<string> = new Set();

  private get broadcastCtx(): BroadcastContext {
    return {
      getConnections: () => this.getConnections(),
      tableConnections: this.tableConnections,
    };
  }

  onStart() {
    const roomCode = this.name.length === 4 ? this.name : generateRoomCode();
    this.state = createInitialState(roomCode, "hongkong");
    console.log(`[${this.state.roomCode}] Room started`);
  }

  onConnect(conn: Connection, ctx: ConnectionContext) {
    const url = new URL(ctx.request.url);
    const mode = url.searchParams.get("mode");

    if (mode === "table") {
      this.tableConnections.add(conn.id);
    }

    sendToConnection(conn, {
      type: "ROOM_INFO",
      roomCode: this.state.roomCode,
      players: this.state.players.map(p => ({ name: p.name, seat: p.seat })),
    });

    if (this.state.phase === "playing") {
      sendStateToConnection(this.broadcastCtx, conn, this.state);
    }
  }

  onClose(conn: Connection) {
    console.log(`[${this.state.roomCode}] Disconnected: ${conn.id}`);
    this.tableConnections.delete(conn.id);

    if (this.state.phase === "waiting") {
      this.state = removePlayer(this.state, conn.id);
      broadcastRoomInfo(this.broadcastCtx, this.state);
    }
  }

  onMessage(sender: Connection, message: string | ArrayBuffer) {
    let action: ClientAction;
    try {
      action = JSON.parse(message as string);
    } catch {
      sendError(sender, "Invalid message format");
      return;
    }

    console.log(`[${this.state.roomCode}] Action from ${sender.id}:`, action.type);
    this.handleAction(sender, action);
  }

  private async handleAction(sender: Connection, action: ClientAction) {
    const lobbyCtx = { botManager: this.botManager };

    switch (action.type) {
      case "JOIN": {
        const result = handleJoin(lobbyCtx, this.state, sender.id, action.name, action.seat);
        if ("error" in result) { sendError(sender, result.error); return; }
        this.state = result.state;
        if (result.shouldBroadcastRoom) broadcastRoomInfo(this.broadcastCtx, this.state);
        if (result.shouldBroadcastGame) broadcastGameState(this.broadcastCtx, this.state);
        await this.scheduleBotActions();
        break;
      }
      case "REJOIN": {
        const result = handleRejoin(this.state, sender.id, action.name, action.seat);
        if ("error" in result) { sendError(sender, result.error); return; }
        this.state = result.state;
        if (result.shouldBroadcastGame) broadcastGameState(this.broadcastCtx, this.state);
        break;
      }
      case "START_GAME": {
        const result = handleStartGame(lobbyCtx, this.state, sender.id);
        if ("error" in result) { sendError(sender, result.error); return; }
        this.state = result.state;
        broadcastGameState(this.broadcastCtx, this.state);
        await this.scheduleBotActions();
        break;
      }
      case "DISCARD": {
        const result = handleDiscard(this.state, sender.id, action.tileId);
        if ("error" in result) { sendError(sender, result.error); return; }
        this.state = result.state;
        broadcastGameState(this.broadcastCtx, this.state);
        if (result.isDraw) { this.broadcastDraw(); return; }
        await this.scheduleBotActions();
        break;
      }
      case "CALL_CHI":
      case "CALL_PENG":
      case "CALL_GANG":
      case "PASS": {
        const callType = action.type === "PASS" ? "pass" : action.type.replace("CALL_", "").toLowerCase() as any;
        const tileIds = action.type === "PASS" ? [] : (action as any).tileIds;
        const result = handleCall(this.state, sender.id, callType, tileIds);
        if ("error" in result) { sendError(sender, result.error); return; }
        this.state = result.state;
        if (result.gameOver) {
          this.lastWinner = result.gameOver.winner;
          broadcastGameOver(this.broadcastCtx, this.state, result.gameOver.winner, result.gameOver.breakdown, result.gameOver.isSelfDrawn);
        }
        broadcastGameState(this.broadcastCtx, this.state);
        if (result.isDraw) { this.broadcastDraw(); return; }
        await this.scheduleBotActions();
        break;
      }
      case "DECLARE_WIN": {
        const result = handleDeclareWin(this.state, sender.id);
        if ("error" in result) { sendError(sender, result.error); return; }
        this.state = result.state;
        if (result.gameOver) {
          this.lastWinner = result.gameOver.winner;
          broadcastGameOver(this.broadcastCtx, this.state, result.gameOver.winner, result.gameOver.breakdown, result.gameOver.isSelfDrawn);
        }
        broadcastGameState(this.broadcastCtx, this.state);
        break;
      }
      case "START_NEXT_ROUND": {
        const result = handleStartNextRound(this.state, sender.id, this.lastWinner);
        if ("error" in result) { sendError(sender, result.error); return; }
        this.state = result.state;
        this.lastWinner = undefined;
        broadcastGameState(this.broadcastCtx, this.state);
        await this.scheduleBotActions();
        break;
      }
      default:
        sendError(sender, `Unknown action: ${(action as any).type}`);
    }
  }

  private async scheduleBotActions() {
    const botAction = getBotNeedingAction(this.botManager, this.state);
    if (!botAction) return;

    const { seat, action } = botAction;
    let result;

    switch (action.type) {
      case 'discard':
        result = handleBotDiscard(this.botManager, this.state, seat, action.tileId);
        break;
      case 'call':
        result = handleBotCall(this.botManager, this.state, seat, action.callType, action.tileIds);
        break;
      case 'pass':
        result = handleBotPass(this.botManager, this.state, seat);
        break;
      case 'win':
        result = handleBotWin(this.botManager, this.state, seat);
        break;
    }

    if (!result || "error" in result) return;

    this.state = result.state;

    if (result.gameOver) {
      this.lastWinner = result.gameOver.winner;
      broadcastGameOver(this.broadcastCtx, this.state, result.gameOver.winner, result.gameOver.breakdown, result.gameOver.isSelfDrawn);
    }

    broadcastGameState(this.broadcastCtx, this.state);

    if (result.isDraw) {
      this.broadcastDraw();
      return;
    }

    await this.scheduleBotActions();
  }

  private broadcastDraw() {
    broadcastGameOver(this.broadcastCtx, this.state, -1, { fan: 0, items: [], basePoints: 0, totalPoints: 0 }, false);
  }
}

interface Env {
  MahjongRoom: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
```

**Step 2: Run type check**

Run: `npm run check`
Expected: PASS

**Step 3: Test locally**

Run: `npm run dev:all`
Expected: App starts, can create room, join, play game with bots

**Step 4: Commit**

```bash
git add party/index.ts
git commit -m "refactor: slim down party/index.ts to use handler modules"
```

---

## Phase 2: CSS Extraction

### Task 8: Create src/styles/tiles.css

**Files:**
- Create: `src/styles/tiles.css`

**Step 1: Extract tile styling patterns**

```css
/* src/styles/tiles.css */

/* Base tile wrapper - used for displayed tiles */
.tile-base {
  padding: clamp(0.15rem, 0.5vw, 0.25rem);
  border: 2px solid var(--tile-border);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

/* Tile image sizing */
.tile-img-sm {
  width: clamp(1.2rem, 4vw, 1.6rem);
  height: clamp(1.7rem, 5.5vw, 2.2rem);
  object-fit: contain;
  display: block;
}

.tile-img-md {
  width: clamp(1.4rem, 5vw, 2rem);
  height: clamp(2rem, 7vw, 2.8rem);
  object-fit: contain;
  display: block;
}

.tile-img-lg {
  width: clamp(2rem, 8vw, 2.8rem);
  height: clamp(2.8rem, 11vw, 4rem);
  object-fit: contain;
  display: block;
}

/* Meld tile container */
.meld-tile-container {
  display: flex;
  gap: 2px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: var(--radius-sm);
}

.meld-tile-img {
  width: clamp(1.4rem, 5vw, 2rem);
  height: clamp(2rem, 7vw, 2.8rem);
  background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
  border-radius: 3px;
  padding: 2px;
  object-fit: contain;
}

/* Small mobile */
@media (max-width: 600px) {
  .tile-img-sm {
    width: 1rem;
    height: 1.4rem;
  }

  .tile-img-md {
    width: 1.2rem;
    height: 1.7rem;
  }

  .tile-img-lg {
    width: 1.6rem;
    height: 2.2rem;
  }

  .meld-tile-container {
    padding: 3px;
    gap: 1px;
  }

  .meld-tile-img {
    width: 1.2rem;
    height: 1.7rem;
  }
}

/* Very small phones */
@media (max-width: 375px) {
  .tile-img-sm {
    width: 0.9rem;
    height: 1.2rem;
  }

  .tile-img-md {
    width: 1rem;
    height: 1.4rem;
  }

  .tile-img-lg {
    width: 1.4rem;
    height: 2rem;
  }
}
```

**Step 2: Commit**

```bash
mkdir -p src/styles
git add src/styles/tiles.css
git commit -m "refactor: create shared tile styles in src/styles/tiles.css"
```

---

### Task 9: Create src/styles/buttons.css

**Files:**
- Create: `src/styles/buttons.css`

**Step 1: Extract button patterns**

```css
/* src/styles/buttons.css */

/* Base action button */
.btn-action {
  padding: var(--space-sm) var(--space-lg);
  font-size: 1rem;
  font-family: var(--font-body);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  overflow: hidden;
}

.btn-action::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%);
  pointer-events: none;
}

.btn-action:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.03);
}

.btn-action:active:not(:disabled) {
  transform: translateY(0) scale(1);
}

.btn-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* Win button (gold, pulsing) */
.btn-win {
  background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
  color: #1a0f0a;
  box-shadow:
    0 4px 20px rgba(255, 215, 0, 0.5),
    inset 0 -2px 0 rgba(0, 0, 0, 0.15);
  animation: btn-pulse 1.5s ease-in-out infinite;
}

.btn-win:hover:not(:disabled) {
  box-shadow:
    0 6px 25px rgba(255, 215, 0, 0.6),
    inset 0 -2px 0 rgba(0, 0, 0, 0.15);
}

@keyframes btn-pulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5), inset 0 -2px 0 rgba(0, 0, 0, 0.15); }
  50% { box-shadow: 0 4px 30px rgba(255, 215, 0, 0.7), inset 0 -2px 0 rgba(0, 0, 0, 0.15); }
}

/* Discard button (red) */
.btn-discard {
  background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
  color: white;
  box-shadow:
    0 4px 12px rgba(196, 30, 58, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-discard:hover:not(:disabled) {
  background: linear-gradient(135deg, #d42a4a 0%, #a00000 100%);
  box-shadow:
    0 6px 16px rgba(196, 30, 58, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Gang button (red variant) */
.btn-gang {
  background: linear-gradient(135deg, #e63946 0%, #a31621 100%);
  color: white;
  box-shadow:
    0 4px 15px rgba(230, 57, 70, 0.4),
    inset 0 -2px 0 rgba(0, 0, 0, 0.2);
}

/* Peng button (green) */
.btn-peng {
  background: linear-gradient(135deg, #2d8659 0%, #1a5038 100%);
  color: white;
  box-shadow:
    0 4px 15px rgba(45, 134, 89, 0.4),
    inset 0 -2px 0 rgba(0, 0, 0, 0.2);
}

/* Chi button (teal) */
.btn-chi {
  background: linear-gradient(135deg, #4ecdc4 0%, #2a9d8f 100%);
  color: #0a1f1c;
  box-shadow:
    0 4px 15px rgba(78, 205, 196, 0.4),
    inset 0 -2px 0 rgba(0, 0, 0, 0.1);
}

/* Pass button (gray) */
.btn-pass {
  background: linear-gradient(135deg, #4a4a4a 0%, #2d2d2d 100%);
  color: var(--text-secondary);
  box-shadow:
    0 4px 10px rgba(0, 0, 0, 0.3),
    inset 0 -2px 0 rgba(0, 0, 0, 0.3);
}

.btn-pass:hover:not(:disabled) {
  color: var(--text-primary);
}

/* Sort button (small, green) */
.btn-sort {
  padding: var(--space-xs) var(--space-md);
  font-size: 0.85rem;
  font-family: var(--font-body);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #2d5a3d 0%, #1a3d2a 100%);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(45, 134, 89, 0.4);
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.btn-sort:hover {
  background: linear-gradient(135deg, #3d7a4d 0%, #2a5d3a 100%);
  transform: translateY(-1px);
}

/* Mobile sizes */
@media (max-width: 600px) {
  .btn-action {
    padding: var(--space-xs) var(--space-md);
    font-size: 0.85rem;
  }

  .btn-sort {
    padding: 4px 10px;
    font-size: 0.7rem;
  }
}

@media (max-width: 375px) {
  .btn-sort {
    padding: 3px 8px;
    font-size: 0.65rem;
  }
}
```

**Step 2: Commit**

```bash
git add src/styles/buttons.css
git commit -m "refactor: create shared button styles in src/styles/buttons.css"
```

---

### Task 10: Create src/styles/modal.css

**Files:**
- Create: `src/styles/modal.css`

**Step 1: Extract modal/overlay patterns**

```css
/* src/styles/modal.css */

/* Overlay backdrop */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
}

/* Modal container */
.modal-container {
  background: var(--bg-table);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(212, 168, 75, 0.3);
  max-width: 400px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

/* Modal header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--gold);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text-primary);
}

/* Modal content */
.modal-content {
  padding: var(--space-sm);
  overflow-y: auto;
  flex: 1;
}

/* Call prompt (floating modal) */
.call-prompt-container {
  position: fixed;
  bottom: 220px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(26, 15, 10, 0.97) 0%, rgba(10, 5, 3, 0.98) 100%);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-xl);
  border: 2px solid var(--gold);
  z-index: 100;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.6),
    0 0 60px rgba(212, 168, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: prompt-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes prompt-appear {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@media (max-width: 600px) {
  .call-prompt-container {
    bottom: 160px;
    padding: var(--space-sm) var(--space-md);
    max-width: calc(100vw - 2rem);
  }
}
```

**Step 2: Commit**

```bash
git add src/styles/modal.css
git commit -m "refactor: create shared modal styles in src/styles/modal.css"
```

---

### Task 11: Import shared styles in app.css

**Files:**
- Modify: `src/app.css`

**Step 1: Add imports at top of app.css**

```css
/* Add at the very top of src/app.css */
@import './styles/tiles.css';
@import './styles/buttons.css';
@import './styles/modal.css';

/* ... rest of existing app.css ... */
```

**Step 2: Verify styles load**

Run: `npm run dev`
Expected: App loads without CSS errors

**Step 3: Commit**

```bash
git add src/app.css
git commit -m "refactor: import shared styles in app.css"
```

---

### Task 12: Update CallPrompt.svelte to use shared styles

**Files:**
- Modify: `src/components/CallPrompt.svelte`

**Step 1: Replace duplicated button styles with shared classes**

Update the template to use shared CSS classes (`btn-action`, `btn-win`, etc.) instead of component-scoped `.call-btn` classes.

Replace in template:
- `class="call-btn win"` → `class="btn-action btn-win"`
- `class="call-btn gang"` → `class="btn-action btn-gang"`
- `class="call-btn peng"` → `class="btn-action btn-peng"`
- `class="call-btn chi"` → `class="btn-action btn-chi"`
- `class="call-btn pass"` → `class="btn-action btn-pass"`
- `class="call-prompt"` → `class="call-prompt-container"`

**Step 2: Remove redundant CSS from component**

Delete the duplicated button styles from the `<style>` section (keep only component-specific styles like `.chi-selector`, `.chi-combo`, `.discarded-tile-display`).

**Step 3: Verify visually**

Run: `npm run dev`
Expected: Call prompt looks identical to before

**Step 4: Commit**

```bash
git add src/components/CallPrompt.svelte
git commit -m "refactor: use shared button styles in CallPrompt.svelte"
```

---

## Phase 3: Component Logic Extraction

### Task 13: Create src/lib/drag-drop.ts

**Files:**
- Create: `src/lib/drag-drop.ts`

**Step 1: Create drag-drop utility**

```typescript
// src/lib/drag-drop.ts

export interface DragDropConfig {
  itemSelector: string;  // CSS selector for draggable items
  ghostClass?: string;   // Class to add to ghost element
}

export interface DragDropState {
  draggedId: string | null;
  dropTargetIndex: number | null;
  touchDragId: string | null;
  ghostElement: HTMLDivElement | null;
}

export function createDragDropState(): DragDropState {
  return {
    draggedId: null,
    dropTargetIndex: null,
    touchDragId: null,
    ghostElement: null,
  };
}

export function handleDragStart(
  state: DragDropState,
  e: DragEvent,
  id: string
): DragDropState {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
  return { ...state, draggedId: id };
}

export function handleDragOver(
  state: DragDropState,
  e: DragEvent,
  index: number
): DragDropState {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  return { ...state, dropTargetIndex: index };
}

export function handleDragLeave(state: DragDropState): DragDropState {
  return { ...state, dropTargetIndex: null };
}

export function handleDrop<T extends { id: string }>(
  state: DragDropState,
  e: DragEvent,
  targetIndex: number,
  order: string[],
  setOrder: (newOrder: string[]) => void
): DragDropState {
  e.preventDefault();

  if (state.draggedId === null) {
    return { ...state, dropTargetIndex: null };
  }

  const draggedIndex = order.indexOf(state.draggedId);
  if (draggedIndex === -1 || draggedIndex === targetIndex) {
    return { ...state, dropTargetIndex: null };
  }

  const newOrder = [...order];
  newOrder.splice(draggedIndex, 1);
  newOrder.splice(targetIndex, 0, state.draggedId);
  setOrder(newOrder);

  return { ...state, dropTargetIndex: null };
}

export function handleDragEnd(state: DragDropState): DragDropState {
  return { ...state, draggedId: null, dropTargetIndex: null };
}

export function handleTouchStart(
  state: DragDropState,
  e: TouchEvent,
  id: string
): DragDropState {
  const touch = e.touches[0];
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  e.preventDefault();

  const ghost = document.createElement('div');
  ghost.className = 'touch-ghost';
  ghost.innerHTML = target.innerHTML;
  ghost.style.cssText = `
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
  document.body.appendChild(ghost);

  return {
    ...state,
    touchDragId: id,
    ghostElement: ghost,
  };
}

export function handleTouchMove(
  state: DragDropState,
  e: TouchEvent,
  itemSelector: string
): DragDropState {
  if (!state.touchDragId || !state.ghostElement) return state;
  e.preventDefault();

  const touch = e.touches[0];
  const rect = state.ghostElement.getBoundingClientRect();

  state.ghostElement.style.left = `${touch.clientX - rect.width / 2}px`;
  state.ghostElement.style.top = `${touch.clientY - rect.height / 2}px`;

  const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
  const dropTarget = elements.find(el =>
    el.matches(itemSelector) && !el.classList.contains('dragging')
  ) as HTMLElement | undefined;

  document.querySelectorAll(`${itemSelector}.drag-over`).forEach(el =>
    el.classList.remove('drag-over')
  );

  let dropTargetIndex: number | null = null;
  if (dropTarget) {
    const index = Array.from(dropTarget.parentElement?.children || []).indexOf(dropTarget);
    dropTargetIndex = index;
    dropTarget.classList.add('drag-over');
  }

  return { ...state, dropTargetIndex };
}

export function handleTouchEnd(
  state: DragDropState,
  order: string[],
  setOrder: (newOrder: string[]) => void,
  itemSelector: string
): DragDropState {
  if (!state.touchDragId) return state;

  if (state.dropTargetIndex !== null) {
    const draggedIndex = order.indexOf(state.touchDragId);
    if (draggedIndex !== -1 && draggedIndex !== state.dropTargetIndex) {
      const newOrder = [...order];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(state.dropTargetIndex, 0, state.touchDragId);
      setOrder(newOrder);
    }
  }

  if (state.ghostElement) {
    state.ghostElement.remove();
  }

  document.querySelectorAll(`${itemSelector}.drag-over`).forEach(el =>
    el.classList.remove('drag-over')
  );

  return {
    ...state,
    touchDragId: null,
    dropTargetIndex: null,
    ghostElement: null,
  };
}

export function cleanupGhost(state: DragDropState): void {
  if (state.ghostElement) {
    state.ghostElement.remove();
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/drag-drop.ts
git commit -m "refactor: create reusable drag-drop utility"
```

---

### Task 14: Update Hand.svelte to use drag-drop utility

**Files:**
- Modify: `src/components/Hand.svelte`

**Step 1: Import and use the drag-drop utility**

Replace the inline drag-drop logic with imports from the utility:

```typescript
import {
  createDragDropState,
  handleDragStart as ddDragStart,
  handleDragOver as ddDragOver,
  handleDragLeave as ddDragLeave,
  handleDrop as ddDrop,
  handleDragEnd as ddDragEnd,
  handleTouchStart as ddTouchStart,
  handleTouchMove as ddTouchMove,
  handleTouchEnd as ddTouchEnd,
  cleanupGhost,
  type DragDropState,
} from "../lib/drag-drop";
```

**Step 2: Replace state variables**

Replace individual drag state variables with:
```typescript
let dragState = $state<DragDropState>(createDragDropState());
```

**Step 3: Update handler functions**

Replace the inline handlers with calls to utility functions:
```typescript
function handleDragStart(e: DragEvent, tileId: string) {
  dragState = ddDragStart(dragState, e, tileId);
}

function handleDragOver(e: DragEvent, index: number) {
  dragState = ddDragOver(dragState, e, index);
}

// ... etc for other handlers
```

**Step 4: Update cleanup effect**

```typescript
$effect(() => {
  return () => cleanupGhost(dragState);
});
```

**Step 5: Update template references**

Replace `draggedTileId` with `dragState.draggedId`, `dropTargetIndex` with `dragState.dropTargetIndex`, etc.

**Step 6: Verify drag-drop works**

Run: `npm run dev`
Expected: Tile reordering works on desktop and mobile

**Step 7: Commit**

```bash
git add src/components/Hand.svelte
git commit -m "refactor: use drag-drop utility in Hand.svelte"
```

---

## Phase 4: Final Verification

### Task 15: Full verification

**Step 1: Run type check**

Run: `npm run check`
Expected: PASS

**Step 2: Run tests**

Run: `npm run test:run`
Expected: All tests pass

**Step 3: Manual testing**

Run: `npm run dev:all`

Test checklist:
- [ ] Create room
- [ ] Join as player
- [ ] Start game (bots fill seats)
- [ ] Discard tile
- [ ] Make a call (chi/peng/gang)
- [ ] Pass on call
- [ ] Win a hand
- [ ] Start next round
- [ ] Reconnect mid-game
- [ ] Tile drag-drop reordering (desktop)
- [ ] Tile drag-drop reordering (mobile simulation)

**Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: complete codebase modularization

- Split party/index.ts into handlers/, bot/, and broadcast.ts
- Extracted shared CSS to src/styles/
- Created reusable drag-drop utility
- All functionality preserved"
```

---

## Summary

**Files created:**
- `party/broadcast.ts`
- `party/bot/manager.ts`
- `party/bot/actions.ts`
- `party/handlers/lobby.ts`
- `party/handlers/gameplay.ts`
- `party/handlers/rounds.ts`
- `src/styles/tiles.css`
- `src/styles/buttons.css`
- `src/styles/modal.css`
- `src/lib/drag-drop.ts`

**Files moved:**
- `party/bot.ts` → `party/bot/bot.ts`

**Files modified:**
- `party/index.ts` (slimmed from 726 to ~180 lines)
- `src/app.css` (added style imports)
- `src/components/CallPrompt.svelte` (use shared styles)
- `src/components/Hand.svelte` (use drag-drop utility)

**Result:**
- No file exceeds 300 lines
- Server logic is modular and testable
- Shared CSS eliminates duplication
- All functionality preserved
