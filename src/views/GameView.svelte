<script lang="ts">
  import type { ClientGameState } from "../game/types";
  import { SEAT_NAMES, SEAT_WINDS, tileToUnicode } from "../lib/tiles";
  import Hand from "../components/Hand.svelte";
  import CallPrompt from "../components/CallPrompt.svelte";

  interface Props {
    state: ClientGameState;
    onDiscard: (tileId: string) => void;
    onCall: (type: string, tileIds: string[]) => void;
  }

  let { state, onDiscard, onCall }: Props = $props();

  let isMyTurn = $derived(state.currentTurn === state.mySeat);
  let canDiscard = $derived(isMyTurn && state.turnPhase === "discarding");
  let canWin = $derived(state.canWin);
  let showCallPrompt = $derived(
    state.turnPhase === "waiting_for_calls" &&
    state.availableCalls.length > 0
  );
</script>

<div class="game">
  <header>
    <div class="room-info">
      Room: <strong>{state.roomCode}</strong>
    </div>
    <div class="round-info">
      Round {state.roundNumber} · {SEAT_NAMES[state.dealerSeat]} Dealer
    </div>
    <div class="wall-info">
      Wall: {state.wallCount} tiles
    </div>
  </header>

  <div class="table">
    <!-- Other players -->
    <div class="other-players">
      {#each state.otherPlayers as player}
        <div
          class="player-info"
          class:current-turn={state.currentTurn === player.seat}
        >
          <div class="player-header">
            {SEAT_WINDS[player.seat]} {player.name}
            {#if player.isDealer}
              <span class="dealer-badge">莊</span>
            {/if}
          </div>
          <div class="player-stats">
            {player.handCount} tiles
          </div>
          {#if player.melds.length > 0}
            <div class="melds">
              {#each player.melds as meld}
                <div class="meld">
                  {#each meld.tiles as tile}
                    <span class="meld-tile">{tileToUnicode(tile.tile)}</span>
                  {/each}
                </div>
              {/each}
            </div>
          {/if}
          {#if player.bonusTiles.length > 0}
            <div class="bonus-tiles">
              {#each player.bonusTiles as bonus}
                <span class="bonus">{tileToUnicode(bonus.tile)}</span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Discard piles -->
    <div class="discard-area">
      {#each [0, 1, 2, 3] as seatNum}
        {@const seat = seatNum as 0 | 1 | 2 | 3}
        <div class="discard-pile">
          <div class="pile-label">{SEAT_WINDS[seat]}</div>
          <div class="pile-tiles">
            {#each state.discardPiles[seat].tiles as tile}
              <span class="discarded">{tileToUnicode(tile.tile)}</span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- My info & hand -->
  <div class="my-area">
    <div class="my-info">
      <strong>{SEAT_WINDS[state.mySeat]} {SEAT_NAMES[state.mySeat]}</strong>
      {#if state.dealerSeat === state.mySeat}
        <span class="dealer-badge">莊</span>
      {/if}
      <span class="turn-indicator" class:my-turn={isMyTurn}>
        {#if isMyTurn}
          {state.turnPhase === "discarding" ? "Your turn - discard a tile" : `Your turn - ${state.turnPhase}`}
        {:else}
          Waiting for {SEAT_NAMES[state.currentTurn]}
        {/if}
      </span>
    </div>

    {#if canWin}
      <button class="hu-button" onclick={() => onCall('win', [])}>
        胡 Hu!
      </button>
    {/if}

    {#if state.myBonusTiles.length > 0}
      <div class="my-bonus">
        Bonus:
        {#each state.myBonusTiles as bonus}
          <span class="bonus">{tileToUnicode(bonus.tile)}</span>
        {/each}
      </div>
    {/if}

    {#if state.myMelds.length > 0}
      <div class="my-melds">
        {#each state.myMelds as meld}
          <div class="meld">
            {#each meld.tiles as tile}
              <span class="meld-tile">{tileToUnicode(tile.tile)}</span>
            {/each}
          </div>
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
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, var(--bg-table) 0%, var(--bg-felt) 50%, var(--bg-table) 100%);
    color: var(--text-primary);
    position: relative;
  }

  .game::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 50% at 50% 40%, rgba(45, 134, 89, 0.15) 0%, transparent 70%),
      url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%);
    font-size: 0.85rem;
    font-family: var(--font-body);
    border-bottom: 1px solid rgba(212, 168, 75, 0.2);
    position: relative;
    z-index: 1;
  }

  .room-info {
    color: var(--text-secondary);
  }

  .room-info strong {
    color: var(--gold);
    font-family: var(--font-display);
    letter-spacing: 0.15em;
  }

  .round-info {
    color: var(--gold);
    font-weight: 500;
  }

  .wall-info {
    color: var(--text-muted);
  }

  .table {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--space-md);
    gap: var(--space-md);
    overflow: auto;
    position: relative;
    z-index: 1;
  }

  .other-players {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .player-info {
    background: linear-gradient(145deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-lg);
    text-align: center;
    min-width: 130px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
  }

  .player-info.current-turn {
    background: linear-gradient(145deg, rgba(212, 168, 75, 0.25) 0%, rgba(212, 168, 75, 0.1) 100%);
    border: 2px solid var(--gold);
    box-shadow:
      0 0 20px rgba(212, 168, 75, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    animation: glowPulse 2s ease-in-out infinite;
  }

  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(212, 168, 75, 0.2); }
    50% { box-shadow: 0 0 30px rgba(212, 168, 75, 0.35); }
  }

  .player-header {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 500;
    margin-bottom: var(--space-xs);
    color: var(--text-primary);
  }

  .player-stats {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-family: var(--font-body);
  }

  .dealer-badge {
    background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
    color: white;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    margin-left: var(--space-xs);
    font-family: var(--font-display);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .bonus-tiles, .my-bonus {
    margin-top: var(--space-sm);
    font-size: 1.8rem;
  }

  .bonus {
    margin: 0 2px;
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: var(--radius-sm);
    padding: 0.15rem 0.25rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .discard-area {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-sm);
  }

  .discard-pile {
    background: linear-gradient(145deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.15) 100%);
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.03);
  }

  .pile-label {
    font-family: var(--font-display);
    font-size: 1.1rem;
    margin-bottom: var(--space-xs);
    color: var(--text-secondary);
  }

  .pile-tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    min-height: 2.5rem;
  }

  .discarded {
    font-size: 1.75rem;
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: var(--radius-sm);
    padding: 0.1rem 0.2rem;
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
    transition: transform 0.15s ease;
  }

  .discarded:last-child {
    box-shadow:
      0 3px 8px rgba(212, 168, 75, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
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

  .my-area {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.6) 100%);
    padding: var(--space-md);
    border-top: 1px solid rgba(212, 168, 75, 0.2);
    position: relative;
    z-index: 1;
  }

  .my-info {
    text-align: center;
    margin-bottom: var(--space-sm);
    font-family: var(--font-display);
    font-size: 1.1rem;
  }

  .turn-indicator {
    display: block;
    margin-top: var(--space-xs);
    font-size: 0.85rem;
    font-family: var(--font-body);
    color: var(--text-muted);
    font-weight: 400;
  }

  .turn-indicator.my-turn {
    color: var(--gold);
    font-weight: 600;
    text-shadow: 0 0 10px rgba(212, 168, 75, 0.5);
    animation: turnPulse 1.5s ease-in-out infinite;
  }

  @keyframes turnPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .my-bonus {
    text-align: center;
    margin-bottom: var(--space-sm);
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .hu-button {
    display: block;
    margin: var(--space-sm) auto;
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
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
  }

  .hu-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 30px rgba(255, 215, 0, 0.7);
  }

  @keyframes huPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }

  .melds {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
    justify-content: center;
  }

  .meld {
    display: flex;
    gap: 2px;
    background: rgba(255, 255, 255, 0.05);
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .meld-tile {
    font-size: 1.4rem;
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 3px;
    padding: 0.08rem 0.18rem;
    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.15);
  }

  .my-melds {
    display: flex;
    gap: var(--space-sm);
    justify-content: center;
    margin-bottom: var(--space-sm);
  }

  /* Responsive styles */
  @media (max-width: 600px) {
    header {
      flex-wrap: wrap;
      gap: var(--space-xs);
      justify-content: center;
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.75rem;
    }

    .table {
      padding: var(--space-sm);
      gap: var(--space-sm);
    }

    .player-info {
      min-width: 100px;
      padding: var(--space-xs) var(--space-sm);
    }

    .player-header {
      font-size: 0.9rem;
    }

    .player-stats {
      font-size: 0.7rem;
    }

    .bonus-tiles, .my-bonus {
      font-size: 1.4rem;
    }

    .bonus {
      padding: 0.1rem 0.15rem;
    }

    .discard-area {
      gap: var(--space-xs);
    }

    .discard-pile {
      padding: var(--space-xs);
    }

    .pile-label {
      font-size: 0.9rem;
    }

    .discarded {
      font-size: 1.3rem;
      padding: 0.05rem 0.1rem;
    }

    .my-area {
      padding: var(--space-sm);
    }

    .my-info {
      font-size: 0.95rem;
    }

    .turn-indicator {
      font-size: 0.75rem;
    }

    .hu-button {
      font-size: 1.2rem;
      padding: var(--space-xs) var(--space-lg);
    }

    .meld-tile {
      font-size: 1.1rem;
    }
  }
</style>
