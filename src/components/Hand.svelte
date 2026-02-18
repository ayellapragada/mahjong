<script lang="ts">
  import type { TileInstance } from "../game/types";
  import { sortTiles } from "../game/types";
  import { untrack } from "svelte";
  import Tile from "./Tile.svelte";

  interface Props {
    tiles: TileInstance[];
    canDiscard: boolean;
    onDiscard?: (tileId: string) => void;
  }

  let { tiles, canDiscard, onDiscard }: Props = $props();
  let selectedTileId: string | null = $state(null);

  // Drag-and-drop state
  let tileOrder: string[] = $state([]);
  let draggedTileId: string | null = $state(null);
  let dropTargetIndex: number | null = $state(null);

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

    if (selectedTileId === tileId) {
      // Double-click to discard
      onDiscard?.(tileId);
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

  <div class="hand" role="list">
    {#each orderedTiles() as tile, index (tile.id)}
      <div
        class="tile-wrapper"
        class:drag-over={dropTargetIndex === index}
        class:dragging={draggedTileId === tile.id}
        draggable="true"
        ondragstart={(e) => handleDragStart(e, tile.id)}
        ondragover={(e) => handleDragOver(e, index)}
        ondragleave={handleDragLeave}
        ondrop={(e) => handleDrop(e, index)}
        ondragend={handleDragEnd}
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

  {#if canDiscard && selectedTileId}
    <button class="discard-btn" onclick={handleDiscardClick}>
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

  @media (max-width: 600px) {
    .hand-container {
      gap: var(--space-sm);
    }

    .hand-header {
      padding: 0 var(--space-sm);
    }

    .sort-btn {
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.75rem;
    }

    .hand {
      padding: var(--space-sm) var(--space-md);
      gap: 2px;
    }

    .discard-btn {
      padding: var(--space-xs) var(--space-md);
      font-size: 0.85rem;
    }
  }
</style>
