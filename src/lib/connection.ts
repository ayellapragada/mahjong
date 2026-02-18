import type { ClientAction, ServerMessage, ClientGameState, Seat, ScoreBreakdown } from "../game/types";

export type ConnectionState =
  | { status: "disconnected" }
  | { status: "connecting" }
  | { status: "connected"; roomCode: string; players: Array<{ name: string; seat: Seat }> }
  | { status: "playing"; state: ClientGameState; gameOver?: { winner: Seat | -1; scores: Record<Seat, number>; breakdown: ScoreBreakdown } };

export type ConnectionStore = {
  state: ConnectionState;
  connect: (roomId: string) => void;
  disconnect: () => void;
  send: (action: ClientAction) => void;
};

export function createConnection(onUpdate: (state: ConnectionState) => void): ConnectionStore {
  let socket: WebSocket | null = null;
  let currentState: ConnectionState = { status: "disconnected" };

  function setState(newState: ConnectionState) {
    currentState = newState;
    onUpdate(newState);
  }

  function connect(roomId: string) {
    if (socket) {
      socket.close();
    }

    setState({ status: "connecting" });

    // partyserver URL pattern: /parties/<class-name>/<room-id>
    const baseUrl = import.meta.env.DEV
      ? "ws://localhost:8787"
      : "wss://mahjong.ayellapragada.workers.dev"; // Update after deploy

    const wsUrl = `${baseUrl}/parties/mahjong-room/${roomId}`;
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
    connect,
    disconnect,
    send,
  };
}
