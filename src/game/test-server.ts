/**
 * Test script to verify the Cloudflare Worker server works
 *
 * Run with: npm run dev:worker (in one terminal)
 * Then: npm run test:server (in another terminal)
 */

import WebSocket from "ws";

const WS_URL = "ws://localhost:8787/parties/mahjong-room";
const ROOM_ID = "TEST";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testServer() {
  console.log("=".repeat(60));
  console.log("WORKER SERVER TEST");
  console.log("=".repeat(60));
  console.log(`\nConnecting to ${WS_URL}/${ROOM_ID}...\n`);

  // Create 4 player connections
  const players: WebSocket[] = [];
  const playerNames = ["Alice", "Bob", "Charlie", "Diana"];

  for (let i = 0; i < 4; i++) {
    const socket = new WebSocket(`${WS_URL}/${ROOM_ID}`);

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data.toString());
      console.log(`[${playerNames[i]}] Received:`, data.type,
        data.type === "STATE_UPDATE" ? `(turn: ${data.state.currentTurn}, phase: ${data.state.turnPhase})` :
        data.type === "ROOM_INFO" ? `(players: ${data.players.length})` :
        data.type === "ERROR" ? `(${data.message})` : "");
    });

    socket.addEventListener("open", () => {
      console.log(`[${playerNames[i]}] Connected`);
    });

    socket.addEventListener("error", (e) => {
      console.log(`[${playerNames[i]}] Error:`, e);
    });

    players.push(socket);
    await sleep(100); // Stagger connections
  }

  await sleep(500);

  // Join each player to a seat
  console.log("\n--- Joining players ---");
  for (let i = 0; i < 4; i++) {
    players[i].send(JSON.stringify({
      type: "JOIN",
      name: playerNames[i],
      seat: i,
    }));
    await sleep(100);
  }

  await sleep(500);

  // Start the game (first player starts it)
  console.log("\n--- Starting game ---");
  players[0].send(JSON.stringify({ type: "START_GAME" }));

  await sleep(1000);

  // Get state and print hands
  console.log("\n--- Game started! Players should have received their hands ---");
  console.log("(Check the STATE_UPDATE messages above)");

  await sleep(500);

  // Test a discard from player 0 (East/dealer goes first)
  // We don't know what tiles they have, so this might fail - that's OK
  console.log("\n--- Attempting discard (may fail if wrong tile ID) ---");
  players[0].send(JSON.stringify({
    type: "DISCARD",
    tileId: "dots-1-0", // Guess - might not be in hand
  }));

  await sleep(500);

  // Clean up
  console.log("\n--- Closing connections ---");
  for (const socket of players) {
    socket.close();
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST COMPLETE");
  console.log("=".repeat(60));
  console.log("\nIf you saw STATE_UPDATE messages with turn/phase info,");
  console.log("the server is working correctly!");

  process.exit(0);
}

testServer().catch(console.error);
