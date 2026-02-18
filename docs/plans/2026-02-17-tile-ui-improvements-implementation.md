# Tile UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hard-to-read Unicode tiles with SVG graphics + number overlays, add drag-and-drop hand reordering, and a sort button.

**Architecture:** Download SVG tiles from perthmahjongsoc/mahjong-tiles-svg (CC-BY-SA-4.0), map them via `tileToUnicode()` (already returns the Unicode char we need for filenames). Add number overlays via CSS positioning. Use native HTML5 drag events in Hand.svelte for reordering. Local-only state for tile order.

**Tech Stack:** Svelte 5, HTML5 Drag and Drop API, SVG assets

---

### Task 1: Download SVG Tile Assets

**Files:**
- Create: `src/assets/tiles/` directory
- Create: `src/assets/tiles/*.svg` (42 tile files)
- Create: `src/assets/tiles/LICENSE` (attribution)

**Step 1: Create tiles directory and download SVGs**

```bash
mkdir -p src/assets/tiles
cd src/assets/tiles

# Download from perthmahjongsoc/mahjong-tiles-svg
# Dots (筒) 1-9
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/筒/🀙.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/筒/🀚.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/筒/🀛.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/筒/🀜.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/筒/🀝.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/筒/🀞.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/筒/🀟.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/筒/🀠.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/筒/🀡.svg"

# Bamboo (索) 1-9
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/索/🀐.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/索/🀑.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/索/🀒.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/索/🀓.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/索/🀔.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/索/🀕.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/索/🀖.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/索/🀗.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/索/🀘.svg"

# Characters (萬) 1-9
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/萬/🀇.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/萬/🀈.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/萬/🀉.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/萬/🀊.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/萬/🀋.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/萬/🀌.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/萬/🀍.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/萬/🀎.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/萬/🀏.svg"

# Winds and Dragons (番)
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/番/🀀.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/番/🀁.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/番/🀂.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/番/🀃.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/番/🀄.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/番/🀅.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/番/🀆.svg"

# Flowers (花) 1-4
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/花/🀢.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/花/🀣.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/花/🀤.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/花/🀥.svg"

# Seasons (花) 1-4 - same folder, different chars
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/花/🀦.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/花/🀧.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/花/🀨.svg"
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/花/🀩.svg"

# Back tile
curl -sLO "https://raw.githubusercontent.com/perthmahjongsoc/mahjong-tiles-svg/main/🀫.svg"
```

**Step 2: Create LICENSE attribution file**

Create `src/assets/tiles/LICENSE`:
```
Mahjong tile SVGs from perthmahjongsoc/mahjong-tiles-svg
Licensed under CC-BY-SA-4.0
https://github.com/perthmahjongsoc/mahjong-tiles-svg
```

**Step 3: Verify download**

```bash
ls src/assets/tiles/*.svg | wc -l
```
Expected: 42 files

**Step 4: Commit**

```bash
git add src/assets/tiles/
git commit -m "assets: add SVG mahjong tiles (CC-BY-SA-4.0)"
```

---

### Task 2: Add SVG Path Helper Function

**Files:**
- Modify: `src/lib/tiles.ts`
- Test: `src/lib/tiles.test.ts`

**Step 1: Write failing test**

Create or add to `src/lib/tiles.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { tileToSvgPath, tileToUnicode } from './tiles';
import type { Tile } from '../game/types';

describe('tileToSvgPath', () => {
  it('returns correct path for suited tiles', () => {
    const tile: Tile = { type: 'suited', suit: 'dots', value: 1 };
    expect(tileToSvgPath(tile)).toBe('/src/assets/tiles/🀙.svg');
  });

  it('returns correct path for wind tiles', () => {
    const tile: Tile = { type: 'wind', direction: 'east' };
    expect(tileToSvgPath(tile)).toBe('/src/assets/tiles/🀀.svg');
  });

  it('returns correct path for dragon tiles', () => {
    const tile: Tile = { type: 'dragon', color: 'red' };
    expect(tileToSvgPath(tile)).toBe('/src/assets/tiles/🀄.svg');
  });

  it('returns correct path for bonus tiles', () => {
    const tile: Tile = { type: 'bonus', bonusType: 'flower', number: 1 };
    expect(tileToSvgPath(tile)).toBe('/src/assets/tiles/🀢.svg');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/tiles.test.ts
```
Expected: FAIL - tileToSvgPath is not defined

**Step 3: Implement tileToSvgPath**

Add to `src/lib/tiles.ts`:

```typescript
export function tileToSvgPath(tile: Tile): string {
  const char = tileToUnicode(tile);
  return `/src/assets/tiles/${char}.svg`;
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/tiles.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/tiles.ts src/lib/tiles.test.ts
git commit -m "feat: add tileToSvgPath helper function"
```

---

### Task 3: Update Tile Component to Use SVG

**Files:**
- Modify: `src/components/Tile.svelte`

**Step 1: Update Tile.svelte to render SVG with number overlay**

Replace the button content and add number overlay:

