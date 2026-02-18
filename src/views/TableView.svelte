<script lang="ts">
  import type { ClientGameState, Meld, Seat, RedactedPlayer } from "../game/types";
  import { tileToUnicode, tileToSvgPath } from "../lib/tiles";

  interface Props {
    state: ClientGameState;
  }

  let { state }: Props = $props();

  // Wind characters
  const WIND_CHARS = ['東', '南', '西', '北'] as const;

  // Get player by seat from otherPlayers (table view has all 4 in otherPlayers)
  function getPlayer(seat: Seat): RedactedPlayer | undefined {
    return state.otherPlayers.find(p => p.seat === seat);
  }

  let eastPlayer = $derived(getPlayer(0));
  let southPlayer = $derived(getPlayer(1));
  let westPlayer = $derived(getPlayer(2));
  let northPlayer = $derived(getPlayer(3));
</script>

<div class="table-view">
  <header>
    <div class="room-badge">{state.roomCode}</div>
    <div class="wall-count">{state.wallCount} tiles remaining</div>
  </header>

  <div class="table">
    <!-- North player (top) -->
    <div class="player-area north" class:current-turn={state.currentTurn === 3}>
      {#if northPlayer}
        <div class="player-info">
          <span class="wind">{WIND_CHARS[3]}</span>
          <span class="name">{northPlayer.name}</span>
          {#if northPlayer.isDealer}<span class="dealer">莊</span>{/if}
        </div>
        <div class="hand-indicator">{northPlayer.handCount} tiles</div>
        {#if northPlayer.melds.length > 0}
          <div class="melds">
            {#each northPlayer.melds as meld}
              <div class="meld">
                {#each meld.tiles as tile}
                  <img src={tileToSvgPath(tile.tile)} alt="" class="meld-tile" />
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- West player (left) -->
    <div class="player-area west" class:current-turn={state.currentTurn === 2}>
      {#if westPlayer}
        <div class="player-info vertical">
          <span class="wind">{WIND_CHARS[2]}</span>
          <span class="name">{westPlayer.name}</span>
          {#if westPlayer.isDealer}<span class="dealer">莊</span>{/if}
        </div>
        <div class="hand-indicator">{westPlayer.handCount}</div>
        {#if westPlayer.melds.length > 0}
          <div class="melds vertical">
            {#each westPlayer.melds as meld}
              <div class="meld vertical">
                {#each meld.tiles as tile}
                  <img src={tileToSvgPath(tile.tile)} alt="" class="meld-tile" />
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Center area: turn indicator + discard pools -->
    <div class="center">
      <div class="turn-indicator">
        <div class="turn-wind">{WIND_CHARS[state.currentTurn]}</div>
        <div class="turn-name">
          {state.otherPlayers.find(p => p.seat === state.currentTurn)?.name ?? 'Waiting...'}
        </div>
      </div>

      <div class="discard-pools">
        {#each [0, 1, 2, 3] as seatNum}
          {@const seat = seatNum as Seat}
          {@const player = getPlayer(seat)}
          <div class="discard-pool" class:current={state.currentTurn === seat}>
            <div class="pool-label">{WIND_CHARS[seat]} {player?.name ?? ''}</div>
            <div class="pool-tiles">
              {#each state.discardPiles[seat].tiles as tile, i}
                <span class="discarded" class:latest={i === state.discardPiles[seat].tiles.length - 1 && state.currentTurn !== seat}>
                  {tileToUnicode(tile.tile)}
                </span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- East player (right) -->
    <div class="player-area east" class:current-turn={state.currentTurn === 0}>
      {#if eastPlayer}
        <div class="player-info vertical">
          <span class="wind">{WIND_CHARS[0]}</span>
          <span class="name">{eastPlayer.name}</span>
          {#if eastPlayer.isDealer}<span class="dealer">莊</span>{/if}
        </div>
        <div class="hand-indicator">{eastPlayer.handCount}</div>
        {#if eastPlayer.melds.length > 0}
          <div class="melds vertical">
            {#each eastPlayer.melds as meld}
              <div class="meld vertical">
                {#each meld.tiles as tile}
                  <img src={tileToSvgPath(tile.tile)} alt="" class="meld-tile" />
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- South player (bottom) -->
    <div class="player-area south" class:current-turn={state.currentTurn === 1}>
      {#if southPlayer}
        <div class="player-info">
          <span class="wind">{WIND_CHARS[1]}</span>
          <span class="name">{southPlayer.name}</span>
          {#if southPlayer.isDealer}<span class="dealer">莊</span>{/if}
        </div>
        <div class="hand-indicator">{southPlayer.handCount} tiles</div>
        {#if southPlayer.melds.length > 0}
          <div class="melds">
            {#each southPlayer.melds as meld}
              <div class="meld">
                {#each meld.tiles as tile}
                  <img src={tileToSvgPath(tile.tile)} alt="" class="meld-tile" />
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .table-view {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: radial-gradient(ellipse at center, var(--bg-felt) 0%, var(--bg-table) 50%, var(--bg-deep) 100%);
    color: var(--text-primary);
    overflow: hidden;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md) var(--space-lg);
    flex-shrink: 0;
  }

  .room-badge {
    background: rgba(0, 0, 0, 0.5);
    color: var(--gold);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 1.2rem;
    letter-spacing: 0.15em;
  }

  .wall-count {
    color: var(--text-secondary);
    font-size: 1.1rem;
    font-family: var(--font-body);
  }

  .table {
    flex: 1;
    display: grid;
    grid-template-areas:
      ". north ."
      "west center east"
      ". south .";
    grid-template-columns: minmax(100px, 1fr) 3fr minmax(100px, 1fr);
    grid-template-rows: auto 1fr auto;
    padding: var(--space-md);
    gap: var(--space-md);
    min-height: 0;
  }

  /* Player areas */
  .player-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-lg);
    border: 2px solid transparent;
    transition: all 0.3s ease;
  }

  .player-area.current-turn {
    background: rgba(212, 168, 75, 0.15);
    border-color: var(--gold);
    box-shadow: 0 0 30px rgba(212, 168, 75, 0.3);
  }

  .player-area.north { grid-area: north; }
  .player-area.south { grid-area: south; }
  .player-area.east { grid-area: east; }
  .player-area.west { grid-area: west; }

  .player-info {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .player-info.vertical {
    flex-direction: column;
  }

  .wind {
    font-family: var(--font-display);
    font-size: 2rem;
    color: var(--gold);
  }

  .name {
    font-family: var(--font-body);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .dealer {
    background: linear-gradient(135deg, var(--crimson) 0%, #8b0000 100%);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-family: var(--font-display);
  }

  .hand-indicator {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .melds {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    justify-content: center;
  }

  .melds.vertical {
    flex-direction: column;
  }

  .meld {
    display: flex;
    gap: 2px;
    background: rgba(0, 0, 0, 0.4);
    padding: 4px;
    border-radius: var(--radius-sm);
  }

  .meld.vertical {
    flex-direction: column;
  }

  .meld-tile {
    width: clamp(1.5rem, 4vw, 2.2rem);
    height: clamp(2.1rem, 5.5vw, 3rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 3px;
    padding: 2px;
    object-fit: contain;
  }

  /* Center area */
  .center {
    grid-area: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-lg);
  }

  .turn-indicator {
    text-align: center;
  }

  .turn-wind {
    font-size: clamp(4rem, 10vw, 8rem);
    font-family: var(--font-display);
    color: var(--gold);
    text-shadow: 0 0 40px rgba(212, 168, 75, 0.6);
    line-height: 1;
    animation: windPulse 2s ease-in-out infinite;
  }

  @keyframes windPulse {
    0%, 100% {
      text-shadow: 0 0 40px rgba(212, 168, 75, 0.6);
      transform: scale(1);
    }
    50% {
      text-shadow: 0 0 60px rgba(212, 168, 75, 0.9);
      transform: scale(1.05);
    }
  }

  .turn-name {
    font-size: 1.5rem;
    color: var(--text-secondary);
    font-family: var(--font-body);
    margin-top: var(--space-sm);
  }

  /* Discard pools */
  .discard-pools {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    background: rgba(0, 0, 0, 0.3);
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    max-width: min(700px, 90vw);
    width: 100%;
  }

  .discard-pool {
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    border: 2px solid transparent;
    transition: all 0.3s ease;
    background: rgba(0, 0, 0, 0.2);
  }

  .discard-pool.current {
    border-color: var(--gold);
    background: rgba(212, 168, 75, 0.1);
  }

  .pool-label {
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--text-muted);
    margin-bottom: var(--space-xs);
  }

  .discard-pool.current .pool-label {
    color: var(--gold);
  }

  .pool-tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 2.5rem;
  }

  .discarded {
    font-size: clamp(1.2rem, 4vw, 1.8rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: var(--radius-sm);
    padding: 0.1rem 0.15rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .discarded.latest {
    box-shadow: 0 4px 15px rgba(212, 168, 75, 0.5);
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

  /* iPad landscape optimization */
  @media (min-width: 768px) and (orientation: landscape) {
    .table {
      grid-template-columns: minmax(150px, 1fr) 2fr minmax(150px, 1fr);
      padding: var(--space-lg);
    }

    .wind {
      font-size: 2.5rem;
    }

    .name {
      font-size: 1.4rem;
    }

    .discard-pools {
      max-width: 800px;
    }
  }
</style>
