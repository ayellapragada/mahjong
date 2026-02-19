// party/broadcast.ts
import type { Connection } from "partyserver";
import type { GameState, ServerMessage, Seat, ScoreBreakdown } from "../src/game/types";
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
  breakdown: ScoreBreakdown,
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
