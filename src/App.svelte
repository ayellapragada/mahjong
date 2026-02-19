<script lang="ts">
  import { onMount } from "svelte";
  import QRCode from "qrcode";
  import type { Seat, ScoreBreakdown } from "./game/types";
  import { createConnection, type ConnectionState, type ViewMode } from "./lib/connection";
  import { saveSession, getSession, clearSession, updateSession } from "./lib/session";
  import { parseRoute, navigateTo, replaceRoute, getFullUrl } from "./lib/router";
  import HomeView from "./views/HomeView.svelte";
  import LobbyView from "./views/LobbyView.svelte";
  import TableView from "./views/TableView.svelte";
  import PlayerHandView from "./views/PlayerHandView.svelte";
  import ResultsModal from "./components/ResultsModal.svelte";
  import ToastContainer from "./components/ToastContainer.svelte";
  import ConnectionStatus from "./components/ConnectionStatus.svelte";
  import { toast } from "./lib/toast.svelte";

  let connectionState: ConnectionState = $state({ status: "disconnected" });
  let viewMode: ViewMode = $state("player");
  let qrCodeUrl: string = $state("");
  let joinUrl: string = $state("");
  let copied: boolean = $state(false);

  let previousStatus = "disconnected";

  // Track if we should attempt rejoin (only true when loading page with existing session)
  let shouldAttemptRejoin = false;
  let rejoinAttempted = false;

  const connection = createConnection((newState) => {
    console.log('[Connection] Status changed:', previousStatus, '->', newState.status);

    // Show toast when reconnection succeeds
    if (previousStatus === "reconnecting" &&
        (newState.status === "connected" || newState.status === "playing")) {
      toast.success("Reconnected!");
    }

    // Handle rejoin for mid-game restoration (only on page load with existing session)
    console.log('[Rejoin Check] shouldAttemptRejoin:', shouldAttemptRejoin, 'rejoinAttempted:', rejoinAttempted, 'status:', newState.status);
    if (shouldAttemptRejoin && !rejoinAttempted && newState.status === "playing") {
      const route = parseRoute();
      console.log('[Rejoin] Route:', route);
      if (route.type === 'play') {
        const session = getSession(route.roomCode, 'player');
        console.log('[Rejoin] Session for', route.roomCode, ':', session);
        if (session?.playerName && session.seat !== undefined) {
          rejoinAttempted = true;
          console.log('[Rejoin] Sending REJOIN action:', session.playerName, 'seat', session.seat);
          connection.send({ type: "REJOIN", name: session.playerName, seat: session.seat as Seat });
          toast.success("Rejoined game!");
        }
      }
    }

    // Reset flags when disconnected
    if (newState.status === "disconnected") {
      shouldAttemptRejoin = false;
      rejoinAttempted = false;
    }

    previousStatus = newState.status;
    connectionState = newState;
  });

  onMount(() => {
    // Handle legacy path-based URLs by redirecting to hash-based
    // This catches old /play/XXXX or /table/XXXX URLs
    const path = window.location.pathname;
    const basePath = import.meta.env.BASE_URL || '/';
    const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    const relativePath = path.startsWith(base) ? path.slice(base.length) : path;

    const legacyPlayMatch = relativePath.match(/^\/play\/([A-Za-z0-9]+)$/);
    if (legacyPlayMatch) {
      replaceRoute({ type: 'play', roomCode: legacyPlayMatch[1].toUpperCase() });
      // Continue with route parsing below
    }

    const legacyTableMatch = relativePath.match(/^\/table\/([A-Za-z0-9]+)$/);
    if (legacyTableMatch) {
      replaceRoute({ type: 'table', roomCode: legacyTableMatch[1].toUpperCase() });
      // Continue with route parsing below
    }

    // Handle legacy ?room= query param
    const params = new URLSearchParams(window.location.search);
    const legacyRoomCode = params.get("room");
    if (legacyRoomCode && legacyRoomCode.length === 4) {
      replaceRoute({ type: 'play', roomCode: legacyRoomCode.toUpperCase() });
    }

    // Now parse the (potentially updated) route
    const route = parseRoute();
    console.log('[onMount] Parsed route:', route);

    // Route-based initialization
    if (route.type === 'play' || route.type === 'table') {
      viewMode = route.type === 'play' ? 'player' : 'table';
      const session = getSession(route.roomCode, viewMode);
      console.log('[onMount] Session for', route.roomCode, viewMode, ':', session);

      // If we have an existing session with seat data, we might need to rejoin
      if (session?.playerName && session.seat !== undefined) {
        shouldAttemptRejoin = true;
        console.log('[onMount] Will attempt rejoin - session has player data');
      }

      connection.connect(route.roomCode, viewMode);

      // Save session if we don't have one
      if (!session) {
        console.log('[onMount] No session found, saving new session');
        saveSession({ roomCode: route.roomCode, viewMode });
      }

      // Generate QR code for table view (needed on page refresh)
      if (route.type === 'table') {
        generateQRCode(route.roomCode);
      }
    }
  });

  async function generateQRCode(roomCode: string) {
    // Generate QR code for joining - use hash-based URL
    joinUrl = getFullUrl({ type: 'play', roomCode });
    qrCodeUrl = await QRCode.toDataURL(joinUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#1a0f0a", light: "#faf6e9" }
    });
  }

  async function handleCreateRoom() {
    viewMode = "table";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let roomId = "";
    for (let i = 0; i < 4; i++) {
      roomId += chars[Math.floor(Math.random() * chars.length)];
    }

    // Navigate to table URL and save session
    navigateTo({ type: 'table', roomCode: roomId });
    saveSession({ roomCode: roomId, viewMode: 'table' });

    connection.connect(roomId, "table");
    generateQRCode(roomId);
  }

  function handleJoinRoom(roomCode: string) {
    viewMode = "player";
    navigateTo({ type: 'play', roomCode });
    saveSession({ roomCode, viewMode: 'player' });
    connection.connect(roomCode, "player");
  }

  function handleTakeSeat(name: string, seat: Seat) {
    // Save player info to session for potential rejoin
    if (connectionState.status === 'connected') {
      console.log('[handleTakeSeat] Updating session for room', connectionState.roomCode, 'with', { playerName: name, seat });
      updateSession(connectionState.roomCode, viewMode, { playerName: name, seat });
      // Verify it was saved
      const saved = getSession(connectionState.roomCode, viewMode);
      console.log('[handleTakeSeat] Session after save:', saved);
    }
    connection.send({ type: "JOIN", name, seat });
  }

  function handleStartGame() {
    connection.send({ type: "START_GAME" });
  }

  function handleLeave() {
    // Clear session for current room
    if (connectionState.status === 'connected' || connectionState.status === 'playing') {
      const roomCode = connectionState.status === 'connected'
        ? connectionState.roomCode
        : connectionState.state.roomCode;
      clearSession(roomCode, viewMode);
    }
    navigateTo({ type: 'home' });
    connection.disconnect();
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = joinUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      copied = true;
      setTimeout(() => copied = false, 2000);
    }
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
      case "win":
        connection.send({ type: "DECLARE_WIN" });
        break;
    }
  }

  function handleNextRound() {
    connection.send({ type: "START_NEXT_ROUND" });
  }
