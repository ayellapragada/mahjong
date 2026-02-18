import { routePartykitRequest, Server } from "partyserver";
import type { Connection } from "partyserver";
import type { GameState, ClientAction, ServerMessage, Seat } from "../src/game/types";
import { BotPlayer, type BotAction } from "./bot";
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
import { getRuleset } from "../src/game/rulesets";
import { declareSelfDrawWin, declareDiscardWin } from "../src/game/win";

export class MahjongRoom extends Server {
  state!: GameState;
  bots: Map<Seat, BotPlayer> = new Map();
  botTimeouts: Map<Seat, ReturnType<typeof setTimeout>> = new Map();

  onStart() {
    // Initialize with a generated room code
    // this.name is the room identifier from the URL
    const roomCode = this.name.length === 4 ? this.name : generateRoomCode();
    this.state = createInitialState(roomCode, "hongkong");
    console.log(`[${this.state.roomCode}] Room started`);
  }

  onConnect(conn: Connection) {
    console.log(`[${this.state.roomCode}] Connection: ${conn.id}`);

    // Send current room info to new connection
    this.sendToConnection(conn, {
      type: "ROOM_INFO",
      roomCode: this.state.roomCode,
      players: this.state.players.map(p => ({ name: p.name, seat: p.seat })),
    });
  }

  onClose(conn: Connection) {
    console.log(`[${this.state.roomCode}] Disconnected: ${conn.id}`);

    // Remove player if game hasn't started
    if (this.state.phase === "waiting") {
      this.state = removePlayer(this.state, conn.id);
      this.broadcastRoomInfo();
    }
  }

  onMessage(sender: Connection, message: string | ArrayBuffer) {
    let action: ClientAction;
    try {
      action = JSON.parse(message as string);
    } catch {
      this.sendError(sender, "Invalid message format");
      return;
    }

    console.log(`[${this.state.roomCode}] Action from ${sender.id}:`, action.type);

    switch (action.type) {
      case "JOIN":
        this.handleJoin(sender, action.name, action.seat);
        break;
      case "START_GAME":
        this.handleStartGame(sender);
        break;
      case "DISCARD":
        this.handleDiscard(sender, action.tileId);
        break;
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
      case "DECLARE_WIN":
        this.handleDeclareWin(sender);
        break;
      default:
        this.sendError(sender, `Unknown action: ${(action as any).type}`);
    }
  }

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  handleJoin(conn: Connection, name: string, seat: Seat) {
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

  handleStartGame(conn: Connection) {
    // Only allow starting if player is in the game
    const player = this.state.players.find(p => p.id === conn.id);
    if (!player) {
      this.sendError(conn, "You must join the game first");
      return;
    }

    // Fill empty seats with bots
    this.fillEmptySeatsWithBots();

    const ruleset = getRuleset(this.state.rulesetId);
    const result = startGame(this.state, ruleset);

    if ("error" in result) {
      this.sendError(conn, result.error);
      return;
    }

    this.state = result;

    // Dealer draws first tile
    const drawResult = drawTile(this.state, ruleset);
    if (!("error" in drawResult)) {
      this.state = drawResult;
    }

    this.broadcastGameState();

    // Schedule bot actions if any bots are playing
    this.scheduleBotActions();
  }

  handleDiscard(conn: Connection, tileId: string) {
    const player = this.state.players.find(p => p.id === conn.id);
    if (!player) {
      this.sendError(conn, "You are not in this game");
      return;
    }

    const ruleset = getRuleset(this.state.rulesetId);
    const result = discardTile(this.state, player.seat, tileId, ruleset);

    if ("error" in result) {
      this.sendError(conn, result.error);
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

  handleCall(conn: Connection, callType: "chi" | "peng" | "gang" | "pass" | "win", tileIds: string[]) {
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

    // Handle win call specially
    if (callType === 'win') {
      // Register the win call
      this.state = registerCall(this.state, player.seat, 'win', []);

      const ruleset = getRuleset(this.state.rulesetId);
      const resolved = resolveCallWindow(this.state, ruleset);

      // Check if win was the winning call (highest priority)
      if (resolved.pendingCalls.length > 0 && resolved.pendingCalls[0].callType === 'win') {
        // Process the win
        const result = declareDiscardWin(this.state, resolved.pendingCalls[0].seat, ruleset);
        if (!("error" in result)) {
          this.state = result.state;

          const winnerPlayer = this.state.players.find(p => p.seat === result.winner);
          for (const c of this.getConnections()) {
            this.sendToConnection(c, {
              type: "GAME_OVER",
              winner: result.winner,
              scores: this.state.scores,
              breakdown: result.breakdown,
              winnerName: winnerPlayer?.name ?? '',
              winningHand: winnerPlayer?.hand ?? [],
              winningMelds: winnerPlayer?.melds ?? [],
              isSelfDrawn: result.isSelfDrawn,
            });
          }
        }
      } else {
        this.state = resolved;
      }

      this.broadcastGameState();
      this.scheduleBotActions();
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
    this.scheduleBotActions();
  }

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
        winnerName: winnerPlayer?.name ?? '',
        winningHand: winnerPlayer?.hand ?? [],
        winningMelds: winnerPlayer?.melds ?? [],
        isSelfDrawn: result.isSelfDrawn,
      });
    }

    // Also send final state
    this.broadcastGameState();
  }

