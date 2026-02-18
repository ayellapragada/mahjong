<script lang="ts">
  import { onMount } from "svelte";
  import QRCode from "qrcode";
  import type { Seat } from "../game/types";
  import { SEAT_NAMES, SEAT_WINDS } from "../lib/tiles";

  interface Props {
    roomCode: string;
    players: Array<{ name: string; seat: Seat }>;
    onTakeSeat: (name: string, seat: Seat) => void;
    onStartGame: () => void;
    onLeave: () => void;
  }

  let { roomCode, players, onTakeSeat, onStartGame, onLeave }: Props = $props();

  let qrCodeUrl = $state("");
  let playerName = $state("");
  let hasJoined = $derived(players.some(p => p.name === playerName && playerName !== ""));

  onMount(() => {
    generateQR();
  });

  async function generateQR() {
    const joinUrl = `${window.location.origin}?room=${roomCode}`;
    qrCodeUrl = await QRCode.toDataURL(joinUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#1a0f0a", light: "#faf6e9" }
    });
  }

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

  {#if qrCodeUrl}
    <div class="qr-section">
      <img src={qrCodeUrl} alt="QR Code to join room" />
      <p class="qr-hint">Scan to join on another device</p>
    </div>
  {/if}

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
</div>

<style>
  .lobby {
    max-width: 520px;
    margin: 0 auto;
    padding: var(--space-lg);
    text-align: center;
    background: linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-table) 100%);
    min-height: 100vh;
    box-sizing: border-box;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 2.25rem;
    font-weight: 600;
    margin-bottom: var(--space-md);
    letter-spacing: 0.3em;
    color: var(--gold);
    text-shadow: 0 2px 8px rgba(212, 168, 75, 0.4);
  }

  .qr-section {
    margin-bottom: var(--space-lg);
    animation: fadeIn 0.6s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .qr-section img {
    border-radius: var(--radius-lg);
    border: 3px solid var(--gold);
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.4),
      0 0 30px rgba(212, 168, 75, 0.15);
  }

  .qr-hint {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-top: var(--space-sm);
    font-family: var(--font-body);
  }

  .join-section {
    background: linear-gradient(135deg, rgba(45, 134, 89, 0.15) 0%, rgba(10, 61, 31, 0.3) 100%);
    padding: var(--space-md);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-lg);
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
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
  }

  .seat-slot {
    padding: var(--space-md) var(--space-sm);
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
    font-size: 1.4rem;
    margin-bottom: var(--space-xs);
    color: var(--text-primary);
    position: relative;
  }

  .player-name {
    font-size: 1.1rem;
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
    gap: var(--space-sm);
    animation: fadeIn 0.5s ease-out 0.3s both;
  }

  .btn {
    width: 100%;
    padding: var(--space-md);
    font-size: 1.05rem;
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
      padding: var(--space-md);
    }

    h1 {
      font-size: 1.75rem;
      letter-spacing: 0.2em;
    }

    .qr-section img {
      width: 160px;
      height: 160px;
    }

    .seats-grid {
      gap: var(--space-sm);
    }

    .seat-slot {
      padding: var(--space-sm) var(--space-xs);
    }

    .seat-label {
      font-size: 1.2rem;
    }

    .player-name {
      font-size: 0.95rem;
    }

    .btn {
      padding: var(--space-sm);
      font-size: 0.95rem;
    }
  }
</style>
