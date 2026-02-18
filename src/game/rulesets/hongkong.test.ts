import { describe, it, expect } from 'vitest';
import { hongKongRuleset } from './hongkong';
import type { TileInstance, Meld, WinContext, Suit, WindDirection } from '../types';

// Helper to create tile instances for testing
function makeTile(type: string, value?: number | string, copy = 0): TileInstance {
  if (type === 'dots' || type === 'bamboo' || type === 'characters') {
    return {
      id: `${type}-${value}-${copy}`,
      tile: { type: 'suited', suit: type as Suit, value: value as 1|2|3|4|5|6|7|8|9 },
    };
  }
  if (type === 'wind') {
    return {
      id: `wind-${value}-${copy}`,
      tile: { type: 'wind', direction: value as WindDirection },
    };
  }
  if (type === 'dragon') {
    return {
      id: `dragon-${value}-${copy}`,
      tile: { type: 'dragon', color: value as 'red' | 'green' | 'white' },
    };
  }
  throw new Error(`Unknown tile type: ${type}`);
}

// Helper to make multiple tiles
function makeTiles(...specs: Array<[string, number | string, number?]>): TileInstance[] {
  return specs.map(([type, value, copy]) => makeTile(type, value, copy ?? 0));
}

// Default win context for testing
const defaultContext: WinContext = {
  winningTile: makeTile('dots', 1),
  isSelfDrawn: false,
  seatWind: 'east',
  roundWind: 'east',
  isLastTile: false,
  isReplacementTile: false,
  isRobbingKong: false,
};

describe('Hong Kong Ruleset - Tile Generation', () => {
  it('should generate 144 tiles', () => {
    const tiles = hongKongRuleset.generateTileSet();
    expect(tiles.length).toBe(144);
  });

  it('should have correct suited tile counts', () => {
    const tiles = hongKongRuleset.generateTileSet();
    const suited = tiles.filter(t => t.tile.type === 'suited');
    // 3 suits × 9 values × 4 copies = 108
    expect(suited.length).toBe(108);
  });

  it('should have correct wind tile counts', () => {
    const tiles = hongKongRuleset.generateTileSet();
    const winds = tiles.filter(t => t.tile.type === 'wind');
    // 4 directions × 4 copies = 16
    expect(winds.length).toBe(16);
  });

  it('should have correct dragon tile counts', () => {
    const tiles = hongKongRuleset.generateTileSet();
    const dragons = tiles.filter(t => t.tile.type === 'dragon');
    // 3 colors × 4 copies = 12
    expect(dragons.length).toBe(12);
  });

  it('should have correct bonus tile counts', () => {
    const tiles = hongKongRuleset.generateTileSet();
    const bonus = tiles.filter(t => t.tile.type === 'bonus');
    // 4 flowers + 4 seasons = 8
    expect(bonus.length).toBe(8);
  });

  it('should have unique IDs for all tiles', () => {
    const tiles = hongKongRuleset.generateTileSet();
    const ids = new Set(tiles.map(t => t.id));
    expect(ids.size).toBe(144);
  });
});

describe('Hong Kong Ruleset - Win Detection', () => {
  it('should detect a basic winning hand (4 melds + pair)', () => {
    // Hand: 111 222 333 444 55 (all dots)
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], ['dots', 5, 1],
    );
    expect(hongKongRuleset.isWinningHand(hand, [], defaultContext)).toBe(true);
  });

  it('should detect a winning hand with sequences', () => {
    // Hand: 123 456 789 111 99 (dots)
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
      ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
      ['dots', 7, 0], ['dots', 8, 0], ['dots', 9, 0],
      ['dots', 1, 1], ['dots', 1, 2], ['dots', 1, 3],
      ['dots', 9, 1], ['dots', 9, 2],
    );
    expect(hongKongRuleset.isWinningHand(hand, [], defaultContext)).toBe(true);
  });

  it('should detect a winning hand with exposed melds', () => {
    // 1 exposed peng, rest in hand
    const hand = makeTiles(
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], ['dots', 5, 1],
    );
    const melds: Meld[] = [{
      type: 'peng',
      tiles: makeTiles(['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2]),
      fromPlayer: 1,
    }];
    expect(hongKongRuleset.isWinningHand(hand, melds, defaultContext)).toBe(true);
  });

  it('should reject an incomplete hand', () => {
    // 13 tiles instead of 14 - can't win
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
      ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
      ['dots', 7, 0], ['dots', 8, 0], ['dots', 9, 0],
      ['bamboo', 1, 0], ['bamboo', 2, 0], ['bamboo', 3, 0],
      ['wind', 'east', 0], // Only 13 tiles, no pair possible
    );
    expect(hongKongRuleset.isWinningHand(hand, [], defaultContext)).toBe(false);
  });

  it('should reject a hand with wrong tile count for exposed melds', () => {
    // With 1 exposed meld, hand should have 11 tiles, but we give 14
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
      ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
      ['dots', 7, 0], ['dots', 8, 0], ['dots', 9, 0],
      ['bamboo', 1, 0], ['bamboo', 2, 0], ['bamboo', 3, 0],
      ['wind', 'east', 0], ['wind', 'east', 1],
    );
    const melds: Meld[] = [{
      type: 'peng',
      tiles: makeTiles(['dragon', 'red', 0], ['dragon', 'red', 1], ['dragon', 'red', 2]),
      fromPlayer: 1,
    }];
    expect(hongKongRuleset.isWinningHand(hand, melds, defaultContext)).toBe(false);
  });

  it('should detect thirteen orphans', () => {
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 9, 0],
      ['bamboo', 1, 0], ['bamboo', 9, 0],
      ['characters', 1, 0], ['characters', 9, 0],
      ['wind', 'east', 0], ['wind', 'south', 0], ['wind', 'west', 0], ['wind', 'north', 0],
      ['dragon', 'red', 0], ['dragon', 'green', 0], ['dragon', 'white', 0],
      ['dots', 1, 1], // Pair
    );
    expect(hongKongRuleset.isWinningHand(hand, [], defaultContext)).toBe(true);
  });

  it('should detect seven pairs', () => {
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1],
      ['dots', 2, 0], ['dots', 2, 1],
      ['dots', 3, 0], ['dots', 3, 1],
      ['dots', 4, 0], ['dots', 4, 1],
      ['dots', 5, 0], ['dots', 5, 1],
      ['dots', 6, 0], ['dots', 6, 1],
      ['dots', 7, 0], ['dots', 7, 1],
    );
    expect(hongKongRuleset.isWinningHand(hand, [], defaultContext)).toBe(true);
  });
});

