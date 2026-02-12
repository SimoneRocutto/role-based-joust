import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { gameConfig, resetMovementConfig } from "@/config/gameConfig";
import { GameEvents } from "@/utils/GameEvents";
import type { PlayerData } from "@/types/index";

const runner = new TestRunner();

// ============================================================================
// CLASSIC MODE CONFIGURATION TESTS
// ============================================================================

runner.test("Classic mode sets countdown to 3 seconds", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  assertEqual(
    engine.getCountdownDuration(),
    3,
    "Countdown should be set to 3 seconds for classic mode"
  );

  resetMovementConfig();
});

runner.test("Classic mode preserves user sensitivity settings", (engine) => {
  resetMovementConfig();
  // Set a non-default sensitivity
  gameConfig.movement.oneshotMode = true;
  gameConfig.movement.damageMultiplier = 100;

  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  // Classic mode should NOT override user's sensitivity settings
  assertEqual(
    gameConfig.movement.oneshotMode,
    true,
    "Classic mode should preserve user's oneshotMode setting"
  );
  assertEqual(
    gameConfig.movement.damageMultiplier,
    100,
    "Classic mode should preserve user's damageMultiplier setting"
  );

  resetMovementConfig();
});

runner.test("Classic mode restores settings on game end", (engine) => {
  resetMovementConfig();
  // Set specific sensitivity before game
  gameConfig.movement.damageMultiplier = 70;
  gameConfig.movement.oneshotMode = false;

  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  // Simulate game end
  mode.onGameEnd(engine);

  // Settings should be restored to what they were before setGameMode
  assertEqual(
    gameConfig.movement.damageMultiplier,
    70,
    "damageMultiplier should be restored after game end"
  );
  assertEqual(
    gameConfig.movement.oneshotMode,
    false,
    "oneshotMode should be restored after game end"
  );

  resetMovementConfig();
});

runner.test("stopGame restores movement config and resets countdown", (engine) => {
  resetMovementConfig();
  // Set specific sensitivity before game
  gameConfig.movement.damageMultiplier = 100;
  gameConfig.movement.oneshotMode = true;

  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  assertEqual(engine.getCountdownDuration(), 3, "Countdown should be 3");

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  engine.stopGame();

  // Settings should be restored to what they were before setGameMode
  assertEqual(
    gameConfig.movement.damageMultiplier,
    100,
    "damageMultiplier should be restored after stopGame"
  );
  assertEqual(
    gameConfig.movement.oneshotMode,
    true,
    "oneshotMode should be restored after stopGame"
  );
  assertEqual(
    engine.getCountdownDuration(),
    10,
    "Countdown should be reset to 10 after stopGame"
  );

  resetMovementConfig();
});

// ============================================================================
// ONESHOT MODE DAMAGE TESTS
// ============================================================================

runner.test("Oneshot mode kills player on any movement above threshold", (engine) => {
  resetMovementConfig();
  // Explicitly enable oneshot mode (classic mode no longer forces this)
  gameConfig.movement.oneshotMode = true;

  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;
  assert(player.isAlive, "Player should start alive");
  assertEqual(player.movementConfig.oneshotMode, true, "Player should have oneshotMode");

  // Simulate movement just above threshold (tiny excess)
  // threshold is 0.10, so intensity ~0.11 should still kill
  // magnitude = intensity * 17.32, so for 0.12 intensity: magnitude = 2.08
  // x=2.08, y=0, z=0 -> magnitude = 2.08 -> normalized = 2.08/17.32 ≈ 0.12
  player.updateMovement(
    { x: 2.08, y: 0, z: 0, timestamp: Date.now() },
    engine.gameTime
  );

  assert(!player.isAlive, "Player should be dead from oneshot mode");

  resetMovementConfig();
});

