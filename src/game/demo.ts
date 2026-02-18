/**
 * Demo script to manually verify tile generation and win detection
 * Run with: npm run demo
 */

import { hongKongRuleset } from './rulesets/hongkong';
import type { TileInstance, WinContext, Meld, Suit, WindDirection } from './types';

// Unicode mahjong tiles for display
const TILE_CHARS: Record<string, Record<string | number, string>> = {
  dots: { 1: '🀙', 2: '🀚', 3: '🀛', 4: '🀜', 5: '🀝', 6: '🀞', 7: '🀟', 8: '🀠', 9: '🀡' },
  bamboo: { 1: '🀐', 2: '🀑', 3: '🀒', 4: '🀓', 5: '🀔', 6: '🀕', 7: '🀖', 8: '🀗', 9: '🀘' },
  characters: { 1: '🀇', 2: '🀈', 3: '🀉', 4: '🀊', 5: '🀋', 6: '🀌', 7: '🀍', 8: '🀎', 9: '🀏' },
  wind: { east: '🀀', south: '🀁', west: '🀂', north: '🀃' },
  dragon: { red: '🀄', green: '🀅', white: '🀆' },
  flower: { 1: '🀢', 2: '🀣', 3: '🀤', 4: '🀥' },
  season: { 1: '🀦', 2: '🀧', 3: '🀨', 4: '🀩' },
};