```svelte
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
>
  <img src={tileToSvgPath(tile.tile)} alt="" class="tile-svg" />
  {#if tileNumber}
    <span class="tile-number">{tileNumber}</span>
  {/if}
</button>

<style>
  .tile {
    font-size: 2.8rem;
    padding: 0.2rem;
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
    min-width: 2.6rem;
    min-height: 3.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .tile-svg {
    width: 2.2rem;
    height: 3rem;
    object-fit: contain;
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
    .tile {
      font-size: 2rem;
      padding: 0.15rem;
      min-width: 2rem;
      min-height: 2.8rem;
    }

    .tile-svg {
      width: 1.6rem;
      height: 2.2rem;
    }

    .tile-number {
      font-size: 0.55rem;
      top: 1px;
      right: 2px;
    }

    .tile:hover:not(.disabled) {
      transform: translateY(-4px) scale(1.02);
    }

    .tile.selected {
      transform: translateY(-6px) scale(1.03);
    }
  }
</style>
```

**Step 2: Test manually in browser**

```bash
npm run dev:all
```

Open browser, verify tiles show SVG images with number badges.

**Step 3: Commit**

```bash
git add src/components/Tile.svelte
git commit -m "feat: render tiles as SVG with number overlays"
```

---

### Task 4: Add Drag-and-Drop to Hand Component

**Files:**
- Modify: `src/components/Hand.svelte`

**Step 1: Update Hand.svelte with drag-and-drop**

```svelte
<script lang="ts">
  import type { TileInstance } from "../game/types";
  import { sortTiles } from "../game/types";
  import Tile from "./Tile.svelte";

  interface Props {
    tiles: TileInstance[];
    canDiscard: boolean;
    onDiscard?: (tileId: string) => void;
  }

  let { tiles, canDiscard, onDiscard }: Props = $props();

  // Local tile order (array of tile IDs)
  let tileOrder: string[] = $state([]);

  // Initialize order when tiles change
  $effect(() => {
    const currentIds = new Set(tiles.map(t => t.id));
    const existingOrder = tileOrder.filter(id => currentIds.has(id));
    const newIds = tiles.filter(t => !tileOrder.includes(t.id)).map(t => t.id);
    tileOrder = [...existingOrder, ...newIds];
  });

  // Derive ordered tiles from tileOrder
  const orderedTiles = $derived(() => {
    const tileMap = new Map(tiles.map(t => [t.id, t]));
    return tileOrder.map(id => tileMap.get(id)).filter((t): t is TileInstance => t !== undefined);
  });

  let selectedTileId: string | null = $state(null);
  let draggedTileId: string | null = $state(null);
  let dropTargetIndex: number | null = $state(null);

  function handleTileClick(tileId: string) {
    if (!canDiscard) return;

    if (selectedTileId === tileId) {
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
    if (!draggedTileId) return;

    const fromIndex = tileOrder.indexOf(draggedTileId);
    if (fromIndex === -1 || fromIndex === targetIndex) {
      draggedTileId = null;
      dropTargetIndex = null;
      return;
    }

    const newOrder = [...tileOrder];
    newOrder.splice(fromIndex, 1);
    const insertIndex = targetIndex > fromIndex ? targetIndex - 1 : targetIndex;
    newOrder.splice(insertIndex, 0, draggedTileId);
    tileOrder = newOrder;

    draggedTileId = null;
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

  <div class="hand">
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
    font-size: 0.8rem;
    font-family: var(--font-body);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-light);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sort-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
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
    left: -4px;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--gold);
    border-radius: 2px;
    animation: dropIndicator 0.5s ease-in-out infinite;
  }

  @keyframes dropIndicator {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
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

    .hand {
      padding: var(--space-sm) var(--space-md);
      gap: 2px;
    }

    .discard-btn {
      padding: var(--space-xs) var(--space-md);
      font-size: 0.85rem;
    }

    .sort-btn {
      font-size: 0.7rem;
      padding: var(--space-xs) var(--space-sm);
    }
  }
</style>
```

**Step 2: Test manually in browser**

```bash
npm run dev:all
```

Test:
1. Drag a tile - should become semi-transparent
2. Hover over another position - should show gold insertion indicator
3. Drop - tiles reorder
4. Click Sort button - tiles sort by suit then number

**Step 3: Commit**

```bash
git add src/components/Hand.svelte
git commit -m "feat: add drag-and-drop hand reordering and sort button"
```

---

### Task 5: Run Type Check and Fix Any Issues

**Step 1: Run type check**

```bash
npm run check
```

**Step 2: Fix any TypeScript errors**

(Address errors as they come up)

**Step 3: Run tests**

```bash
npm run test:run
```

**Step 4: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve type errors from tile UI changes"
```

---

### Task 6: Manual E2E Verification

**Step 1: Start dev server**

```bash
npm run dev:all
```

**Step 2: Verify in browser**

Checklist:
- [ ] Tiles display as SVG images (not Unicode text)
- [ ] Number badges visible on suited tiles (1-9)
- [ ] Tiles are clearly distinguishable (good contrast)
- [ ] Drag and drop works to reorder tiles
- [ ] Sort button organizes tiles by suit/number
- [ ] Tile selection still works (click to select, double-click to discard)
- [ ] Mobile responsive (smaller tiles on narrow screens)

**Step 3: Commit completion**

```bash
git add -A
git commit -m "feat: complete tile UI improvements - SVG tiles, numbers, drag-and-drop"
```
