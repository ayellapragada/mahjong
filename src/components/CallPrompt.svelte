<script lang="ts">
  import type { AvailableCall, TileInstance } from "../game/types";
  import { tileToUnicode } from "../lib/tiles";

  interface Props {
    calls: AvailableCall[];
    onCall: (type: string, tileIds: string[]) => void;
  }

  let { calls, onCall }: Props = $props();

  let selectedChiCombo = $state<number | null>(null);

  const hasChi = $derived(calls.some(c => c.type === "chi"));
  const hasPeng = $derived(calls.some(c => c.type === "peng"));
  const hasGang = $derived(calls.some(c => c.type === "gang"));
  const hasWin = $derived(calls.some(c => c.type === "win"));

  const chiCall = $derived(calls.find(c => c.type === "chi"));
  const pengCall = $derived(calls.find(c => c.type === "peng"));
  const gangCall = $derived(calls.find(c => c.type === "gang"));

  function handleChi() {
    if (!chiCall?.tiles) return;

    // If multiple combinations, need to select
    if (chiCall.tiles.length > 1 && selectedChiCombo === null) {
      return; // Must select first
    }

    const combo = chiCall.tiles[selectedChiCombo ?? 0];
    onCall("chi", combo.map(t => t.id));
  }

  function handlePeng() {
    if (!pengCall?.tiles?.[0]) return;
    onCall("peng", pengCall.tiles[0].map(t => t.id));
  }

  function handleGang() {
    if (!gangCall?.tiles?.[0]) return;
    onCall("gang", gangCall.tiles[0].map(t => t.id));
  }

  function handleWin() {
    onCall("win", []);
  }

  function handlePass() {
    onCall("pass", []);
  }
</script>

