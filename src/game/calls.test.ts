import { describe, it, expect } from 'vitest';
import {
  findChiCombinations,
  findPengTiles,
  findGangTiles,
  getAvailableCallsForPlayer,
  registerCall,
  resolveCallWindow,
} from './calls';
import type { TileInstance, Suit, Seat, GameState, Meld } from './types';
import { hongKongRuleset } from './rulesets/hongkong';

// Helper function to create minimal game state for testing
function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    roomCode: 'TEST',
    rulesetId: 'hongkong',
    players: [],
    wall: [],
    deadWall: [],
    discardPiles: { 0: { tiles: [] }, 1: { tiles: [] }, 2: { tiles: [] }, 3: { tiles: [] } },
    currentTurn: 0,
    turnPhase: 'waiting_for_calls',
    roundWind: 'east',
    dealerSeat: 0,
    pendingCalls: [],
    callTimeout: 0,
    awaitingCallFrom: [],
    scores: { 0: 0, 1: 0, 2: 0, 3: 0 },
    roundNumber: 1,
    handNumber: 1,
    ...overrides,
  };
}

function makeSuitedTile(suit: Suit, value: number, copy = 0): TileInstance {
  return {
    id: `${suit}-${value}-${copy}`,
    tile: { type: 'suited', suit, value: value as 1|2|3|4|5|6|7|8|9 },
  };
}

function makeTiles(...specs: Array<[Suit, number, number?]>): TileInstance[] {
  return specs.map(([suit, value, copy]) => makeSuitedTile(suit, value, copy ?? 0));
}

describe('findChiCombinations', () => {
  it('should find chi when discard is middle of sequence', () => {
    // Hand has 1 and 3, discard is 2
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 3),
      makeSuitedTile('dots', 7),
    ];
    const discard = makeSuitedTile('dots', 2);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(1);
    expect(combos[0].map(t => (t.tile as any).value).sort()).toEqual([1, 3]);
  });

  it('should find chi when discard is low end of sequence', () => {
    // Hand has 2 and 3, discard is 1
    const hand = [
      makeSuitedTile('dots', 2),
      makeSuitedTile('dots', 3),
    ];
    const discard = makeSuitedTile('dots', 1);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(1);
    expect(combos[0].map(t => (t.tile as any).value).sort()).toEqual([2, 3]);
  });

  it('should find chi when discard is high end of sequence', () => {
    // Hand has 7 and 8, discard is 9
    const hand = [
      makeSuitedTile('dots', 7),
      makeSuitedTile('dots', 8),
    ];
    const discard = makeSuitedTile('dots', 9);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(1);
    expect(combos[0].map(t => (t.tile as any).value).sort()).toEqual([7, 8]);
  });

  it('should find multiple chi combinations', () => {
    // Hand has 1,2,4,5 - discard is 3 - can form 1-2-3, 2-3-4, 3-4-5
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 2),
      makeSuitedTile('dots', 4),
      makeSuitedTile('dots', 5),
    ];
    const discard = makeSuitedTile('dots', 3);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(3);
  });

  it('should return empty for honor tiles', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 2),
    ];
    const discard: TileInstance = {
      id: 'wind-east-0',
      tile: { type: 'wind', direction: 'east' },
    };

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(0);
  });

  it('should return empty when no valid sequence exists', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 5),
    ];
    const discard = makeSuitedTile('dots', 3);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(0);
  });

  it('should only match same suit', () => {
    const hand = [
      makeSuitedTile('bamboo', 1),
      makeSuitedTile('bamboo', 3),
    ];
    const discard = makeSuitedTile('dots', 2);

    const combos = findChiCombinations(hand, discard);

    expect(combos).toHaveLength(0);
  });
});

describe('findPengTiles', () => {
  it('should find peng when hand has 2 matching tiles', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 7, 0),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const result = findPengTiles(hand, discard);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
  });

  it('should return null when hand has only 1 matching tile', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 7, 0),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const result = findPengTiles(hand, discard);

    expect(result).toBeNull();
  });

  it('should work with honor tiles', () => {
    const hand: TileInstance[] = [
      { id: 'wind-east-0', tile: { type: 'wind', direction: 'east' } },
      { id: 'wind-east-1', tile: { type: 'wind', direction: 'east' } },
    ];
    const discard: TileInstance = {
      id: 'wind-east-2',
      tile: { type: 'wind', direction: 'east' },
    };

    const result = findPengTiles(hand, discard);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
  });
});

