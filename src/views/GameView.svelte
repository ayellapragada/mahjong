<script lang="ts">
  import type { ClientGameState, Meld, Seat, RedactedPlayer } from "../game/types";
  import { SEAT_NAMES, SEAT_WINDS, tileToUnicode, tileToSvgPath } from "../lib/tiles";
  import Hand from "../components/Hand.svelte";
  import CallPrompt from "../components/CallPrompt.svelte";

  interface Props {
    state: ClientGameState;
    onDiscard: (tileId: string) => void;
    onCall: (type: string, tileIds: string[]) => void;
  }

  let { state, onDiscard, onCall }: Props = $props();

  // Wind characters for turn indicator
  const WIND_CHARS = ['東', '南', '西', '北'] as const;

  let isMyTurn = $derived(state.currentTurn === state.mySeat);
  let canDiscard = $derived(isMyTurn && state.turnPhase === "discarding");
  let canWin = $derived(state.canWin);
  let showCallPrompt = $derived(
    state.turnPhase === "waiting_for_calls" &&
    state.availableCalls.length > 0
  );

  // Relative seat positions (you are always at bottom)
  let acrossSeat = $derived(((state.mySeat + 2) % 4) as Seat);
  let rightSeat = $derived(((state.mySeat + 1) % 4) as Seat);
  let leftSeat = $derived(((state.mySeat + 3) % 4) as Seat);

  // Helper to find player by seat
  function getPlayer(seat: Seat): RedactedPlayer | undefined {
    return state.otherPlayers.find(p => p.seat === seat);
  }

  let acrossPlayer = $derived(getPlayer(acrossSeat));
  let rightPlayer = $derived(getPlayer(rightSeat));
  let leftPlayer = $derived(getPlayer(leftSeat));

  // Get meld type label
  function getMeldLabel(meld: Meld): string {
    switch (meld.type) {
      case 'chi': return 'CHI';
      case 'peng': return 'PENG';
      case 'gang': return 'GANG';
      default: return '';
    }
  }
</script>