</script>

<main>
  <ToastContainer />
  <ConnectionStatus state={connectionState} onRetry={() => connection.retry()} />
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
    {#if viewMode === "table"}
      <!-- Table mode skips lobby, waits for game to start -->
      <div class="table-waiting">
        <p class="waiting-label">Room Code</p>
        <div class="room-badge">{connectionState.roomCode}</div>
        {#if qrCodeUrl}
          <div class="qr-section">
            <img src={qrCodeUrl} alt="QR Code to join room" />
            <p class="qr-hint">Scan to join</p>
            <button class="copy-link-btn" onclick={handleCopyLink}>
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        {/if}
        <p>Waiting for players to join...</p>
        <div class="player-count">
          {connectionState.players.length} / 4 players
        </div>
      </div>
    {:else}
      <LobbyView
        roomCode={connectionState.roomCode}
        players={connectionState.players}
        onTakeSeat={handleTakeSeat}
        onStartGame={handleStartGame}
        onLeave={handleLeave}
      />
    {/if}
  {:else if connectionState.status === "playing"}
    {#if viewMode === "table"}
      <!-- iPad table view: shows shared game state -->
      <TableView state={connectionState.state} />
    {:else}
      <!-- Phone player view: shows hand only -->
      <PlayerHandView
        gameState={connectionState.state}
        onDiscard={handleDiscard}
        onCall={handleCall}
      />
    {/if}
    {#if connectionState.gameOver}
      <ResultsModal
        winner={connectionState.gameOver.winner}
        winnerName={connectionState.gameOver.winnerName}
        breakdown={connectionState.gameOver.breakdown}
        scores={connectionState.gameOver.scores}
        winningHand={connectionState.gameOver.winningHand}
        winningMelds={connectionState.gameOver.winningMelds}
        isSelfDrawn={connectionState.gameOver.isSelfDrawn}
        onNextRound={handleNextRound}
      />
    {/if}
  {/if}
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

  :global(*) {
    box-sizing: border-box;
  }

  :global(html) {
    overflow-x: hidden;
    width: 100%;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg-deep);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
  }

  :global(#app) {
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
  }

  :global(:root) {
    /* Typography */
    --font-display: 'Crimson Pro', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;

    /* Responsive scale factor - scales down on larger screens */
    --scale: clamp(0.6, calc(100vw / 800), 1);

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
    --crimson: #c41e3a;

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

    /* Tile dimensions - responsive */
    --tile-width: clamp(1.4rem, 6vw, 2.4rem);
    --tile-height: clamp(2rem, 8.5vw, 3.4rem);
    --tile-svg-width: clamp(1.2rem, 5.5vw, 2.2rem);
    --tile-svg-height: clamp(1.7rem, 7.5vw, 3rem);
  }

  main {
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .loading {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
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

  .table-waiting {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: radial-gradient(ellipse at center, var(--bg-felt) 0%, var(--bg-deep) 100%);
    gap: 12px;
    padding: 20px;
    padding-top: calc(20px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
    overflow-y: auto;
  }

  .table-waiting .waiting-label {
    font-size: 0.85rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    margin: 0;
  }

  .table-waiting .room-badge {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: clamp(3rem, 18vw, 8rem);
    color: var(--gold);
    letter-spacing: 0.2em;
    text-shadow: 0 0 40px rgba(212, 168, 75, 0.6);
    margin: 8px 0;
    line-height: 1;
  }

  .table-waiting p {
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0;
    text-align: center;
  }

  .table-waiting .qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .table-waiting .qr-section img {
    width: clamp(120px, 20vw, 200px);
    height: clamp(120px, 20vw, 200px);
    border-radius: 12px;
    border: 3px solid var(--gold);
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.4),
      0 0 30px rgba(212, 168, 75, 0.15);
  }

  .table-waiting .qr-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .table-waiting .copy-link-btn {
    margin-top: 8px;
    padding: 10px 24px;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--gold);
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--gold-dim);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 120px;
  }

  .table-waiting .copy-link-btn:hover {
    background: rgba(212, 168, 75, 0.15);
    border-color: var(--gold);
  }

  .table-waiting .copy-link-btn:active {
    transform: scale(0.98);
  }

  .table-waiting .player-count {
    margin-top: 16px;
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--jade-bright);
  }

  @media (max-width: 480px) {
    .table-waiting {
      gap: 8px;
      padding: 16px;
    }

    .table-waiting .waiting-label {
      font-size: 0.75rem;
    }

    .table-waiting .room-badge {
      font-size: clamp(2.5rem, 20vw, 5rem);
      letter-spacing: 0.15em;
    }

    .table-waiting p {
      font-size: 0.9rem;
    }

    .table-waiting .hint {
      font-size: 0.7rem;
    }

    .table-waiting .player-count {
      font-size: 0.9rem;
      padding: 8px 16px;
    }
  }

  /* Landscape mode - make content more compact */
  @media (max-height: 600px) and (orientation: landscape) {
    .table-waiting {
      gap: 6px;
      padding: 12px;
    }

    .table-waiting .room-badge {
      font-size: clamp(2rem, 12vh, 4rem);
      margin: 4px 0;
    }

    .table-waiting .qr-section img {
      width: clamp(80px, 25vh, 150px);
      height: clamp(80px, 25vh, 150px);
    }

    .table-waiting .qr-hint {
      font-size: 0.75rem;
    }

    .table-waiting .copy-link-btn {
      padding: 6px 16px;
      font-size: 0.8rem;
    }

    .table-waiting .player-count {
      margin-top: 8px;
      padding: 6px 14px;
      font-size: 0.85rem;
    }
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
