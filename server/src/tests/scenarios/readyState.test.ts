import { TestRunner, assert, assertEqual } from "../testRunner";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { GameEvents } from "@/utils/GameEvents";
import type { PlayerData } from "@/types/index";

const runner = new TestRunner();

// ============================================================================
// CONNECTION MANAGER READY STATE TESTS
// ============================================================================

runner.test("ConnectionManager: Set player ready state", (engine) => {
  const connectionManager = ConnectionManager.getInstance();
  connectionManager.clearAll();

  // Register a player
  connectionManager.registerConnection("p1", "socket1", "Alice", true);

  // Initially not ready
  assertEqual(connectionManager.getPlayerReady("p1"), false, "Player should not be ready initially");

  // Set ready
  connectionManager.setPlayerReady("p1", true);
  assertEqual(connectionManager.getPlayerReady("p1"), true, "Player should be ready after setting");

  // Set not ready
  connectionManager.setPlayerReady("p1", false);
  assertEqual(connectionManager.getPlayerReady("p1"), false, "Player should not be ready after unsetting");

  connectionManager.clearAll();
});

runner.test("ConnectionManager: Get ready count", (engine) => {
  const connectionManager = ConnectionManager.getInstance();
  connectionManager.clearAll();

  // Register multiple players
  connectionManager.registerConnection("p1", "socket1", "Alice", true);
  connectionManager.registerConnection("p2", "socket2", "Bob", true);
  connectionManager.registerConnection("p3", "socket3", "Charlie", true);

  // Initially no one ready
  let readyCount = connectionManager.getReadyCount();
  assertEqual(readyCount.ready, 0, "No players should be ready initially");
  assertEqual(readyCount.total, 3, "Total should be 3");

  // Set some players ready
  connectionManager.setPlayerReady("p1", true);
  connectionManager.setPlayerReady("p2", true);

  readyCount = connectionManager.getReadyCount();
  assertEqual(readyCount.ready, 2, "2 players should be ready");
  assertEqual(readyCount.total, 3, "Total should still be 3");

  // Set all ready
  connectionManager.setPlayerReady("p3", true);

  readyCount = connectionManager.getReadyCount();
  assertEqual(readyCount.ready, 3, "All 3 players should be ready");
  assertEqual(readyCount.total, 3, "Total should be 3");

  connectionManager.clearAll();
});

runner.test("ConnectionManager: Reset all ready state", (engine) => {
  const connectionManager = ConnectionManager.getInstance();
  connectionManager.clearAll();

  // Register players and set ready
  connectionManager.registerConnection("p1", "socket1", "Alice", true);
  connectionManager.registerConnection("p2", "socket2", "Bob", true);
  connectionManager.setPlayerReady("p1", true);
  connectionManager.setPlayerReady("p2", true);

  let readyCount = connectionManager.getReadyCount();
  assertEqual(readyCount.ready, 2, "2 players should be ready");

  // Reset all ready state
  connectionManager.resetAllReadyState();

  readyCount = connectionManager.getReadyCount();
  assertEqual(readyCount.ready, 0, "No players should be ready after reset");
  assertEqual(connectionManager.getPlayerReady("p1"), false, "Player 1 should not be ready");
  assertEqual(connectionManager.getPlayerReady("p2"), false, "Player 2 should not be ready");

  connectionManager.clearAll();
});

runner.test("ConnectionManager: getLobbyPlayers includes isReady", (engine) => {
  const connectionManager = ConnectionManager.getInstance();
  connectionManager.clearAll();

  // Register players
  connectionManager.registerConnection("p1", "socket1", "Alice", true);
  connectionManager.registerConnection("p2", "socket2", "Bob", true);

  // Set one player ready
  connectionManager.setPlayerReady("p1", true);

  const lobbyPlayers = connectionManager.getLobbyPlayers();
  assertEqual(lobbyPlayers.length, 2, "Should have 2 lobby players");

  const alice = lobbyPlayers.find(p => p.id === "p1");
  const bob = lobbyPlayers.find(p => p.id === "p2");

  assert(alice !== undefined, "Alice should be in lobby");
  assert(bob !== undefined, "Bob should be in lobby");
  assertEqual(alice!.isReady, true, "Alice should be ready");
  assertEqual(bob!.isReady, false, "Bob should not be ready");

  connectionManager.clearAll();
});

runner.test("ConnectionManager: Cannot set ready state for unknown player", (engine) => {
  const connectionManager = ConnectionManager.getInstance();
  connectionManager.clearAll();

  // Try to set ready for non-existent player (should not crash)
  connectionManager.setPlayerReady("unknown-player", true);

  // Should return false for unknown player
  assertEqual(connectionManager.getPlayerReady("unknown-player"), false, "Unknown player should not be ready");

  connectionManager.clearAll();
});

// ============================================================================
// GAME ENGINE READY STATE TESTS
// ============================================================================

