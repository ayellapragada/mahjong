// party/bot.ts
import type { Seat, GameState, CallType } from '../src/game/types';
import { getAvailableCallsForPlayer } from '../src/game/calls';
import { canDeclareWin } from '../src/game/engine';
import { getRuleset } from '../src/game/rulesets';

export type BotAction =
  | { type: 'discard'; tileId: string }
  | { type: 'call'; callType: 'chi' | 'peng' | 'gang'; tileIds: string[] }
  | { type: 'win' }
  | { type: 'pass' };

const SEAT_WIND_NAMES: Record<Seat, string> = {
  0: 'East',
  1: 'South',
  2: 'West',
  3: 'North',
};

export interface BotOptions {
  thinkingDelay?: { min: number; max: number };
}

export class BotPlayer {
  seat: Seat;
  name: string;
  thinkingDelay: { min: number; max: number };

  constructor(seat: Seat, options: BotOptions = {}) {
    this.seat = seat;
    this.name = `Bot ${SEAT_WIND_NAMES[seat]}`;
    this.thinkingDelay = options.thinkingDelay ?? { min: 500, max: 1500 };
  }

  getThinkingDelay(): number {
    const { min, max } = this.thinkingDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  decideAction(state: GameState): BotAction | null {
    // Find the bot's player data
    const player = state.players.find(p => p.seat === this.seat);
    if (!player) return null;

    // Guard against empty hand
    if (player.hand.length === 0) return null;

    // Check if it's our turn to discard
    if (state.currentTurn === this.seat && state.turnPhase === 'discarding') {
      // Check for self-draw win first
      const ruleset = getRuleset(state.rulesetId);
      if (canDeclareWin(state, this.seat, ruleset)) {
        return { type: 'win' };
      }

      // Pick a random tile to discard
      const randomIndex = Math.floor(Math.random() * player.hand.length);
      return { type: 'discard', tileId: player.hand[randomIndex].id };
    }

    // Check if we're in a call window and expected to respond
    if (state.turnPhase === 'waiting_for_calls' && state.awaitingCallFrom.includes(this.seat)) {
      // Need a discard to call on
      if (!state.lastDiscard) {
        return { type: 'pass' };
      }

      const ruleset = getRuleset(state.rulesetId);
      const availableCalls = getAvailableCallsForPlayer(
        player.hand,
        state.lastDiscard.tile,
        this.seat,
        state.lastDiscard.from,
        ruleset,
        player.melds
      );

      // Always declare win if available
      if (availableCalls.some(c => c.type === 'win')) {
        return { type: 'win' };
      }

      // Filter out 'pass' and 'win' - check other calls
      const realCalls = availableCalls.filter(c => c.type !== 'pass' && c.type !== 'win');

      if (realCalls.length > 0 && Math.random() < 0.5) {
        // 50% chance to make the highest priority call
        // Priority: gang > peng > chi
        const priorityOrder: CallType[] = ['gang', 'peng', 'chi'];
        for (const callType of priorityOrder) {
          const call = realCalls.find(c => c.type === callType);
          if (call && call.tiles && call.tiles.length > 0) {
            // Use first available combination
            return {
              type: 'call',
              callType: callType as 'chi' | 'peng' | 'gang',
              tileIds: call.tiles[0].map(t => t.id),
            };
          }
        }
      }

      return { type: 'pass' };
    }

    return null;
  }
}
