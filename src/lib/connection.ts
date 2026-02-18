import type { ClientAction, ServerMessage, ClientGameState, Seat, ScoreBreakdown, TileInstance, Meld } from "../game/types";

export type ViewMode = "player" | "table";

export type ConnectionState =
  | { status: "disconnected" }
  | { status: "connecting" }
  | { status: "connected"; roomCode: string; players: Array<{ name: string; seat: Seat }> }
  | { status: "playing"; state: ClientGameState; gameOver?: { winner: Seat | -1; scores: Record<Seat, number>; breakdown: ScoreBreakdown; winnerName: string; winningHand: TileInstance[]; winningMelds: Meld[]; isSelfDrawn: boolean } };

export type ConnectionStore = {
  state: ConnectionState;
  viewMode: ViewMode;
  connect: (roomId: string, viewMode?: ViewMode) => void;
  disconnect: () => void;
  send: (action: ClientAction) => void;
};

export function createConnection(onUpdate: (state: ConnectionState) => void): ConnectionStore {
  let socket: WebSocket | null = null;
  let currentState: ConnectionState = { status: "disconnected" };
  let currentViewMode: ViewMode = "player";

  function setState(newState: ConnectionState) {
    currentState = newState;
    onUpdate(newState);
  }

  function connect(roomId: string, viewMode: ViewMode = "player") {
    if (socket) {
      socket.close();
    }

    currentViewMode = viewMode;
    setState({ status: "connecting" });

    // partyserver URL pattern: /parties/<class-name>/<room-id>
    const baseUrl = import.meta.env.DEV
      ? "ws://localhost:8787"
      : "wss://mahjong.ayellapragada.workers.dev"; // Update after deploy

    // Add viewMode as query param so server knows this is a table-only connection
    const wsUrl = `${baseUrl}/parties/mahjong-room/${roomId}?mode=${viewMode}`;
    socket = new WebSocket(wsUrl);

    socket.addEventListener("open", () => {
      console.log("Connected to room:", roomId);
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
          // Keep the current state but add gameOver data
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
          alert(`Error: ${message.message}`);
          break;
      }
    });

    socket.addEventListener("close", () => {
      console.log("Disconnected");
      setState({ status: "disconnected" });
    });

    socket.addEventListener("error", (e) => {
      console.error("Connection error:", e);
      console.error("WebSocket URL:", socket?.url);
      console.error("ReadyState:", socket?.readyState);
    });
  }

  function disconnect() {
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

  return {
    get state() { return currentState; },
    get viewMode() { return currentViewMode; },
    connect,
    disconnect,
    send,
  };
}
