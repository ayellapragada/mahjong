<script lang="ts">
  import type { Seat } from "../game/types";
  import { SEAT_NAMES, SEAT_WINDS } from "../lib/tiles";

  interface Props {
    roomCode: string;
    players: Array<{ name: string; seat: Seat }>;
    loading?: boolean;
    onTakeSeat: (name: string, seat: Seat) => void;
    onStartGame: () => void;
    onLeave: () => void;
  }

  let { roomCode, players, loading = false, onTakeSeat, onStartGame, onLeave }: Props = $props();

  let playerName = $state("");
  let hasJoined = $derived(players.some(p => p.name === playerName && playerName !== ""));

  function getPlayerInSeat(seat: Seat): string | null {
    const player = players.find(p => p.seat === seat);
    return player?.name ?? null;
  }

  function isSeatTaken(seat: Seat): boolean {
    return players.some(p => p.seat === seat);
  }

  function handleTakeSeat(seat: Seat) {
    if (playerName && !isSeatTaken(seat) && !hasJoined) {
      onTakeSeat(playerName, seat);
    }
  }
</script>

<div class="lobby">
  <h1>Room: {roomCode}</h1>

  {#if loading}
    <div class="join-section">
      <div class="skeleton skeleton-input"></div>
    </div>
    <div class="seats-grid">
      {#each [0, 1, 2, 3] as _}
        <div class="seat-slot skeleton skeleton-seat"></div>
      {/each}
    </div>
    <div class="actions">
      <div class="skeleton skeleton-button"></div>
      <div class="skeleton skeleton-button"></div>
    </div>
  {:else}
    {#if !hasJoined}
      <div class="join-section">
        <label>
          Your Name
          <input
            type="text"
            bind:value={playerName}
            placeholder="Enter your name"
            maxlength="20"
          />
        </label>
      </div>
    {/if}

    <div class="seats-grid">
      {#each [0, 1, 2, 3] as seat}
        {@const playerInSeat = getPlayerInSeat(seat as Seat)}
        {@const taken = isSeatTaken(seat as Seat)}
        <button
          class="seat-slot"
          class:occupied={taken}
          class:available={!taken && playerName && !hasJoined}
          disabled={taken || !playerName || hasJoined}
          onclick={() => handleTakeSeat(seat as Seat)}
        >
          <div class="seat-label">{SEAT_WINDS[seat]} {SEAT_NAMES[seat]}</div>
          <div class="player-name">
            {#if playerInSeat}
              {playerInSeat}
            {:else if playerName && !hasJoined}
              <span class="click-to-join">Click to sit</span>
            {:else}
              <span class="empty">Empty</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>

    <div class="actions">
      <button
        class="btn primary"
        onclick={onStartGame}
        disabled={players.length === 0}
      >
        {players.length === 4 ? "Start Game" : `Start with ${4 - players.length} Bot${4 - players.length === 1 ? '' : 's'}`}
      </button>

      <button class="btn secondary" onclick={onLeave}>
        Leave Room
      </button>
    </div>
  {/if}
</div>

<style>
  .skeleton {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.05) 25%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-md);
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .skeleton-seat {
    height: 80px;
  }

  .skeleton-input {
    height: 48px;
    width: 100%;
  }

  .skeleton-button {
    height: 44px;
    width: 100%;
  }

  .lobby {
    max-width: 520px;
    margin: 0 auto;
    padding: var(--space-md);
    padding-top: calc(var(--space-md) + env(safe-area-inset-top, 0px));
    padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
    text-align: center;
    background: linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-table) 100%);
    min-height: 100vh;
    min-height: 100dvh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-md);
  }

  h1 {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 600;
    margin: 0;
    letter-spacing: 0.3em;
    color: var(--gold);
    text-shadow: 0 2px 8px rgba(212, 168, 75, 0.4);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .join-section {
    background: linear-gradient(135deg, rgba(45, 134, 89, 0.15) 0%, rgba(10, 61, 31, 0.3) 100%);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-lg);
    text-align: left;
    border: 1px solid rgba(45, 134, 89, 0.3);
    animation: fadeIn 0.5s ease-out 0.1s both;
  }

  .join-section label {
    display: block;
    color: var(--text-secondary);
    font-weight: 500;
    font-family: var(--font-body);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .join-section input {
    display: block;
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    margin-top: var(--space-sm);
    font-size: 1.1rem;
    font-family: var(--font-body);
    border: 2px solid var(--jade);
    border-radius: var(--radius-md);
    box-sizing: border-box;
    background: rgba(10, 61, 31, 0.5);
    color: var(--text-primary);
    transition: all 0.2s ease;
  }

  .join-section input::placeholder {
    color: var(--text-muted);
  }

  .join-section input:focus {
    outline: none;
    border-color: var(--gold);
    box-shadow: 0 0 20px rgba(212, 168, 75, 0.2);
  }

  .seats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
  }

  .seat-slot {
    padding: var(--space-sm);
    background: linear-gradient(145deg, rgba(10, 61, 31, 0.4) 0%, rgba(26, 15, 10, 0.6) 100%);
    border: 2px dashed rgba(45, 134, 89, 0.4);
    border-radius: var(--radius-lg);
    color: var(--text-muted);
    cursor: not-allowed;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .seat-slot::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.2) 100%);
    pointer-events: none;
  }

  .seat-slot.available {
    cursor: pointer;
    border-color: var(--jade);
    border-style: solid;
  }

  .seat-slot.available:hover {
    background: linear-gradient(145deg, rgba(45, 134, 89, 0.3) 0%, rgba(10, 61, 31, 0.5) 100%);
    border-color: var(--gold);
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  .seat-slot.occupied {
    background: linear-gradient(145deg, rgba(45, 134, 89, 0.25) 0%, rgba(10, 61, 31, 0.4) 100%);
    border: 2px solid var(--gold);
    border-style: solid;
    color: var(--text-primary);
    cursor: default;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 4px 15px rgba(0, 0, 0, 0.2);
  }

  .seat-label {
    font-family: var(--font-display);
    font-size: 1.2rem;
    margin-bottom: 2px;
    color: var(--text-primary);
    position: relative;
  }

  .player-name {
    font-size: 0.95rem;
    font-weight: 600;
    font-family: var(--font-body);
    color: var(--gold);
    position: relative;
  }

  .player-name .empty {
    color: var(--text-muted);
    font-weight: 400;
    font-style: italic;
  }

  .player-name .click-to-join {
    color: var(--jade);
    font-weight: 400;
    font-size: 0.9rem;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    animation: fadeIn 0.5s ease-out 0.3s both;
  }

  .btn {
    width: 100%;
    padding: var(--space-sm);
    font-size: 0.95rem;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    font-family: var(--font-body);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transition: all 0.2s ease;
  }

  .btn.primary {
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%);
    color: var(--bg-deep);
    box-shadow:
      0 4px 15px rgba(212, 168, 75, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn.primary:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 100%);
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px rgba(212, 168, 75, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .btn.secondary {
    background: linear-gradient(135deg, rgba(60, 60, 60, 0.8) 0%, rgba(40, 40, 40, 0.9) 100%);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn.secondary:hover {
    background: linear-gradient(135deg, rgba(80, 80, 80, 0.8) 0%, rgba(60, 60, 60, 0.9) 100%);
    color: var(--text-primary);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 480px) {
    .lobby {
      padding: var(--space-sm);
      padding-top: calc(var(--space-sm) + env(safe-area-inset-top, 0px));
      padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom, 0px));
      gap: var(--space-sm);
    }

    h1 {
      font-size: 1.5rem;
      letter-spacing: 0.15em;
    }

    .join-section {
      padding: var(--space-xs) var(--space-sm);
    }

    .join-section input {
      padding: var(--space-xs) var(--space-sm);
      font-size: 1rem;
    }

    .qr-section img {
      width: 160px;
      height: 160px;
    }

    .seats-grid {
      gap: var(--space-xs);
    }

    .seat-slot {
      padding: var(--space-xs);
    }

    .seat-label {
      font-size: 1.1rem;
    }

    .player-name {
      font-size: 0.85rem;
    }

    .btn {
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.85rem;
    }
  }
</style>
