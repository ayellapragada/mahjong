<script lang="ts">
  import type { TileInstance } from "../game/types";
  import { tileToSvgPath } from "../lib/tiles";

  interface Props {
    tile: TileInstance;
    selected?: boolean;
    disabled?: boolean;
    onclick?: () => void;
  }

  let { tile, selected = false, disabled = false, onclick }: Props = $props();

  // Get number for suited tiles
  const tileNumber = $derived(
    tile.tile.type === 'suited' ? tile.tile.value : null
  );
</script>

<button
  class="tile"
  class:selected
  class:disabled
  onclick={onclick}
  {disabled}
  draggable="false"
>
  <img src={tileToSvgPath(tile.tile)} alt="" class="tile-svg" draggable="false" />
  {#if tileNumber}
    <span class="tile-number">{tileNumber}</span>
  {/if}
</button>

<style>
  .tile {
    padding: clamp(0.1rem, 0.5vw, 0.2rem);
    border: 2px solid var(--tile-border);
    border-radius: var(--radius-md);
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.25),
      0 1px 2px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      inset 0 -1px 0 rgba(0, 0, 0, 0.05);
    min-width: var(--tile-width);
    min-height: var(--tile-height);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .tile-svg {
    width: var(--tile-svg-width);
    height: var(--tile-svg-height);
    object-fit: contain;
    pointer-events: none;
  }

  .tile-number {
    position: absolute;
    top: 2px;
    right: 3px;
    font-size: 0.65rem;
    font-weight: 700;
    color: #333;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 3px;
    padding: 0 3px;
    line-height: 1.2;
    font-family: var(--font-body);
    pointer-events: none;
  }

  .tile::before {
    content: '';
    position: absolute;
    inset: 3px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 50%);
    border-radius: calc(var(--radius-md) - 2px);
    pointer-events: none;
  }

  .tile:hover:not(.disabled) {
    transform: translateY(-8px) scale(1.02);
    box-shadow:
      0 12px 24px rgba(0, 0, 0, 0.3),
      0 4px 8px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 0 20px rgba(212, 168, 75, 0.15);
    border-color: var(--gold-dark);
  }

  .tile.selected {
    transform: translateY(-12px) scale(1.04);
    border-color: var(--gold);
    box-shadow:
      0 15px 30px rgba(212, 168, 75, 0.35),
      0 5px 10px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      0 0 25px rgba(212, 168, 75, 0.4);
    background: linear-gradient(180deg, #fffff8 0%, var(--tile-face) 100%);
  }

  .tile.selected::after {
    content: '';
    position: absolute;
    inset: -4px;
    border: 2px solid var(--gold);
    border-radius: calc(var(--radius-md) + 2px);
    animation: selectGlow 1s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes selectGlow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .tile.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(0.3);
  }

  @media (max-width: 600px) {
    .tile-number {
      font-size: 0.5rem;
      top: 1px;
      right: 2px;
      padding: 0 2px;
    }

    .tile:hover:not(.disabled) {
      transform: translateY(-4px) scale(1.02);
    }

    .tile.selected {
      transform: translateY(-6px) scale(1.03);
    }
  }
</style>
