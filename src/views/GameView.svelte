<script lang="ts">
  import type { ClientGameState, Meld } from "../game/types";
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
    <!-- Other players with exposed melds -->
    <div class="opponents">
      {#each state.otherPlayers as player}
        <div class="opponent" class:current-turn={state.currentTurn === player.seat}>
          <div class="opponent-name">
            {WIND_CHARS[player.seat]} {player.name}
            {#if player.isDealer}
              <span class="dealer-badge">莊</span>
            {/if}
          </div>
          {#if player.melds.length > 0}
            <div class="opponent-melds">
              {#each player.melds as meld}
                <div class="labeled-meld">
                  <span class="meld-label">{getMeldLabel(meld)}</span>
                  <div class="meld-tiles">
                    {#each meld.tiles as tile}
                      <img src={tileToSvgPath(tile.tile)} alt="" class="mini-tile" />
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Central turn indicator -->
    <div class="turn-center">
      <div class="turn-wind" class:active={true}>
        {WIND_CHARS[state.currentTurn]}
      </div>
      <div class="turn-name">
        {#if isMyTurn}
          Your Turn
        {:else}
          {state.otherPlayers.find(p => p.seat === state.currentTurn)?.name || SEAT_NAMES[state.currentTurn]}
        {/if}
      </div>
    </div>

    <!-- Discard piles -->
    <div class="discard-area">
      {#each [0, 1, 2, 3] as seatNum}
        {@const seat = seatNum as 0 | 1 | 2 | 3}
        <div class="discard-pile" class:current={state.currentTurn === seat}>
          <div class="pile-label">{WIND_CHARS[seat]}</div>
          <div class="pile-tiles">
            {#each state.discardPiles[seat].tiles as tile}
              <span class="discarded">{tileToUnicode(tile.tile)}</span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- My area -->
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

  /* Simplified header */
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .room-badge {
    background: rgba(0, 0, 0, 0.4);
    color: var(--gold);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.85rem;
    letter-spacing: 0.1em;
  }

  .wall-count {
    color: var(--text-muted);
    font-size: 0.85rem;
    font-family: var(--font-body);
  }

  .table {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--space-sm) var(--space-md);
    gap: var(--space-sm);
    overflow: auto;
    position: relative;
    z-index: 1;
  }

  /* Opponents section */
  .opponents {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .opponent {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    transition: all 0.3s ease;
  }

  .opponent.current-turn {
    background: rgba(212, 168, 75, 0.15);
    box-shadow: 0 0 20px rgba(212, 168, 75, 0.2);
  }

  .opponent-name {
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .opponent.current-turn .opponent-name {
    color: var(--gold);
  }

  .dealer-badge {
    background: linear-gradient(135deg, var(--crimson) 0%, #8b0000 100%);
    color: white;
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
    font-size: 0.65rem;
    font-family: var(--font-display);
  }

  .opponent-melds {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    justify-content: center;
  }

  /* Labeled meld component */
  .labeled-meld {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .meld-label {
    font-size: 0.6rem;
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

  .mini-tile {
    width: clamp(1rem, 3vw, 1.4rem);
    height: clamp(1.4rem, 4vw, 2rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 2px;
    padding: 1px;
    object-fit: contain;
  }

  /* Central turn indicator */
  .turn-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
  }

  .turn-wind {
    font-size: clamp(2.5rem, 8vw, 4rem);
    font-family: var(--font-display);
    color: var(--gold);
    text-shadow: 0 0 30px rgba(212, 168, 75, 0.5);
    line-height: 1;
  }

  .turn-wind.active {
    animation: windPulse 2s ease-in-out infinite;
  }

  @keyframes windPulse {
    0%, 100% {
      text-shadow: 0 0 30px rgba(212, 168, 75, 0.5);
      transform: scale(1);
    }
    50% {
      text-shadow: 0 0 50px rgba(212, 168, 75, 0.8);
      transform: scale(1.05);
    }
  }

  .turn-name {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-family: var(--font-body);
    margin-top: var(--space-xs);
  }

  /* Discard area */
  .discard-area {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-xs);
  }

  .discard-pile {
    background: rgba(0, 0, 0, 0.2);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    transition: all 0.3s ease;
  }

  .discard-pile.current {
    border-color: rgba(212, 168, 75, 0.3);
    background: rgba(212, 168, 75, 0.05);
  }

  .pile-label {
    font-family: var(--font-display);
    font-size: 0.9rem;
    margin-bottom: 2px;
    color: var(--text-muted);
  }

  .discard-pile.current .pile-label {
    color: var(--gold);
  }

  .pile-tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    min-height: clamp(1.5rem, 4vw, 2rem);
  }

  .discarded {
    font-size: clamp(1rem, 3.5vw, 1.4rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: var(--radius-sm);
    padding: 0.05rem 0.1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .discarded:last-child {
    box-shadow: 0 3px 8px rgba(212, 168, 75, 0.3);
    animation: tileAppear 0.3s ease-out;
  }

  @keyframes tileAppear {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* My area */
  .my-area {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.5) 100%);
    padding: var(--space-sm) var(--space-md);
    padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid rgba(212, 168, 75, 0.15);
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .hu-button {
    display: block;
    margin: 0 auto var(--space-sm);
    padding: var(--space-sm) var(--space-xl);
    background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
    color: #1a0f0a;
    border: none;
    border-radius: var(--radius-lg);
    font-family: var(--font-display);
    font-size: 1.5rem;
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
    margin-bottom: var(--space-sm);
    flex-wrap: wrap;
  }

  .meld-tile-img {
    width: clamp(1.2rem, 4vw, 1.8rem);
    height: clamp(1.7rem, 5.5vw, 2.5rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 3px;
    padding: 2px;
    object-fit: contain;
  }

  .my-bonus {
    display: flex;
    justify-content: center;
    gap: 4px;
    margin-bottom: var(--space-sm);
  }

  .bonus-tile-img {
    width: clamp(1rem, 3vw, 1.4rem);
    height: clamp(1.4rem, 4vw, 2rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 2px;
    padding: 1px;
    object-fit: contain;
  }

  /* Responsive styles */
  @media (max-width: 600px) {
    header {
      padding: var(--space-xs) var(--space-sm);
    }

    .room-badge {
      font-size: 0.75rem;
      padding: 2px var(--space-xs);
    }

    .wall-count {
      font-size: 0.75rem;
    }

    .table {
      padding: var(--space-xs) var(--space-sm);
    }

    .opponent-name {
      font-size: 0.75rem;
    }

    .turn-center {
      padding: var(--space-sm);
    }

    .turn-wind {
      font-size: 2.5rem;
    }

    .turn-name {
      font-size: 0.75rem;
    }

    .discard-pile {
      padding: var(--space-xs);
    }

    .pile-label {
      font-size: 0.75rem;
    }

    .discarded {
      font-size: 1.1rem;
    }

    .my-area {
      padding: var(--space-xs) var(--space-sm);
      padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom, 0px));
    }

    .hu-button {
      font-size: 1.2rem;
      padding: var(--space-xs) var(--space-lg);
    }

    .meld-label {
      font-size: 0.5rem;
    }
  }
</style>