<div class="call-prompt">
  <div class="call-title">A tile was discarded!</div>

  <div class="call-buttons">
    {#if hasWin}
      <button class="call-btn win" onclick={handleWin}>
        Hu (胡)
      </button>
    {/if}

    {#if hasGang}
      <button class="call-btn gang" onclick={handleGang}>
        Gang (槓)
      </button>
    {/if}

    {#if hasPeng}
      <button class="call-btn peng" onclick={handlePeng}>
        Peng (碰)
      </button>
    {/if}

    {#if hasChi}
      {#if chiCall?.tiles && chiCall.tiles.length > 1}
        <div class="chi-selector">
          <div class="chi-label">Chi (吃) - select tiles:</div>
          {#each chiCall.tiles as combo, i}
            <button
              class="chi-combo"
              class:selected={selectedChiCombo === i}
              onclick={() => selectedChiCombo = i}
            >
              {#each combo as tile}
                <span class="tile">{tileToUnicode(tile.tile)}</span>
              {/each}
            </button>
          {/each}
          <button
            class="call-btn chi"
            onclick={handleChi}
            disabled={selectedChiCombo === null}
          >
            Confirm Chi
          </button>
        </div>
      {:else}
        <button class="call-btn chi" onclick={handleChi}>
          Chi (吃)
        </button>
      {/if}
    {/if}

    <button class="call-btn pass" onclick={handlePass}>
      Pass
    </button>
  </div>
</div>

<style>
  .call-prompt {
    position: fixed;
    bottom: 220px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(180deg, rgba(26, 15, 10, 0.97) 0%, rgba(10, 5, 3, 0.98) 100%);
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--radius-xl);
    border: 2px solid var(--gold);
    z-index: 100;
    box-shadow:
      0 10px 40px rgba(0, 0, 0, 0.6),
      0 0 60px rgba(212, 168, 75, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    animation: promptAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes promptAppear {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }

  .call-title {
    text-align: center;
    font-family: var(--font-display);
    font-size: 1.15rem;
    margin-bottom: var(--space-md);
    color: var(--gold);
    text-shadow: 0 0 15px rgba(212, 168, 75, 0.4);
  }

  .call-buttons {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    justify-content: center;
  }

  .call-btn {
    padding: var(--space-sm) var(--space-lg);
    font-size: 1rem;
    font-family: var(--font-body);
    font-weight: 600;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: relative;
    overflow: hidden;
  }

  .call-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%);
    pointer-events: none;
  }

  .call-btn:hover:not(:disabled) {
    transform: translateY(-3px) scale(1.03);
  }

  .call-btn:active:not(:disabled) {
    transform: translateY(0) scale(1);
  }

  .call-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  .call-btn.gang {
    background: linear-gradient(135deg, #e63946 0%, #a31621 100%);
    color: white;
    box-shadow:
      0 4px 15px rgba(230, 57, 70, 0.4),
      inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  }

  .call-btn.gang:hover:not(:disabled) {
    box-shadow:
      0 6px 20px rgba(230, 57, 70, 0.5),
      inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  }

  .call-btn.win {
    background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
    color: #1a0f0a;
    box-shadow:
      0 4px 20px rgba(255, 215, 0, 0.5),
      inset 0 -2px 0 rgba(0, 0, 0, 0.15);
    animation: winPulse 1.5s ease-in-out infinite;
  }

  .call-btn.win:hover:not(:disabled) {
    box-shadow:
      0 6px 25px rgba(255, 215, 0, 0.6),
      inset 0 -2px 0 rgba(0, 0, 0, 0.15);
  }

  @keyframes winPulse {
    0%, 100% {
      box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5), inset 0 -2px 0 rgba(0, 0, 0, 0.15);
    }
    50% {
      box-shadow: 0 4px 30px rgba(255, 215, 0, 0.7), inset 0 -2px 0 rgba(0, 0, 0, 0.15);
    }
  }

  .call-btn.peng {
    background: linear-gradient(135deg, #2d8659 0%, #1a5038 100%);
    color: white;
    box-shadow:
      0 4px 15px rgba(45, 134, 89, 0.4),
      inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  }

  .call-btn.peng:hover:not(:disabled) {
    box-shadow:
      0 6px 20px rgba(45, 134, 89, 0.5),
      inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  }

  .call-btn.chi {
    background: linear-gradient(135deg, #4ecdc4 0%, #2a9d8f 100%);
    color: #0a1f1c;
    box-shadow:
      0 4px 15px rgba(78, 205, 196, 0.4),
      inset 0 -2px 0 rgba(0, 0, 0, 0.1);
  }

  .call-btn.chi:hover:not(:disabled) {
    box-shadow:
      0 6px 20px rgba(78, 205, 196, 0.5),
      inset 0 -2px 0 rgba(0, 0, 0, 0.1);
  }

  .call-btn.pass {
    background: linear-gradient(135deg, #4a4a4a 0%, #2d2d2d 100%);
    color: var(--text-secondary);
    box-shadow:
      0 4px 10px rgba(0, 0, 0, 0.3),
      inset 0 -2px 0 rgba(0, 0, 0, 0.3);
  }

  .call-btn.pass:hover {
    color: var(--text-primary);
    box-shadow:
      0 6px 15px rgba(0, 0, 0, 0.4),
      inset 0 -2px 0 rgba(0, 0, 0, 0.3);
  }

  .chi-selector {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    align-items: center;
  }

  .chi-label {
    font-size: 0.85rem;
    font-family: var(--font-body);
    color: var(--text-muted);
  }

  .chi-combo {
    display: flex;
    gap: 4px;
    padding: var(--space-sm);
    background: linear-gradient(145deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .chi-combo:hover {
    background: linear-gradient(145deg, rgba(78, 205, 196, 0.15) 0%, rgba(78, 205, 196, 0.05) 100%);
    border-color: rgba(78, 205, 196, 0.3);
  }

  .chi-combo.selected {
    border-color: #4ecdc4;
    background: linear-gradient(145deg, rgba(78, 205, 196, 0.2) 0%, rgba(78, 205, 196, 0.1) 100%);
    box-shadow: 0 0 15px rgba(78, 205, 196, 0.3);
  }

  .chi-combo .tile {
    font-size: 1.8rem;
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border-radius: var(--radius-sm);
    padding: 0.15rem 0.25rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 600px) {
    .call-prompt {
      bottom: 160px;
      padding: var(--space-sm) var(--space-md);
      max-width: calc(100vw - 2rem);
    }

    .call-title {
      font-size: 1rem;
      margin-bottom: var(--space-sm);
    }

    .call-buttons {
      gap: var(--space-xs);
    }

    .call-btn {
      padding: var(--space-xs) var(--space-md);
      font-size: 0.85rem;
    }

    .chi-combo .tile {
      font-size: 1.4rem;
      padding: 0.1rem 0.15rem;
    }
  }
</style>
