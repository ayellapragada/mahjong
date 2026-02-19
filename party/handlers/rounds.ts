// party/handlers/rounds.ts
import type { GameState, Seat } from "../../src/game/types";
import { startNextRound, drawTile } from "../../src/game/engine";
import { getRuleset } from "../../src/game/rulesets";

export type RoundsResult =
  | { state: GameState }
  | { error: string };

export function handleStartNextRound(
  state: GameState,
  connId: string,
  lastWinner?: Seat
): RoundsResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You are not in this game" };
  }

  if (state.phase !== 'finished') {
    return { error: "Game not finished" };
  }

  const ruleset = getRuleset(state.rulesetId);
  const result = startNextRound(state, ruleset, lastWinner);

  if ("error" in result) {
    return { error: result.error };
  }

  state = result;

  // Dealer draws first tile
  const drawResult = drawTile(state, ruleset);
  if (!("error" in drawResult)) {
    state = drawResult;
  }

  return { state };
}
