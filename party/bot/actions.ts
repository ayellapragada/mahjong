// party/bot/actions.ts
import type { GameState, Seat, ScoreBreakdown } from "../../src/game/types";
import { discardTile, drawTile, logAction } from "../../src/game/engine";
import { registerCall, resolveCallWindow } from "../../src/game/calls";
import { getRuleset } from "../../src/game/rulesets";
import { declareSelfDrawWin, declareDiscardWin } from "../../src/game/win";
import type { BotManager } from "./manager";

export type BotActionResult =
  | {
      state: GameState;
      gameOver?: {
        winner: Seat;
        breakdown: ScoreBreakdown;
        isSelfDrawn: boolean;
      };
      isDraw?: boolean;
    }
  | { error: string };

export function handleBotDiscard(
  manager: BotManager,
  state: GameState,
  seat: Seat,
  tileId: string
): BotActionResult {
  if (!manager.bots.has(seat)) {
    return { error: "Bot not found" };
  }

  const botPlayer = state.players.find(p => p.seat === seat);
  const discardedTile = botPlayer?.hand.find(t => t.id === tileId);

  const ruleset = getRuleset(state.rulesetId);
  const result = discardTile(state, seat, tileId, ruleset);

  if ("error" in result) {
    return { error: result.error };
  }

  state = result;

  if (discardedTile) {
    state = logAction(state, 'discard', seat, discardedTile);
  }

  if (state.turnPhase === "drawing") {
    const drawResult = drawTile(state, ruleset);
    if (!("error" in drawResult)) {
      state = drawResult;
    }
  }

  const isDraw = state.phase === 'finished' && state.turnPhase === 'game_over';
  return { state, isDraw };
}

export function handleBotCall(
  manager: BotManager,
  state: GameState,
  seat: Seat,
  callType: 'chi' | 'peng' | 'gang',
  tileIds: string[]
): BotActionResult {
  if (!manager.bots.has(seat)) {
    return { error: "Bot not found" };
  }

  if (state.turnPhase !== "waiting_for_calls") {
    return { error: "Not waiting for calls" };
  }

  if (!state.awaitingCallFrom.includes(seat)) {
    return { error: "Not expecting call from bot" };
  }

  const calledTile = state.lastDiscard?.tile;
  const fromSeat = state.lastDiscard?.from;

  state = registerCall(state, seat, callType, tileIds);

  const ruleset = getRuleset(state.rulesetId);
  const resolved = resolveCallWindow(state, ruleset);

  if (resolved !== state) {
    state = resolved;

    if (state.currentTurn === seat && calledTile) {
      state = logAction(state, callType, seat, calledTile, fromSeat);
    }

    if (state.turnPhase === "replacing" || state.turnPhase === "drawing") {
      const drawResult = drawTile(state, ruleset);
      if (!("error" in drawResult)) {
        state = drawResult;
      }
    }
  }

  const isDraw = state.phase === 'finished' && state.turnPhase === 'game_over';
  return { state, isDraw };
}

export function handleBotPass(
  manager: BotManager,
  state: GameState,
  seat: Seat
): BotActionResult {
  if (!manager.bots.has(seat)) {
    return { error: "Bot not found" };
  }

  if (state.turnPhase !== "waiting_for_calls") {
    return { error: "Not waiting for calls" };
  }

  if (!state.awaitingCallFrom.includes(seat)) {
    return { error: "Not expecting call from bot" };
  }

  state = registerCall(state, seat, 'pass', []);

  const ruleset = getRuleset(state.rulesetId);
  const resolved = resolveCallWindow(state, ruleset);

  if (resolved !== state) {
    state = resolved;

    if (state.turnPhase === "drawing") {
      const drawResult = drawTile(state, ruleset);
      if (!("error" in drawResult)) {
        state = drawResult;
      }
    }
  }

  const isDraw = state.phase === 'finished' && state.turnPhase === 'game_over';
  return { state, isDraw };
}

export function handleBotWin(
  manager: BotManager,
  state: GameState,
  seat: Seat
): BotActionResult {
  if (!manager.bots.has(seat)) {
    return { error: "Bot not found" };
  }

  const ruleset = getRuleset(state.rulesetId);

  let result;
  if (state.turnPhase === 'discarding' && state.currentTurn === seat) {
    result = declareSelfDrawWin(state, seat, ruleset);
  } else if (state.turnPhase === 'waiting_for_calls') {
    result = declareDiscardWin(state, seat, ruleset);
  } else {
    return { error: "Invalid win timing" };
  }

  if ("error" in result) {
    return { error: result.error };
  }

  return {
    state: result.state,
    gameOver: {
      winner: result.winner,
      breakdown: result.breakdown,
      isSelfDrawn: result.isSelfDrawn,
    }
  };
}