<div class="game">
  <header>
    <div class="room-badge">{state.roomCode}</div>
    <div class="wall-count">{state.wallCount} tiles</div>
  </header>

  <div class="table">
    <!-- Top: Across opponent -->
    <div class="table-top">
      {#if acrossPlayer}
        <div class="opponent top" class:current-turn={state.currentTurn === acrossSeat}>
          <div class="opponent-info">
            <span class="opponent-wind">{WIND_CHARS[acrossSeat]}</span>
            <span class="opponent-name">{acrossPlayer.name}</span>
            {#if acrossPlayer.isDealer}
              <span class="dealer-badge">莊</span>
            {/if}
          </div>
          {#if acrossPlayer.melds.length > 0}
            <div class="opponent-melds">
              {#each acrossPlayer.melds as meld}
                <div class="labeled-meld">
                  <div class="meld-tiles">
                    {#each meld.tiles as tile}
                      <img src={tileToSvgPath(tile.tile)} alt="" class="mini-tile" />
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
          <div class="hand-backs">
            {#each Array(acrossPlayer.handCount) as _}
              <div class="tile-back"></div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Left opponent -->
    <div class="table-left">
      {#if leftPlayer}
        <div class="opponent left" class:current-turn={state.currentTurn === leftSeat}>
          <div class="opponent-info">
            <span class="opponent-wind">{WIND_CHARS[leftSeat]}</span>
            <span class="opponent-name">{leftPlayer.name}</span>
            {#if leftPlayer.isDealer}
              <span class="dealer-badge">莊</span>
            {/if}
          </div>
          {#if leftPlayer.melds.length > 0}
            <div class="opponent-melds vertical">
              {#each leftPlayer.melds as meld}
                <div class="labeled-meld">
                  <div class="meld-tiles vertical">
                    {#each meld.tiles as tile}
                      <img src={tileToSvgPath(tile.tile)} alt="" class="mini-tile" />
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
          <div class="hand-backs vertical">
            {#each Array(leftPlayer.handCount) as _}
              <div class="tile-back"></div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Center: turn indicator + discard pool -->
    <div class="table-center">
      <div class="turn-indicator">
        <div class="turn-wind" class:active={true}>
          {WIND_CHARS[state.currentTurn]}
        </div>
        <div class="turn-label">
          {#if isMyTurn}
            Your Turn
          {:else}
            {state.otherPlayers.find(p => p.seat === state.currentTurn)?.name || SEAT_NAMES[state.currentTurn]}
          {/if}
        </div>
      </div>

      <!-- Central discard pool -->
      <div class="discard-pool">
        {#each [0, 1, 2, 3] as seatNum}
          {@const seat = seatNum as 0 | 1 | 2 | 3}
          <div class="discard-section" class:current={state.currentTurn === seat} class:is-me={seat === state.mySeat}>
            <div class="discard-label">{WIND_CHARS[seat]}</div>
            <div class="discard-tiles">
              {#each state.discardPiles[seat].tiles as tile, i}
                <span class="discarded" class:latest={i === state.discardPiles[seat].tiles.length - 1}>{tileToUnicode(tile.tile)}</span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Right opponent -->
    <div class="table-right">
      {#if rightPlayer}
        <div class="opponent right" class:current-turn={state.currentTurn === rightSeat}>
          <div class="opponent-info">
            <span class="opponent-wind">{WIND_CHARS[rightSeat]}</span>
            <span class="opponent-name">{rightPlayer.name}</span>
            {#if rightPlayer.isDealer}
              <span class="dealer-badge">莊</span>
            {/if}
          </div>
          {#if rightPlayer.melds.length > 0}
            <div class="opponent-melds vertical">
              {#each rightPlayer.melds as meld}
                <div class="labeled-meld">
                  <div class="meld-tiles vertical">
                    {#each meld.tiles as tile}
                      <img src={tileToSvgPath(tile.tile)} alt="" class="mini-tile" />
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
          <div class="hand-backs vertical">
            {#each Array(rightPlayer.handCount) as _}
              <div class="tile-back"></div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- My area (bottom) -->
  <div class="my-area">
    {#if canWin}
      <button class="hu-button" onclick={() => onCall('win', [])}>
        胡 Hu!
      </button>
    {/if}

    <!-- My exposed melds with labels -->
    {#if state.myMelds.length > 0}
      <div class="my-melds">
        {#each state.myMelds as meld}
          <div class="labeled-meld">
            <span class="meld-label">{getMeldLabel(meld)}</span>
            <div class="meld-tiles">
              {#each meld.tiles as tile}
                <img src={tileToSvgPath(tile.tile)} alt="" class="meld-tile-img" />
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if state.myBonusTiles.length > 0}
      <div class="my-bonus">
        {#each state.myBonusTiles as bonus}
          <img src={tileToSvgPath(bonus.tile)} alt="" class="bonus-tile-img" />
        {/each}
      </div>
    {/if}

    <Hand
      tiles={state.myHand}
      {canDiscard}
      {onDiscard}
    />
  </div>

  {#if showCallPrompt}
    <CallPrompt
      calls={state.availableCalls}
      {onCall}
    />
  {/if}
</div>

<style>
  .game {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, var(--bg-table) 0%, var(--bg-felt) 50%, var(--bg-table) 100%);
    color: var(--text-primary);
    position: relative;
    overflow: hidden;
  }

  .game::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 50% at 50% 40%, rgba(45, 134, 89, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }

  /* Header */
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xs) var(--space-sm);
    position: relative;
    z-index: 10;
    flex-shrink: 0;
  }

  .room-badge {
    background: rgba(0, 0, 0, 0.4);
    color: var(--gold);
    padding: 2px var(--space-xs);
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
  }

  .wall-count {
    color: var(--text-muted);
    font-size: 0.75rem;
    font-family: var(--font-body);
  }

  /* Square table grid layout */
  .table {
    flex: 1;
    display: grid;
    grid-template-areas:
      "top top top"
      "left center right"
      ". . .";
    grid-template-columns: minmax(60px, auto) 1fr minmax(60px, auto);
    grid-template-rows: auto 1fr auto;
    padding: var(--space-xs);
    gap: var(--space-xs);
    overflow: hidden;
    position: relative;
    z-index: 1;
    min-height: 0;
  }

  /* Top opponent (across) */
  .table-top {
    grid-area: top;
    display: flex;
    justify-content: center;
  }

  .opponent.top {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    transition: all 0.3s ease;
  }

  /* Left opponent */
  .table-left {
    grid-area: left;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .opponent.left {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--space-xs);
    border-radius: var(--radius-md);
    transition: all 0.3s ease;
  }

  /* Right opponent */
  .table-right {
    grid-area: right;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .opponent.right {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--space-xs);
    border-radius: var(--radius-md);
    transition: all 0.3s ease;
  }

  /* Center area */
  .table-center {
    grid-area: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    min-height: 0;
    overflow: hidden;
  }

  /* Opponent shared styles */
  .opponent {
    background: rgba(0, 0, 0, 0.2);
  }

  .opponent.current-turn {
    background: rgba(212, 168, 75, 0.15);
    box-shadow: 0 0 20px rgba(212, 168, 75, 0.3);
  }

  .opponent-info {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-body);
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .opponent.current-turn .opponent-info {
    color: var(--gold);
  }

  .opponent-wind {
    font-family: var(--font-display);
    font-size: 1rem;
  }

  .opponent-name {
    font-size: 0.75rem;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dealer-badge {
    background: linear-gradient(135deg, var(--crimson) 0%, #8b0000 100%);
    color: white;
    padding: 0.1rem 0.3rem;
    border-radius: var(--radius-sm);
    font-size: 0.55rem;
    font-family: var(--font-display);
  }

  /* Opponent melds */
  .opponent-melds {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .opponent-melds.vertical {
    flex-direction: column;
    align-items: center;
  }

  .labeled-meld {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }

  .meld-label {
    font-size: 0.5rem;
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .meld-tiles {
    display: flex;
    gap: 1px;
    background: rgba(0, 0, 0, 0.3);
    padding: 2px;
    border-radius: var(--radius-sm);
  }

  .meld-tiles.vertical {
    flex-direction: column;
  }

  .mini-tile {
    width: clamp(0.9rem, 2.5vw, 1.2rem);
    height: clamp(1.2rem, 3.5vw, 1.7rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 2px;
    padding: 1px;
    object-fit: contain;
  }

  /* Tile backs for opponent hands */
  .hand-backs {
    display: flex;
    gap: 1px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 200px;
  }

  .hand-backs.vertical {
    flex-direction: column;
    max-width: none;
    max-height: 150px;
  }

  .tile-back {
    width: clamp(0.7rem, 2vw, 1rem);
    height: clamp(1rem, 2.8vw, 1.4rem);
    background: linear-gradient(135deg, #1a4f3a 0%, #0d2a1f 100%);
    border-radius: 2px;
    border: 1px solid rgba(212, 168, 75, 0.2);
  }

  /* Turn indicator */
  .turn-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .turn-wind {
    font-size: clamp(2rem, 6vw, 3rem);
    font-family: var(--font-display);
    color: var(--gold);
    text-shadow: 0 0 20px rgba(212, 168, 75, 0.5);
    line-height: 1;
  }

  .turn-wind.active {
    animation: windPulse 2s ease-in-out infinite;
  }

  @keyframes windPulse {
    0%, 100% {
      text-shadow: 0 0 20px rgba(212, 168, 75, 0.5);
      transform: scale(1);
    }
    50% {
      text-shadow: 0 0 40px rgba(212, 168, 75, 0.8);
      transform: scale(1.05);
    }
  }

  .turn-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
    font-family: var(--font-body);
  }

  /* Central discard pool */
  .discard-pool {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xs);
    background: rgba(0, 0, 0, 0.25);
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    max-width: min(400px, 90vw);
    width: 100%;
  }

  .discard-section {
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    transition: all 0.3s ease;
  }

  .discard-section.current {
    border-color: rgba(212, 168, 75, 0.4);
    background: rgba(212, 168, 75, 0.1);
  }

  .discard-section.is-me {
    background: rgba(100, 180, 130, 0.1);
  }

  .discard-label {
    font-family: var(--font-display);
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-bottom: 2px;
  }

  .discard-section.current .discard-label {
    color: var(--gold);
  }

  .discard-tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    min-height: 1.5rem;
  }

  .discarded {
    font-size: clamp(0.9rem, 3vw, 1.2rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: var(--radius-sm);
    padding: 0.05rem 0.1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .discarded.latest {
    box-shadow: 0 2px 8px rgba(212, 168, 75, 0.4);
    animation: tileAppear 0.3s ease-out;
  }

  @keyframes tileAppear {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(-5px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* My area (bottom) */
  .my-area {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.5) 100%);
    padding: var(--space-xs) var(--space-sm);
    padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid rgba(212, 168, 75, 0.2);
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .hu-button {
    display: block;
    margin: 0 auto var(--space-xs);
    padding: var(--space-xs) var(--space-lg);
    background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
    color: #1a0f0a;
    border: none;
    border-radius: var(--radius-lg);
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    animation: huPulse 1s ease-in-out infinite;
    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
  }

  .hu-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 30px rgba(255, 215, 0, 0.7);
  }

  @keyframes huPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }

  .my-melds {
    display: flex;
    gap: var(--space-sm);
    justify-content: center;
    margin-bottom: var(--space-xs);
    flex-wrap: wrap;
  }

  .meld-tile-img {
    width: clamp(1rem, 3.5vw, 1.5rem);
    height: clamp(1.4rem, 5vw, 2rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 3px;
    padding: 2px;
    object-fit: contain;
  }

  .my-bonus {
    display: flex;
    justify-content: center;
    gap: 4px;
    margin-bottom: var(--space-xs);
  }

  .bonus-tile-img {
    width: clamp(0.9rem, 2.5vw, 1.2rem);
    height: clamp(1.2rem, 3.5vw, 1.7rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 2px;
    padding: 1px;
    object-fit: contain;
  }

  /* Responsive adjustments */
  @media (max-width: 500px) {
    .table {
      grid-template-columns: minmax(50px, auto) 1fr minmax(50px, auto);
    }

    .opponent-name {
      display: none;
    }

    .hand-backs {
      max-width: 100px;
    }

    .hand-backs.vertical {
      max-height: 100px;
    }

    .discard-pool {
      padding: var(--space-xs);
    }

    .discarded {
      font-size: 0.85rem;
    }
  }

  @media (min-width: 768px) {
    .table {
      padding: var(--space-sm);
      gap: var(--space-sm);
    }

    .turn-wind {
      font-size: 3.5rem;
    }

    .discard-pool {
      max-width: 500px;
    }
  }
</style>
