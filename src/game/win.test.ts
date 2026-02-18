import { describe, it, expect } from 'vitest';
import { declareSelfDrawWin, declareDiscardWin } from './win';
import type { GameState, TileInstance, Seat, Meld, Player } from './types';
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

function makePlayer(seat: Seat, hand: TileInstance[], melds: Meld[] = []): Player {
  return {
    id: `player-${seat}`,
    name: `Player ${seat}`,
    seat,
    hand,
    melds,
    bonusTiles: [],
    isDealer: seat === 0,
  };
}

function makeGameState(overrides: Partial<GameState>): GameState {
  return {
    phase: 'playing',
    roomCode: 'TEST',
    rulesetId: 'hongkong',
    players: [],
    wall: [],
    deadWall: [],
    discardPiles: { 0: { tiles: [] }, 1: { tiles: [] }, 2: { tiles: [] }, 3: { tiles: [] } },
    currentTurn: 0 as Seat,
    turnPhase: 'discarding',
    roundWind: 'east',
    dealerSeat: 0 as Seat,
    pendingCalls: [],
    callTimeout: 0,
    awaitingCallFrom: [],
    scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
    roundNumber: 1,
    handNumber: 1,
    actionLog: [],
    ...overrides,
  };
}

describe('declareSelfDrawWin', () => {
  it('should process valid self-draw win', () => {
    // Valid winning hand: 111 222 333 444 55 (dots) - 14 tiles
    const winningHand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], ['dots', 5, 1],
    );

    const state = makeGameState({
      players: [
        makePlayer(0, winningHand),
        makePlayer(1, []),
        makePlayer(2, []),
        makePlayer(3, []),
      ],
      currentTurn: 0,
      turnPhase: 'discarding',
    });

    const result = declareSelfDrawWin(state, 0, hongKongRuleset);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.winner).toBe(0);
      expect(result.isSelfDrawn).toBe(true);
      expect(result.state.phase).toBe('finished');
      expect(result.state.turnPhase).toBe('game_over');
      expect(result.breakdown.fan).toBeGreaterThanOrEqual(0);
    }
  });

  it('should reject win when not your turn', () => {
    const winningHand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], ['dots', 5, 1],
    );

    const state = makeGameState({
      players: [
        makePlayer(0, []),
        makePlayer(1, winningHand),
        makePlayer(2, []),
        makePlayer(3, []),
      ],
      currentTurn: 0, // It's player 0's turn
      turnPhase: 'discarding',
    });

    // Player 1 tries to win
    const result = declareSelfDrawWin(state, 1, hongKongRuleset);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Not your turn');
    }
  });

  it('should reject win with non-winning hand', () => {
    const nonWinningHand = makeTiles(
      ['dots', 1, 0], ['dots', 2, 0], ['dots', 3, 0],
      ['dots', 4, 0], ['dots', 5, 0], ['dots', 6, 0],
      ['dots', 7, 0], ['dots', 8, 0], ['dots', 9, 0],
      ['bamboo', 1, 0], ['bamboo', 2, 0], ['bamboo', 3, 0],
      ['characters', 5, 0], ['characters', 9, 0], // Not a valid hand
    );

    const state = makeGameState({
      players: [
        makePlayer(0, nonWinningHand),
        makePlayer(1, []),
        makePlayer(2, []),
        makePlayer(3, []),
      ],
      currentTurn: 0,
      turnPhase: 'discarding',
    });

    const result = declareSelfDrawWin(state, 0, hongKongRuleset);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Not a winning hand');
    }
  });

  it('should update scores correctly for self-draw', () => {
    const winningHand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], ['dots', 5, 1],
    );

    const state = makeGameState({
      players: [
        makePlayer(0, winningHand),
        makePlayer(1, []),
        makePlayer(2, []),
        makePlayer(3, []),
      ],
      currentTurn: 0,
      turnPhase: 'discarding',
      scores: { 0: 100, 1: 100, 2: 100, 3: 100 },
    });

    const result = declareSelfDrawWin(state, 0, hongKongRuleset);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      // Self-draw: all losers pay the same amount
      const totalGain = result.state.scores[0] - 100;
      const loss1 = 100 - result.state.scores[1];
      const loss2 = 100 - result.state.scores[2];
      const loss3 = 100 - result.state.scores[3];

      expect(totalGain).toBe(loss1 + loss2 + loss3);
      expect(loss1).toBe(loss2);
      expect(loss2).toBe(loss3);
    }
  });
});

describe('declareDiscardWin', () => {
  it('should process valid discard win', () => {
    // Hand with 13 tiles waiting for the 14th
    const waitingHand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0], // Waiting for 5
    );

    const discard = makeSuitedTile('dots', 5, 1);

    const state = makeGameState({
      players: [
        makePlayer(0, []),
        makePlayer(1, waitingHand),
        makePlayer(2, []),
        makePlayer(3, []),
      ],
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      lastDiscard: { tile: discard, from: 0 as Seat },
      awaitingCallFrom: [1, 2, 3] as Seat[],
    });

    const result = declareDiscardWin(state, 1, hongKongRuleset);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.winner).toBe(1);
      expect(result.isSelfDrawn).toBe(false);
      expect(result.state.phase).toBe('finished');
    }
  });

  it('should reject win when not in call window', () => {
    const waitingHand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0],
    );

    const state = makeGameState({
      players: [
        makePlayer(0, []),
        makePlayer(1, waitingHand),
        makePlayer(2, []),
        makePlayer(3, []),
      ],
      currentTurn: 0,
      turnPhase: 'discarding', // Not in call window
    });

    const result = declareDiscardWin(state, 1, hongKongRuleset);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Not in call window');
    }
  });

  it('should make discarder pay double', () => {
    const waitingHand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2],
      ['dots', 5, 0],
    );

    const discard = makeSuitedTile('dots', 5, 1);

    const state = makeGameState({
      players: [
        makePlayer(0, []),
        makePlayer(1, waitingHand),
        makePlayer(2, []),
        makePlayer(3, []),
      ],
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      lastDiscard: { tile: discard, from: 0 as Seat },
      awaitingCallFrom: [1, 2, 3] as Seat[],
      scores: { 0: 100, 1: 100, 2: 100, 3: 100 },
    });

    const result = declareDiscardWin(state, 1, hongKongRuleset);

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      // Discarder (0) should pay double
      const discarderLoss = 100 - result.state.scores[0];
      const otherLoss = 100 - result.state.scores[2];

      expect(discarderLoss).toBe(otherLoss * 2);
    }
  });
});
