<script lang="ts">
  import type { TileInstance } from "../game/types";
  import { sortTiles } from "../game/types";
  import { untrack } from "svelte";
  import Tile from "./Tile.svelte";
  import { getTileInfo } from "../lib/tiles";
  import { vibrate } from "../lib/haptics";
  import { playSound } from "../lib/sounds";

  interface Props {
    tiles: TileInstance[];
    canDiscard: boolean;
    onDiscard?: (tileId: string) => void;
  }

  let { tiles, canDiscard, onDiscard }: Props = $props();
  let selectedTileId: string | null = $state(null);

  // Get info for selected tile
  let selectedTile = $derived(
    selectedTileId ? tiles.find(t => t.id === selectedTileId) : null
  );
  let selectedTileInfo = $derived(
    selectedTile ? getTileInfo(selectedTile.tile) : null
  );

  // Drag-and-drop state
  let tileOrder: string[] = $state([]);
  let draggedTileId: string | null = $state(null);
  let dropTargetIndex: number | null = $state(null);

  // Touch drag state
  let touchDragId: string | null = $state(null);
  let touchStartX: number = $state(0);
  let touchStartY: number = $state(0);
  let ghostElement: HTMLDivElement | null = $state(null);

  // Cleanup ghost elements on unmount
  $effect(() => {
    return () => {
      if (ghostElement) {
        ghostElement.remove();
      }
    };
  });

  // Sync order with incoming tiles (preserve existing, append new)
  $effect(() => {
    // Create dependency on tiles array
    const tileIds = tiles.map(t => t.id).join(',');
    // Use untrack to read tileOrder without creating circular dependency
    untrack(() => {
      const currentIds = new Set(tiles.map(t => t.id));
      const existingOrder = tileOrder.filter(id => currentIds.has(id));
      const newIds = tiles.filter(t => !tileOrder.includes(t.id)).map(t => t.id);
      if (newIds.length > 0 || existingOrder.length !== tileOrder.length) {
        tileOrder = [...existingOrder, ...newIds];
      }
    });
  });

  // Derive ordered tiles
  const orderedTiles = $derived(() => {
    const tileMap = new Map(tiles.map(t => [t.id, t]));
    return tileOrder.map(id => tileMap.get(id)).filter((t): t is TileInstance => t !== undefined);
  });

  function handleTileClick(tileId: string) {
    if (!canDiscard) return;
    playSound('tile-click');
    vibrate('light');

    if (selectedTileId === tileId) {
      // Clicking selected tile unselects it
      selectedTileId = null;
    } else {
      selectedTileId = tileId;
    }
  }

  function handleDiscardClick() {
    if (selectedTileId && canDiscard) {
      onDiscard?.(selectedTileId);
      selectedTileId = null;
    }
  }

  // Drag-and-drop handlers
  function handleDragStart(e: DragEvent, tileId: string) {
    draggedTileId = tileId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tileId);
    }
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    dropTargetIndex = index;
  }

  function handleDragLeave() {
    dropTargetIndex = null;
  }

  function handleDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();

    if (draggedTileId === null) return;

    const draggedIndex = tileOrder.indexOf(draggedTileId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      dropTargetIndex = null;
      return;
    }

    // Reorder the tiles
    const newOrder = [...tileOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTileId);
    tileOrder = newOrder;

    dropTargetIndex = null;
  }

  function handleDragEnd() {
    draggedTileId = null;
    dropTargetIndex = null;
  }

  function handleTouchStart(e: TouchEvent, tileId: string) {
    const touch = e.touches[0];
    touchDragId = tileId;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    e.preventDefault();

    // Create ghost element
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    ghostElement = document.createElement('div');
    ghostElement.className = 'touch-ghost';
    ghostElement.innerHTML = target.innerHTML;
    ghostElement.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      z-index: 1000;
      opacity: 0.8;
      transform: scale(1.1);
      transition: transform 0.1s ease;
    `;
    document.body.appendChild(ghostElement);
  }

  function handleTouchMove(e: TouchEvent) {
    if (!touchDragId || !ghostElement) return;
    e.preventDefault();

    const touch = e.touches[0];

    // Move ghost
    const rect = ghostElement.getBoundingClientRect();
    ghostElement.style.left = `${touch.clientX - rect.width / 2}px`;
    ghostElement.style.top = `${touch.clientY - rect.height / 2}px`;

    // Find drop target
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const dropTarget = elements.find(el =>
      el.classList.contains('tile-wrapper') &&
      !el.classList.contains('dragging')
    ) as HTMLElement | undefined;

    // Update drop target indicator
    document.querySelectorAll('.tile-wrapper.drag-over').forEach(el =>
      el.classList.remove('drag-over')
    );

    if (dropTarget) {
      const index = Array.from(dropTarget.parentElement?.children || []).indexOf(dropTarget);
      dropTargetIndex = index;
      dropTarget.classList.add('drag-over');
    } else {
      dropTargetIndex = null;
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!touchDragId) return;

    // Complete the drop if we have a target
    if (dropTargetIndex !== null && touchDragId) {
      const draggedIndex = tileOrder.indexOf(touchDragId);
      if (draggedIndex !== -1 && draggedIndex !== dropTargetIndex) {
        const newOrder = [...tileOrder];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(dropTargetIndex, 0, touchDragId);
        tileOrder = newOrder;
      }
    }

    // Cleanup
    if (ghostElement) {
      ghostElement.remove();
      ghostElement = null;
    }
    document.querySelectorAll('.tile-wrapper.drag-over').forEach(el =>
      el.classList.remove('drag-over')
    );
    touchDragId = null;
    dropTargetIndex = null;
  }

  function handleSort() {
    const sorted = sortTiles(tiles);
    tileOrder = sorted.map(t => t.id);
  }
</script>

<div class="hand-container">
  <div class="hand-header">
    <button class="sort-btn" onclick={handleSort} title="Sort tiles by suit and number">
      Sort
    </button>
  </div>

  <!-- Tile info panel - always visible to prevent layout shift -->
  <div class="tile-info-panel" class:has-selection={selectedTileInfo}>
    {#if selectedTileInfo}
      <span class="info-unicode">{selectedTileInfo.unicode}</span>
      <div class="tile-info-details">
        <span class="info-name">{selectedTileInfo.name}</span>
        <span class="info-type">{selectedTileInfo.type}</span>
        <span class="info-desc">{selectedTileInfo.description}</span>
      </div>
    {:else}
      <span class="info-unicode placeholder">🀄</span>
      <div class="tile-info-details">
        <span class="info-name placeholder">Tap a tile for info</span>
        <span class="info-type placeholder">—</span>
        <span class="info-desc placeholder">Select any tile to see its name and details</span>
      </div>
    {/if}
  </div>

  <div class="hand" role="list">
    {#each orderedTiles() as tile, index (tile.id)}
      <div
        class="tile-wrapper"
        class:drag-over={dropTargetIndex === index}
        class:dragging={draggedTileId === tile.id || touchDragId === tile.id}
        draggable="true"
        ondragstart={(e) => handleDragStart(e, tile.id)}
        ondragover={(e) => handleDragOver(e, index)}
        ondragleave={handleDragLeave}
        ondrop={(e) => handleDrop(e, index)}
        ondragend={handleDragEnd}
        ontouchstart={(e) => handleTouchStart(e, tile.id)}
        ontouchmove={handleTouchMove}
        ontouchend={handleTouchEnd}
        role="listitem"
      >
        <Tile
          {tile}
          selected={selectedTileId === tile.id}
          disabled={!canDiscard}
          onclick={() => handleTileClick(tile.id)}
        />
      </div>
    {/each}
  </div>

  {#if canDiscard}
    <button class="discard-btn" onclick={handleDiscardClick} disabled={!selectedTileId}>
      Discard Selected
    </button>
  {/if}
</div>

<style>
  .hand-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }

  .hand-header {
    display: flex;
    justify-content: flex-end;
    width: 100%;
    padding: 0 var(--space-md);
  }

  .sort-btn {
    padding: var(--space-xs) var(--space-md);
    font-size: 0.85rem;
    font-family: var(--font-body);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: linear-gradient(135deg, #2d5a3d 0%, #1a3d2a 100%);
    color: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(45, 134, 89, 0.4);
    border-radius: var(--radius-sm);
    cursor: pointer;
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }

  .sort-btn:hover {
    background: linear-gradient(135deg, #3d7a4d 0%, #2a5d3a 100%);
    transform: translateY(-1px);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  .sort-btn:active {
    transform: translateY(0);
  }

  /* Tile info panel */
  .tile-info-panel {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 100%;
    min-height: 3.5rem;
    transition: all 0.2s ease;
  }

  .tile-info-panel.has-selection {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgba(212, 168, 75, 0.3);
  }

  .info-unicode {
    font-size: 2rem;
    line-height: 1;
    flex-shrink: 0;
    transition: opacity 0.2s ease;
  }

  .info-unicode.placeholder {
    opacity: 0.3;
  }

  .tile-info-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .info-name {
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 700;
    color: var(--gold);
    transition: color 0.2s ease;
  }

  .info-name.placeholder {
    color: var(--text-muted);
    font-weight: 500;
  }

  .info-type {
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-type.placeholder {
    color: var(--text-muted);
    opacity: 0.5;
  }

  .info-desc {
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.3;
  }

  .info-desc.placeholder {
    opacity: 0.5;
  }

  .hand {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
    padding: var(--space-md) var(--space-lg);
    background: linear-gradient(180deg, rgba(10, 61, 31, 0.6) 0%, rgba(10, 61, 31, 0.4) 100%);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(45, 134, 89, 0.3);
    box-shadow:
      inset 0 2px 8px rgba(0, 0, 0, 0.3),
      0 4px 12px rgba(0, 0, 0, 0.2);
    position: relative;
  }

  .hand::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  }

  .tile-wrapper {
    position: relative;
    transition: transform 0.15s ease;
  }

  .tile-wrapper.dragging {
    opacity: 0.5;
  }

  .tile-wrapper.drag-over::before {
    content: '';
    position: absolute;
    left: -3px;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #ffd700 0%, #ffb700 100%);
    border-radius: 2px;
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
    z-index: 10;
  }

  .discard-btn {
    padding: var(--space-sm) var(--space-lg);
    font-size: 0.95rem;
    font-family: var(--font-body);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    box-shadow:
      0 4px 12px rgba(196, 30, 58, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease;
    animation: discardPulse 1.5s ease-in-out infinite;
  }

  @keyframes discardPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }

  .discard-btn:hover {
    background: linear-gradient(135deg, #d42a4a 0%, #a00000 100%);
    transform: translateY(-2px);
    box-shadow:
      0 6px 16px rgba(196, 30, 58, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .discard-btn:active {
    transform: translateY(0);
  }

  .discard-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    animation: none;
    background: linear-gradient(135deg, #666 0%, #444 100%);
    box-shadow: none;
  }

  .discard-btn:disabled:hover {
    transform: none;
  }

  @media (max-width: 600px) {
    .hand-container {
      gap: 6px;
      width: 100%;
    }

    .hand-header {
      padding: 0 6px;
    }

    .sort-btn {
      padding: 4px 10px;
      font-size: 0.7rem;
    }

    .tile-info-panel {
      padding: 6px 10px;
      gap: 10px;
      min-height: 3rem;
    }

    .info-unicode {
      font-size: 1.5rem;
    }

    .info-name {
      font-size: 0.85rem;
    }

    .info-type {
      font-size: 0.65rem;
    }

    .info-desc {
      font-size: 0.7rem;
    }

    .hand {
      padding: 8px 6px;
      gap: 2px;
      width: 100%;
      box-sizing: border-box;
    }

    .discard-btn {
      padding: 8px 16px;
      font-size: 0.8rem;
    }
  }

  /* Very small phones */
  @media (max-width: 375px) {
    .hand-container {
      gap: 4px;
    }

    .sort-btn {
      padding: 3px 8px;
      font-size: 0.65rem;
    }

    .tile-info-panel {
      padding: 4px 8px;
      gap: 8px;
      min-height: 2.5rem;
    }

    .info-unicode {
      font-size: 1.2rem;
    }

    .info-name {
      font-size: 0.75rem;
    }

    .info-type {
      font-size: 0.6rem;
    }

    .info-desc {
      font-size: 0.65rem;
      display: none; /* Hide description on very small screens */
    }

    .hand {
      padding: 6px 4px;
      gap: 1px;
    }

    .discard-btn {
      padding: 6px 12px;
      font-size: 0.75rem;
    }
  }

  :global(.touch-ghost) {
    background: linear-gradient(180deg, var(--tile-face) 0%, var(--tile-shadow) 100%);
    border: 2px solid var(--gold);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(212, 168, 75, 0.3);
  }

  :global(.touch-ghost img) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