describe('findGangTiles', () => {
  it('should find gang when hand has 3 matching tiles', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 5, 2),
      makeSuitedTile('dots', 7, 0),
    ];
    const discard = makeSuitedTile('dots', 5, 3);

    const result = findGangTiles(hand, discard);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
  });

  it('should return null when hand has only 2 matching tiles', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 7, 0),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const result = findGangTiles(hand, discard);

    expect(result).toBeNull();
  });
});

describe('getAvailableCallsForPlayer', () => {
  it('should return peng when player has 2 matching tiles', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,  // player seat
      0 as Seat,  // discarder seat
      hongKongRuleset
    );

    expect(calls.some(c => c.type === 'peng')).toBe(true);
  });

  it('should return chi only for left player in HK rules', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 3),
    ];
    const discard = makeSuitedTile('dots', 2);

    // Seat 1 is to the left of seat 0 (discarder)
    const callsLeft = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset
    );
    expect(callsLeft.some(c => c.type === 'chi')).toBe(true);

    // Seat 2 is NOT to the left of seat 0
    const callsNotLeft = getAvailableCallsForPlayer(
      hand,
      discard,
      2 as Seat,
      0 as Seat,
      hongKongRuleset
    );
    expect(callsNotLeft.some(c => c.type === 'chi')).toBe(false);
  });

  it('should return empty array when no calls available', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('bamboo', 5),
    ];
    const discard = makeSuitedTile('characters', 9);

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset
    );

    expect(calls).toHaveLength(0);
  });

  it('should return both peng and gang when player has 3 matching', () => {
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 5, 2),
    ];
    const discard = makeSuitedTile('dots', 5, 3);

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset
    );

    expect(calls.some(c => c.type === 'peng')).toBe(true);
    expect(calls.some(c => c.type === 'gang')).toBe(true);
  });
});

describe('registerCall', () => {
  it('should add call to pendingCalls and remove from awaitingCallFrom', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [1, 2, 3] as Seat[],
      pendingCalls: [],
    });

    const newState = registerCall(state, 1 as Seat, 'peng', ['dots-5-0', 'dots-5-1']);

    expect(newState.pendingCalls).toHaveLength(1);
    expect(newState.pendingCalls[0].seat).toBe(1);
    expect(newState.pendingCalls[0].callType).toBe('peng');
    expect(newState.awaitingCallFrom).toEqual([2, 3]);
  });

  it('should handle pass call', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [1, 2] as Seat[],
      pendingCalls: [],
    });

    const newState = registerCall(state, 1 as Seat, 'pass', []);

    expect(newState.pendingCalls).toHaveLength(1);
    expect(newState.pendingCalls[0].callType).toBe('pass');
    expect(newState.awaitingCallFrom).toEqual([2]);
  });
});

