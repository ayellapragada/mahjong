// party/handlers/lobby.ts
import type { GameState, Seat } from "../../src/game/types";
import { addPlayer, startGame, drawTile } from "../../src/game/engine";
import { getRuleset } from "../../src/game/rulesets";
import type { BotManager } from "../bot/manager";
import { fillEmptySeatsWithBots, bumpBot, removeBotPlayer } from "../bot/manager";

export interface LobbyContext {
  botManager: BotManager;
}

export type LobbyResult =
  | { state: GameState; shouldBroadcastRoom?: boolean; shouldBroadcastGame?: boolean }
  | { error: string };

export function handleJoin(
  ctx: LobbyContext,
  state: GameState,
  connId: string,
  name: string,
  seat: Seat
): LobbyResult {
  // Check if a bot occupies this seat
  if (ctx.botManager.bots.has(seat)) {
    state = removeBotPlayer(state, seat);
    bumpBot(ctx.botManager, seat);
  }

  const result = addPlayer(state, connId, name, seat);

  if ("error" in result) {
    return { error: result.error };
  }

  return {
    state: result,
    shouldBroadcastRoom: true,
    shouldBroadcastGame: state.phase === 'playing'
  };
}

export function handleRejoin(
  state: GameState,
  connId: string,
  name: string,
  seat: Seat
): LobbyResult {
  if (state.phase === "waiting") {
    return { error: "Cannot rejoin during lobby - please take a seat normally" };
  }

  const seatPlayer = state.players.find(p => p.seat === seat);

  if (!seatPlayer) {
    return { error: "No player at that seat" };
  }

  if (seatPlayer.name !== name) {
    return { error: "Name does not match seat" };
  }

  // Update the player's connection ID
  seatPlayer.id = connId;

  return { state, shouldBroadcastGame: true };
}

export function handleStartGame(
  ctx: LobbyContext,
  state: GameState,
  connId: string
): LobbyResult {
  const player = state.players.find(p => p.id === connId);
  if (!player) {
    return { error: "You must join the game first" };
  }

  // Fill empty seats with bots
  state = fillEmptySeatsWithBots(ctx.botManager, state);

  const ruleset = getRuleset(state.rulesetId);
  const result = startGame(state, ruleset);

  if ("error" in result) {
    return { error: result.error };
  }

  state = result;

  // Dealer draws first tile
  const drawResult = drawTile(state, ruleset);
  if (!("error" in drawResult)) {
    state = drawResult;
  }

  return { state, shouldBroadcastGame: true };
}
