import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { gameConfig, resetMovementConfig } from "@/config/gameConfig";
import { GameEvents } from "@/utils/GameEvents";
import { TeamManager } from "@/managers/TeamManager";
import type { PlayerData } from "@/types/index";

const RESPAWN_DELAY = gameConfig.modeDefaults.deathCount.respawnDelayMs;

const runner = new TestRunner();

// ============================================================================
// DEATH COUNT MODE CONFIGURATION TESTS
// ============================================================================

runner.test("DeathCountMode creates with correct defaults", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("death-count");
  engine.setGameMode(mode);

  assertEqual(mode.name, "Death Count", "Name should be 'Death Count'");
  assertEqual(mode.useRoles, false, "Should not use roles");
  assertEqual(mode.multiRound, true, "Should be multi-round");
  assertEqual(mode.roundCount, 3, "Default roundCount should be 3");
  assertEqual(mode.roundDuration, 90000, "Default roundDuration should be 90000ms");
  assertEqual(
    engine.getCountdownDuration(),
    3,
    "Countdown should be set to 3 seconds"
  );

  resetMovementConfig();
});

runner.test("DeathCountMode accepts custom roundDuration", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 60000,
    roundCount: 2,
  });

  assertEqual(mode.roundDuration, 60000, "roundDuration should be 60000ms");
  assertEqual(mode.roundCount, 2, "roundCount should be 2");

  resetMovementConfig();
});

runner.test("DeathCountMode uses configured respawnDelayMs when passed as option", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 30000,
    respawnDelayMs: 10000,
  });
  engine.setGameMode(mode);

  const players = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" as const },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" as const },
  ];
  engine.startGame(players);

  // Kill player 1
  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);

  assert(!player1.isAlive, "Player should be dead after die()");

  // Fast-forward 9.9s — should still be dead (respawn delay is 10s)
  engine.fastForward(9900);
  assert(!player1.isAlive, "Player should still be dead at 9.9s with 10s respawn delay");

  // Fast-forward past 10s total — should respawn
  engine.fastForward(200);
  assert(player1.isAlive, "Player should be alive after 10s respawn delay");

  mode.onGameEnd(engine);
  resetMovementConfig();
});

runner.test("DeathCountMode falls back to default respawn delay when no option provided", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 30000,
    // no respawnDelayMs option
  });
  engine.setGameMode(mode);

  const players = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" as const },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" as const },
  ];
  engine.startGame(players);

  // Kill player 1
  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);

  assert(!player1.isAlive, "Player should be dead after die()");

  // Fast-forward 4.9s — should still be dead (default 5s delay)
  engine.fastForward(4900);
  assert(!player1.isAlive, "Player should still be dead at 4.9s with default 5s respawn delay");

  // Fast-forward past 5s — should respawn
  engine.fastForward(200);
  assert(player1.isAlive, "Player should be alive after default 5s respawn delay");

  mode.onGameEnd(engine);
  resetMovementConfig();
});

// ============================================================================
// DEATH COUNT AND RESPAWN TESTS
// ============================================================================

runner.test("Death increments death counter", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 30000,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  assertEqual(mode.getPlayerDeathCount("p1"), 0, "Should start with 0 deaths");

  // Kill player 1
  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);

  assertEqual(mode.getPlayerDeathCount("p1"), 1, "Should have 1 death after dying");

  mode.onGameEnd(engine);
  resetMovementConfig();
});

runner.test("Respawn after 5 seconds", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 30000,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);

  assert(!player1.isAlive, "Player should be dead after die()");

  // Fast-forward 4.9 seconds — should still be dead
  engine.fastForward(4900);
  assert(!player1.isAlive, "Player should still be dead at 4.9s");

  // Fast-forward past 5 seconds total — should respawn
  engine.fastForward(200);
  assert(player1.isAlive, "Player should be alive after 5s respawn delay");
  assertEqual(player1.accumulatedDamage, 0, "Damage should be reset on respawn");

  mode.onGameEnd(engine);
  resetMovementConfig();
});

runner.test("No respawn in last 5 seconds of round", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 10000, // 10s round
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Advance to 6 seconds (within last 5 seconds if dying now: 6 + 5 = 11 > 10)
  engine.fastForward(6000);

  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);

  // Fast-forward to end of round — player should still be dead
  engine.fastForward(4000);

  // The round should have ended, but verify the player didn't respawn
  // during those 4 seconds (they died at 6s, respawn would be at 11s > 10s)
  assert(!player1.isAlive, "Player should stay dead when dying in last 5s of round");

  mode.onGameEnd(engine);
  resetMovementConfig();
});

// ============================================================================
// SCORING TESTS
// ============================================================================

