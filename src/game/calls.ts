import type {
  TileInstance,
  SuitedTile,
  Seat,
  AvailableCall,
  Ruleset,
  GameState,
  PendingCall,
  CallType,
  Meld,
} from './types';
import { isSuitedTile, tilesEqual } from './types';

/**
 * Find all valid chi (sequence) combinations from hand tiles with a discarded tile.
 * Returns array of tile pairs from the hand that would form a sequence with the discard.
 */
export function findChiCombinations(
  hand: TileInstance[],
  discard: TileInstance
): TileInstance[][] {
  // Chi only works with suited tiles
  if (!isSuitedTile(discard.tile)) {
    return [];
  }

  const discardTile = discard.tile;
  const suit = discardTile.suit;
  const value = discardTile.value;

  // Get all suited tiles of same suit from hand, indexed by value
  const suitedByValue = new Map<number, TileInstance[]>();
  for (const ti of hand) {
    if (isSuitedTile(ti.tile) && ti.tile.suit === suit) {
      const v = ti.tile.value;
      const existing = suitedByValue.get(v) || [];
      existing.push(ti);
      suitedByValue.set(v, existing);
    }
  }

  const combinations: TileInstance[][] = [];

  // Check all three possible sequence positions for the discarded tile:

  // 1. Discard is LOW (need value+1 and value+2)
  if (value <= 7) {
    const mid = suitedByValue.get(value + 1);
    const high = suitedByValue.get(value + 2);
    if (mid && mid.length > 0 && high && high.length > 0) {
      combinations.push([mid[0], high[0]]);
    }
  }

  // 2. Discard is MIDDLE (need value-1 and value+1)
  if (value >= 2 && value <= 8) {
    const low = suitedByValue.get(value - 1);
    const high = suitedByValue.get(value + 1);
    if (low && low.length > 0 && high && high.length > 0) {
      combinations.push([low[0], high[0]]);
    }
  }

  // 3. Discard is HIGH (need value-2 and value-1)
  if (value >= 3) {
    const low = suitedByValue.get(value - 2);
    const mid = suitedByValue.get(value - 1);
    if (low && low.length > 0 && mid && mid.length > 0) {
      combinations.push([low[0], mid[0]]);
    }
  }

  return combinations;
}

/**
 * Find tiles in hand that can form a peng (triplet) with the discarded tile.
 * Returns 2 tiles from hand, or null if not enough matching tiles.
 */
export function findPengTiles(
  hand: TileInstance[],
  discard: TileInstance
): TileInstance[] | null {
  const matching = hand.filter(t => tilesEqual(t.tile, discard.tile));

  if (matching.length >= 2) {
    return matching.slice(0, 2);
  }

  return null;
}

/**
 * Find tiles in hand that can form a gang (quad) with the discarded tile.
 * Returns 3 tiles from hand, or null if not enough matching tiles.
 */
export function findGangTiles(
  hand: TileInstance[],
  discard: TileInstance
): TileInstance[] | null {
  const matching = hand.filter(t => tilesEqual(t.tile, discard.tile));

  if (matching.length >= 3) {
    return matching.slice(0, 3);
  }

  return null;
}

/**
 * Get all available calls for a specific player given a discarded tile.
 */
export function getAvailableCallsForPlayer(
  hand: TileInstance[],
  discard: TileInstance,
  playerSeat: Seat,
  discarderSeat: Seat,
  ruleset: Ruleset,
  melds: Meld[] = []
): AvailableCall[] {
  const calls: AvailableCall[] = [];

  // Check for peng
  if (ruleset.allowPeng) {
    const pengTiles = findPengTiles(hand, discard);
    if (pengTiles) {
      calls.push({ type: 'peng', tiles: [pengTiles] });
    }
  }

  // Check for gang
  if (ruleset.allowGang) {
    const gangTiles = findGangTiles(hand, discard);
    if (gangTiles) {
      calls.push({ type: 'gang', tiles: [gangTiles] });
    }
  }

  // Check for chi (sequence) - only if allowed and from correct position
  if (ruleset.allowChi) {
    const isLeftOfDiscarder = ((discarderSeat + 1) % 4) === playerSeat;
    if (!ruleset.chiFromLeftOnly || isLeftOfDiscarder) {
      const chiCombos = findChiCombinations(hand, discard);
      if (chiCombos.length > 0) {
        calls.push({ type: 'chi', tiles: chiCombos });
      }
    }
  }

  // Check for win
  const testHand = [...hand, discard];
  const winContext = {
    winningTile: discard,
    isSelfDrawn: false,
    seatWind: (['east', 'south', 'west', 'north'] as const)[playerSeat],
    roundWind: 'east' as const,
    isLastTile: false,
    isReplacementTile: false,
    isRobbingKong: false,
  };

  if (ruleset.isWinningHand(testHand, melds, winContext)) {
    calls.push({ type: 'win' });
  }

  return calls;
}