describe('resolveCallWindow', () => {
  it('should return state unchanged if still awaiting responses', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [2] as Seat[],
      pendingCalls: [{ seat: 1 as Seat, callType: 'pass' }],
    });

    const result = resolveCallWindow(state, hongKongRuleset);

    expect(result).toEqual(state);
  });

  it('should pick gang over peng', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [],
      pendingCalls: [
        { seat: 1 as Seat, callType: 'peng', tiles: [{ id: 'dots-5-0', tile: { type: 'suited', suit: 'dots', value: 5 } } as TileInstance, { id: 'dots-5-1', tile: { type: 'suited', suit: 'dots', value: 5 } } as TileInstance] },
        { seat: 2 as Seat, callType: 'gang', tiles: [{ id: 'dots-5-0', tile: { type: 'suited', suit: 'dots', value: 5 } } as TileInstance, { id: 'dots-5-1', tile: { type: 'suited', suit: 'dots', value: 5 } } as TileInstance, { id: 'dots-5-2', tile: { type: 'suited', suit: 'dots', value: 5 } } as TileInstance] },
      ],
      lastDiscard: { tile: makeSuitedTile('dots', 5, 3), from: 0 as Seat },
      players: [
        { id: 'p0', name: 'P0', seat: 0 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: true },
        { id: 'p1', name: 'P1', seat: 1 as Seat, hand: [makeSuitedTile('dots', 5, 0), makeSuitedTile('dots', 5, 1), makeSuitedTile('dots', 9)], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p2', name: 'P2', seat: 2 as Seat, hand: [makeSuitedTile('dots', 5, 0), makeSuitedTile('dots', 5, 1), makeSuitedTile('dots', 5, 2)], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p3', name: 'P3', seat: 3 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
      ],
    });

    const result = resolveCallWindow(state, hongKongRuleset);

    expect(result.currentTurn).toBe(2); // Gang winner's turn
  });

  it('should pick peng over chi', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [],
      pendingCalls: [
        { seat: 1 as Seat, callType: 'chi', tiles: [{ id: 'dots-1-0', tile: { type: 'suited', suit: 'dots', value: 1 } } as TileInstance, { id: 'dots-3-0', tile: { type: 'suited', suit: 'dots', value: 3 } } as TileInstance] },
        { seat: 2 as Seat, callType: 'peng', tiles: [{ id: 'dots-2-0', tile: { type: 'suited', suit: 'dots', value: 2 } } as TileInstance, { id: 'dots-2-1', tile: { type: 'suited', suit: 'dots', value: 2 } } as TileInstance] },
      ],
      lastDiscard: { tile: makeSuitedTile('dots', 2, 2), from: 0 as Seat },
      players: [
        { id: 'p0', name: 'P0', seat: 0 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: true },
        { id: 'p1', name: 'P1', seat: 1 as Seat, hand: [makeSuitedTile('dots', 1), makeSuitedTile('dots', 3)], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p2', name: 'P2', seat: 2 as Seat, hand: [makeSuitedTile('dots', 2, 0), makeSuitedTile('dots', 2, 1)], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p3', name: 'P3', seat: 3 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
      ],
    });

    const result = resolveCallWindow(state, hongKongRuleset);

    expect(result.currentTurn).toBe(2); // Peng winner's turn
  });

  it('should advance to next player when all pass', () => {
    const state = makeMinimalState({
      awaitingCallFrom: [],
      pendingCalls: [
        { seat: 1 as Seat, callType: 'pass' },
        { seat: 2 as Seat, callType: 'pass' },
        { seat: 3 as Seat, callType: 'pass' },
      ],
      lastDiscard: { tile: makeSuitedTile('dots', 5, 0), from: 0 as Seat },
      currentTurn: 0,
      players: [
        { id: 'p0', name: 'P0', seat: 0 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: true },
        { id: 'p1', name: 'P1', seat: 1 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p2', name: 'P2', seat: 2 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
        { id: 'p3', name: 'P3', seat: 3 as Seat, hand: [], melds: [], bonusTiles: [], isDealer: false },
      ],
    });

    const result = resolveCallWindow(state, hongKongRuleset);

    expect(result.currentTurn).toBe(1); // Next player after discarder
    expect(result.turnPhase).toBe('drawing');
  });
});

describe('getAvailableCallsForPlayer - win detection', () => {
  it('should return win call when player can win on discard', () => {
    // Hand: 111 222 333 44 55 (dots) - needs another 4 to complete
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1], ['dots', 3, 2],
      ['dots', 4, 0], ['dots', 4, 1],
      ['dots', 5, 0], ['dots', 5, 1],
    );
    const discard = makeSuitedTile('dots', 4, 2);

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset
    );

    expect(calls.some(c => c.type === 'win')).toBe(true);
  });

  it('should not return win call when hand is not winning', () => {
    const hand = [
      makeSuitedTile('dots', 1),
      makeSuitedTile('dots', 2),
      makeSuitedTile('bamboo', 5),
    ];
    const discard = makeSuitedTile('characters', 9);

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset
    );

    expect(calls.some(c => c.type === 'win')).toBe(false);
  });

  it('should detect win with exposed melds', () => {
    // Hand has 10 tiles (3 melds worth) + pair, plus 1 exposed meld
    // With 1 exposed meld (3 tiles), hand should have 11 tiles (3*3 + 2)
    const hand = makeTiles(
      ['dots', 1, 0], ['dots', 1, 1], ['dots', 1, 2],
      ['dots', 2, 0], ['dots', 2, 1], ['dots', 2, 2],
      ['dots', 3, 0], ['dots', 3, 1],
      ['dots', 5, 0], ['dots', 5, 1],
    );
    const discard = makeSuitedTile('dots', 3, 2); // Completes 333 triplet

    const melds: Meld[] = [{
      type: 'peng',
      tiles: makeTiles(['dots', 4, 0], ['dots', 4, 1], ['dots', 4, 2]) as TileInstance[],
      fromPlayer: 0 as Seat
    }];

    const calls = getAvailableCallsForPlayer(
      hand,
      discard,
      1 as Seat,
      0 as Seat,
      hongKongRuleset,
      melds
    );

    expect(calls.some(c => c.type === 'win')).toBe(true);
  });
});