describe('Hong Kong Ruleset - Scoring', () => {
  it('should score self-draw as 1 fan', () => {
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], ['dots', 5, 1],
    );
    const context: WinContext = { ...defaultContext, isSelfDrawn: true };
    const score = hongKongRuleset.scoreHand(hand, [], context);

    expect(score.items.some(i => i.name.includes('Self-Draw'))).toBe(true);
    expect(score.fan).toBeGreaterThanOrEqual(1);
  });

  it('should score pure one suit as 7 fan', () => {
    // Using sequences so it's not also "all triplets"
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
      ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
      ['dots', 7, 0], ['dots', 8, 0], ['dots', 9, 0],
      ['dots', 1, 1], ['dots', 2, 1], ['dots', 3, 1],
      ['dots', 5, 1], ['dots', 5, 2],
    );
    const score = hongKongRuleset.scoreHand(hand, [], defaultContext);

    expect(score.items.some(i => i.name.includes('Pure One Suit'))).toBe(true);
    expect(score.fan).toBe(7);
  });

  it('should score mixed one suit as 3 fan', () => {
    // Using sequences so it's not also "all triplets"
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
      ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
      ['dots', 7, 0], ['dots', 8, 0], ['dots', 9, 0],
      ['wind', 'east', 0], ['wind', 'east', 1], ['wind', 'east', 2],
      ['dragon', 'red', 0], ['dragon', 'red', 1],
    );
    const score = hongKongRuleset.scoreHand(hand, [], defaultContext);

    expect(score.items.some(i => i.name.includes('Mixed One Suit'))).toBe(true);
    expect(score.fan).toBe(3);
  });

  it('should score chicken hand as 0 fan', () => {
    // Mixed suits, no special patterns
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
      ['bamboo', 4, 0], ['bamboo', 5, 0], ['bamboo', 6, 0],
      ['characters', 7, 0], ['characters', 8, 0], ['characters', 9, 0],
      ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
      ['bamboo', 1, 0], ['bamboo', 1, 1],
    );
    const score = hongKongRuleset.scoreHand(hand, [], defaultContext);

    expect(score.items.some(i => i.name.includes('Chicken Hand'))).toBe(true);
    expect(score.fan).toBe(0);
  });

  it('should score dragon peng as 1 fan', () => {
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
      ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
      ['dots', 7, 0], ['dots', 8, 0], ['dots', 9, 0],
      ['bamboo', 1, 0], ['bamboo', 1, 1],
    );
    const melds: Meld[] = [{
      type: 'peng',
      tiles: makeTiles(['dragon', 'red', 0], ['dragon', 'red', 1], ['dragon', 'red', 2]),
      fromPlayer: 1,
    }];
    const score = hongKongRuleset.scoreHand(hand, melds, defaultContext);

    expect(score.items.some(i => i.name.includes('Red Dragon'))).toBe(true);
    expect(score.fan).toBeGreaterThanOrEqual(1);
  });
});

describe('Hong Kong Ruleset - Configuration', () => {
  it('should allow chi from left player only', () => {
    expect(hongKongRuleset.allowChi).toBe(true);
    expect(hongKongRuleset.chiFromLeftOnly).toBe(true);
  });

  it('should allow peng and gang from any player', () => {
    expect(hongKongRuleset.allowPeng).toBe(true);
    expect(hongKongRuleset.allowGang).toBe(true);
  });

  it('should allow replacement tile after gang', () => {
    expect(hongKongRuleset.allowReplacementTileAfterGang).toBe(true);
  });

  it('should have minimum 0 fan (chicken hand allowed)', () => {
    expect(hongKongRuleset.minimumFan).toBe(0);
  });
});
