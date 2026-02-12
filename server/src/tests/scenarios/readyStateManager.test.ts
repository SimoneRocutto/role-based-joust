import { TestRunner, assert, assertEqual } from "../testRunner";
import { ReadyStateManager } from "@/managers/ReadyStateManager";
import { BasePlayer } from "@/models/BasePlayer";

const runner = new TestRunner();

// ============================================================================
// HELPER: create test players
// ============================================================================

function makePlayers(count: number): BasePlayer[] {
  return Array.from({ length: count }, (_, i) =>
    new BasePlayer({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      socketId: `s${i + 1}`,
      isBot: true,
      behavior: "idle",
    })
  );
}

// ============================================================================
// SET PLAYER READY TESTS
// ============================================================================

runner.test("ReadyStateManager: setPlayerReady marks player ready", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(2);

  assertEqual(manager.getPlayerReady("p1"), false, "Player should not be ready initially");

  manager.setPlayerReady("p1", "Player 1", true, players);

  assertEqual(manager.getPlayerReady("p1"), true, "Player should be ready after setPlayerReady");
});

runner.test("ReadyStateManager: setPlayerReady can unset ready", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(2);

  manager.setPlayerReady("p1", "Player 1", true, players);
  assertEqual(manager.getPlayerReady("p1"), true, "Player should be ready");

  manager.setPlayerReady("p1", "Player 1", false, players);
  assertEqual(manager.getPlayerReady("p1"), false, "Player should not be ready after unsetting");
});

// ============================================================================
// ARE ALL PLAYERS READY TESTS
// ============================================================================

runner.test("ReadyStateManager: areAllPlayersReady returns false when none ready", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(3);

  assertEqual(manager.areAllPlayersReady(players), false, "Should return false when no players are ready");
});

runner.test("ReadyStateManager: areAllPlayersReady returns false when some ready", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(3);

  manager.setPlayerReady("p1", "Player 1", true, players);
  manager.setPlayerReady("p2", "Player 2", true, players);

  assertEqual(manager.areAllPlayersReady(players), false, "Should return false when only 2 of 3 are ready");
});

runner.test("ReadyStateManager: areAllPlayersReady returns true when all ready", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(2);

  manager.setPlayerReady("p1", "Player 1", true, players);
  manager.setPlayerReady("p2", "Player 2", true, players);

  assertEqual(manager.areAllPlayersReady(players), true, "Should return true when all players are ready");
});

runner.test("ReadyStateManager: areAllPlayersReady returns false for empty player list", (engine) => {
  const manager = new ReadyStateManager();

  assertEqual(manager.areAllPlayersReady([]), false, "Should return false for empty player list");
});

// ============================================================================
// GET READY COUNT TESTS
// ============================================================================

runner.test("ReadyStateManager: getReadyCount returns correct counts", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(3);

  let count = manager.getReadyCount(players);
  assertEqual(count.ready, 0, "Ready count should be 0 initially");
  assertEqual(count.total, 3, "Total should be 3");

  manager.setPlayerReady("p1", "Player 1", true, players);
  manager.setPlayerReady("p2", "Player 2", true, players);

  count = manager.getReadyCount(players);
  assertEqual(count.ready, 2, "Ready count should be 2");
  assertEqual(count.total, 3, "Total should still be 3");
});

// ============================================================================
// READY DELAY TESTS
// ============================================================================

runner.test("ReadyStateManager: Ready delay prevents readying during delay period", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(2);

  // Simulate non-test-mode delay start
  manager.startReadyDelay(false);

  assertEqual(manager.isReadyEnabled(), false, "Ready should be disabled during delay");

  // Try to set ready — should be rejected
  const result = manager.setPlayerReady("p1", "Player 1", true, players);
  assertEqual(result, false, "setPlayerReady should return false during delay");
  assertEqual(manager.getPlayerReady("p1"), false, "Player should not be ready during delay");

  // Unsetting ready should still work during delay
  manager.setPlayerReady("p1", "Player 1", false, players);
  // (doesn't throw)

  manager.cleanup();
});

runner.test("ReadyStateManager: startReadyDelay is skipped in test mode", (engine) => {
  const manager = new ReadyStateManager();

  manager.startReadyDelay(true);

  assertEqual(manager.isReadyEnabled(), true, "Ready should remain enabled in test mode");

  manager.cleanup();
});

// ============================================================================
// ON ALL READY CALLBACK TESTS
// ============================================================================

runner.test("ReadyStateManager: onAllReady callback fires when all players ready", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(2);

  let callbackFired = false;
  manager.onAllReady = () => { callbackFired = true; };

  manager.setPlayerReady("p1", "Player 1", true, players);
  assertEqual(callbackFired, false, "Callback should not fire when only 1 of 2 ready");

  manager.setPlayerReady("p2", "Player 2", true, players);
  assertEqual(callbackFired, true, "Callback should fire when all players are ready");

  manager.cleanup();
});

runner.test("ReadyStateManager: onAllReady does not fire when no callback set", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(1);

  // No callback set — should not throw
  manager.setPlayerReady("p1", "Player 1", true, players);
  assert(true, "Should not throw when onAllReady is null");

  manager.cleanup();
});

// ============================================================================
// RESET TESTS
// ============================================================================

runner.test("ReadyStateManager: resetReadyState clears all ready states", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(2);

  manager.setPlayerReady("p1", "Player 1", true, players);
  manager.setPlayerReady("p2", "Player 2", true, players);
  assertEqual(manager.areAllPlayersReady(players), true, "All should be ready before reset");

  manager.resetReadyState();

  assertEqual(manager.getPlayerReady("p1"), false, "Player 1 should not be ready after reset");
  assertEqual(manager.getPlayerReady("p2"), false, "Player 2 should not be ready after reset");
  assertEqual(manager.areAllPlayersReady(players), false, "areAllPlayersReady should return false after reset");
});

// ============================================================================
// CLEANUP TESTS
// ============================================================================

runner.test("ReadyStateManager: cleanup clears all state", (engine) => {
  const manager = new ReadyStateManager();
  const players = makePlayers(2);

  // Set some state
  manager.setPlayerReady("p1", "Player 1", true, players);
  manager.startReadyDelay(false);

  assertEqual(manager.isReadyEnabled(), false, "Ready should be disabled before cleanup");
  assertEqual(manager.getPlayerReady("p1"), true, "Player should be ready before cleanup");

  manager.cleanup();

  assertEqual(manager.isReadyEnabled(), true, "Ready should be re-enabled after cleanup");
  assertEqual(manager.getPlayerReady("p1"), false, "Player ready state should be cleared after cleanup");
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runReadyStateManagerTests() {
  return runner.run();
}

// Auto-run if executed directly
if (require.main === module) {
  runReadyStateManagerTests();
}
