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
    <!-- North player (top) - rotated 180deg to face center -->
    <div class="player-section north">
      <div class="player-content">
        <div class="player-area" class:current-turn={state.currentTurn === 3}>
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
        <div class="discard-area" class:current={state.currentTurn === 3}>
          <div class="pool-tiles">
            {#each state.discardPiles[3].tiles as tile, i}
              <img
                src={tileToSvgPath(tile.tile)}
                alt=""
                class="discarded"
                class:latest={i === state.discardPiles[3].tiles.length - 1 && state.currentTurn !== 3}
              />
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- West player (left) - rotated 90deg clockwise to face center -->
    <div class="player-section west">
      <div class="player-content">
        <div class="player-area" class:current-turn={state.currentTurn === 2}>
          {#if westPlayer}
            <div class="player-info">
              <span class="wind">{WIND_CHARS[2]}</span>
              <span class="name">{westPlayer.name}</span>
              {#if westPlayer.isDealer}<span class="dealer">莊</span>{/if}
            </div>
            <div class="hand-indicator">{westPlayer.handCount} tiles</div>
            {#if westPlayer.melds.length > 0}
              <div class="melds">
                {#each westPlayer.melds as meld}
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
        <div class="discard-area" class:current={state.currentTurn === 2}>
          <div class="pool-tiles">
            {#each state.discardPiles[2].tiles as tile, i}
              <img
                src={tileToSvgPath(tile.tile)}
                alt=""
                class="discarded"
                class:latest={i === state.discardPiles[2].tiles.length - 1 && state.currentTurn !== 2}
              />
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Center area: turn indicator only -->
    <div class="center">
      <div class="turn-indicator">
        <div class="turn-wind">{WIND_CHARS[state.currentTurn]}</div>
        <div class="turn-name">
          {state.otherPlayers.find(p => p.seat === state.currentTurn)?.name ?? 'Waiting...'}
        </div>
      </div>
    </div>

    <!-- East player (right) - rotated 90deg counter-clockwise to face center -->
    <div class="player-section east">
      <div class="player-content">
        <div class="player-area" class:current-turn={state.currentTurn === 0}>
          {#if eastPlayer}
            <div class="player-info">
              <span class="wind">{WIND_CHARS[0]}</span>
              <span class="name">{eastPlayer.name}</span>
              {#if eastPlayer.isDealer}<span class="dealer">莊</span>{/if}
            </div>
            <div class="hand-indicator">{eastPlayer.handCount} tiles</div>
            {#if eastPlayer.melds.length > 0}
              <div class="melds">
                {#each eastPlayer.melds as meld}
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
        <div class="discard-area" class:current={state.currentTurn === 0}>
          <div class="pool-tiles">
            {#each state.discardPiles[0].tiles as tile, i}
              <img
                src={tileToSvgPath(tile.tile)}
                alt=""
                class="discarded"
                class:latest={i === state.discardPiles[0].tiles.length - 1 && state.currentTurn !== 0}
              />
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- South player (bottom) - discard near center, player info at edge, both rotated -->
    <div class="player-section south">
      <div class="player-content">
        <div class="discard-area rotated" class:current={state.currentTurn === 1}>
          <div class="pool-tiles">
            {#each state.discardPiles[1].tiles as tile, i}
              <img
                src={tileToSvgPath(tile.tile)}
                alt=""
                class="discarded"
                class:latest={i === state.discardPiles[1].tiles.length - 1 && state.currentTurn !== 1}
              />
            {/each}
          </div>
        </div>
        <div class="player-area rotated" class:current-turn={state.currentTurn === 1}>
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
  </div>
</div>

<style>
  .table-view {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: radial-gradient(ellipse at center, var(--bg-felt) 0%, var(--bg-table) 50%, var(--bg-deep) 100%);
    color: var(--text-primary);
    overflow-y: auto;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
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

  /* Player sections - positioned in grid */
  .player-section {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .player-section.north {
    grid-area: north;
  }

  .player-section.south {
    grid-area: south;
  }

  .player-section.west {
    grid-area: west;
  }

  .player-section.east {
    grid-area: east;
  }

  /* Player content wrapper - this gets rotated */
  .player-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
  }

  /* Rotate player content to face outward (readable by person on that side of table) */
  .player-section.east .player-content {
    transform: rotate(90deg);
  }

  .player-section.west .player-content {
    transform: rotate(-90deg);
  }

  /* North faces up naturally - readable from top of table */
  /* South: rotate player-area to face outward, rotate discard to face center */
  .player-section.south .player-area.rotated,
  .player-section.south .discard-area.rotated {
    transform: rotate(180deg);
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

  .player-info {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
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

  .meld {
    display: flex;
    gap: 2px;
    background: rgba(0, 0, 0, 0.4);
    padding: 4px;
    border-radius: var(--radius-sm);
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

  /* Discard areas near each player */
  .discard-area {
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    border: 2px solid transparent;
    transition: all 0.3s ease;
    background: rgba(0, 0, 0, 0.2);
  }

  .discard-area.current {
    border-color: var(--gold);
    background: rgba(212, 168, 75, 0.1);
  }

  .pool-tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    justify-content: center;
    align-content: flex-start;
    /* 6 tiles wide */
    width: calc(6 * clamp(1.3rem, 3.5vw, 1.8rem) + 5 * 3px);
    min-height: calc(2 * clamp(1.8rem, 4.8vw, 2.5rem) + 3px);
  }

  .discarded {
    width: clamp(1.3rem, 3.5vw, 1.8rem);
    height: clamp(1.8rem, 4.8vw, 2.5rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: var(--radius-sm);
    padding: 2px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    object-fit: contain;
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

  /* Mobile phones */
  @media (max-width: 600px) {
    header {
      padding: var(--space-xs) var(--space-sm);
    }

    .room-badge {
      font-size: 0.9rem;
      padding: var(--space-xs) var(--space-sm);
    }

    .wall-count {
      font-size: 0.8rem;
    }

    .table {
      grid-template-columns: minmax(60px, 1fr) 2fr minmax(60px, 1fr);
      padding: var(--space-xs);
      gap: var(--space-xs);
    }

    .player-area {
      padding: var(--space-xs);
      gap: var(--space-xs);
    }

    .wind {
      font-size: 1.2rem;
    }

    .name {
      font-size: 0.75rem;
    }

    .dealer {
      font-size: 0.65rem;
      padding: 0.1rem 0.3rem;
    }

    .hand-indicator {
      font-size: 0.65rem;
    }

    .meld-tile {
      width: 1.2rem;
      height: 1.7rem;
    }

    .turn-wind {
      font-size: 3rem;
    }

    .turn-name {
      font-size: 1rem;
    }

    .discard-area {
      padding: var(--space-xs);
    }

    .pool-tiles {
      gap: 2px;
      width: calc(6 * 1rem + 5 * 2px);
      min-height: calc(2 * 1.4rem + 2px);
    }

    .discarded {
      width: 1rem;
      height: 1.4rem;
    }
  }

  /* Very small phones */
  @media (max-width: 375px) {
    .table {
      grid-template-columns: minmax(50px, 1fr) 2fr minmax(50px, 1fr);
    }

    .wind {
      font-size: 1rem;
    }

    .name {
      font-size: 0.65rem;
    }

    .turn-wind {
      font-size: 2.5rem;
    }

    .turn-name {
      font-size: 0.85rem;
    }

    .discarded {
      width: 0.9rem;
      height: 1.2rem;
    }
  }

  /* iPad landscape optimization */
  @media (min-width: 768px) and (orientation: landscape) {
    .table {
      grid-template-columns: minmax(200px, 1fr) 2fr minmax(200px, 1fr);
      padding: var(--space-lg);
    }

    .wind {
      font-size: 2.5rem;
    }

    .name {
      font-size: 1.4rem;
    }
  }
</style>
