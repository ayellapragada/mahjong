import type { GameState, Seat, Ruleset, WinContext, ScoreBreakdown } from './types';
import { calculateScoreTransfer } from './scoring';

export interface WinResult {
  state: GameState;
  winner: Seat;
  breakdown: ScoreBreakdown;
  isSelfDrawn: boolean;
}

/**
 * Process a win declaration (self-draw).
 */
export function declareSelfDrawWin(
  state: GameState,
  seat: Seat,
  ruleset: Ruleset
): WinResult | { error: string } {
  if (state.phase !== 'playing') {
    return { error: 'Game not in progress' };
  }

  if (state.currentTurn !== seat) {
    return { error: 'Not your turn' };
  }

  if (state.turnPhase !== 'discarding') {
    return { error: 'Cannot declare win now' };
  }

  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    return { error: 'Player not found' };
  }

  const winningTile = player.hand[player.hand.length - 1];
  const winContext: WinContext = {
    winningTile,
    isSelfDrawn: true,
    seatWind: (['east', 'south', 'west', 'north'] as const)[seat],
    roundWind: state.roundWind,
    isLastTile: state.wall.length === 0,
    isReplacementTile: false,
    isRobbingKong: false,
  };

  if (!ruleset.isWinningHand(player.hand, player.melds, winContext)) {
    return { error: 'Not a winning hand' };
  }

  const breakdown = ruleset.scoreHand(player.hand, player.melds, winContext);
  const transfer = calculateScoreTransfer(seat, breakdown, true);

  // Update scores
  const newScores = { ...state.scores };
  for (const s of [0, 1, 2, 3] as Seat[]) {
    newScores[s] += transfer[s];
  }

  const newState: GameState = {
    ...state,
    phase: 'finished',
    turnPhase: 'game_over',
    scores: newScores,
  };

  return {
    state: newState,
    winner: seat,
    breakdown,
    isSelfDrawn: true,
  };
}

/**
 * Process a win declaration from call window (discard win).
 */
export function declareDiscardWin(
  state: GameState,
  seat: Seat,
  ruleset: Ruleset
): WinResult | { error: string } {
  if (state.phase !== 'playing') {
    return { error: 'Game not in progress' };
  }

  if (state.turnPhase !== 'waiting_for_calls') {
    return { error: 'Not in call window' };
  }

  if (!state.lastDiscard) {
    return { error: 'No discard to win on' };
  }

  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    return { error: 'Player not found' };
  }

  const winningTile = state.lastDiscard.tile;
  const testHand = [...player.hand, winningTile];
  const winContext: WinContext = {
    winningTile,
    isSelfDrawn: false,
    seatWind: (['east', 'south', 'west', 'north'] as const)[seat],
    roundWind: state.roundWind,
    isLastTile: state.wall.length === 0,
    isReplacementTile: false,
    isRobbingKong: false,
  };

  if (!ruleset.isWinningHand(testHand, player.melds, winContext)) {
    return { error: 'Not a winning hand' };
  }

  const breakdown = ruleset.scoreHand(testHand, player.melds, winContext);
  const discarder = state.lastDiscard.from;
  const transfer = calculateScoreTransfer(seat, breakdown, false, discarder);

  // Update scores
  const newScores = { ...state.scores };
  for (const s of [0, 1, 2, 3] as Seat[]) {
    newScores[s] += transfer[s];
  }

  // Add winning tile to player's hand for display
  const newPlayers = state.players.map(p => {
    if (p.seat === seat) {
      return { ...p, hand: testHand };
    }
    return p;
  });

  const newState: GameState = {
    ...state,
    players: newPlayers,
    phase: 'finished',
    turnPhase: 'game_over',
    scores: newScores,
    pendingCalls: [],
    awaitingCallFrom: [],
  };

  return {
    state: newState,
    winner: seat,
    breakdown,
    isSelfDrawn: false,
  };
}
