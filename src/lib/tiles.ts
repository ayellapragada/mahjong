import type { Tile, TileInstance } from "../game/types";

// Unicode mahjong tile characters
const TILE_CHARS: Record<string, Record<string | number, string>> = {
  dots: { 1: '🀙', 2: '🀚', 3: '🀛', 4: '🀜', 5: '🀝', 6: '🀞', 7: '🀟', 8: '🀠', 9: '🀡' },
  bamboo: { 1: '🀐', 2: '🀑', 3: '🀒', 4: '🀓', 5: '🀔', 6: '🀕', 7: '🀖', 8: '🀗', 9: '🀘' },
  characters: { 1: '🀇', 2: '🀈', 3: '🀉', 4: '🀊', 5: '🀋', 6: '🀌', 7: '🀍', 8: '🀎', 9: '🀏' },
  wind: { east: '🀀', south: '🀁', west: '🀂', north: '🀃' },
  dragon: { red: '🀄', green: '🀅', white: '🀆' },
  flower: { 1: '🀢', 2: '🀣', 3: '🀤', 4: '🀥' },
  season: { 1: '🀦', 2: '🀧', 3: '🀨', 4: '🀩' },
};

export function tileToUnicode(tile: Tile): string {
  switch (tile.type) {
    case 'suited':
      return TILE_CHARS[tile.suit][tile.value];
    case 'wind':
      return TILE_CHARS.wind[tile.direction];
    case 'dragon':
      return TILE_CHARS.dragon[tile.color];
    case 'bonus':
      return TILE_CHARS[tile.bonusType][tile.number];
  }
}

export function tileToLabel(tile: Tile): string {
  switch (tile.type) {
    case 'suited':
      const suitNames = { dots: 'Dots', bamboo: 'Bamboo', characters: 'Char' };
      return `${tile.value} ${suitNames[tile.suit]}`;
    case 'wind':
      return tile.direction.charAt(0).toUpperCase() + tile.direction.slice(1);
    case 'dragon':
      const dragonNames = { red: 'Red', green: 'Green', white: 'White' };
      return dragonNames[tile.color];
    case 'bonus':
      return `${tile.bonusType === 'flower' ? 'F' : 'S'}${tile.number}`;
  }
}

export function tileToSvgPath(tile: Tile): string {
  // Use import.meta.env.BASE_URL for correct path on GitHub Pages
  const base = import.meta.env.BASE_URL || '/';
  switch (tile.type) {
    case 'suited':
      return `${base}tiles/${tile.suit}-${tile.value}.svg`;
    case 'wind':
      return `${base}tiles/wind-${tile.direction}.svg`;
    case 'dragon':
      return `${base}tiles/dragon-${tile.color}.svg`;
    case 'bonus':
      return `${base}tiles/${tile.bonusType}-${tile.number}.svg`;
  }
}

export const SEAT_NAMES = ['East', 'South', 'West', 'North'] as const;
export const SEAT_WINDS = ['🀀', '🀁', '🀂', '🀃'] as const;
