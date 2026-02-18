import { describe, it, expect } from 'vitest';
import { startNextRound, canDeclareWin, discardTile, drawTile } from './engine';
import type { GameState, TileInstance, Seat, Player } from './types';
import { hongKongRuleset } from './rulesets/hongkong';

function makeSuitedTile(suit: 'dots' | 'bamboo' | 'characters', value: number, copy = 0): TileInstance {
  return {
    id: `${suit}-${value}-${copy}`,
    tile: { type: 'suited', suit, value: value as 1|2|3|4|5|6|7|8|9 },
  };
}

function makeTiles(...specs: Array<['dots' | 'bamboo' | 'characters', number, number?]>): TileInstance[] {
  return specs.map(([suit, value, copy]) => makeSuitedTile(suit, value, copy ?? 0));
}

function makePlayer(seat: Seat, hand: TileInstance[] = []): Player {
  return {
    id: `player-${seat}`,
    name: `Player ${seat}`,
    seat,
    hand,
    melds: [],
    bonusTiles: [],
    isDealer: seat === 0,
  };
}

function makeFinishedGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'finished',
    roomCode: 'TEST',
    rulesetId: 'hongkong',
    players: [makePlayer(0), makePlayer(1), makePlayer(2), makePlayer(3)],
    wall: [],
    deadWall: [],
    discardPiles: { 0: { tiles: [] }, 1: { tiles: [] }, 2: { tiles: [] }, 3: { tiles: [] } },
    currentTurn: 0 as Seat,
    turnPhase: 'game_over',
    roundWind: 'east',
    dealerSeat: 0 as Seat,
    pendingCalls: [],
    callTimeout: 0,
    awaitingCallFrom: [],
    scores: { 0: 100, 1: 50, 2: -50, 3: -100 },
    roundNumber: 1,
    handNumber: 1,
    actionLog: [],
    ...overrides,
  };
}

describe('startNextRound', () => {
  it('should start a new round after game is finished', () => {
    const state = makeFinishedGameState();

    const result = startNextRound(state, hongKongRuleset, undefined);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.phase).toBe('playing');
      expect(result.turnPhase).toBe('drawing');
      expect(result.players.every(p => p.hand.length === 13)).toBe(true);
      expect(result.wall.length).toBeGreaterThan(0);
    }
  });

  it('should keep scores from previous round', () => {
    const state = makeFinishedGameState({
      scores: { 0: 200, 1: 100, 2: -100, 3: -200 },
    });

    const result = startNextRound(state, hongKongRuleset, undefined);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.scores).toEqual({ 0: 200, 1: 100, 2: -100, 3: -200 });
    }
  });

  it('should keep dealer if dealer won', () => {
    const state = makeFinishedGameState({
      dealerSeat: 0,
    });

    const result = startNextRound(state, hongKongRuleset, 0); // Dealer won

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.dealerSeat).toBe(0);
      expect(result.handNumber).toBe(1); // Stays the same
    }
  });

  it('should rotate dealer if non-dealer won', () => {
    const state = makeFinishedGameState({
      dealerSeat: 0,
    });

    const result = startNextRound(state, hongKongRuleset, 1); // Non-dealer won

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.dealerSeat).toBe(1);
      expect(result.handNumber).toBe(2);
    }
  });

  it('should reject starting next round if game not finished', () => {
    const state = makeFinishedGameState({
      phase: 'playing',
    });

    const result = startNextRound(state, hongKongRuleset, undefined);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Game not finished');
    }
  });
});

describe('canDeclareWin', () => {
  it('should return true when player has winning hand on their turn', () => {
    const winningHand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], ['dots', 5, 1],
    );

    const state: GameState = {
      phase: 'playing',
      roomCode: 'TEST',
      rulesetId: 'hongkong',
      players: [
        { ...makePlayer(0), hand: winningHand },
        makePlayer(1),
        makePlayer(2),
        makePlayer(3),
      ],
      wall: [],
      deadWall: [],
      discardPiles: { 0: { tiles: [] }, 1: { tiles: [] }, 2: { tiles: [] }, 3: { tiles: [] } },
      currentTurn: 0,
      turnPhase: 'discarding',
      roundWind: 'east',
      dealerSeat: 0,
      pendingCalls: [],
      callTimeout: 0,
      awaitingCallFrom: [],
      scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
      roundNumber: 1,
      handNumber: 1,
      actionLog: [],
    };

    expect(canDeclareWin(state, hongKongRuleset)).toBe(true);
  });

  it('should return false when not their turn', () => {
    const winningHand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], ['dots', 5, 1],
    );

    const state: GameState = {
      phase: 'playing',
      roomCode: 'TEST',
      rulesetId: 'hongkong',
      players: [
        makePlayer(0),
        { ...makePlayer(1), hand: winningHand },
        makePlayer(2),
        makePlayer(3),
      ],
      wall: [],
      deadWall: [],
      discardPiles: { 0: { tiles: [] }, 1: { tiles: [] }, 2: { tiles: [] }, 3: { tiles: [] } },
      currentTurn: 0, // Player 0's turn
      turnPhase: 'discarding',
      roundWind: 'east',
      dealerSeat: 0,
      pendingCalls: [],
      callTimeout: 0,
      awaitingCallFrom: [],
      scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
      roundNumber: 1,
      handNumber: 1,
      actionLog: [],
    };

    expect(canDeclareWin(state, hongKongRuleset)).toBe(false);
  });

  it('should return false with non-winning hand', () => {
    const nonWinningHand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
      ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
      ['bamboo', 1, 0], ['bamboo', 2, 0], ['bamboo', 3, 0],
      ['characters', 1, 0], ['characters', 2, 0], ['characters', 3, 0],
      ['dots', 7, 0], ['dots', 9, 0], // Invalid - not a pair
    );

    const state: GameState = {
      phase: 'playing',
      roomCode: 'TEST',
      rulesetId: 'hongkong',
      players: [
        { ...makePlayer(0), hand: nonWinningHand },
        makePlayer(1),
        makePlayer(2),
        makePlayer(3),
      ],
      wall: [],
      deadWall: [],
      discardPiles: { 0: { tiles: [] }, 1: { tiles: [] }, 2: { tiles: [] }, 3: { tiles: [] } },
      currentTurn: 0,
      turnPhase: 'discarding',
      roundWind: 'east',
      dealerSeat: 0,
      pendingCalls: [],
      callTimeout: 0,
      awaitingCallFrom: [],
      scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
      roundNumber: 1,
      handNumber: 1,
      actionLog: [],
    };

    expect(canDeclareWin(state, hongKongRuleset)).toBe(false);
  });
});
