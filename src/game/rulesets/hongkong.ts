import type {
  Ruleset,
  TileSetConfig,
  TileInstance,
  Tile,
  Meld,
  WinContext,
  ScoreBreakdown,
  ScoreItem,
  Suit,
  WindDirection,
  DragonColor,
  SuitedTile,
} from '../types';
import {
  isSuitedTile,
  isHonorTile,
  isDragonTile,
  isWindTile,
  tilesEqual,
  isTerminalTile,
} from '../types';

// ============================================================================
// TILE SET GENERATION
// ============================================================================

function generateTileSet(): TileInstance[] {
  const tiles: TileInstance[] = [];

  const suits: Suit[] = ['dots', 'bamboo', 'characters'];
  const winds: WindDirection[] = ['east', 'south', 'west', 'north'];
  const dragons: DragonColor[] = ['red', 'green', 'white'];

  // Suited tiles: 1-9 in each suit, 4 copies each
  for (const suit of suits) {
    for (let value = 1; value <= 9; value++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({
          id: `${suit}-${value}-${copy}`,
          tile: { type: 'suited', suit, value: value as 1|2|3|4|5|6|7|8|9 },
        });
      }
    }
  }

  // Wind tiles: 4 copies each
  for (const direction of winds) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `wind-${direction}-${copy}`,
        tile: { type: 'wind', direction },
      });
    }
  }

  // Dragon tiles: 4 copies each
  for (const color of dragons) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `dragon-${color}-${copy}`,
        tile: { type: 'dragon', color },
      });
    }
  }

  // Bonus tiles: flowers 1-4 and seasons 1-4 (1 copy each)
  for (let num = 1; num <= 4; num++) {
    tiles.push({
      id: `flower-${num}`,
      tile: { type: 'bonus', bonusType: 'flower', number: num as 1|2|3|4 },
    });
    tiles.push({
      id: `season-${num}`,
      tile: { type: 'bonus', bonusType: 'season', number: num as 1|2|3|4 },
    });
  }

  return tiles;
}

// ============================================================================
// WIN DETECTION HELPERS
// ============================================================================

interface HandAnalysis {
  // Group tiles by type for analysis
  suitedBysuit: Map<Suit, TileInstance[]>;
  winds: TileInstance[];
  dragons: TileInstance[];
}

function analyzeHand(tiles: TileInstance[]): HandAnalysis {
  const analysis: HandAnalysis = {
    suitedBysuit: new Map(),
    winds: [],
    dragons: [],
  };

  for (const ti of tiles) {
    const tile = ti.tile;
    if (isSuitedTile(tile)) {
      const existing = analysis.suitedBysuit.get(tile.suit) || [];
      existing.push(ti);
      analysis.suitedBysuit.set(tile.suit, existing);
    } else if (isWindTile(tile)) {
      analysis.winds.push(ti);
    } else if (isDragonTile(tile)) {
      analysis.dragons.push(ti);
    }
  }

  return analysis;
}