runner.test("GameEngine: Set and get player ready state", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Set player ready (works regardless of game state)
  engine.setPlayerReady("p1", true);
  assertEqual(engine.getPlayerReady("p1"), true, "Player 1 should be ready");
  assertEqual(engine.getPlayerReady("p2"), false, "Player 2 should not be ready");

  // Unset player ready
  engine.setPlayerReady("p1", false);
  assertEqual(engine.getPlayerReady("p1"), false, "Player 1 should not be ready after unsetting");
});

runner.test("GameEngine: Get ready count", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
    { id: "p3", name: "Charlie", socketId: "s3", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Initially no one ready
  let readyCount = engine.getReadyCount();
  assertEqual(readyCount.ready, 0, "No players should be ready");
  assertEqual(readyCount.total, 3, "Total should be 3");

  // Set some ready
  engine.setPlayerReady("p1", true);
  engine.setPlayerReady("p2", true);

  readyCount = engine.getReadyCount();
  assertEqual(readyCount.ready, 2, "2 players should be ready");
  assertEqual(readyCount.total, 3, "Total should still be 3");

  // Set all ready
  engine.setPlayerReady("p3", true);

  readyCount = engine.getReadyCount();
  assertEqual(readyCount.ready, 3, "All 3 players should be ready");
});

runner.test("GameEngine: Check if all players are ready", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Initially not all ready
  assertEqual(engine.areAllPlayersReady(), false, "Not all players should be ready initially");

  // Set one ready
  engine.setPlayerReady("p1", true);
  assertEqual(engine.areAllPlayersReady(), false, "Not all players ready with only 1 ready");

  // Set all ready
  engine.setPlayerReady("p2", true);
  assertEqual(engine.areAllPlayersReady(), true, "All players should be ready");
});

runner.test("GameEngine: resetReadyState clears all ready states", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Set players ready
  engine.setPlayerReady("p1", true);
  engine.setPlayerReady("p2", true);
  assertEqual(engine.areAllPlayersReady(), true, "All players should be ready");

  // Reset ready state
  engine.resetReadyState();

  // Ready state should be reset
  assertEqual(engine.getPlayerReady("p1"), false, "Player 1 ready state should be reset");
  assertEqual(engine.getPlayerReady("p2"), false, "Player 2 ready state should be reset");
  assertEqual(engine.areAllPlayersReady(), false, "areAllPlayersReady should return false after reset");
});

runner.test("GameEngine: Ready state resets when game stops", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Set a player ready (even though not in round-ended, just to test reset)
  engine.setPlayerReady("p1", true);

  // Stop the game
  engine.stopGame();

  // Ready state should be reset
  assertEqual(engine.getPlayerReady("p1"), false, "Player 1 ready state should be reset after stop");
});

runner.test("GameEngine: Cannot set ready state for unknown player", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Try to set ready for non-existent player (should not crash)
  engine.setPlayerReady("unknown-player", true);

  // Should return false for unknown player
  assertEqual(engine.getPlayerReady("unknown-player"), false, "Unknown player should not be ready");
});

// ============================================================================
// READY EVENT TESTS
// ============================================================================

runner.test("GameEvents: Player ready event is emitted", (engine) => {
  const gameEvents = GameEvents.getInstance();

  let receivedPayload: any = null;
  const listener = (payload: any) => {
    receivedPayload = payload;
  };
  gameEvents.onPlayerReady(listener);

  // Emit a ready event
  gameEvents.emitPlayerReady({
    playerId: "p1",
    playerName: "Alice",
    playerNumber: 1,
    isReady: true,
  });

  assert(receivedPayload !== null, "Should receive ready event");
  assertEqual(receivedPayload.playerId, "p1", "Player ID should match");
  assertEqual(receivedPayload.playerName, "Alice", "Player name should match");
  assertEqual(receivedPayload.playerNumber, 1, "Player number should match");
  assertEqual(receivedPayload.isReady, true, "isReady should be true");

  gameEvents.removeListener("player:ready", listener);
});

runner.test("GameEvents: Ready count update event is emitted", (engine) => {
  const gameEvents = GameEvents.getInstance();

  let receivedPayload: any = null;
  const listener = (payload: any) => {
    receivedPayload = payload;
  };
  gameEvents.onReadyCountUpdate(listener);

  // Emit a ready count update
  gameEvents.emitReadyCountUpdate({
    ready: 3,
    total: 5,
  });

  assert(receivedPayload !== null, "Should receive ready count update");
  assertEqual(receivedPayload.ready, 3, "Ready count should be 3");
  assertEqual(receivedPayload.total, 5, "Total should be 5");

  gameEvents.removeListener("ready:update", listener);
});

// ============================================================================
// DEV MODE TESTS
// ============================================================================

runner.test("GameEngine: isDevMode reflects NODE_ENV", (engine) => {
  // In test environment, NODE_ENV is typically 'test' or 'development'
  // The isDevMode should be true if NODE_ENV === 'development'
  const expectedDevMode = process.env.NODE_ENV === "development";
  assertEqual(engine.isDevMode, expectedDevMode, `isDevMode should reflect NODE_ENV (${process.env.NODE_ENV})`);
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runReadyStateTests() {
  return runner.run();
}

// Auto-run if executed directly
if (require.main === module) {
  runReadyStateTests();
}
