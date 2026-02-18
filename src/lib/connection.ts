import type { ClientAction, ServerMessage, ClientGameState, Seat, ScoreBreakdown, TileInstance, Meld } from "../game/types";

export type ViewMode = "player" | "table";

export type ConnectionState =
  | { status: "disconnected" }
  | { status: "connecting"; attempt?: number }
  | { status: "reconnecting"; attempt: number; maxAttempts: number }
  | { status: "connected"; roomCode: string; players: Array<{ name: string; seat: Seat }> }
  | { status: "playing"; state: ClientGameState; gameOver?: { winner: Seat | -1; scores: Record<Seat, number>; breakdown: ScoreBreakdown; winnerName: string; winningHand: TileInstance[]; winningMelds: Meld[]; isSelfDrawn: boolean } };

export type ConnectionStore = {
  state: ConnectionState;
  viewMode: ViewMode;
  connect: (roomId: string, viewMode?: ViewMode) => void;
  disconnect: () => void;
  send: (action: ClientAction) => void;
  retry: () => void;
};

export function createConnection(onUpdate: (state: ConnectionState) => void): ConnectionStore {
  let socket: WebSocket | null = null;
  let currentState: ConnectionState = { status: "disconnected" };
  let currentViewMode: ViewMode = "player";
  let currentRoomId: string | null = null;
  let reconnectAttempt = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 30000];

  function setState(newState: ConnectionState) {
    currentState = newState;
    onUpdate(newState);
  }

  function getReconnectDelay(attempt: number): number {
    return RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
  }

  function scheduleReconnect() {
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      setState({ status: "disconnected" });
      return;
    }

    const delay = getReconnectDelay(reconnectAttempt);
    reconnectAttempt++;

    setState({
      status: "reconnecting",
      attempt: reconnectAttempt,
      maxAttempts: MAX_RECONNECT_ATTEMPTS
    });

    reconnectTimeout = setTimeout(() => {
      if (currentRoomId) {
        connectInternal(currentRoomId, currentViewMode, true);
      }
    }, delay);
  }

  function clearReconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }

  function connectInternal(roomId: string, viewMode: ViewMode, isReconnect: boolean) {
    if (socket) {
      socket.close();
    }

    currentViewMode = viewMode;
    currentRoomId = roomId;

    if (!isReconnect) {
      reconnectAttempt = 0;
      setState({ status: "connecting" });
    }

    const baseUrl = import.meta.env.DEV
      ? "ws://localhost:8787"
      : "wss://mahjong.ayellapragada.workers.dev";

    const wsUrl = `${baseUrl}/parties/mahjong-room/${roomId}?mode=${viewMode}`;
    socket = new WebSocket(wsUrl);

    socket.addEventListener("open", () => {
      console.log("Connected to room:", roomId);
      reconnectAttempt = 0;
      clearReconnect();
    });

    socket.addEventListener("message", (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      console.log("Received:", message.type);

      switch (message.type) {
        case "ROOM_INFO":
          setState({
            status: "connected",
            roomCode: message.roomCode,
            players: message.players,
          });
          break;
        case "STATE_UPDATE":
          setState({
            status: "playing",
            state: message.state,
          });
          break;
        case "GAME_OVER":
          if (currentState.status === "playing") {
            setState({
              ...currentState,
              gameOver: {
                winner: message.winner,
                scores: message.scores,
                breakdown: message.breakdown,
                winnerName: message.winnerName,
                winningHand: message.winningHand,
                winningMelds: message.winningMelds,
                isSelfDrawn: message.isSelfDrawn,
              },
            });
          }
          break;
        case "ERROR":
          console.error("Server error:", message.message);
          break;
      }
    });

    socket.addEventListener("close", (event) => {
      console.log("Disconnected", event.code, event.reason);

      // Only auto-reconnect if we were previously connected and it wasn't intentional
      if (currentRoomId && currentState.status !== "disconnected") {
        scheduleReconnect();
      } else {
        setState({ status: "disconnected" });
      }
    });

    socket.addEventListener("error", (e) => {
      console.error("Connection error:", e);
    });
  }

  function connect(roomId: string, viewMode: ViewMode = "player") {
    clearReconnect();
    connectInternal(roomId, viewMode, false);
  }

  function disconnect() {
    clearReconnect();
    currentRoomId = null;
    if (socket) {
      socket.close();
      socket = null;
    }
    setState({ status: "disconnected" });
  }

  function send(action: ClientAction) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(action));
    } else {
      console.error("Cannot send: not connected");
    }
  }

  function retry() {
    if (currentRoomId) {
      reconnectAttempt = 0;
      clearReconnect();
      connectInternal(currentRoomId, currentViewMode, false);
    }
  }

  return {
    get state() { return currentState; },
    get viewMode() { return currentViewMode; },
    connect,
    disconnect,
    send,
    retry,
  };
}