runner.test("Oneshot mode does not kill player below threshold", (engine) => {
  resetMovementConfig();
  // Explicitly enable oneshot mode (classic mode no longer forces this)
  gameConfig.movement.oneshotMode = true;

  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;

  // Simulate movement below threshold
  // Very small movement that stays under 0.10
  player.updateMovement(
    { x: 0.5, y: 0, z: 0, timestamp: Date.now() },
    engine.gameTime
  );

  assert(player.isAlive, "Player should still be alive below threshold");
  assertEqual(player.accumulatedDamage, 0, "Player should have no damage");

  resetMovementConfig();
});

// ============================================================================
// ROLE ASSIGNMENT SKIP TESTS
// ============================================================================

runner.test("Classic mode does not emit role assignments", (engine) => {
  resetMovementConfig();
  const gameEvents = GameEvents.getInstance();

  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  // Track role:assigned events
  let roleAssignedCount = 0;
  const listener = () => {
    roleAssignedCount++;
  };
  gameEvents.on("role:assigned", listener);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  assertEqual(
    roleAssignedCount,
    0,
    "Should not emit role:assigned events for classic mode"
  );

  gameEvents.removeListener("role:assigned", listener);
  resetMovementConfig();
});

// Note: Cannot test role-based mode emitting role:assigned events because
// test mode skips countdown (where emitRoleAssignments is called).

// ============================================================================
// READY STATE RESET ON GAME END TESTS
// ============================================================================

runner.test("Ready state resets when game ends", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Simulate players being ready (as they would be before a round starts)
  engine.setPlayerReady("p1", true);
  engine.setPlayerReady("p2", true);

  const beforeEnd = engine.getReadyCount();
  assertEqual(beforeEnd.ready, 2, "Both players should be ready before game end");

  // Kill player 2 to trigger game end
  const player2 = engine.getPlayerById("p2")!;
  player2.die(engine.gameTime);

  // Fast-forward to let game detect win and end
  engine.fastForward(200);

  assertEqual(engine.gameState, "finished", "Game should be finished");

  // Ready state should be reset
  const afterEnd = engine.getReadyCount();
  assertEqual(afterEnd.ready, 0, "Ready count should be 0 after game end");

  resetMovementConfig();
});

runner.test("Ready state resets when round ends (role-based)", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Simulate players being ready
  engine.setPlayerReady("p1", true);
  engine.setPlayerReady("p2", true);

  const beforeEnd = engine.getReadyCount();
  assertEqual(beforeEnd.ready, 2, "Both players should be ready before round end");

  // Kill player 2 to end round 1 (not the game — role-based has 3 rounds)
  let player2 = engine.getPlayerById("p2")!;
  player2.die(engine.gameTime);

  // Fast-forward to let game detect win
  engine.fastForward(200);

  // In test mode, it auto-advances to round 2
  assertEqual(engine.currentRound, 2, "Should be on round 2");

  // Ready state should have been reset during round transition
  // (resetReadyState is called in endRound and again in startCountdown/startRound)
  const afterRoundEnd = engine.getReadyCount();
  assertEqual(afterRoundEnd.ready, 0, "Ready count should be 0 after round transition");

  resetMovementConfig();
});

// ============================================================================
// POINT ACCUMULATION TESTS
// ============================================================================

runner.test("Classic mode awards points to last standing player", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  const player1 = engine.getPlayerById("p1")!;
  const player2 = engine.getPlayerById("p2")!;

  assertEqual(player1.points, 0, "Player 1 should start with 0 points");
  assertEqual(player2.points, 0, "Player 2 should start with 0 points");

  // Kill player 2 to end the round
  player2.die(engine.gameTime);

  // Fast-forward to let game detect win
  engine.fastForward(200);

  // Player 1 should have earned the last standing bonus (5 points)
  assertEqual(player1.points, 5, "Last standing player should earn 5 points");
  assertEqual(player2.points, 0, "Dead player should have 0 points");

  resetMovementConfig();
});

