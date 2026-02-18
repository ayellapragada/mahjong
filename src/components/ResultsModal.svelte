<script lang="ts">
  import type { Seat, ScoreBreakdown, TileInstance, Meld } from "../game/types";
  import { SEAT_NAMES, SEAT_WINDS, tileToUnicode } from "../lib/tiles";

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
            <span class="tile">{tileToUnicode(tile.tile)}</span>
          {/each}
        </div>
        {#if winningMelds.length > 0}
          <div class="melds">
            {#each winningMelds as meld}
              <div class="meld">
                {#each meld.tiles as tile}
                  <span class="tile meld-tile">{tileToUnicode(tile.tile)}</span>
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
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: linear-gradient(145deg, var(--bg-table) 0%, var(--bg-felt) 100%);
    border: 2px solid var(--gold);
    border-radius: var(--radius-xl);
    padding: var(--space-lg);
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 0 60px rgba(212, 168, 75, 0.4);
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .winner-banner, .draw-banner {
    text-align: center;
    margin-bottom: var(--space-lg);
    padding: var(--space-md) var(--space-lg);
    background: linear-gradient(135deg, rgba(212, 168, 75, 0.25) 0%, rgba(184, 134, 11, 0.15) 100%);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(212, 168, 75, 0.3);
  }

  .winner-banner .wind {
    font-size: 2.5rem;
    display: block;
    margin-bottom: var(--space-xs);
  }

  .winner-banner .name {
    font-family: var(--font-display);
    font-size: 1.6rem;
    color: var(--gold);
    display: block;
  }

  .winner-banner .win-type {
    display: block;
    font-size: 1.3rem;
    color: var(--crimson);
    margin-top: var(--space-sm);
    font-family: var(--font-display);
  }

  .draw-banner {
    background: linear-gradient(135deg, rgba(100, 100, 100, 0.25) 0%, rgba(60, 60, 60, 0.15) 100%);
    border-color: rgba(150, 150, 150, 0.3);
  }

  .draw-text {
    font-size: 2.5rem;
    display: block;
    color: var(--text-secondary);
  }

  .draw-subtitle {
    font-family: var(--font-display);
    font-size: 1.2rem;
    color: var(--text-muted);
    display: block;
    margin-top: var(--space-xs);
  }

  .winning-hand {
    text-align: center;
    margin-bottom: var(--space-lg);
    padding: var(--space-md);
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-lg);
  }

  .hand-tiles {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: var(--space-sm);
  }

  .tile {
    font-size: 2.2rem;
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.35rem;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  }

  .melds {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    margin-top: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .meld {
    display: flex;
    gap: 3px;
    padding: var(--space-xs);
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm);
  }

  .meld-tile {
    font-size: 1.6rem !important;
  }

  .scoring {
    margin-bottom: var(--space-lg);
  }

  .scoring h3, .scores h3 {
    font-family: var(--font-display);
    color: var(--gold);
    margin-bottom: var(--space-sm);
    text-align: center;
    font-size: 1.2rem;
  }

  .scoring table {
    width: 100%;
    border-collapse: collapse;
  }

  .scoring td {
    padding: var(--space-xs) var(--space-sm);
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
    padding-top: var(--space-sm);
  }

  .score-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
  }

  .score-item {
    text-align: center;
    padding: var(--space-sm);
    background: rgba(0, 0, 0, 0.25);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
  }

  .score-item.winner {
    background: rgba(212, 168, 75, 0.15);
    border-color: var(--gold);
  }

  .seat {
    display: block;
    font-size: 1.3rem;
    margin-bottom: var(--space-xs);
  }

  .score {
    font-family: var(--font-display);
    font-size: 1.15rem;
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
    padding: var(--space-md);
    margin-top: var(--space-lg);
    background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
    color: var(--bg-dark);
    border: none;
    border-radius: var(--radius-lg);
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .next-round-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(212, 168, 75, 0.5);
  }

  @media (max-width: 600px) {
    .modal {
      padding: var(--space-md);
      margin: var(--space-sm);
    }

    .winner-banner .wind, .draw-text {
      font-size: 2rem;
    }

    .winner-banner .name {
      font-size: 1.3rem;
    }

    .tile {
      font-size: 1.6rem;
      padding: 0.15rem 0.25rem;
    }

    .meld-tile {
      font-size: 1.3rem !important;
    }

    .score-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .next-round-btn {
      font-size: 1.1rem;
      padding: var(--space-sm) var(--space-md);
    }
  }
</style>
