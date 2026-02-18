# Tile UI Improvements Design

## Problem

1. **Poor contrast** - Unicode mahjong tiles render as white/light on light tile backgrounds, making them nearly unreadable
2. **No hand organization** - Players can't rearrange tiles in their hand to group by suit/strategy
3. **Hard to distinguish tiles** - Similar-looking bamboo tiles (1-4) are difficult to tell apart at a glance

## Solution

### 1. Custom SVG Tiles with Number Overlays

Replace Unicode characters with proper SVG tile graphics.

**Approach:**
- Use open-source MIT/CC0 licensed SVG tileset (FluffyStuff mahjong tiles or similar)
- Store SVGs in `src/assets/tiles/` as individual files
- Add number badge overlay on suited tiles (1-9) for quick identification

**File Changes:**
- `src/lib/tiles.ts` - Add `getTileSvgPath(tile)` function
- `src/components/Tile.svelte` - Render `<img>` with SVG source instead of Unicode text, add number overlay
- `src/assets/tiles/` - New directory with SVG files

**Number Overlay:**
- Small badge in corner of tile showing the number (1-9)
- Only on suited tiles (bamboo, characters, dots)
- High contrast colors for visibility

### 2. Drag-and-Drop Hand Reordering

Native HTML5 drag events for reordering tiles within the hand.

**Events:**
- `dragstart` - Store dragged tile ID, add visual feedback (opacity)
- `dragover` - Prevent default, show drop indicator
- `drop` - Reorder tiles array, clear drag state
- `dragend` - Clean up visual state

**State:**
- Hand order is local UI state only (not synced to server)
- `Hand.svelte` maintains ordered array of tile IDs
- Tiles re-render in user's preferred order

**Visual Feedback:**
- Dragged tile: reduced opacity
- Drop target: insertion line indicator between tiles

### 3. Sort Button

One-click sorting of entire hand.

**Sort Order:**
1. Suited tiles first, grouped by suit (bamboo → characters → dots)
2. Within suit, sorted by number (1-9)
3. Honor tiles last (winds, then dragons)

**UI:**
- "Sort" button positioned near hand
- Instant reorder animation on click

## Out of Scope

- Server-side hand order persistence
- Multiple sort strategies (just one default sort)
- Tile skin/theme selection
