<script lang="ts">
  import type { TileInstance } from "../game/types";
  import { tileToSvgPath } from "../lib/tiles";

  interface Props {
    tile: TileInstance;
    selected?: boolean;
    highlighted?: boolean;
    justDrawn?: boolean;
    disabled?: boolean;
    onclick?: () => void;
  }

  let { tile, selected = false, highlighted = false, justDrawn = false, disabled = false, onclick }: Props = $props();

  // Get number for suited tiles
  const tileNumber = $derived(
    tile.tile.type === 'suited' ? tile.tile.value : null
  );
</script>

<button
  class="tile"
  class:selected
  class:highlighted
  class:just-drawn={justDrawn}
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

  .tile.selected {
    transform: translateY(-6px);
    border-color: var(--gold);
    box-shadow:
      0 8px 16px rgba(0, 0, 0, 0.3),
      0 0 12px rgba(212, 168, 75, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  .tile.highlighted {
    transform: translateY(-4px);
    border-color: #4ecdc4;
    box-shadow:
      0 6px 12px rgba(0, 0, 0, 0.25),
      0 0 16px rgba(78, 205, 196, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    animation: highlightPulse 0.8s ease-in-out infinite;
  }

  .tile.just-drawn {
    border-color: #d4a5b0;
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.25),
      0 0 8px rgba(212, 165, 176, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    animation: justDrawnPulse 2s ease-in-out infinite;
  }

  @keyframes justDrawnPulse {
    0%, 100% {
      box-shadow:
        0 4px 8px rgba(0, 0, 0, 0.25),
        0 0 8px rgba(212, 165, 176, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
    50% {
      box-shadow:
        0 4px 8px rgba(0, 0, 0, 0.25),
        0 0 14px rgba(212, 165, 176, 0.55),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
  }

  @keyframes highlightPulse {
    0%, 100% {
      box-shadow:
        0 6px 12px rgba(0, 0, 0, 0.25),
        0 0 16px rgba(78, 205, 196, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
    50% {
      box-shadow:
        0 6px 12px rgba(0, 0, 0, 0.25),
        0 0 24px rgba(78, 205, 196, 0.7),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
  }

  .tile.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(0.3);
  }

  @media (max-width: 600px) {
    .tile {
      /* Smaller tiles on mobile for better fit */
      min-width: clamp(1.4rem, 7vw, 2rem);
      min-height: clamp(2rem, 10vw, 2.8rem);
      padding: 2px;
      border-width: 1.5px;
    }

    .tile-svg {
      width: clamp(1.2rem, 6vw, 1.8rem);
      height: clamp(1.7rem, 8.5vw, 2.4rem);
    }

    .tile-number {
      font-size: 0.45rem;
      top: 0px;
      right: 1px;
      padding: 0 2px;
    }

    .tile.selected {
      transform: translateY(-4px);
    }

    .tile.highlighted {
      transform: translateY(-3px);
    }

    .tile.just-drawn {
      box-shadow:
        0 3px 6px rgba(0, 0, 0, 0.2),
        0 0 6px rgba(212, 165, 176, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
  }

  /* Very small phones */
  @media (max-width: 375px) {
    .tile {
      min-width: clamp(1.2rem, 6.5vw, 1.8rem);
      min-height: clamp(1.7rem, 9vw, 2.4rem);
      padding: 1px;
      border-radius: 4px;
    }

    .tile-svg {
      width: clamp(1rem, 5.5vw, 1.5rem);
      height: clamp(1.4rem, 7.5vw, 2rem);
    }

    .tile-number {
      font-size: 0.4rem;
    }

    .tile::before {
      inset: 2px;
    }
  }
</style>
