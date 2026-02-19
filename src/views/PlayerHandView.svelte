<script lang="ts">
  import type { ClientGameState, Meld, Seat, RedactedPlayer } from "../game/types";
  import { tileToSvgPath, tileToUnicode } from "../lib/tiles";
  import Hand from "../components/Hand.svelte";
  import CallPrompt from "../components/CallPrompt.svelte";
  import ActionLog from "../components/ActionLog.svelte";
  import { vibrate } from "../lib/haptics";

  interface Props {
    gameState: ClientGameState;
    onDiscard: (tileId: string) => void;
    onCall: (type: string, tileIds: string[]) => void;
  }

  let { gameState, onDiscard, onCall }: Props = $props();

  const WIND_CHARS = ['東', '南', '西', '北'] as const;

  let isMyTurn = $derived(gameState.currentTurn === gameState.mySeat);
  let canDiscard = $derived(isMyTurn && gameState.turnPhase === "discarding");
  let canWin = $derived(gameState.canWin);
  let showCallPrompt = $derived(
    gameState.turnPhase === "waiting_for_calls" &&
    gameState.availableCalls.length > 0
  );

  // Get current player name
  let currentPlayerName = $derived(
    gameState.currentTurn === gameState.mySeat
      ? "You"
      : gameState.otherPlayers.find(p => p.seat === gameState.currentTurn)?.name ?? "..."
  );

  // Get last discarded tile info
  let lastDiscard = $derived(gameState.lastDiscard);
  let lastDiscardPlayer = $derived(
    lastDiscard
      ? (lastDiscard.from === gameState.mySeat
          ? "You"
          : gameState.otherPlayers.find(p => p.seat === lastDiscard.from)?.name ?? "...")
      : null
  );

  // Get meld type label
  function getMeldLabel(meld: Meld): string {
    switch (meld.type) {
      case 'chi': return 'CHI';
      case 'peng': return 'PENG';
      case 'gang': return 'GANG';
      default: return '';
    }
  }

  // Get relative position name
  function getRelativePosition(seat: Seat): string {
    const diff = (seat - gameState.mySeat + 4) % 4;
    switch (diff) {
      case 1: return "Right";
      case 2: return "Across";
      case 3: return "Left";
      default: return "";
    }
  }

  function handleDiscardWithHaptic(tileId: string) {
    vibrate('medium');
    onDiscard(tileId);
  }

  // History modal state
  let historyOpen = $state(false);

  // Highlighted tiles for call preview
  let highlightedTileIds = $state<string[]>([]);
</script>

