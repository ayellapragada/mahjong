<script lang="ts">
  import type { Seat, ScoreBreakdown, TileInstance, Meld } from "../game/types";
  import { SEAT_NAMES, SEAT_WINDS, tileToSvgPath } from "../lib/tiles";

  interface Props {
    winner: Seat | -1; // -1 for draw
    winnerName: string;
    breakdown: ScoreBreakdown;
    scores: Record<Seat, number>;
    winningHand: TileInstance[];
    winningMelds: Meld[];
    isSelfDrawn: boolean;
    onNextRound: () => void;
  }

  let {
    winner,
    winnerName,
    breakdown,
    scores,
    winningHand,
    winningMelds,
    isSelfDrawn,
    onNextRound,
  }: Props = $props();

  let isDraw = $derived(winner === -1);
</script>

<div class="modal-overlay">
  <div class="modal">
    {#if isDraw}
      <div class="draw-banner">
        <span class="draw-text">流局</span>
        <span class="draw-subtitle">Draw - Wall Exhausted</span>
      </div>
    {:else}
      <div class="winner-banner">
        <span class="wind">{SEAT_WINDS[winner as Seat]}</span>
        <span class="name">{winnerName}</span>
        <span class="win-type">{isSelfDrawn ? '自摸 Self-Draw!' : '胡 Hu!'}</span>
      </div>

      <div class="winning-hand">
        <div class="hand-tiles">
          {#each winningHand as tile}
            <img src={tileToSvgPath(tile.tile)} alt="" class="tile" />
          {/each}
        </div>
        {#if winningMelds.length > 0}
          <div class="melds">
            {#each winningMelds as meld}
              <div class="meld">
                {#each meld.tiles as tile}
                  <img src={tileToSvgPath(tile.tile)} alt="" class="tile meld-tile" />
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="scoring">
        <h3>Scoring</h3>
        <table>
          <tbody>
            {#each breakdown.items as item}
              <tr>
                <td class="item-name">{item.name}</td>
                <td class="item-fan">{item.fan} fan</td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="total">
              <td>Total</td>
              <td>{breakdown.fan} fan = {breakdown.totalPoints} pts</td>
            </tr>
          </tfoot>
        </table>
      </div>
    {/if}

    <div class="scores">
      <h3>Scores</h3>
      <div class="score-grid">
        {#each [0, 1, 2, 3] as seat}
          <div class="score-item" class:winner={seat === winner}>
            <span class="seat">{SEAT_WINDS[seat as Seat]}</span>
            <span class="score" class:positive={scores[seat as Seat] > 0} class:negative={scores[seat as Seat] < 0}>
              {scores[seat as Seat] > 0 ? '+' : ''}{scores[seat as Seat]}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <button class="next-round-btn" onclick={onNextRound}>
      Next Round
    </button>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: var(--space-sm);
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: linear-gradient(145deg, var(--bg-table) 0%, var(--bg-felt) 100%);
    border: 2px solid var(--gold);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    width: min(400px, calc(100vw - 2rem));
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    box-shadow: 0 0 40px rgba(212, 168, 75, 0.3);
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .winner-banner, .draw-banner {
    text-align: center;
    margin-bottom: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: linear-gradient(135deg, rgba(212, 168, 75, 0.25) 0%, rgba(184, 134, 11, 0.15) 100%);
    border-radius: var(--radius-md);
    border: 1px solid rgba(212, 168, 75, 0.3);
  }

  .winner-banner .wind {
    font-size: 1.8rem;
    display: block;
    margin-bottom: 2px;
  }

  .winner-banner .name {
    font-family: var(--font-display);
    font-size: 1.1rem;
    color: var(--gold);
    display: block;
  }

  .winner-banner .win-type {
    display: block;
    font-size: 0.95rem;
    color: var(--crimson);
    margin-top: var(--space-xs);
    font-family: var(--font-display);
  }

  .draw-banner {
    background: linear-gradient(135deg, rgba(100, 100, 100, 0.25) 0%, rgba(60, 60, 60, 0.15) 100%);
    border-color: rgba(150, 150, 150, 0.3);
  }

  .draw-text {
    font-size: 1.8rem;
    display: block;
    color: var(--text-secondary);
  }

  .draw-subtitle {
    font-family: var(--font-display);
    font-size: 0.9rem;
    color: var(--text-muted);
    display: block;
    margin-top: 2px;
  }

  .winning-hand {
    text-align: center;
    margin-bottom: var(--space-md);
    padding: var(--space-sm);
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
  }

  .hand-tiles {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 3px;
    margin-bottom: var(--space-xs);
  }

  .tile {
    width: clamp(1.6rem, 5vw, 2rem);
    height: clamp(2.2rem, 7vw, 2.8rem);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: 3px;
    padding: 2px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    object-fit: contain;
  }

  .melds {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .meld {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  .meld-tile {
    width: clamp(1.2rem, 4vw, 1.6rem) !important;
    height: clamp(1.7rem, 5.5vw, 2.2rem) !important;
    padding: 1px !important;
  }

  .scoring {
    margin-bottom: var(--space-md);
  }

  .scoring h3, .scores h3 {
    font-family: var(--font-display);
    color: var(--gold);
    margin-bottom: var(--space-xs);
    text-align: center;
    font-size: 0.95rem;
  }

  .scoring table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .scoring td {
    padding: 4px var(--space-xs);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .item-name {
    color: var(--text-primary);
    font-family: var(--font-body);
  }

  .item-fan {
    text-align: right;
    color: var(--jade);
    font-weight: 600;
  }

  .total {
    font-weight: bold;
  }

  .total td {
    border-top: 2px solid var(--gold);
    border-bottom: none;
    color: var(--gold);
    padding-top: var(--space-xs);
  }

  .score-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-xs);
  }

  .score-item {
    text-align: center;
    padding: var(--space-xs);
    background: rgba(0, 0, 0, 0.25);
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
  }

  .score-item.winner {
    background: rgba(212, 168, 75, 0.15);
    border-color: var(--gold);
  }

  .seat {
    display: block;
    font-size: 1rem;
    margin-bottom: 2px;
  }

  .score {
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .score.positive {
    color: var(--jade);
  }

  .score.negative {
    color: var(--crimson);
  }

  .next-round-btn {
    display: block;
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    margin-top: var(--space-md);
    background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
    color: var(--bg-dark);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .next-round-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(212, 168, 75, 0.5);
  }

  /* Small mobile screens */
  @media (max-width: 380px) {
    .modal {
      padding: var(--space-sm);
    }

    .winner-banner .wind, .draw-text {
      font-size: 1.5rem;
    }

    .winner-banner .name {
      font-size: 1rem;
    }

    .tile {
      width: 1.4rem;
      height: 2rem;
    }

    .meld-tile {
      width: 1.1rem !important;
      height: 1.5rem !important;
    }

    .score-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .scoring table {
      font-size: 0.8rem;
    }
  }
</style>
