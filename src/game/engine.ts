/**
 * Pure game engine - no network, no UI dependencies
 * All functions are pure and operate on GameState
 */

import type {
  GameState,
  TileInstance,
  Player,
  Seat,
  Ruleset,
  ClientGameState,
  RedactedPlayer,
  AvailableCall,
  Meld,
  TurnPhase,
  WindDirection,
} from './types';
import { isBonusTile, tilesEqual, sortTiles } from './types';
import { getAvailableCallsForPlayer } from './calls';
import { getRuleset } from './rulesets';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================================================
// GAME STATE CREATION
// ============================================================================

export function createInitialState(roomCode: string, rulesetId: string): GameState {
  return {
    phase: 'waiting',
    roomCode,
    rulesetId,
    players: [],
    wall: [],
    deadWall: [],
    discardPiles: {
      0: { tiles: [] },
      1: { tiles: [] },
      2: { tiles: [] },
      3: { tiles: [] },
    },
    currentTurn: 0,
    turnPhase: 'drawing',
    roundWind: 'east',
    dealerSeat: 0,
    pendingCalls: [],
    callTimeout: 0,
    awaitingCallFrom: [],
    scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
    roundNumber: 1,
    handNumber: 1,
  };
}

// ============================================================================
// PLAYER MANAGEMENT
// ============================================================================

export function addPlayer(
  state: GameState,
  playerId: string,
  name: string,
  seat: Seat
): GameState | { error: string } {
  if (state.phase !== 'waiting') {
    return { error: 'Game already started' };
  }

  if (state.players.some(p => p.seat === seat)) {
    return { error: 'Seat already taken' };
  }

  if (state.players.some(p => p.id === playerId)) {
    return { error: 'Already joined' };
  }

  const newPlayer: Player = {
    id: playerId,
    name,
    seat,
    hand: [],
    melds: [],
    bonusTiles: [],
    isDealer: seat === state.dealerSeat,
  };

  return {
    ...state,
    players: [...state.players, newPlayer].sort((a, b) => a.seat - b.seat),
  };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.filter(p => p.id !== playerId),
  };
}

// ============================================================================
// DEALING
// ============================================================================

export function startGame(state: GameState, ruleset: Ruleset): GameState | { error: string } {
  if (state.phase !== 'waiting') {
    return { error: 'Game already started' };
  }

  if (state.players.length !== 4) {
    return { error: 'Need exactly 4 players' };
  }

  // Generate and shuffle tiles
  const allTiles = shuffle(ruleset.generateTileSet());

  // Separate bonus tiles - they go to dead wall initially
  const bonusTiles: TileInstance[] = [];
  const regularTiles: TileInstance[] = [];

  for (const tile of allTiles) {
    if (isBonusTile(tile.tile)) {
      bonusTiles.push(tile);
    } else {
      regularTiles.push(tile);
    }
  }

  // Deal 13 tiles to each player
  const hands: TileInstance[][] = [[], [], [], []];
  for (let i = 0; i < 13; i++) {
    for (let seat = 0; seat < 4; seat++) {
      hands[seat].push(regularTiles.shift()!);
    }
  }

  // Update players with dealt hands
  const players = state.players.map(p => ({
    ...p,
    hand: sortTiles(hands[p.seat]),
    melds: [],
    bonusTiles: [],
    isDealer: p.seat === state.dealerSeat,
  }));

  // Dead wall gets 14 tiles (for kong replacements) + bonus tiles
  const deadWall = [...regularTiles.splice(0, 14), ...bonusTiles];

  return {
    ...state,
    phase: 'playing',
    players,
    wall: regularTiles,
    deadWall,
    currentTurn: state.dealerSeat,
    turnPhase: 'drawing',
    discardPiles: {
      0: { tiles: [] },
      1: { tiles: [] },
      2: { tiles: [] },
      3: { tiles: [] },
    },
    lastDiscard: undefined,
    pendingCalls: [],
  };
}

// ============================================================================
// DRAWING
// ============================================================================

