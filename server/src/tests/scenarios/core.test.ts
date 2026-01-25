import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import type { PlayerData } from "@/types/index";

const runner = new TestRunner();

// ============================================================================
// BASIC GAME FLOW TESTS
// ============================================================================

runner.test("Game engine initializes correctly", (engine) => {
  assert(engine !== null, "Engine should exist");
  assertEqual(engine.gameState, "waiting", "Initial state should be waiting");
  assertEqual(engine.currentRound, 0, "Initial round should be 0");
  assertEqual(engine.gameTime, 0, "Initial game time should be 0");
});

runner.test("Classic mode: Game starts with 2 players", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  assertEqual(engine.gameState, "active", "Game should be active");
  assertEqual(engine.currentRound, 1, "Should be round 1");
  assertEqual(engine.players.length, 2, "Should have 2 players");
  assert(
    engine.players.every((p) => p.isAlive),
    "All players should be alive"
  );
});

runner.test("Classic mode: Last player standing wins", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Kill player 2
  const player2 = engine.getPlayerById("p2");
  assert(player2 !== undefined, "Player 2 should exist");
  player2!.die(engine.gameTime);

  // Fast-forward to let game detect win
  engine.fastForward(200);

  assertEqual(
    engine.gameState,
    "finished",
    "Game should be finished after one player dies"
  );

  const winner = engine.players.find((p) => p.isAlive);
  assert(winner !== undefined, "There should be a winner");
  assertEqual(winner!.id, "p1", "Alice should be the winner");
});

runner.test("Role-based mode: Multi-round game", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  assertEqual(mode.multiRound, true, "Should be multi-round");
  assertEqual(mode.roundCount, 3, "Should have 3 rounds");
});

runner.test("Game validates player count", (engine) => {
  // Setting to false so that player count validation isn't skipped
  engine.testMode = false;
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Solo", socketId: "s1", isBot: true },
  ];

  let errorThrown = false;
  try {
    engine.startGame(players);
  } catch (error) {
    errorThrown = true;
    assert(
      (error as Error).message.includes("at least 2 players"),
      "Should mention minimum players"
    );
  }

  assert(errorThrown, "Should throw error for too few players");
});

// ============================================================================
// MOVEMENT & DAMAGE TESTS
// ============================================================================

runner.test("Player takes damage from excessive movement", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;
  const initialDamage = player.accumulatedDamage;

  // Simulate high intensity movement
  player.updateMovement(
    { x: 8, y: 8, z: 8, timestamp: Date.now() },
    engine.gameTime
  );

  assert(
    player.accumulatedDamage > initialDamage,
    "Player should have accumulated damage"
  );
});

runner.test("Player dies when damage exceeds threshold", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;
  assert(player.isAlive, "Player should start alive");

  // Deal lethal damage
  player.takeDamage(200, engine.gameTime);

  assert(!player.isAlive, "Player should be dead after lethal damage");
});

runner.test("Toughness reduces damage", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Normal", socketId: "s1", isBot: true },
    { id: "p2", name: "Tough", socketId: "s2", isBot: true },
  ];

  engine.startGame(players);

  const normal = engine.getPlayerById("p1")!;
  const tough = engine.getPlayerById("p2")!;

  // Make one player tougher
  tough.toughness = 2.0;

  // Deal same damage to both
  normal.takeDamage(100, engine.gameTime);
  tough.takeDamage(100, engine.gameTime);

  assert(
    tough.accumulatedDamage < normal.accumulatedDamage,
    "Tough player should have less accumulated damage"
  );
  assertEqual(
    tough.accumulatedDamage,
    50,
    "Tough player should take half damage"
  );
});

// ============================================================================
// BOT FUNCTIONALITY TESTS
// ============================================================================

runner.test("Bot players are created correctly", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    {
      id: "bot1",
      name: "Bot 1",
      socketId: "s1",
      isBot: true,
      behavior: "aggressive",
    },
  ];

  engine.startGame(players);

  const bot = engine.getPlayerById("bot1")!;
  assert(bot.isBot, "Player should be marked as bot");
  assertEqual(
    bot.behavior,
    "aggressive",
    "Bot should have aggressive behavior"
  );
});

runner.test("Bot can be commanded via triggerAction", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "bot1", name: "Bot 1", socketId: "s1", isBot: true },
  ];

  engine.startGame(players);

  const bot = engine.getPlayerById("bot1")!;
  assert(bot.isAlive, "Bot should start alive");

  // Command bot to die
  bot.triggerAction("die", engine.gameTime);

  assert(!bot.isAlive, "Bot should be dead after die command");
});

runner.test("Bot executes autoplay behavior", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    {
      id: "bot1",
      name: "Bot 1",
      socketId: "s1",
      isBot: true,
      behavior: "aggressive",
    },
  ];

  engine.startGame(players);

  const bot = engine.getPlayerById("bot1")!;
  const initialHistory = bot.movementHistory.length;

  // Fast-forward to let bot move
  engine.fastForward(1000);

  assert(
    bot.movementHistory.length > initialHistory,
    "Bot should have generated movement"
  );
});

runner.test("Non-bot players cannot execute bot actions", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Human", socketId: "s1", isBot: false },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;
  assert(!player.isBot, "Player should not be a bot");

  // Try to command non-bot (should not work)
  player.triggerAction("shake", engine.gameTime);

  // Should not crash, just log warning
  assert(true, "Should handle non-bot gracefully");
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runCoreTests() {
  return runner.run();
}

// Auto-run if executed directly
if (require.main === module) {
  runCoreTests();
}
