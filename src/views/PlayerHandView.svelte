<script lang="ts">
  import type { ClientGameState, Meld, Seat, RedactedPlayer } from "../game/types";
  import { tileToSvgPath, tileToUnicode } from "../lib/tiles";
  import Hand from "../components/Hand.svelte";
  import CallPrompt from "../components/CallPrompt.svelte";

  interface Props {
    state: ClientGameState;
    onDiscard: (tileId: string) => void;
    onCall: (type: string, tileIds: string[]) => void;
  }

  let { state, onDiscard, onCall }: Props = $props();

  const WIND_CHARS = ['東', '南', '西', '北'] as const;

  let isMyTurn = $derived(state.currentTurn === state.mySeat);
  let canDiscard = $derived(isMyTurn && state.turnPhase === "discarding");
  let canWin = $derived(state.canWin);
  let showCallPrompt = $derived(
    state.turnPhase === "waiting_for_calls" &&
    state.availableCalls.length > 0
  );

  // Get current player name
  let currentPlayerName = $derived(
    state.currentTurn === state.mySeat
      ? "You"
      : state.otherPlayers.find(p => p.seat === state.currentTurn)?.name ?? "..."
  );

  // Get last discarded tile info
  let lastDiscard = $derived(state.lastDiscard);
  let lastDiscardPlayer = $derived(
    lastDiscard
      ? (lastDiscard.from === state.mySeat
          ? "You"
          : state.otherPlayers.find(p => p.seat === lastDiscard.from)?.name ?? "...")
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
    const diff = (seat - state.mySeat + 4) % 4;
    switch (diff) {
      case 1: return "Right";
      case 2: return "Across";
      case 3: return "Left";
      default: return "";
    }
  }
</script>

<div class="player-hand-view">
  <!-- Status bar -->
  <header>
    <div class="player-info">
      <span class="wind">{WIND_CHARS[state.mySeat]}</span>
      <span class="seat-label">You</span>
    </div>
    <div class="turn-status" class:my-turn={isMyTurn}>
      {#if isMyTurn}
        Your Turn
      {:else}
        {WIND_CHARS[state.currentTurn]}'s Turn
      {/if}
    </div>
    <div class="room-code">{state.roomCode}</div>
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
        {#each state.otherPlayers as player}
          <div class="player-chip" class:current-turn={state.currentTurn === player.seat}>
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
    {#if state.myMelds.length > 0}
      <div class="my-melds">
        {#each state.myMelds as meld}
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
    {#if state.myBonusTiles.length > 0}
      <div class="bonus-tiles">
        {#each state.myBonusTiles as bonus}
          <img src={tileToSvgPath(bonus.tile)} alt="" class="bonus-tile" />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Hand at bottom (takes most space) -->
  <div class="hand-area">
    <Hand
      tiles={state.myHand}
      {canDiscard}
      {onDiscard}
    />
  </div>

  <!-- Call prompt overlay -->
  {#if showCallPrompt}
    <CallPrompt
      calls={state.availableCalls}
      {onCall}
    />
  {/if}
</div>

<style>
  .player-hand-view {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, var(--bg-table) 0%, var(--bg-felt) 50%, var(--bg-table) 100%);
    color: var(--text-primary);
    overflow: hidden;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    background: rgba(0, 0, 0, 0.4);
    flex-shrink: 0;
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .wind {
    font-family: var(--font-display);
    font-size: 1.5rem;
    color: var(--gold);
  }

  .seat-label {
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .turn-status {
    font-family: var(--font-body);
    font-size: 1rem;
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

  .room-code {
    font-family: var(--font-body);
    font-size: 0.8rem;
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
    gap: var(--space-md);
    padding: var(--space-md);
    min-height: 0;
    overflow-y: auto;
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
    padding: var(--space-md);
    padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid rgba(212, 168, 75, 0.2);
    flex-shrink: 0;
  }

  /* Phone-specific optimizations */
  @media (max-width: 500px) {
    header {
      padding: var(--space-xs) var(--space-sm);
    }

    .wind {
      font-size: 1.2rem;
    }

    .turn-status {
      font-size: 0.85rem;
    }

    .main-area {
      padding: var(--space-sm);
      gap: var(--space-sm);
    }

    .discard-tile {
      width: 1.8rem;
      height: 2.5rem;
    }

    .discard-tile-wrapper .tile-number {
      font-size: 0.6rem;
      top: 2px;
      right: 3px;
      padding: 0 3px;
    }

    .player-chip {
      padding: 4px 8px;
    }

    .chip-name {
      max-width: 50px;
    }

    .hu-button {
      font-size: 1.5rem;
      padding: var(--space-sm) var(--space-lg);
    }

    .hand-area {
      padding: var(--space-sm);
      padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom, 0px));
    }
  }

  /* Landscape phone */
  @media (max-height: 500px) and (orientation: landscape) {
    .main-area {
      flex-direction: row;
      justify-content: space-around;
    }

    .hu-button {
      font-size: 1.2rem;
      padding: var(--space-xs) var(--space-md);
    }
  }
</style>