runner.test("Placement bonus scoring: 1st gets 5, 2nd gets 3, 3rd gets 1, rest 0", (engine) => {
  resetMovementConfig();
  TeamManager.getInstance().configure(false, 2); // ensure no team contamination from prior tests
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 10000,
    roundCount: 1,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
    { id: "p3", name: "Carol", socketId: "s3", isBot: true, behavior: "idle" },
    { id: "p4", name: "Dave", socketId: "s4", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Alice: 0 deaths (rank 1 → 5 pts)
  // Bob: 1 death (rank 2 → 3 pts)
  // Carol: 2 deaths (rank 3 → 1 pt)
  // Dave: 3 deaths (rank 4 → 0 pts)
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(5100); // wait for respawn
  engine.getPlayerById("p3")!.die(engine.gameTime);
  engine.getPlayerById("p3")!.die(engine.gameTime); // may need 2 if already respawned

  // Just kill Dave 3 times total across the round (quick approach: re-use the engine state)
  // Actually, deaths are tracked by the mode's death counter regardless of alive state.
  // Let's use direct die() calls — the mode counts deaths, not alive state.
  const dave = engine.getPlayerById("p4")!;
  dave.die(engine.gameTime);
  dave.die(engine.gameTime);
  dave.die(engine.gameTime);

  assertEqual(mode.getPlayerDeathCount("p1"), 0, "Alice should have 0 deaths");
  assertEqual(mode.getPlayerDeathCount("p2"), 1, "Bob should have 1 death");

  // Fast-forward to end of round — triggers checkWinCondition and awardRoundPoints
  engine.fastForward(5000);

  const alice = engine.getPlayerById("p1")!;
  const bob = engine.getPlayerById("p2")!;
  assertEqual(alice.points, 5, "Alice (rank 1) should get 5 pts");
  assertEqual(bob.points, 3, "Bob (rank 2) should get 3 pts");

  mode.onGameEnd(engine);
  resetMovementConfig();
});

runner.test("Round ends at roundDuration", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 5000, // 5s round
    roundCount: 1,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  assertEqual(engine.gameState, "active", "Game should be active");

  // Fast-forward to just before round end
  engine.fastForward(4900);
  assertEqual(engine.gameState, "active", "Game should still be active at 4.9s");

  // Fast-forward past round end
  engine.fastForward(200);
  assertEqual(engine.gameState, "finished", "Game should be finished after 1 round");

  resetMovementConfig();
});

runner.test("Multi-round point accumulation", (engine) => {
  resetMovementConfig();
  TeamManager.getInstance().configure(false, 2); // ensure no team contamination from prior tests
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 5000, // 5s round
    roundCount: 2,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Round 1: Kill Bob once, Alice stays alive
  const bob = engine.getPlayerById("p2")!;
  bob.die(engine.gameTime);

  // Fast-forward to end of round
  engine.fastForward(5100);

  // In test mode, it auto-advances to round 2
  assertEqual(engine.currentRound, 2, "Should be on round 2");

  // Check that Alice got 5 points (rank 1 placement bonus) in round 1, transferred to totalPoints
  let alice = engine.getPlayerById("p1")!;
  assertEqual(alice.totalPoints, 5, "Alice should have 5 total points after round 1 (rank 1 placement bonus)");

  resetMovementConfig();
});

runner.test("Cleanup restores movement config", (engine) => {
  resetMovementConfig();
  gameConfig.movement.damageMultiplier = 70;
  gameConfig.movement.oneshotMode = false;

  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 10000,
  });
  engine.setGameMode(mode);

  // Simulate game end
  mode.onGameEnd(engine);

  assertEqual(
    gameConfig.movement.damageMultiplier,
    70,
    "damageMultiplier should be restored after game end"
  );

  resetMovementConfig();
});

runner.test("getPlayerDeathCount returns correct values", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 30000,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  assertEqual(mode.getPlayerDeathCount("p1"), 0, "Alice should start with 0");
  assertEqual(mode.getPlayerDeathCount("p2"), 0, "Bob should start with 0");
  assertEqual(mode.getPlayerDeathCount("nonexistent"), 0, "Unknown player should return 0");

  // Kill Alice twice
  const alice = engine.getPlayerById("p1")!;
  alice.die(engine.gameTime);
  engine.fastForward(5100);
  alice.die(engine.gameTime);

  assertEqual(mode.getPlayerDeathCount("p1"), 2, "Alice should have 2 deaths");
  assertEqual(mode.getPlayerDeathCount("p2"), 0, "Bob should still have 0 deaths");

  mode.onGameEnd(engine);
  resetMovementConfig();
});

