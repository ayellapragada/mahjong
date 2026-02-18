// party/bot.test.ts
import { describe, it, expect } from 'vitest';
import { BotPlayer } from './bot';
import type { GameState, TileInstance, Seat, Player } from '../src/game/types';

// Helper to create minimal game state
function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    roomCode: 'TEST',
    rulesetId: 'hongkong',
    players: [],
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
    ...overrides,
  };
}

function makeTile(id: string): TileInstance {
  return { id, tile: { type: 'suited', suit: 'dots', value: 1 } };
}

function makePlayer(seat: Seat, hand: TileInstance[]): Player {
  return {
    id: `bot-${seat}`,
    name: `Bot ${seat}`,
    seat,
    hand,
    melds: [],
    bonusTiles: [],
    isDealer: seat === 0,
  };
}

describe('BotPlayer', () => {
  it('should create a bot with default name based on seat', () => {
    const bot = new BotPlayer(0);
    expect(bot.seat).toBe(0);
    expect(bot.name).toBe('Bot East');
  });

  it('should create bots with correct wind names', () => {
    expect(new BotPlayer(0).name).toBe('Bot East');
    expect(new BotPlayer(1).name).toBe('Bot South');
    expect(new BotPlayer(2).name).toBe('Bot West');
    expect(new BotPlayer(3).name).toBe('Bot North');
  });

  it('should have default thinking delay range', () => {
    const bot = new BotPlayer(0);
    expect(bot.thinkingDelay).toEqual({ min: 500, max: 1500 });
  });

  it('should allow custom thinking delay', () => {
    const bot = new BotPlayer(0, { thinkingDelay: { min: 100, max: 200 } });
    expect(bot.thinkingDelay).toEqual({ min: 100, max: 200 });
  });

  it('should return a delay within configured range', () => {
    const bot = new BotPlayer(0, { thinkingDelay: { min: 100, max: 200 } });
    for (let i = 0; i < 100; i++) {
      const delay = bot.getThinkingDelay();
      expect(delay).toBeGreaterThanOrEqual(100);
      expect(delay).toBeLessThanOrEqual(200);
    }
  });
});

describe('BotPlayer.decideAction', () => {
  it('should return discard action when it is bots turn to discard', () => {
    const bot = new BotPlayer(0);
    const hand = [makeTile('tile-1'), makeTile('tile-2'), makeTile('tile-3')];
    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'discarding',
      players: [makePlayer(0, hand)],
    });

    const action = bot.decideAction(state);

    expect(action).not.toBeNull();
    expect(action!.type).toBe('discard');
    if (action!.type === 'discard') {
      expect(hand.map(t => t.id)).toContain(action.tileId);
    }
  });

  it('should return null when it is not bots turn', () => {
    const bot = new BotPlayer(0);
    const state = makeGameState({
      currentTurn: 1, // Not bot's turn
      turnPhase: 'discarding',
      players: [makePlayer(0, [makeTile('tile-1')])],
    });

    const action = bot.decideAction(state);

    expect(action).toBeNull();
  });

  it('should return null when not in discarding phase', () => {
    const bot = new BotPlayer(0);
    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'drawing', // Not discarding
      players: [makePlayer(0, [makeTile('tile-1')])],
    });

    const action = bot.decideAction(state);

    expect(action).toBeNull();
  });

  it('should return null when hand is empty', () => {
    const bot = new BotPlayer(0);
    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'discarding',
      players: [makePlayer(0, [])], // Empty hand
    });

    const action = bot.decideAction(state);

    expect(action).toBeNull();
  });
});

function makeSuitedTile(suit: 'dots' | 'bamboo' | 'characters', value: number, copy = 0): TileInstance {
  return {
    id: `${suit}-${value}-${copy}`,
    tile: { type: 'suited', suit, value: value as 1|2|3|4|5|6|7|8|9 },
  };
}

describe('BotPlayer.decideAction - calls', () => {
  it('should return pass when in call window with no available calls', () => {
    const bot = new BotPlayer(1);
    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      awaitingCallFrom: [1],
      players: [makePlayer(1, [makeTile('tile-1')])],
    });

    const action = bot.decideAction(state);

    expect(action).toEqual({ type: 'pass' });
  });

  it('should return null when not awaited for call', () => {
    const bot = new BotPlayer(1);
    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      awaitingCallFrom: [2], // Not awaiting bot 1
      players: [makePlayer(1, [makeTile('tile-1')])],
    });

    const action = bot.decideAction(state);

    expect(action).toBeNull();
  });
});

describe('BotPlayer.decideAction - making calls', () => {
  it('should sometimes make a peng call when available', () => {
    const bot = new BotPlayer(1);
    // Hand has two 5-dots, discard is 5-dots
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 7),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      awaitingCallFrom: [1],
      lastDiscard: { tile: discard, from: 0 as Seat },
      players: [
        makePlayer(0, []),
        makePlayer(1, hand),
      ],
    });

    // Run multiple times to check randomness (50% call, 50% pass)
    let madeCall = false;
    let passed = false;
    for (let i = 0; i < 100; i++) {
      const action = bot.decideAction(state);
      if (action?.type === 'call' && action.callType === 'peng') {
        madeCall = true;
      } else if (action?.type === 'pass') {
        passed = true;
      }
    }

    // Should sometimes call, sometimes pass (50/50)
    expect(madeCall).toBe(true);
    expect(passed).toBe(true);
  });

  it('should return the correct tile IDs when making a peng call', () => {
    const bot = new BotPlayer(1);
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
      makeSuitedTile('dots', 7),
    ];
    const discard = makeSuitedTile('dots', 5, 2);

    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      awaitingCallFrom: [1],
      lastDiscard: { tile: discard, from: 0 as Seat },
      players: [
        makePlayer(0, []),
        makePlayer(1, hand),
      ],
    });

    // Keep trying until we get a call
    let action = null;
    for (let i = 0; i < 100; i++) {
      action = bot.decideAction(state);
      if (action?.type === 'call') break;
    }

    expect(action).not.toBeNull();
    expect(action!.type).toBe('call');
    if (action!.type === 'call') {
      expect(action.callType).toBe('peng');
      expect(action.tileIds).toHaveLength(2);
      // Should be the two 5-dots tiles from hand
      expect(action.tileIds).toContain('dots-5-0');
      expect(action.tileIds).toContain('dots-5-1');
    }
  });

  it('should pass when no lastDiscard exists', () => {
    const bot = new BotPlayer(1);
    const hand = [
      makeSuitedTile('dots', 5, 0),
      makeSuitedTile('dots', 5, 1),
    ];

    const state = makeGameState({
      currentTurn: 0,
      turnPhase: 'waiting_for_calls',
      awaitingCallFrom: [1],
      lastDiscard: undefined, // No discard
      players: [makePlayer(1, hand)],
    });

    const action = bot.decideAction(state);

    expect(action).toEqual({ type: 'pass' });
  });
});
