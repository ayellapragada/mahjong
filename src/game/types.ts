// ============================================================================
// TILE TYPES
// ============================================================================

export type Suit = 'dots' | 'bamboo' | 'characters';
export type WindDirection = 'east' | 'south' | 'west' | 'north';
export type DragonColor = 'red' | 'green' | 'white';
export type BonusType = 'flower' | 'season';

export type TileType = 'suited' | 'wind' | 'dragon' | 'bonus';

export interface SuitedTile {
  type: 'suited';
  suit: Suit;
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export interface WindTile {
  type: 'wind';
  direction: WindDirection;
}

export interface DragonTile {
  type: 'dragon';
  color: DragonColor;
}

export interface BonusTile {
  type: 'bonus';
  bonusType: BonusType;
  number: 1 | 2 | 3 | 4; // Flower 1-4 or Season 1-4
}

export type Tile = SuitedTile | WindTile | DragonTile | BonusTile;

// Tile with unique instance ID for tracking specific tiles
export interface TileInstance {
  tile: Tile;
  id: string; // Unique ID like "dots-3-2" (suit-value-copy) or "wind-east-1"
}

// ============================================================================
// MELD TYPES
// ============================================================================

export type MeldType = 'chi' | 'peng' | 'gang' | 'concealed_gang';

export interface Meld {
  type: MeldType;
  tiles: TileInstance[];
  fromPlayer?: Seat; // Who discarded the tile (undefined for concealed)
}

// ============================================================================
// GAME STATE TYPES
// ============================================================================

export type Seat = 0 | 1 | 2 | 3;
export type GamePhase = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string; // Connection ID
  name: string;
  seat: Seat;
  hand: TileInstance[]; // Concealed tiles in hand
  melds: Meld[]; // Exposed melds
  bonusTiles: TileInstance[]; // Declared bonus tiles
  isDealer: boolean;
}

// What other players can see about a player
export interface RedactedPlayer {
  id: string;
  name: string;
  seat: Seat;
  handCount: number; // Only tile count, not actual tiles
  melds: Meld[];
  bonusTiles: TileInstance[];
  isDealer: boolean;
}

export interface DiscardPile {
  tiles: TileInstance[];
}

export interface GameState {
  phase: GamePhase;
  roomCode: string;
  rulesetId: string;

  players: Player[];
  wall: TileInstance[];
  deadWall: TileInstance[]; // Replacement tiles for kongs

  discardPiles: Record<Seat, DiscardPile>;

  currentTurn: Seat;
  turnPhase: TurnPhase;
  roundWind: WindDirection;
  dealerSeat: Seat;

  // For tracking calls after a discard
  lastDiscard?: {
    tile: TileInstance;
    from: Seat;
  };
  pendingCalls: PendingCall[];
  callTimeout: number;          // 0 = no timeout, else milliseconds
  callWindowStart?: number;     // timestamp when waiting started
  awaitingCallFrom: Seat[];     // players who haven't responded yet

  // Scoring
  scores: Record<Seat, number>;

  // Round tracking
  roundNumber: number;
  handNumber: number; // Resets when dealer changes
}

export type TurnPhase =
  | 'drawing'           // Player needs to draw
  | 'discarding'        // Player has drawn, must discard
  | 'waiting_for_calls' // Discard made, waiting for peng/chi/gang/win calls
  | 'replacing'         // Drawing replacement tile after gang
  | 'declaring_bonus'   // Player drew a bonus tile, must declare
  | 'game_over';

export interface PendingCall {
  seat: Seat;
  callType: CallType;
  tiles?: TileInstance[]; // Tiles from hand used in the call
}

export type CallType = 'chi' | 'peng' | 'gang' | 'win' | 'pass';

// ============================================================================
// CLIENT VIEW (what each player sees)
// ============================================================================

export interface ClientGameState {
  phase: GamePhase;
  roomCode: string;
  rulesetId: string;

  mySeat: Seat;
  myHand: TileInstance[];
  myMelds: Meld[];
  myBonusTiles: TileInstance[];

  otherPlayers: RedactedPlayer[];

  discardPiles: Record<Seat, DiscardPile>;

  currentTurn: Seat;
  turnPhase: TurnPhase;
  roundWind: WindDirection;
  dealerSeat: Seat;

  lastDiscard?: {
    tile: TileInstance;
    from: Seat;
  };

  // What calls are available to THIS player right now
  availableCalls: AvailableCall[];

  wallCount: number;
  deadWallCount: number;

  scores: Record<Seat, number>;
  roundNumber: number;
  handNumber: number;

  // Win detection
  canWin: boolean;
}

export interface AvailableCall {
  type: CallType;
  tiles?: TileInstance[][]; // Possible tile combinations for chi
}