export function drawTile(state: GameState, ruleset: Ruleset): GameState | { error: string } {
  if (state.phase !== 'playing') {
    return { error: 'Game not in progress' };
  }

  if (state.turnPhase !== 'drawing' && state.turnPhase !== 'replacing') {
    return { error: 'Not in drawing phase' };
  }

  const isReplacement = state.turnPhase === 'replacing';
  const sourceWall = isReplacement ? state.deadWall : state.wall;

  if (sourceWall.length === 0) {
    // Draw - no more tiles
    return {
      ...state,
      phase: 'finished',
      turnPhase: 'game_over',
    };
  }

  const drawnTile = sourceWall[0];
  const remainingWall = sourceWall.slice(1);

  // Check if it's a bonus tile
  if (isBonusTile(drawnTile.tile)) {
    // Add to player's bonus tiles and draw again
    const players = state.players.map(p => {
      if (p.seat === state.currentTurn) {
        return {
          ...p,
          bonusTiles: [...p.bonusTiles, drawnTile],
        };
      }
      return p;
    });

    const newState: GameState = {
      ...state,
      players,
      ...(isReplacement
        ? { deadWall: remainingWall }
        : { wall: remainingWall }),
      turnPhase: 'replacing', // Draw replacement from dead wall
    };

    // Recursively draw replacement
    return drawTile(newState, ruleset);
  }

  // Normal tile - add to hand
  const players = state.players.map(p => {
    if (p.seat === state.currentTurn) {
      return {
        ...p,
        hand: sortTiles([...p.hand, drawnTile]),
      };
    }
    return p;
  });

  return {
    ...state,
    players,
    ...(isReplacement
      ? { deadWall: remainingWall }
      : { wall: remainingWall }),
    turnPhase: 'discarding',
  };
}

// ============================================================================
// DISCARDING
// ============================================================================

export function discardTile(
  state: GameState,
  seat: Seat,
  tileId: string,
  ruleset: Ruleset
): GameState | { error: string } {
  if (state.phase !== 'playing') {
    return { error: 'Game not in progress' };
  }

  if (state.currentTurn !== seat) {
    return { error: 'Not your turn' };
  }

  if (state.turnPhase !== 'discarding') {
    return { error: 'Not in discarding phase' };
  }

  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    return { error: 'Player not found' };
  }

  const tileIndex = player.hand.findIndex(t => t.id === tileId);
  if (tileIndex === -1) {
    return { error: 'Tile not in hand' };
  }

  const discardedTile = player.hand[tileIndex];
  const newHand = [...player.hand.slice(0, tileIndex), ...player.hand.slice(tileIndex + 1)];

  const players = state.players.map(p => {
    if (p.seat === seat) {
      return { ...p, hand: newHand };
    }
    return p;
  });

  const discardPiles = {
    ...state.discardPiles,
    [seat]: {
      tiles: [...state.discardPiles[seat].tiles, discardedTile],
    },
  };

  // Check for available calls from other players
  const playersWithCalls = getPlayersWithCalls(state, discardedTile, seat, ruleset);

  if (playersWithCalls.length > 0) {
    return {
      ...state,
      players,
      discardPiles,
      lastDiscard: { tile: discardedTile, from: seat },
      turnPhase: 'waiting_for_calls',
      pendingCalls: [],
      awaitingCallFrom: playersWithCalls,
      callWindowStart: Date.now(),
    };
  }

  // No calls available, move to next player
  const nextSeat = ((seat + 1) % 4) as Seat;

  return {
    ...state,
    players,
    discardPiles,
    lastDiscard: { tile: discardedTile, from: seat },
    currentTurn: nextSeat,
    turnPhase: 'drawing',
    pendingCalls: [],
  };
}

// ============================================================================
// CALL DETECTION
// ============================================================================

function getPlayersWithCalls(
  state: GameState,
  discardedTile: TileInstance,
  fromSeat: Seat,
  ruleset: Ruleset
): Seat[] {
  const seats: Seat[] = [];

  for (const player of state.players) {
    if (player.seat === fromSeat) continue;

    const calls = getAvailableCallsForPlayer(
      player.hand,
      discardedTile,
      player.seat,
      fromSeat,
      ruleset,
      player.melds
    );

    if (calls.length > 0) {
      seats.push(player.seat);
    }
  }

  return seats;
}

// ============================================================================
// WIN DETECTION
// ============================================================================