function tileToUnicode(ti: TileInstance): string {
  const tile = ti.tile;
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

function tilesToString(tiles: TileInstance[]): string {
  return tiles.map(tileToUnicode).join(' ');
}

// Shuffle array (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

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

function makeTiles(...specs: Array<[string, number | string, number?]>): TileInstance[] {
  return specs.map(([type, value, copy]) => makeTile(type, value, copy ?? 0));
}

console.log('='.repeat(60));
console.log('HONG KONG MAHJONG - SLICE 1 DEMO');
console.log('='.repeat(60));

// 1. Show ruleset info
console.log('\n📋 RULESET INFO:');
console.log(`  Name: ${hongKongRuleset.name}`);
console.log(`  ID: ${hongKongRuleset.id}`);
console.log(`  Suits: ${hongKongRuleset.tileSet.suits.join(', ')}`);
console.log(`  Winds: ${hongKongRuleset.tileSet.includeWinds}`);
console.log(`  Dragons: ${hongKongRuleset.tileSet.includeDragons}`);
console.log(`  Bonus tiles: ${hongKongRuleset.tileSet.includeBonusTiles}`);
console.log(`  Chi from left only: ${hongKongRuleset.chiFromLeftOnly}`);
console.log(`  Minimum fan: ${hongKongRuleset.minimumFan}`);

// 2. Generate and display tile set
console.log('\n🀄 TILE SET GENERATION:');
const allTiles = hongKongRuleset.generateTileSet();
console.log(`  Total tiles: ${allTiles.length}`);

const suited = allTiles.filter(t => t.tile.type === 'suited');
const winds = allTiles.filter(t => t.tile.type === 'wind');
const dragons = allTiles.filter(t => t.tile.type === 'dragon');
const bonus = allTiles.filter(t => t.tile.type === 'bonus');

console.log(`  Suited: ${suited.length} (3 suits × 9 values × 4 copies = 108)`);
console.log(`  Winds: ${winds.length} (4 directions × 4 copies = 16)`);
console.log(`  Dragons: ${dragons.length} (3 colors × 4 copies = 12)`);
console.log(`  Bonus: ${bonus.length} (4 flowers + 4 seasons = 8)`);

// 3. Show sample tiles
console.log('\n🎨 SAMPLE TILES:');
console.log('  Dots:       ', tilesToString(suited.filter(t => (t.tile as any).suit === 'dots').slice(0, 9)));
console.log('  Bamboo:     ', tilesToString(suited.filter(t => (t.tile as any).suit === 'bamboo').slice(0, 9)));
console.log('  Characters: ', tilesToString(suited.filter(t => (t.tile as any).suit === 'characters').slice(0, 9)));
console.log('  Winds:      ', tilesToString(winds.slice(0, 4)));
console.log('  Dragons:    ', tilesToString(dragons.slice(0, 3)));
console.log('  Bonus:      ', tilesToString(bonus));

// 4. Simulate dealing
console.log('\n🎲 SIMULATED DEAL:');
const shuffled = shuffle(allTiles.filter(t => t.tile.type !== 'bonus')); // Remove bonus for initial deal
const hands: TileInstance[][] = [
  shuffled.slice(0, 13),
  shuffled.slice(13, 26),
  shuffled.slice(26, 39),
  shuffled.slice(39, 52),
];

for (let i = 0; i < 4; i++) {
  const sorted = hands[i].sort((a, b) => a.id.localeCompare(b.id));
  console.log(`  Player ${i + 1}: ${tilesToString(sorted)}`);
}
console.log(`  Wall: ${shuffled.length - 52} tiles remaining`);

// 5. Test win detection
console.log('\n✅ WIN DETECTION TESTS:');

const defaultContext: WinContext = {
  winningTile: makeTile('dots', 1),
  isSelfDrawn: false,
  seatWind: 'east',
  roundWind: 'east',
  isLastTile: false,
  isReplacementTile: false,
  isRobbingKong: false,
};

// Test 1: All triplets (pure dots)
const allTriplets = makeTiles(
  ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
  ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
  ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
  ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
  ['dots', 5, 0], ['dots', 5, 1],
);
console.log(`  All triplets (pure dots): ${tilesToString(allTriplets)}`);
console.log(`    Is winning: ${hongKongRuleset.isWinningHand(allTriplets, [], defaultContext)}`);

// Test 2: Sequences
const sequences = makeTiles(
  ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
  ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
  ['dots', 7, 0], ['dots', 8, 0], ['dots', 9, 0],
  ['bamboo', 1, 0], ['bamboo', 2, 0], ['bamboo', 3, 0],
  ['wind', 'east', 0], ['wind', 'east', 1],
);
console.log(`  Mixed sequences: ${tilesToString(sequences)}`);
console.log(`    Is winning: ${hongKongRuleset.isWinningHand(sequences, [], defaultContext)}`);

// Test 3: Thirteen Orphans
const orphans = makeTiles(
  ['dots', 1, 0], ['dots', 9, 0],
  ['bamboo', 1, 0], ['bamboo', 9, 0],
  ['characters', 1, 0], ['characters', 9, 0],
  ['wind', 'east', 0], ['wind', 'south', 0], ['wind', 'west', 0], ['wind', 'north', 0],
  ['dragon', 'red', 0], ['dragon', 'green', 0], ['dragon', 'white', 0],
  ['dots', 1, 1],
);
console.log(`  Thirteen Orphans: ${tilesToString(orphans)}`);
console.log(`    Is winning: ${hongKongRuleset.isWinningHand(orphans, [], defaultContext)}`);

// Test 4: Invalid hand
const invalid = makeTiles(
  ['dots', 1, 0], ['dots', 2, 0], ['dots', 4, 0], // Not a sequence
  ['bamboo', 3, 0], ['bamboo', 5, 0], ['bamboo', 7, 0],
  ['characters', 2, 0], ['characters', 4, 0], ['characters', 6, 0],
  ['wind', 'east', 0], ['wind', 'south', 0], ['wind', 'west', 0],
  ['dragon', 'red', 0], ['dragon', 'green', 0],
);
console.log(`  Invalid hand: ${tilesToString(invalid)}`);
console.log(`    Is winning: ${hongKongRuleset.isWinningHand(invalid, [], defaultContext)}`);

// 6. Test scoring
console.log('\n💰 SCORING TESTS:');

// Pure one suit (7 fan)
const pureSuit = makeTiles(
  ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
  ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
  ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
  ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
  ['dots', 5, 0], ['dots', 5, 1],
);
console.log(`  Pure One Suit: ${tilesToString(pureSuit)}`);
const pureSuitScore = hongKongRuleset.scoreHand(pureSuit, [], defaultContext);
console.log(`    Fan: ${pureSuitScore.fan}`);
console.log(`    Breakdown: ${pureSuitScore.items.map(i => `${i.name} (${i.fan})`).join(', ')}`);

// Self-draw + concealed
const selfDrawContext: WinContext = { ...defaultContext, isSelfDrawn: true };
console.log(`  Same hand with self-draw:`);
const selfDrawScore = hongKongRuleset.scoreHand(pureSuit, [], selfDrawContext);
console.log(`    Fan: ${selfDrawScore.fan}`);
console.log(`    Breakdown: ${selfDrawScore.items.map(i => `${i.name} (${i.fan})`).join(', ')}`);

// Dragon peng
const withDragon = makeTiles(
  ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
  ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
  ['bamboo', 7, 0], ['bamboo', 8, 0], ['bamboo', 9, 0],
  ['characters', 1, 0], ['characters', 1, 1],
);
const dragonMeld: Meld = {
  type: 'peng',
  tiles: makeTiles(['dragon', 'red', 0], ['dragon', 'red', 1], ['dragon', 'red', 2]),
  fromPlayer: 1,
};
console.log(`  With Red Dragon Peng: ${tilesToString(withDragon)} + 🀄🀄🀄`);
const dragonScore = hongKongRuleset.scoreHand(withDragon, [dragonMeld], defaultContext);
console.log(`    Fan: ${dragonScore.fan}`);
console.log(`    Breakdown: ${dragonScore.items.map(i => `${i.name} (${i.fan})`).join(', ')}`);

console.log('\n' + '='.repeat(60));
console.log('SLICE 1 COMPLETE - Types, Ruleset, Win Detection, Scoring');
console.log('='.repeat(60));
console.log('\nNext: Run "npm test" to run unit tests');
console.log('      Run "npm run demo" to run this demo again');