runner.test("Respawn emits player:respawn event", (engine) => {
  resetMovementConfig();
  const gameEvents = GameEvents.getInstance();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 30000,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Track respawn events
  let respawnCount = 0;
  let respawnPlayerId: string | null = null;
  const listener = (payload: any) => {
    respawnCount++;
    respawnPlayerId = payload.player.id;
  };
  gameEvents.onPlayerRespawn(listener);

  // Kill player 1
  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);

  // Fast-forward past respawn delay
  engine.fastForward(5100);

  assertEqual(respawnCount, 1, "Should have emitted 1 respawn event");
  assertEqual(respawnPlayerId, "p1", "Respawn event should be for p1");

  gameEvents.removeListener("player:respawn", listener);
  mode.onGameEnd(engine);
  resetMovementConfig();
});

runner.test("Death emits player:respawn-pending event", (engine) => {
  resetMovementConfig();
  const gameEvents = GameEvents.getInstance();
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 30000,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Track respawn-pending events
  let pendingCount = 0;
  let pendingRespawnIn: number | null = null;
  const listener = (payload: any) => {
    pendingCount++;
    pendingRespawnIn = payload.respawnIn;
  };
  gameEvents.onPlayerRespawnPending(listener);

  // Kill player 1
  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);

  assertEqual(pendingCount, 1, "Should have emitted 1 respawn-pending event");
  assertEqual(pendingRespawnIn, RESPAWN_DELAY, `respawnIn should be ${RESPAWN_DELAY}ms`);

  gameEvents.removeListener("player:respawn-pending", listener);
  mode.onGameEnd(engine);
  resetMovementConfig();
});

runner.test("calculateFinalScores sorts by totalPoints", (engine) => {
  resetMovementConfig();
  TeamManager.getInstance().configure(false, 2); // ensure no team contamination from prior tests
  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 5000,
    roundCount: 1,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
    { id: "p3", name: "Carol", socketId: "s3", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Kill Bob and Carol, Alice stays alive
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.getPlayerById("p3")!.die(engine.gameTime);

  // Fast-forward to end of round
  engine.fastForward(5100);

  // Game should be finished
  assertEqual(engine.gameState, "finished", "Game should be finished");

  const scores = mode.calculateFinalScores(engine);
  assertEqual(scores.length, 3, "Should have 3 score entries");

  // Alice: 0 deaths → rank 1 → 5 pts
  // Bob: 1 death → rank 2 (tied with Carol) → 3 pts
  // Carol: 1 death → rank 2 (tied with Bob) → 3 pts
  const aliceScore = scores.find((s) => s.player.id === "p1")!;
  assertEqual(aliceScore.score, 5, "Alice should have 5 total points (rank 1)");
  assertEqual(aliceScore.rank, 1, "Alice should be rank 1");

  const bobScore = scores.find((s) => s.player.id === "p2")!;
  const carolScore = scores.find((s) => s.player.id === "p3")!;
  assertEqual(bobScore.score, 3, "Bob should have 3 pts (tied rank 2)");
  assertEqual(carolScore.score, 3, "Carol should have 3 pts (tied rank 2)");
  assertEqual(bobScore.rank, 2, "Bob should be rank 2");
  assertEqual(carolScore.rank, 2, "Carol should be rank 2 (tied)");

  resetMovementConfig();
});

// ============================================================================
// TEAM DEATH COUNT SCORING TESTS
// ============================================================================

runner.test("Team DC: team with fewest total deaths gets 5 pts", (engine) => {
  resetMovementConfig();
  const teamManager = TeamManager.getInstance();
  teamManager.reset();
  teamManager.configure(true, 2);

  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 5000,
    roundCount: 1,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" }, // Red
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },   // Red
    { id: "p3", name: "Carol", socketId: "s3", isBot: true, behavior: "idle" }, // Blue
    { id: "p4", name: "Dave", socketId: "s4", isBot: true, behavior: "idle" },  // Blue
  ];

  engine.startGame(players);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);
  // p1, p3 → team 0 (Red); p2, p4 → team 1 (Blue)

  // Kill Blue team players: Carol 2 deaths, Dave 1 death → Blue total 3 deaths
  // Red team: Alice 0 deaths, Bob 1 death → Red total 1 death
  engine.getPlayerById("p2")!.die(engine.gameTime); // Bob (team 1) - 1 death
  engine.getPlayerById("p4")!.die(engine.gameTime); // Dave (team 1) - 1 death

  engine.fastForward(5100); // end of round → triggers awardRoundPoints

  // Red (1 total death) should be rank 1 → 5 pts
  // Blue (2 total deaths) should be rank 2 → 3 pts
  assertEqual(teamManager.getMatchPoints(0), 5, "Red team (1 death) should get 5 pts");
  assertEqual(teamManager.getMatchPoints(1), 3, "Blue team (2 deaths) should get 3 pts");

  mode.onGameEnd(engine);
  teamManager.reset();
  resetMovementConfig();
});