/**
 * Register a player's call response.
 */
export function registerCall(
  state: GameState,
  seat: Seat,
  callType: CallType,
  tileIds: string[]
): GameState {
  const tiles = tileIds.map(id => ({ id })) as TileInstance[];

  const pendingCall: PendingCall = {
    seat,
    callType,
    tiles: tiles.length > 0 ? tiles : undefined,
  };

  return {
    ...state,
    pendingCalls: [...state.pendingCalls, pendingCall],
    awaitingCallFrom: state.awaitingCallFrom.filter(s => s !== seat),
  };
}

/**
 * Resolve the call window once all players have responded.
 * Returns updated state with winning call executed, or advances to next player if all passed.
 */
export function resolveCallWindow(
  state: GameState,
  ruleset: Ruleset
): GameState {
  // Still waiting for responses
  if (state.awaitingCallFrom.length > 0) {
    return state;
  }

  // Priority order: win > gang > peng > chi > pass
  const priorityOrder: CallType[] = ['win', 'gang', 'peng', 'chi', 'pass'];

  // Sort calls by priority
  const sortedCalls = [...state.pendingCalls].sort((a, b) => {
    const priorityA = priorityOrder.indexOf(a.callType);
    const priorityB = priorityOrder.indexOf(b.callType);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Same priority - closer to discarder wins (seat order)
    const discarderSeat = state.lastDiscard?.from ?? 0;
    const distA = (a.seat - discarderSeat + 4) % 4;
    const distB = (b.seat - discarderSeat + 4) % 4;
    return distA - distB;
  });

  const winningCall = sortedCalls[0];

  // All passed - advance to next player
  if (winningCall.callType === 'pass') {
    const discarderSeat = state.lastDiscard?.from ?? 0;
    const nextSeat = ((discarderSeat + 1) % 4) as Seat;
    return {
      ...state,
      currentTurn: nextSeat,
      turnPhase: 'drawing',
      pendingCalls: [],
    };
  }

  // Execute the winning call
  return executeCall(state, winningCall, ruleset);
}

/**
 * Execute a call: create meld, update hands, set turn.
 */
function executeCall(
  state: GameState,
  call: PendingCall,
  ruleset: Ruleset
): GameState {
  const { seat, callType, tiles } = call;

  // Win is handled separately - just mark the winner for server to process
  if (callType === 'win') {
    return {
      ...state,
      pendingCalls: [call], // Keep the win call for server to process
      awaitingCallFrom: [],
    };
  }

  const discard = state.lastDiscard!.tile;
  const discarderSeat = state.lastDiscard!.from;

  // Find the player
  const playerIndex = state.players.findIndex(p => p.seat === seat);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];

  // Get the actual tile instances from the player's hand
  const tileIds = tiles?.map(t => t.id) ?? [];
  const handTiles = player.hand.filter(t => tileIds.includes(t.id));

  // Create the meld
  const meldType = callType === 'chi' ? 'chi' : callType === 'peng' ? 'peng' : 'gang';
  const meld: Meld = {
    type: meldType,
    tiles: [...handTiles, discard],
    fromPlayer: discarderSeat,
  };

  // Remove tiles from hand
  const newHand = player.hand.filter(t => !tileIds.includes(t.id));

  // Remove discard from discard pile
  const newDiscardPile = {
    tiles: state.discardPiles[discarderSeat].tiles.filter(t => t.id !== discard.id),
  };

  // Update player
  const newPlayers = state.players.map((p, i) => {
    if (i === playerIndex) {
      return {
        ...p,
        hand: newHand,
        melds: [...p.melds, meld],
      };
    }
    return p;
  });

  // Gang requires drawing a replacement tile
  const nextPhase = callType === 'gang' ? 'replacing' : 'discarding';

  return {
    ...state,
    players: newPlayers,
    discardPiles: {
      ...state.discardPiles,
      [discarderSeat]: newDiscardPile,
    },
    currentTurn: seat,
    turnPhase: nextPhase,
    pendingCalls: [],
    lastDiscard: undefined,
  };
}