// ============================================================================
// ACTIONS (client -> server)
// ============================================================================

export type ClientAction =
  | { type: 'JOIN'; name: string; seat: Seat }
  | { type: 'START_GAME' }
  | { type: 'DISCARD'; tileId: string }
  | { type: 'DECLARE_BONUS'; tileId: string }
  | { type: 'CALL_CHI'; tileIds: [string, string] } // Two tiles from hand
  | { type: 'CALL_PENG'; tileIds: [string, string] } // Two tiles from hand
  | { type: 'CALL_GANG'; tileIds: string[] } // 3 from hand (exposed) or 4 (concealed)
  | { type: 'DECLARE_WIN' }
  | { type: 'PASS' };

// ============================================================================
// SERVER MESSAGES (server -> client)
// ============================================================================

export type ServerMessage =
  | { type: 'STATE_UPDATE'; state: ClientGameState }
  | { type: 'ROOM_INFO'; roomCode: string; players: Array<{ name: string; seat: Seat }> }
  | { type: 'ERROR'; message: string }
  | { type: 'GAME_OVER'; winner: Seat; scores: Record<Seat, number>; breakdown: ScoreBreakdown };

// ============================================================================
// SCORING TYPES
// ============================================================================

export interface ScoreBreakdown {
  fan: number;
  items: ScoreItem[];
  basePoints: number;
  totalPoints: number;
}

export interface ScoreItem {
  name: string;
  fan: number;
}

// ============================================================================
// WIN CONTEXT (passed to ruleset for win/score calculation)
// ============================================================================

export interface WinContext {
  winningTile: TileInstance;
  isSelfDrawn: boolean;
  seatWind: WindDirection;
  roundWind: WindDirection;
  isLastTile: boolean; // Won on last tile of wall
  isReplacementTile: boolean; // Won on tile drawn after kong
  isRobbingKong: boolean; // Won by taking someone's kong tile
}

// ============================================================================
// TILE SET CONFIG (for rulesets)
// ============================================================================

export interface TileSetConfig {
  suits: Suit[];
  includeWinds: boolean;
  includeDragons: boolean;
  includeBonusTiles: boolean;
  copiesPerTile: number; // Usually 4
}

// ============================================================================
// RULESET INTERFACE
// ============================================================================

export interface Ruleset {
  id: string;
  name: string;

  // Tile configuration
  tileSet: TileSetConfig;

  // Call rules
  allowChi: boolean;
  chiFromLeftOnly: boolean; // If true, can only chi from player to your left
  allowPeng: boolean;
  allowGang: boolean;
  allowSelfDrawWin: boolean;

  // Game rules
  minimumFan: number; // Minimum fan required to win
  mustDiscardAfterDraw: boolean;
  allowReplacementTileAfterGang: boolean;

  // Winning hand validation
  isWinningHand: (hand: TileInstance[], melds: Meld[], context: WinContext) => boolean;

  // Scoring
  scoreHand: (hand: TileInstance[], melds: Meld[], context: WinContext) => ScoreBreakdown;

  // Generate the full tile set for this ruleset
  generateTileSet: () => TileInstance[];
}

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

export function isSuitedTile(tile: Tile): tile is SuitedTile {
  return tile.type === 'suited';
}

export function isWindTile(tile: Tile): tile is WindTile {
  return tile.type === 'wind';
}

export function isDragonTile(tile: Tile): tile is DragonTile {
  return tile.type === 'dragon';
}

export function isBonusTile(tile: Tile): tile is BonusTile {
  return tile.type === 'bonus';
}

export function isHonorTile(tile: Tile): tile is WindTile | DragonTile {
  return tile.type === 'wind' || tile.type === 'dragon';
}

export function isTerminalTile(tile: Tile): boolean {
  return tile.type === 'suited' && (tile.value === 1 || tile.value === 9);
}

export function isSimpleTile(tile: Tile): boolean {
  return tile.type === 'suited' && tile.value >= 2 && tile.value <= 8;
}

// ============================================================================
// TILE COMPARISON HELPERS
// ============================================================================

export function tilesEqual(a: Tile, b: Tile): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case 'suited':
      return a.suit === (b as SuitedTile).suit && a.value === (b as SuitedTile).value;
    case 'wind':
      return a.direction === (b as WindTile).direction;
    case 'dragon':
      return a.color === (b as DragonTile).color;
    case 'bonus':
      return a.bonusType === (b as BonusTile).bonusType && a.number === (b as BonusTile).number;
  }
}

export function getTileKey(tile: Tile): string {
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

export function sortTiles(tiles: TileInstance[]): TileInstance[] {
  return [...tiles].sort((a, b) => {
    const keyA = getTileKey(a.tile);
    const keyB = getTileKey(b.tile);
    return keyA.localeCompare(keyB);
  });
}