runner.test("Classic mode accumulates points across rounds", (engine) => {
  resetMovementConfig();
  // Create classic mode with 3 rounds
  const mode = GameModeFactory.getInstance().createMode("classic", { roundCount: 3 });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Round 1: Kill player 2
  let player2 = engine.getPlayerById("p2")!;
  player2.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.currentRound, 2, "Should be on round 2");

  // After round 1, player 1 should have 5 total points
  let player1 = engine.getPlayerById("p1")!;
  assertEqual(player1.totalPoints, 5, "Player 1 should have 5 total points after round 1");

  // Round 2: Kill player 1 this time
  player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.currentRound, 3, "Should be on round 3");

  // After round 2, player 2 should have 5 total points
  player2 = engine.getPlayerById("p2")!;
  assertEqual(player2.totalPoints, 5, "Player 2 should have 5 total points after round 2");

  // Player 1 should still have 5 total points
  player1 = engine.getPlayerById("p1")!;
  assertEqual(player1.totalPoints, 5, "Player 1 should still have 5 total points");

  resetMovementConfig();
});

runner.test("Classic mode final scores use total points", (engine) => {
  resetMovementConfig();
  // Create classic mode with 2 rounds for quicker test
  const mode = GameModeFactory.getInstance().createMode("classic", { roundCount: 2 });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Round 1: Player 1 wins
  let player2 = engine.getPlayerById("p2")!;
  player2.die(engine.gameTime);
  engine.fastForward(200);

  // Round 2: Player 2 wins
  let player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.gameState, "finished", "Game should be finished after 2 rounds");

  // Both players should have 5 total points (tie)
  player1 = engine.getPlayerById("p1")!;
  player2 = engine.getPlayerById("p2")!;
  assertEqual(player1.totalPoints, 5, "Player 1 should have 5 total points");
  assertEqual(player2.totalPoints, 5, "Player 2 should have 5 total points");

  // Final scores should reflect total points
  const scores = mode.calculateFinalScores(engine);
  assertEqual(scores.length, 2, "Should have 2 score entries");
  assertEqual(scores[0].score, 5, "First player's score should be 5");
  assertEqual(scores[1].score, 5, "Second player's score should be 5");

  resetMovementConfig();
});

runner.test("calculateFinalScores returns roundPoints distinct from total score", (engine) => {
  resetMovementConfig();
  // 3 rounds so the game doesn't end after round 2
  const mode = GameModeFactory.getInstance().createMode("classic", { roundCount: 3 });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Round 1: Player 1 wins (5 round points, 5 total)
  let player2 = engine.getPlayerById("p2")!;
  player2.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.currentRound, 2, "Should be on round 2");

  // Round 2: Player 1 wins again (5 round points, 10 total)
  player2 = engine.getPlayerById("p2")!;
  player2.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.currentRound, 3, "Should be on round 3");

  // Round 3: Player 2 wins (5 round points, 5 total)
  let player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.gameState, "finished", "Game should be finished after 3 rounds");

  const scores = mode.calculateFinalScores(engine);
  assertEqual(scores.length, 2, "Should have 2 score entries");

  // Player 1 won rounds 1 and 2 (10 total), lost round 3 (0 round points)
  const p1Score = scores.find((s) => s.player.id === "p1")!;
  assertEqual(p1Score.score, 10, "Player 1 total score should be 10");
  assertEqual(p1Score.roundPoints, 0, "Player 1 round points should be 0 (lost last round)");

  // Player 2 lost rounds 1 and 2 (0 total from those), won round 3 (5 round points, 5 total)
  const p2Score = scores.find((s) => s.player.id === "p2")!;
  assertEqual(p2Score.score, 5, "Player 2 total score should be 5");
  assertEqual(p2Score.roundPoints, 5, "Player 2 round points should be 5 (won last round)");

  resetMovementConfig();
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runClassicModeTests() {
  return runner.run();
}

// Allow direct execution
runClassicModeTests();