  // ============================================================================
  // BOT MANAGEMENT
  // ============================================================================

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

  clearAllBots() {
    for (const timeout of this.botTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.botTimeouts.clear();
    this.bots.clear();
  }

  scheduleBotActions() {
    if (this.state.phase !== 'playing') return;

    for (const [seat, bot] of this.bots) {
      // Cancel any existing timeout for this bot
      const existingTimeout = this.botTimeouts.get(seat);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Check if bot might need to act (simplified check)
      const mightAct = (this.state.currentTurn === seat && this.state.turnPhase === 'discarding') ||
                       (this.state.turnPhase === 'waiting_for_calls' && this.state.awaitingCallFrom.includes(seat));

      if (mightAct) {
        const delay = bot.getThinkingDelay();
        const timeout = setTimeout(() => {
          // Re-evaluate action at execution time with current state
          const action = bot.decideAction(this.state);
          if (action) {
            this.executeBotAction(seat, action);
          }
        }, delay);
        this.botTimeouts.set(seat, timeout);
      }
    }
  }

  executeBotAction(seat: Seat, action: BotAction) {
    // Verify bot still exists (wasn't bumped by human)
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

  // ============================================================================
  // BROADCAST HELPERS
  // ============================================================================

  broadcastRoomInfo() {
    const message: ServerMessage = {
      type: "ROOM_INFO",
      roomCode: this.state.roomCode,
      players: this.state.players.map(p => ({ name: p.name, seat: p.seat })),
    };

    for (const conn of this.getConnections()) {
      this.sendToConnection(conn, message);
    }
  }

  broadcastGameState() {
    for (const conn of this.getConnections()) {
      const clientState = getClientState(this.state, conn.id);

      if (clientState) {
        // Player view - shows their own hand
        this.sendToConnection(conn, {
          type: "STATE_UPDATE",
          state: clientState,
        });
      } else {
        // Spectator/table view - no hands visible
        const tableState = getTableState(this.state);
        this.sendToConnection(conn, {
          type: "STATE_UPDATE",
          state: {
            ...tableState,
            mySeat: 0 as Seat, // Dummy value for spectators
            myHand: [],
            myMelds: [],
            myBonusTiles: [],
          },
        });
      }
    }
  }

  sendToConnection(conn: Connection, message: ServerMessage) {
    conn.send(JSON.stringify(message));
  }

  sendError(conn: Connection, message: string) {
    this.sendToConnection(conn, { type: "ERROR", message });
  }
}

// Env type for Cloudflare Workers
interface Env {
  MahjongRoom: DurableObjectNamespace;
}

// Worker fetch handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
