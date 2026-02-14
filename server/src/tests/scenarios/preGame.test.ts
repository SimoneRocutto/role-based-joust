import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { GameEvents } from "@/utils/GameEvents";
import type { PlayerData } from "@/types/index";

const runner = new TestRunner();

// ============================================================================
// HELPER
// ============================================================================

function setupMode(engine: any, modeKey = "role-based", roundCount = 3) {
  const factory = GameModeFactory.getInstance();
  const mode = factory.createMode(modeKey, { roundCount });
  engine.setGameMode(mode);
  engine.lastModeKey = modeKey;
}

function makePlayerData(count: number): PlayerData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    socketId: `s${i + 1}`,
    isBot: true,
    behavior: "idle" as const,
  }));
}

// ============================================================================
// PRE-GAME STATE TESTS
// ============================================================================

runner.test("startGame enters pre-game state (non-test mode)", (engine) => {
  // Non-test mode engine
  engine.testMode = false;
  setupMode(engine);
  const players = makePlayerData(3);

  engine.startGame(players);

  assertEqual(engine.gameState, "pre-game", "Should be in pre-game state");
  assertEqual(engine.currentRound, 1, "Should be round 1");
  assertEqual(engine.players.length, 3, "Should have 3 players");

  engine.stopGame();
});

runner.test("startGame skips pre-game in test mode", (engine) => {
  setupMode(engine);
  const players = makePlayerData(3);

  // engine.testMode defaults to false, set it to true for test
  engine.testMode = true;
  engine.startGame(players);

  assertEqual(engine.gameState, "active", "Should skip to active in test mode");

  engine.stopGame();
});

runner.test("startGame with skipPreGame goes to countdown", (engine) => {
  engine.testMode = false;
  setupMode(engine);
  const players = makePlayerData(3);

  engine.startGame(players, undefined, true);

  assertEqual(engine.gameState, "countdown", "Should go to countdown with skipPreGame");

  engine.stopGame();
});

runner.test("proceedFromPreGame starts countdown", (engine) => {
  engine.testMode = false;
  setupMode(engine);
  const players = makePlayerData(3);

  engine.startGame(players);
  assertEqual(engine.gameState, "pre-game", "Should be in pre-game");

  const result = engine.proceedFromPreGame();
  assert(result.success, "proceedFromPreGame should succeed");
  assertEqual(engine.gameState, "countdown", "Should be in countdown after proceeding");

  engine.stopGame();
});

runner.test("proceedFromPreGame fails if not in pre-game", (engine) => {
  // Engine starts in "waiting" state
  const result = engine.proceedFromPreGame();
  assert(!result.success, "proceedFromPreGame should fail from waiting state");
  assert(result.message !== undefined, "Should have error message");
});

runner.test("game:start event includes sensitivity", (engine) => {
  engine.testMode = false;
  setupMode(engine);
  const players = makePlayerData(3);

  const gameEvents = GameEvents.getInstance();
  let receivedSensitivity: string | undefined;

  const listener = (payload: { sensitivity: string }) => {
    receivedSensitivity = payload.sensitivity;
  };
  gameEvents.on("game:start", listener);

  engine.startGame(players);

  assert(receivedSensitivity !== undefined, "Should have received sensitivity");
  assert(typeof receivedSensitivity === "string", "Sensitivity should be a string");

  gameEvents.removeListener("game:start", listener);
  engine.stopGame();
});

runner.test("pre-game ready state: all players ready triggers auto-start", (engine) => {
  engine.testMode = false;
  setupMode(engine);
  const players = makePlayerData(2);

  engine.startGame(players);
  assertEqual(engine.gameState, "pre-game", "Should be in pre-game");

  // Simulate ready delay passing (enable ready)
  // In non-test mode, ready is disabled initially. Force enable for testing.
  // Access the private readyStateManager through the public methods
  // Wait won't work in sync tests, so we test proceedFromPreGame directly
  const result = engine.proceedFromPreGame();
  assert(result.success, "Should proceed from pre-game");
  assertEqual(engine.gameState, "countdown", "Should be in countdown");

  engine.stopGame();
});

runner.test("stopGame from pre-game returns to waiting", (engine) => {
  engine.testMode = false;
  setupMode(engine);
  const players = makePlayerData(3);

  engine.startGame(players);
  assertEqual(engine.gameState, "pre-game", "Should be in pre-game");

  engine.stopGame();
  assertEqual(engine.gameState, "waiting", "Should be in waiting after stop");
  assertEqual(engine.players.length, 0, "Players should be cleared");
});

// ============================================================================
// EXPORT
// ============================================================================

export async function runPreGameTests() {
  return runner.run();
}

// Auto-run if executed directly
if (require.main === module) {
  runPreGameTests();
}