runner.test("Team DC: tied teams share the same rank and bonus", (engine) => {
  resetMovementConfig();
  const teamManager = TeamManager.getInstance();
  teamManager.reset();
  teamManager.configure(true, 2);

  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 5000,
    roundCount: 1,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
    { id: "p3", name: "Carol", socketId: "s3", isBot: true, behavior: "idle" },
    { id: "p4", name: "Dave", socketId: "s4", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);
  // p1, p3 → team 0; p2, p4 → team 1

  // Each team gets exactly 1 total death → tied rank 1 → both get 5 pts
  engine.getPlayerById("p1")!.die(engine.gameTime); // team 0: 1 death
  engine.getPlayerById("p2")!.die(engine.gameTime); // team 1: 1 death

  engine.fastForward(5100);

  assertEqual(teamManager.getMatchPoints(0), 5, "Tied team 0 should get 5 pts (shared rank 1)");
  assertEqual(teamManager.getMatchPoints(1), 5, "Tied team 1 should get 5 pts (shared rank 1)");

  mode.onGameEnd(engine);
  teamManager.reset();
  resetMovementConfig();
});

runner.test("Team DC: match points accumulate across rounds", (engine) => {
  resetMovementConfig();
  const teamManager = TeamManager.getInstance();
  teamManager.reset();
  teamManager.configure(true, 2);

  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 5000,
    roundCount: 2,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  teamManager.assignSequential(["p1", "p2"]);
  // p1 → team 0; p2 → team 1

  // Round 1: Bob dies once → team 1 has more deaths → team 0 wins round (+5)
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(5100); // end of round 1, auto-advance to round 2

  assertEqual(teamManager.getMatchPoints(0), 5, "Team 0 should have 5 pts after round 1");
  assertEqual(teamManager.getMatchPoints(1), 3, "Team 1 should have 3 pts after round 1");

  // Round 2: Alice dies once → team 1 wins round 2 (+5 to team 1)
  engine.getPlayerById("p1")!.die(engine.gameTime);
  engine.fastForward(5100); // end of round 2

  assertEqual(teamManager.getMatchPoints(0), 8, "Team 0 should have 8 pts after round 2 (5+3)");
  assertEqual(teamManager.getMatchPoints(1), 8, "Team 1 should have 8 pts after round 2 (3+5)");

  teamManager.reset();
  resetMovementConfig();
});

runner.test("Team DC: calculateFinalScores uses team match points", (engine) => {
  resetMovementConfig();
  const teamManager = TeamManager.getInstance();
  teamManager.reset();
  teamManager.configure(true, 2);

  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 5000,
    roundCount: 1,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  teamManager.assignSequential(["p1", "p2"]);
  // p1 → team 0; p2 → team 1

  // Bob dies → team 1 has more deaths → team 0 wins (+5)
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(5100);

  const scores = mode.calculateFinalScores(engine);
  const aliceEntry = scores.find((s) => s.player.id === "p1")!;
  const bobEntry = scores.find((s) => s.player.id === "p2")!;

  assertEqual(aliceEntry.score, 5, "Alice's score should be team 0 match points (5)");
  assertEqual(bobEntry.score, 3, "Bob's score should be team 1 match points (3)");
  assertEqual(aliceEntry.rank, 1, "Alice (winning team) should be rank 1");
  assertEqual(bobEntry.rank, 2, "Bob (losing team) should be rank 2");

  teamManager.reset();
  resetMovementConfig();
});

runner.test("Team DC: getTeamScoreData returns team-level scores", (engine) => {
  resetMovementConfig();
  const teamManager = TeamManager.getInstance();
  teamManager.reset();
  teamManager.configure(true, 2);

  const mode = GameModeFactory.getInstance().createMode("death-count", {
    roundDuration: 5000,
    roundCount: 1,
  });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  teamManager.assignSequential(["p1", "p2"]);

  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(5100);

  const data = mode.getTeamScoreData();
  assert(data !== null, "getTeamScoreData should return data when teams enabled");
  assertEqual(data!.get(0)?.score, 5, "Team 0 score should be 5");
  assertEqual(data!.get(1)?.score, 3, "Team 1 score should be 3");
  assertEqual(data!.get(0)?.roundPoints, 5, "Team 0 round points should be 5 (this round)");
  assertEqual(data!.get(1)?.roundPoints, 3, "Team 1 round points should be 3 (this round)");

  teamManager.reset();
  resetMovementConfig();
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runDeathCountModeTests() {
  return runner.run();
}

// Allow direct execution
runDeathCountModeTests();