// Count tiles by their face value (ignoring instance ID)
function countTiles(tiles: TileInstance[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ti of tiles) {
    const key = tileToKey(ti.tile);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function tileToKey(tile: Tile): string {
  switch (tile.type) {
    case 'suited':
      return `${tile.suit}-${tile.value}`;
    case 'wind':
      return `wind-${tile.direction}`;
    case 'dragon':
      return `dragon-${tile.color}`;
    case 'bonus':
      return `bonus-${tile.bonusType}-${tile.number}`;
  }
}

// Check if tiles can form a valid standard hand (N melds + 1 pair)
// Uses backtracking to try all possible combinations
function canFormStandardHand(tiles: TileInstance[], neededMelds: number = 4): boolean {
  const counts = countTiles(tiles);
  return tryFormMelds(counts, 0, false, neededMelds);
}

function tryFormMelds(
  counts: Map<string, number>,
  meldsFormed: number,
  hasPair: boolean,
  neededMelds: number = 4
): boolean {
  // Success: required melds and 1 pair
  if (meldsFormed === neededMelds && hasPair) {
    // Check all tiles used
    for (const count of counts.values()) {
      if (count > 0) return false;
    }
    return true;
  }

  // Find first tile with remaining count
  let firstKey: string | null = null;
  for (const [key, count] of counts) {
    if (count > 0) {
      firstKey = key;
      break;
    }
  }

  if (!firstKey) {
    return meldsFormed === neededMelds && hasPair;
  }

  const count = counts.get(firstKey)!;

  // Try forming a pair (if we don't have one yet)
  if (!hasPair && count >= 2) {
    counts.set(firstKey, count - 2);
    if (tryFormMelds(counts, meldsFormed, true, neededMelds)) {
      counts.set(firstKey, count);
      return true;
    }
    counts.set(firstKey, count);
  }

  // Try forming a triplet (peng)
  if (count >= 3) {
    counts.set(firstKey, count - 3);
    if (tryFormMelds(counts, meldsFormed + 1, hasPair, neededMelds)) {
      counts.set(firstKey, count);
      return true;
    }
    counts.set(firstKey, count);
  }

  // Try forming a sequence (chi) - only for suited tiles
  const parsed = parseKey(firstKey);
  if (parsed && parsed.type === 'suited' && parsed.value <= 7) {
    const key2 = `${parsed.suit}-${parsed.value + 1}`;
    const key3 = `${parsed.suit}-${parsed.value + 2}`;
    const count2 = counts.get(key2) || 0;
    const count3 = counts.get(key3) || 0;

    if (count >= 1 && count2 >= 1 && count3 >= 1) {
      counts.set(firstKey, count - 1);
      counts.set(key2, count2 - 1);
      counts.set(key3, count3 - 1);
      if (tryFormMelds(counts, meldsFormed + 1, hasPair, neededMelds)) {
        counts.set(firstKey, count);
        counts.set(key2, count2);
        counts.set(key3, count3);
        return true;
      }
      counts.set(firstKey, count);
      counts.set(key2, count2);
      counts.set(key3, count3);
    }
  }

  return false;
}

function parseKey(key: string): { type: 'suited'; suit: Suit; value: number } | null {
  const suits: Suit[] = ['dots', 'bamboo', 'characters'];
  for (const suit of suits) {
    if (key.startsWith(suit + '-')) {
      const value = parseInt(key.slice(suit.length + 1));
      if (!isNaN(value)) {
        return { type: 'suited', suit, value };
      }
    }
  }
  return null;
}

// ============================================================================
// SPECIAL HANDS
// ============================================================================

function isThirteenOrphans(tiles: TileInstance[]): boolean {
  if (tiles.length !== 14) return false;

  const required = [
    'dots-1', 'dots-9',
    'bamboo-1', 'bamboo-9',
    'characters-1', 'characters-9',
    'wind-east', 'wind-south', 'wind-west', 'wind-north',
    'dragon-red', 'dragon-green', 'dragon-white',
  ];

  const counts = countTiles(tiles);
  let pairFound = false;

  for (const key of required) {
    const count = counts.get(key) || 0;
    if (count === 0) return false;
    if (count === 2) {
      if (pairFound) return false; // Can only have one pair
      pairFound = true;
    }
    if (count > 2) return false;
  }

  // Must have exactly 14 tiles from required set
  let total = 0;
  for (const [key, count] of counts) {
    if (!required.includes(key)) return false;
    total += count;
  }

  return total === 14 && pairFound;
}

function isAllHonors(tiles: TileInstance[], melds: Meld[]): boolean {
  for (const ti of tiles) {
    if (!isHonorTile(ti.tile)) return false;
  }
  for (const meld of melds) {
    for (const ti of meld.tiles) {
      if (!isHonorTile(ti.tile)) return false;
    }
  }
  return true;
}

function isAllPairs(tiles: TileInstance[]): boolean {
  if (tiles.length !== 14) return false;
  const counts = countTiles(tiles);
  for (const count of counts.values()) {
    if (count !== 2) return false;
  }
  return counts.size === 7;
}

// ============================================================================
// WIN DETECTION
// ============================================================================

function isWinningHand(
  hand: TileInstance[],
  melds: Meld[],
  _context: WinContext
): boolean {
  // Special hands (check before standard) - only valid with no exposed melds
  if (melds.length === 0 && hand.length === 14) {
    if (isThirteenOrphans(hand)) return true;
    if (isAllPairs(hand)) return true;
  }

  // Standard hand: 4 melds + 1 pair
  // With exposed melds, we need fewer melds from hand
  // 0 exposed melds: hand needs 4 melds + pair = 14 tiles
  // 1 exposed meld (3 tiles): hand needs 3 melds + pair = 11 tiles
  // 2 exposed melds: hand needs 2 melds + pair = 8 tiles
  // etc.

  const neededMeldsFromHand = 4 - melds.length;
  const expectedHandSize = neededMeldsFromHand * 3 + 2;

  if (hand.length !== expectedHandSize) {
    return false;
  }

  // Check if hand can form the remaining melds + pair using backtracking
  return canFormStandardHand(hand, neededMeldsFromHand);
}

// ============================================================================
// SCORING
// ============================================================================

function scoreHand(
  hand: TileInstance[],
  melds: Meld[],
  context: WinContext
): ScoreBreakdown {
  const items: ScoreItem[] = [];
  let fan = 0;

  const allTiles = [...hand, ...melds.flatMap(m => m.tiles)];
  const counts = countTiles(allTiles);
  const analysis = analyzeHand(allTiles);

  // Check if hand is concealed (no exposed melds except concealed kongs)
  const isConcealed = melds.every(m => m.type === 'concealed_gang');

  // Self-draw (自摸) - 1 fan
  if (context.isSelfDrawn) {
    items.push({ name: 'Self-Draw (自摸)', fan: 1 });
    fan += 1;
  }

  // All Peng/Kong (對對糊) - 3 fan
  const allMeldsAreTriplets = melds.every(m =>
    m.type === 'peng' || m.type === 'gang' || m.type === 'concealed_gang'
  ) && canFormAllTriplets(hand);
  if (allMeldsAreTriplets) {
    items.push({ name: 'All Triplets (對對糊)', fan: 3 });
    fan += 3;
  }

  // Mixed One Suit (混一色) - 3 fan
  const mixedOneSuit = checkMixedOneSuit(allTiles);
  if (mixedOneSuit) {
    items.push({ name: 'Mixed One Suit (混一色)', fan: 3 });
    fan += 3;
  }

  // Pure One Suit (清一色) - 7 fan
  const pureOneSuit = checkPureOneSuit(allTiles);
  if (pureOneSuit) {
    // Remove mixed one suit if pure
    const mixedIdx = items.findIndex(i => i.name.includes('混一色'));
    if (mixedIdx >= 0) {
      fan -= items[mixedIdx].fan;
      items.splice(mixedIdx, 1);
    }
    items.push({ name: 'Pure One Suit (清一色)', fan: 7 });
    fan += 7;
  }

  // All Honors (字一色) - 10 fan
  if (isAllHonors(hand, melds)) {
    items.push({ name: 'All Honors (字一色)', fan: 10 });
    fan += 10;
  }

  // Dragon Peng/Kong - 1 fan each
  for (const meld of melds) {
    if ((meld.type === 'peng' || meld.type === 'gang') && isDragonTile(meld.tiles[0].tile)) {
      const color = meld.tiles[0].tile.color;
      const names: Record<string, string> = {
        red: 'Red Dragon (中)',
        green: 'Green Dragon (發)',
        white: 'White Dragon (白)',
      };
      items.push({ name: names[color], fan: 1 });
      fan += 1;
    }
  }

  // Seat Wind - 1 fan
  for (const meld of melds) {
    if ((meld.type === 'peng' || meld.type === 'gang') && isWindTile(meld.tiles[0].tile)) {
      if (meld.tiles[0].tile.direction === context.seatWind) {
        items.push({ name: 'Seat Wind', fan: 1 });
        fan += 1;
      }
    }
  }

  // Round Wind - 1 fan
  for (const meld of melds) {
    if ((meld.type === 'peng' || meld.type === 'gang') && isWindTile(meld.tiles[0].tile)) {
      if (meld.tiles[0].tile.direction === context.roundWind) {
        items.push({ name: 'Round Wind', fan: 1 });
        fan += 1;
      }
    }
  }

  // Concealed Hand (門前清) - 1 fan (only if also self-drawn)
  if (isConcealed && context.isSelfDrawn) {
    items.push({ name: 'Concealed Hand (門前清)', fan: 1 });
    fan += 1;
  }

  // Win on Last Tile (海底撈月) - 1 fan
  if (context.isLastTile) {
    items.push({ name: 'Last Tile (海底撈月)', fan: 1 });
    fan += 1;
  }

  // Win on Replacement Tile (槓上開花) - 1 fan
  if (context.isReplacementTile) {
    items.push({ name: 'Win on Kong (槓上開花)', fan: 1 });
    fan += 1;
  }

  // Robbing Kong (搶槓) - 1 fan
  if (context.isRobbingKong) {
    items.push({ name: 'Robbing Kong (搶槓)', fan: 1 });
    fan += 1;
  }

  // Chicken Hand (雞糊) - 0 fan base, but counts as valid win
  if (fan === 0) {
    items.push({ name: 'Chicken Hand (雞糊)', fan: 0 });
  }

  // Calculate points (simplified HK scoring)
  // Base: 2^fan, with minimums and maximums
  const basePoints = Math.pow(2, Math.min(fan, 10)); // Cap at 2^10 = 1024
  const totalPoints = basePoints;

  return {
    fan,
    items,
    basePoints,
    totalPoints,
  };
}

function canFormAllTriplets(hand: TileInstance[]): boolean {
  const counts = countTiles(hand);

  let pairs = 0;
  let triplets = 0;

  for (const count of counts.values()) {
    if (count === 2) pairs++;
    else if (count === 3) triplets++;
    else if (count !== 0) return false;
  }

  // Must have exactly 1 pair and rest triplets
  return pairs === 1;
}

function checkMixedOneSuit(tiles: TileInstance[]): boolean {
  const suits = new Set<Suit>();
  let hasHonors = false;

  for (const ti of tiles) {
    if (isSuitedTile(ti.tile)) {
      suits.add(ti.tile.suit);
    } else if (isHonorTile(ti.tile)) {
      hasHonors = true;
    }
  }

  return suits.size === 1 && hasHonors;
}

function checkPureOneSuit(tiles: TileInstance[]): boolean {
  const suits = new Set<Suit>();

  for (const ti of tiles) {
    if (isSuitedTile(ti.tile)) {
      suits.add(ti.tile.suit);
    } else if (isHonorTile(ti.tile)) {
      return false; // No honors allowed
    }
  }

  return suits.size === 1;
}

// ============================================================================
// HONG KONG RULESET EXPORT
// ============================================================================

export const hongKongRuleset: Ruleset = {
  id: 'hongkong',
  name: 'Hong Kong (Cantonese)',

  tileSet: {
    suits: ['dots', 'bamboo', 'characters'],
    includeWinds: true,
    includeDragons: true,
    includeBonusTiles: true,
    copiesPerTile: 4,
  },

  allowChi: true,
  chiFromLeftOnly: true,
  allowPeng: true,
  allowGang: true,
  allowSelfDrawWin: true,

  minimumFan: 0, // Chicken hand allowed in casual HK
  mustDiscardAfterDraw: true,
  allowReplacementTileAfterGang: true,

  isWinningHand,
  scoreHand,
  generateTileSet,
};
