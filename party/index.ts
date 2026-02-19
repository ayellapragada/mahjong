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
