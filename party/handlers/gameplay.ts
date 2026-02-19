// party/handlers/gameplay.ts
import type { GameState, Seat, ScoreBreakdown } from "../../src/game/types";
import { discardTile, drawTile, logAction } from "../../src/game/engine";
import { registerCall, resolveCallWindow } from "../../src/game/calls";
import { getRuleset } from "../../src/game/rulesets";
import { declareSelfDrawWin, declareDiscardWin } from "../../src/game/win";

export type GameplayResult =
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

export function handleDiscard(
  state: GameState,
  connId: string,
  tileId: string
): GameplayResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You are not in this game" };
  }

  const discardedTile = player.hand.find(t => t.id === tileId);
  const ruleset = getRuleset(state.rulesetId);
  const result = discardTile(state, player.seat, tileId, ruleset);

  if ("error" in result) {
    return { error: result.error };
  }

  state = result;

  if (discardedTile) {
    state = logAction(state, 'discard', player.seat, discardedTile);
  }

  if (state.turnPhase === "drawing") {
    const drawResult = drawTile(state, ruleset);
    if (!("error" in drawResult)) {
      state = drawResult;
    }
  }

  const isDraw = checkForDraw(state);
  return { state, isDraw };
}

export function handleCall(
  state: GameState,
  connId: string,
  callType: "chi" | "peng" | "gang" | "pass" | "win",
  tileIds: string[]
): GameplayResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You are not in this game" };
  }

  if (state.turnPhase !== "waiting_for_calls") {
    return { error: "Not waiting for calls" };
  }

  if (!state.awaitingCallFrom.includes(player.seat)) {
    return { error: "Not expecting a call from you" };
  }

  const ruleset = getRuleset(state.rulesetId);

  // Handle win call specially
  if (callType === 'win') {
    state = registerCall(state, player.seat, 'win', []);
    const resolved = resolveCallWindow(state, ruleset);

    if (resolved.pendingCalls.length > 0 && resolved.pendingCalls[0].callType === 'win') {
      const result = declareDiscardWin(state, resolved.pendingCalls[0].seat, ruleset);
      if (!("error" in result)) {
        return {
          state: result.state,
          gameOver: {
            winner: result.winner,
            breakdown: result.breakdown,
            isSelfDrawn: result.isSelfDrawn,
          }
        };
      }
    }

    return { state: resolved };
  }

  // Register non-win call
  state = registerCall(state, player.seat, callType, tileIds);
  const resolved = resolveCallWindow(state, ruleset);

  if (resolved !== state) {
    state = resolved;

    if (state.turnPhase === "replacing" || state.turnPhase === "drawing") {
      const drawResult = drawTile(state, ruleset);
      if (!("error" in drawResult)) {
        state = drawResult;
      }
    }
  }

  const isDraw = checkForDraw(state);
  return { state, isDraw };
}

export function handleDeclareWin(
  state: GameState,
  connId: string
): GameplayResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You are not in this game" };
  }

  const ruleset = getRuleset(state.rulesetId);

  let result;
  if (state.turnPhase === 'discarding' && state.currentTurn === player.seat) {
    result = declareSelfDrawWin(state, player.seat, ruleset);
  } else if (state.turnPhase === 'waiting_for_calls') {
    result = declareDiscardWin(state, player.seat, ruleset);
  } else {
    return { error: "Cannot declare win now" };
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

function checkForDraw(state: GameState): boolean {
  return state.phase === 'finished' &&
         state.turnPhase === 'game_over';
}
