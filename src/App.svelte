<script lang="ts">
  import { onMount } from "svelte";
  import type { Seat } from "./game/types";
  import { createConnection, type ConnectionState } from "./lib/connection";
  import HomeView from "./views/HomeView.svelte";
  import LobbyView from "./views/LobbyView.svelte";
  import GameView from "./views/GameView.svelte";

  let connectionState: ConnectionState = $state({ status: "disconnected" });

  const connection = createConnection((newState) => {
    connectionState = newState;
  });

  // Check for room code in URL on mount
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get("room");
    if (roomCode && roomCode.length === 4) {
      connection.connect(roomCode.toUpperCase());
      // Clear the URL param
      window.history.replaceState({}, "", window.location.pathname);
    }
  });

  function handleCreateRoom() {
    // Generate a random room ID
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let roomId = "";
    for (let i = 0; i < 4; i++) {
      roomId += chars[Math.floor(Math.random() * chars.length)];
    }
    connection.connect(roomId);
  }

  function handleJoinRoom(roomCode: string) {
    connection.connect(roomCode);
  }

  function handleTakeSeat(name: string, seat: Seat) {
    connection.send({ type: "JOIN", name, seat });
  }

  function handleStartGame() {
    connection.send({ type: "START_GAME" });
  }

  function handleLeave() {
    connection.disconnect();
  }

  function handleDiscard(tileId: string) {
    connection.send({ type: "DISCARD", tileId });
  }

  function handleCall(type: string, tileIds: string[]) {
    switch (type) {
      case "chi":
        connection.send({ type: "CALL_CHI", tileIds: tileIds as [string, string] });
        break;
      case "peng":
        connection.send({ type: "CALL_PENG", tileIds: tileIds as [string, string] });
        break;
      case "gang":
        connection.send({ type: "CALL_GANG", tileIds });
        break;
      case "pass":
        connection.send({ type: "PASS" });
        break;
    }
  }
</script>

<main>
  {#if connectionState.status === "disconnected"}
    <HomeView
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
    />
  {:else if connectionState.status === "connecting"}
    <div class="loading">
      <div class="loading-content">
        <div class="loading-tile">🀄</div>
        <p>Connecting...</p>
      </div>
    </div>
  {:else if connectionState.status === "connected"}
    <LobbyView
      roomCode={connectionState.roomCode}
      players={connectionState.players}
      onTakeSeat={handleTakeSeat}
      onStartGame={handleStartGame}
      onLeave={handleLeave}
    />
  {:else if connectionState.status === "playing"}
    <GameView
      state={connectionState.state}
      onDiscard={handleDiscard}
      onCall={handleCall}
    />
  {/if}
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

  :global(*) {
    box-sizing: border-box;
  }

  :global(html) {
    overflow-x: hidden;
  }

  :global(body) {
    margin: 0;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg-deep);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    width: 100%;
    max-width: 100vw;
  }

  :global(:root) {
    /* Typography */
    --font-display: 'Crimson Pro', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;

    /* Core palette - Rosewood parlor */
    --bg-deep: #1a0f0a;
    --bg-table: #0d2818;
    --bg-felt: #0a3d1f;
    --bg-card: #2a1810;
    --bg-card-hover: #3a2218;

    /* Accent colors */
    --gold: #d4a84b;
    --gold-light: #f0c75e;
    --gold-dark: #a07830;
    --gold-bright: #f0c75e;
    --gold-dim: #a07830;
    --jade: #2d8659;
    --jade-bright: #3da66d;
    --jade-glow: rgba(45, 134, 89, 0.3);
    --red-accent: #c94040;
    --red-bright: #e05050;

    /* Tile colors */
    --tile-face: #faf6e9;
    --tile-face-bright: #fffcf0;
    --tile-shadow: #c4b896;
    --tile-border: #8b7355;
    --tile-border-dark: #5a4a3a;

    /* Text */
    --text-primary: #f5f0e8;
    --text-secondary: #a09080;
    --text-muted: #6a5a4a;

    /* Effects */
    --shadow-sm: 0 2px 4px rgba(0,0,0,0.3);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
    --shadow-glow: 0 0 20px rgba(212, 168, 75, 0.3);

    /* Borders */
    --border-subtle: 1px solid rgba(255,255,255,0.08);
    --border-gold: 1px solid var(--gold-dim);

    /* Spacing */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;

    /* Radii */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
  }

  main {
    min-height: 100vh;
    min-height: 100dvh;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    height: 100dvh;
    background:
      radial-gradient(ellipse at center, var(--bg-felt) 0%, var(--bg-deep) 100%);
  }

  .loading-content {
    text-align: center;
  }

  .loading-tile {
    font-size: 4rem;
    animation: pulse 1.5s ease-in-out infinite;
    filter: drop-shadow(0 0 20px var(--gold));
  }

  .loading p {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 1.5rem;
    color: var(--gold);
    margin-top: var(--space-md);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }
</style>
