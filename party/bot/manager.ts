// party/bot/manager.ts
import type { GameState, Seat } from "../../src/game/types";
import { addPlayer, removePlayer } from "../../src/game/engine";
import { BotPlayer, type BotAction } from "./bot";

export interface BotManager {
  bots: Map<Seat, BotPlayer>;
  pendingBotAction?: { seat: Seat; scheduledAt: number };
}

export function createBotManager(): BotManager {
  return {
    bots: new Map(),
    pendingBotAction: undefined,
  };
}

export function fillEmptySeatsWithBots(
  manager: BotManager,
  state: GameState
): GameState {
  const occupiedSeats = new Set(state.players.map(p => p.seat));

  for (const seat of [0, 1, 2, 3] as Seat[]) {
    if (!occupiedSeats.has(seat)) {
      const bot = new BotPlayer(seat);
      manager.bots.set(seat, bot);

      const result = addPlayer(state, `bot-${seat}`, bot.name, seat);
      if (!("error" in result)) {
        state = result;
      }
    }
  }

  return state;
}

export function bumpBot(manager: BotManager, seat: Seat): void {
  if (manager.pendingBotAction?.seat === seat) {
    manager.pendingBotAction = undefined;
  }
  manager.bots.delete(seat);
}

export function clearAllBots(manager: BotManager): void {
  manager.pendingBotAction = undefined;
  manager.bots.clear();
}

// Removes bot from game state only. Call bumpBot() separately to clean up manager.
export function removeBotPlayer(state: GameState, seat: Seat): GameState {
  const botId = `bot-${seat}`;
  return removePlayer(state, botId);
}

export function getBotNeedingAction(
  manager: BotManager,
  state: GameState
): { seat: Seat; bot: BotPlayer; action: BotAction } | null {
  if (state.phase !== 'playing') return null;

  for (const [seat, bot] of manager.bots) {
    const needsToAct =
      (state.currentTurn === seat && state.turnPhase === 'discarding') ||
      (state.turnPhase === 'waiting_for_calls' && state.awaitingCallFrom.includes(seat));

    if (needsToAct) {
      const action = bot.decideAction(state);
      if (action) {
        return { seat, bot, action };
      }
    }
  }

  return null;
}