/**
 * Check if the current player can declare a win (self-draw).
 */
export function canDeclareWin(state: GameState, ruleset: Ruleset): boolean {
  if (state.phase !== 'playing') return false;
  if (state.turnPhase !== 'discarding') return false;

  const player = state.players.find(p => p.seat === state.currentTurn);
  if (!player) return false;

  // Calculate expected hand size based on melds
  // With N melds (each 3 tiles), hand should have 14 - (N*3) tiles
  // A gang (4 tiles) still counts as 3 for this calc since it takes 1 meld slot
  const meldTileCount = player.melds.reduce((sum, m) => sum + m.tiles.length, 0);
  const expectedHandSize = 14 - meldTileCount;
  if (player.hand.length !== expectedHandSize) return false;

  const winContext = {
    winningTile: player.hand[player.hand.length - 1], // Last drawn tile
    isSelfDrawn: true,
    seatWind: (['east', 'south', 'west', 'north'] as const)[player.seat],
    roundWind: state.roundWind,
    isLastTile: state.wall.length === 0,
    isReplacementTile: false,
    isRobbingKong: false,
  };

  return ruleset.isWinningHand(player.hand, player.melds, winContext);
}

// ============================================================================
// CLIENT STATE (redacted view for each player)
// ============================================================================

export function getClientState(state: GameState, playerId: string): ClientGameState | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return null;

  const otherPlayers: RedactedPlayer[] = state.players
    .filter(p => p.id !== playerId)
    .map(p => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      handCount: p.hand.length,
      melds: p.melds,
      bonusTiles: p.bonusTiles,
      isDealer: p.isDealer,
    }));

  const ruleset = getRuleset(state.rulesetId);

  let availableCalls: AvailableCall[] = [];

  if (state.turnPhase === 'waiting_for_calls' &&
      state.lastDiscard &&
      state.awaitingCallFrom.includes(player.seat)) {
    availableCalls = getAvailableCallsForPlayer(
      player.hand,
      state.lastDiscard.tile,
      player.seat,
      state.lastDiscard.from,
      ruleset,
      player.melds
    );
  }

  // Check if current player can win (self-draw)
  const canWin = player.seat === state.currentTurn &&
                 state.turnPhase === 'discarding' &&
                 canDeclareWin(state, ruleset);

  return {
    phase: state.phase,
    roomCode: state.roomCode,
    rulesetId: state.rulesetId,
    mySeat: player.seat,
    myHand: player.hand,
    myMelds: player.melds,
    myBonusTiles: player.bonusTiles,
    otherPlayers,
    discardPiles: state.discardPiles,
    currentTurn: state.currentTurn,
    turnPhase: state.turnPhase,
    roundWind: state.roundWind,
    dealerSeat: state.dealerSeat,
    lastDiscard: state.lastDiscard,
    availableCalls,
    wallCount: state.wall.length,
    deadWallCount: state.deadWall.length,
    scores: state.scores,
    roundNumber: state.roundNumber,
    handNumber: state.handNumber,
    canWin,
  };
}

// For spectators / table view - shows all public info but no hands
export function getTableState(state: GameState): Omit<ClientGameState, 'myHand' | 'mySeat' | 'myMelds' | 'myBonusTiles'> & {
  players: RedactedPlayer[];
} {
  const players: RedactedPlayer[] = state.players.map(p => ({
    id: p.id,
    name: p.name,
    seat: p.seat,
    handCount: p.hand.length,
    melds: p.melds,
    bonusTiles: p.bonusTiles,
    isDealer: p.isDealer,
  }));

  return {
    phase: state.phase,
    roomCode: state.roomCode,
    rulesetId: state.rulesetId,
    players,
    otherPlayers: players,
    discardPiles: state.discardPiles,
    currentTurn: state.currentTurn,
    turnPhase: state.turnPhase,
    roundWind: state.roundWind,
    dealerSeat: state.dealerSeat,
    lastDiscard: state.lastDiscard,
    availableCalls: [],
    wallCount: state.wall.length,
    deadWallCount: state.deadWall.length,
    scores: state.scores,
    roundNumber: state.roundNumber,
    handNumber: state.handNumber,
    canWin: false,
  };
}