<div class="player-hand-view">
  <!-- Status bar -->
  <header>
    <div class="player-info">
      <span class="wind">{WIND_CHARS[gameState.mySeat]}</span>
      <span class="seat-label">You</span>
    </div>
    <div class="turn-status" class:my-turn={isMyTurn}>
      {#if isMyTurn}
        Your Turn
      {:else}
        {WIND_CHARS[gameState.currentTurn]}'s Turn
      {/if}
    </div>
    <div class="header-right">
      <button class="history-btn" onclick={() => historyOpen = true}>History</button>
      <div class="room-code">{gameState.roomCode}</div>
    </div>
  </header>

  <!-- Main content area -->
  <div class="main-area">
    <!-- Win button (most prominent when available) -->
    {#if canWin}
      <button class="hu-button" onclick={() => onCall('win', [])}>
        胡 Hu!
      </button>
    {/if}

    <!-- Game info section -->
    <div class="game-info">
      <!-- Last discard -->
      {#if lastDiscard}
        {@const tileNumber = lastDiscard.tile.tile.type === 'suited' ? lastDiscard.tile.tile.value : null}
        <div class="last-discard">
          <span class="info-label">Last Discard</span>
          <div class="discard-display">
            <div class="discard-tile-wrapper">
              <img src={tileToSvgPath(lastDiscard.tile.tile)} alt="" class="discard-tile" />
              {#if tileNumber}
                <span class="tile-number">{tileNumber}</span>
              {/if}
            </div>
            <span class="discard-by">by {lastDiscardPlayer}</span>
          </div>
        </div>
      {/if}

      <!-- Other players summary -->
      <div class="players-summary">
        {#each gameState.otherPlayers as player}
          <div class="player-chip" class:current-turn={gameState.currentTurn === player.seat}>
            <span class="chip-wind">{WIND_CHARS[player.seat]}</span>
            <span class="chip-name">{player.name}</span>
            <span class="chip-tiles">{player.handCount}</span>
            {#if player.melds.length > 0}
              <span class="chip-melds">{player.melds.length} melds</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Exposed melds -->
    {#if gameState.myMelds.length > 0}
      <div class="my-melds">
        {#each gameState.myMelds as meld}
          <div class="meld-group">
            <span class="meld-label">{getMeldLabel(meld)}</span>
            <div class="meld-tiles">
              {#each meld.tiles as tile}
                <img src={tileToSvgPath(tile.tile)} alt="" class="meld-tile" />
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Bonus tiles -->
    {#if gameState.myBonusTiles.length > 0}
      <div class="bonus-tiles">
        {#each gameState.myBonusTiles as bonus}
          <img src={tileToSvgPath(bonus.tile)} alt="" class="bonus-tile" />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Hand at bottom (takes most space) -->
  <div class="hand-area">
    <Hand
      tiles={gameState.myHand}
      {canDiscard}
      onDiscard={handleDiscardWithHaptic}
      {highlightedTileIds}
      lastDrawnTileId={gameState.lastDrawnTileId}
    />
  </div>

  <!-- Call prompt overlay -->
  {#if showCallPrompt}
    <CallPrompt
      calls={gameState.availableCalls}
      discardedTile={gameState.lastDiscard?.tile}
      discardedBy={lastDiscardPlayer ?? undefined}
      {onCall}
      onHighlight={(ids) => highlightedTileIds = ids}
    />
  {/if}

  <!-- History modal -->
  {#if historyOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="history-overlay" onclick={() => historyOpen = false}>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="history-modal" role="dialog" aria-labelledby="history-title" onclick={(e) => e.stopPropagation()}>
        <div class="history-header">
          <h3 id="history-title">Game History</h3>
          <button class="close-btn" onclick={() => historyOpen = false} aria-label="Close">×</button>
        </div>
        <div class="history-content">
          {#if gameState.recentActions && gameState.recentActions.length > 0}
            <ActionLog actions={gameState.recentActions} mySeat={gameState.mySeat} />
          {:else}
            <div class="no-history">No actions yet</div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .player-hand-view {
    width: 100%;
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, var(--bg-table) 0%, var(--bg-felt) 50%, var(--bg-table) 100%);
    color: var(--text-primary);
    overflow: hidden;
    box-sizing: border-box;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xs) var(--space-sm);
    padding-top: calc(var(--space-xs) + env(safe-area-inset-top, 0px));
    background: rgba(0, 0, 0, 0.5);
    flex-shrink: 0;
    min-height: 44px;
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .wind {
    font-family: var(--font-display);
    font-size: 1.25rem;
    color: var(--gold);
  }

  .seat-label {
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .turn-status {
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    transition: all 0.3s ease;
  }

  .turn-status.my-turn {
    color: var(--gold);
    background: rgba(212, 168, 75, 0.2);
    animation: turnPulse 1.5s ease-in-out infinite;
  }

  @keyframes turnPulse {
    0%, 100% { box-shadow: 0 0 0 rgba(212, 168, 75, 0); }
    50% { box-shadow: 0 0 15px rgba(212, 168, 75, 0.4); }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .history-btn {
    background: rgba(0, 0, 0, 0.3);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2px var(--space-xs);
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .history-btn:hover {
    background: rgba(0, 0, 0, 0.5);
    color: var(--text-primary);
  }

  .room-code {
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gold);
    letter-spacing: 0.1em;
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-sm);
    padding: var(--space-sm);
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }

  /* Game info section */
  .game-info {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .last-discard {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm);
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-md);
  }

  .info-label {
    font-size: 0.7rem;
    font-family: var(--font-body);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .discard-display {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .discard-tile-wrapper {
    position: relative;
    padding: clamp(0.15rem, 0.5vw, 0.25rem);
    border: 2px solid var(--tile-border);
    border-radius: var(--radius-md);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }

  .discard-tile {
    width: clamp(2rem, 8vw, 2.8rem);
    height: clamp(2.8rem, 11vw, 4rem);
    object-fit: contain;
    display: block;
  }

  .discard-tile-wrapper .tile-number {
    position: absolute;
    top: 3px;
    right: 4px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #333;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 3px;
    padding: 0 4px;
    line-height: 1.3;
    font-family: var(--font-body);
  }

  .discard-by {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  /* Players summary */
  .players-summary {
    display: flex;
    gap: var(--space-xs);
    justify-content: center;
    flex-wrap: wrap;
  }

  .player-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: var(--space-xs) var(--space-sm);
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    transition: all 0.3s ease;
  }

  .player-chip.current-turn {
    background: rgba(212, 168, 75, 0.2);
    border-color: var(--gold);
    box-shadow: 0 0 10px rgba(212, 168, 75, 0.3);
  }

  .chip-wind {
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--gold);
  }

  .chip-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chip-tiles {
    font-size: 0.7rem;
    color: var(--text-muted);
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .chip-melds {
    font-size: 0.65rem;
    color: var(--jade);
  }

  .hu-button {
    padding: var(--space-md) var(--space-xl);
    background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
    color: #1a0f0a;
    border: none;
    border-radius: var(--radius-xl);
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    cursor: pointer;
    animation: huPulse 1s ease-in-out infinite;
    box-shadow: 0 6px 30px rgba(255, 215, 0, 0.6);
  }

  .hu-button:active {
    transform: scale(0.98);
  }

  @keyframes huPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .my-melds {
    display: flex;
    gap: var(--space-md);
    flex-wrap: wrap;
    justify-content: center;
  }

  .meld-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .meld-label {
    font-size: 0.7rem;
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .meld-tiles {
    display: flex;
    gap: 2px;
    background: rgba(0, 0, 0, 0.3);
    padding: 4px;
    border-radius: var(--radius-sm);
  }

  .meld-tile {
    width: clamp(1.4rem, 5vw, 2rem);
    height: clamp(2rem, 7vw, 2.8rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 3px;
    padding: 2px;
    object-fit: contain;
  }

  .bonus-tiles {
    display: flex;
    gap: 4px;
  }

  .bonus-tile {
    width: clamp(1.2rem, 4vw, 1.6rem);
    height: clamp(1.7rem, 5.5vw, 2.2rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 2px;
    padding: 1px;
    object-fit: contain;
  }

  .hand-area {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.5) 100%);
    padding: var(--space-sm);
    padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid rgba(212, 168, 75, 0.2);
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
  }

  /* Mobile-first optimizations */
  @media (max-width: 600px) {
    .player-hand-view {
      /* Ensure full viewport on mobile */
      width: 100vw;
      max-width: 100%;
    }

    header {
      padding: 6px 10px;
      padding-top: calc(6px + env(safe-area-inset-top, 0px));
      min-height: 40px;
    }

    .wind {
      font-size: 1.1rem;
    }

    .seat-label {
      font-size: 0.7rem;
    }

    .turn-status {
      font-size: 0.75rem;
      padding: 4px 8px;
    }

    .room-code {
      font-size: 0.7rem;
    }

    .main-area {
      padding: 8px;
      gap: 8px;
    }

    .game-info {
      gap: 6px;
    }

    .last-discard {
      padding: 6px;
    }

    .info-label {
      font-size: 0.6rem;
    }

    .discard-tile-wrapper {
      padding: 3px;
    }

    .discard-tile {
      width: 1.6rem;
      height: 2.2rem;
    }

    .discard-tile-wrapper .tile-number {
      font-size: 0.55rem;
      top: 1px;
      right: 2px;
      padding: 0 2px;
    }

    .discard-by {
      font-size: 0.75rem;
    }

    .players-summary {
      gap: 4px;
    }

    .player-chip {
      padding: 3px 6px;
      gap: 3px;
    }

    .chip-wind {
      font-size: 0.85rem;
    }

    .chip-name {
      font-size: 0.7rem;
      max-width: 45px;
    }

    .chip-tiles {
      font-size: 0.6rem;
      padding: 1px 4px;
    }

    .chip-melds {
      font-size: 0.55rem;
    }

    .hu-button {
      font-size: 1.3rem;
      padding: 10px 20px;
    }

    .my-melds {
      gap: 8px;
    }

    .meld-label {
      font-size: 0.6rem;
    }

    .meld-tiles {
      padding: 3px;
      gap: 1px;
    }

    .meld-tile {
      width: 1.2rem;
      height: 1.7rem;
    }

    .bonus-tile {
      width: 1rem;
      height: 1.4rem;
    }

    .hand-area {
      padding: 8px;
      padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    }
  }

  /* Very small phones */
  @media (max-width: 375px) {
    header {
      padding: 4px 8px;
      padding-top: calc(4px + env(safe-area-inset-top, 0px));
    }

    .wind {
      font-size: 1rem;
    }

    .turn-status {
      font-size: 0.7rem;
    }

    .main-area {
      padding: 6px;
      gap: 6px;
    }

    .player-chip {
      padding: 2px 5px;
    }

    .chip-name {
      max-width: 35px;
    }

    .hu-button {
      font-size: 1.1rem;
      padding: 8px 16px;
    }

    .hand-area {
      padding: 6px;
      padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
    }
  }

  /* Landscape phone - keep hand at bottom, info at top */
  @media (max-height: 500px) and (orientation: landscape) {
    .player-hand-view {
      flex-direction: column;
    }

    header {
      padding: 4px 8px;
      padding-top: calc(4px + env(safe-area-inset-top, 0px));
      min-height: 32px;
    }

    .main-area {
      flex: 1;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: var(--space-sm);
      padding: 4px 8px;
      min-height: 0;
    }

    .game-info {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: var(--space-sm);
    }

    .last-discard {
      flex-direction: row;
      padding: 4px 8px;
      gap: var(--space-sm);
    }

    .discard-tile {
      width: 1.4rem;
      height: 2rem;
    }

    .players-summary {
      gap: 4px;
    }

    .player-chip {
      padding: 2px 6px;
    }

    .hand-area {
      padding: 4px 8px;
      padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
    }

    .hu-button {
      font-size: 1rem;
      padding: 6px 12px;
    }

    .my-melds {
      gap: 6px;
    }

    .meld-tile {
      width: 1rem;
      height: 1.4rem;
    }
  }

  /* History modal */
  .history-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
  }

  .history-modal {
    background: var(--bg-table);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(212, 168, 75, 0.3);
    max-width: 400px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .history-header h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--gold);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .history-content {
    padding: var(--space-sm);
    overflow-y: auto;
    flex: 1;
  }

  .no-history {
    text-align: center;
    color: var(--text-muted);
    padding: var(--space-lg);
    font-style: italic;
  }
</style>
