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

// Short code format commonly used in mahjong notation: 2B, 4D, 7C, E, S, W, N, R, G, W
export function tileToShortCode(tile: Tile): string {
  switch (tile.type) {
    case 'suited':
      const suitCodes = { dots: 'D', bamboo: 'B', characters: 'C' };
      return `${tile.value}${suitCodes[tile.suit]}`;
    case 'wind':
      const windCodes = { east: 'E', south: 'S', west: 'W', north: 'N' };
      return windCodes[tile.direction];
    case 'dragon':
      const dragonCodes = { red: 'R', green: 'G', white: 'W' };
      return dragonCodes[tile.color];
    case 'bonus':
      return `${tile.bonusType === 'flower' ? 'F' : 'S'}${tile.number}`;
  }
}

// Full tile info for display
export interface TileInfo {
  name: string;
  type: string;
  unicode: string;
  description: string;
}

export function getTileInfo(tile: Tile): TileInfo {
  const unicode = tileToUnicode(tile);

  switch (tile.type) {
    case 'suited': {
      const suitNames = { dots: 'Circles', bamboo: 'Bamboo', characters: 'Characters' };
      const suitDescriptions = {
        dots: 'Also known as Circles or Coins (筒子)',
        bamboo: 'Also known as Sticks or Bams (索子)',
        characters: 'Also known as Cracks or Wan (萬子)'
      };
      return {
        name: `${tile.value} of ${suitNames[tile.suit]}`,
        type: 'Suited Tile',
        unicode,
        description: suitDescriptions[tile.suit]
      };
    }
    case 'wind': {
      const windNames = {
        east: 'East Wind (東)',
        south: 'South Wind (南)',
        west: 'West Wind (西)',
        north: 'North Wind (北)'
      };
      return {
        name: windNames[tile.direction],
        type: 'Honor Tile - Wind',
        unicode,
        description: 'Wind tiles are honor tiles. A set of your seat wind or round wind scores extra points.'
      };
    }
    case 'dragon': {
      const dragonNames = {
        red: 'Red Dragon (中)',
        green: 'Green Dragon (發)',
        white: 'White Dragon (白)'
      };
      const dragonDesc = {
        red: 'The Red Dragon represents the center or middle.',
        green: 'The Green Dragon represents prosperity and fortune.',
        white: 'The White Dragon represents purity or blank slate.'
      };
      return {
        name: dragonNames[tile.color],
        type: 'Honor Tile - Dragon',
        unicode,
        description: dragonDesc[tile.color]
      };
    }
    case 'bonus': {
      const bonusNames = {
        flower: ['Plum Blossom', 'Orchid', 'Chrysanthemum', 'Bamboo'],
        season: ['Spring', 'Summer', 'Autumn', 'Winter']
      };
      return {
        name: bonusNames[tile.bonusType][tile.number - 1],
        type: tile.bonusType === 'flower' ? 'Bonus Tile - Flower' : 'Bonus Tile - Season',
        unicode,
        description: 'Bonus tiles score extra points and are immediately replaced when drawn.'
      };
    }
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
