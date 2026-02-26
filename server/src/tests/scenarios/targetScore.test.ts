import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { ClassicMode } from "@/gameModes/ClassicMode";
import { RoleBasedMode } from "@/gameModes/RoleBasedMode";
import { TeamManager } from "@/managers/TeamManager";
import { resetMovementConfig } from "@/config/gameConfig";
import type { PlayerData } from "@/types/index";

const runner = new TestRunner();

/**
 * Disable teams before solo tests — TeamManager is a singleton and can carry
 * state from earlier test suites (e.g. domination tests that leave enabled=true).
 */
function disableTeams(): void {
  TeamManager.getInstance().configure(false, 2);
}

// ============================================================================
// MODE CONFIGURATION TESTS
// ============================================================================

runner.test("ClassicMode with targetScore is multi-round", () => {
  const mode = new ClassicMode({ targetScore: 10 });
  assert(mode.multiRound === true, "Should be multi-round when targetScore is set");
  assertEqual(mode.targetScore, 10, "targetScore should be 10");
});

runner.test("ClassicMode without targetScore defaults to single round", () => {
  const mode = new ClassicMode();
  assert(mode.multiRound === false, "Should be single-round with no options");
  assertEqual(mode.roundCount, 1, "roundCount should default to 1");
  assertEqual(mode.targetScore, null, "targetScore should be null");
});

runner.test("ClassicMode without targetScore respects roundCount option", () => {
  const mode = new ClassicMode({ roundCount: 3 });
  assertEqual(mode.roundCount, 3, "roundCount should be 3");
  assertEqual(mode.targetScore, null, "targetScore should be null");
});

runner.test("RoleBasedMode with targetScore sets targetScore", () => {
  const mode = new RoleBasedMode({ targetScore: 15 });
  assertEqual(mode.targetScore, 15, "targetScore should be 15");
  assert(mode.multiRound === true, "Should be multi-round");
});

runner.test("RoleBasedMode without targetScore defaults to roundCount 3", () => {
  const mode = new RoleBasedMode();
  assertEqual(mode.roundCount, 3, "Default roundCount should be 3");
  assertEqual(mode.targetScore, null, "targetScore should be null");
});

runner.test("RoleBasedMode with explicit roundCount and no targetScore uses that roundCount", () => {
  const mode = new RoleBasedMode({ roundCount: 5 });
  assertEqual(mode.roundCount, 5, "roundCount should be 5");
  assertEqual(mode.targetScore, null, "targetScore should be null");
});

runner.test("GameModeFactory creates classic mode with targetScore", () => {
  const mode = GameModeFactory.getInstance().createMode("classic", { targetScore: 20 });
  assertEqual(mode.targetScore, 20, "targetScore should be 20");
  assert(mode.multiRound === true, "Should be multi-round");
});

// ============================================================================
// SOLO WIN CONDITION TESTS
// ============================================================================

runner.test("Solo classic: game ends when player reaches targetScore", (engine) => {
  resetMovementConfig();
  disableTeams(); // Prevent stale TeamManager state from prior test suites
  // targetScore=10: player needs 10 points to win
  // Two 5-point wins = 10 → game should end after round 2
  const mode = GameModeFactory.getInstance().createMode("classic", { targetScore: 10 });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  assertEqual(engine.currentRound, 1, "Should be on round 1");

  // Round 1: kill p2, p1 wins (5 pts)
  const player2 = engine.getPlayerById("p2")!;
  player2.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.currentRound, 2, "Should advance to round 2");

  // Round 2: kill p2 again, p1 wins again (5 more pts → totalPoints=10)
  const player2r2 = engine.getPlayerById("p2")!;
  player2r2.die(engine.gameTime);
  engine.fastForward(200);

  // Game should be finished — p1 has 10 total points
  assertEqual(engine.gameState, "finished", "Game should be finished after player reaches targetScore");

  resetMovementConfig();
});

runner.test("Solo classic: game continues when no player has reached targetScore", (engine) => {
  resetMovementConfig();
  disableTeams(); // Prevent stale TeamManager state from prior test suites
  // targetScore=15: two wins only give 10, not enough
  const mode = GameModeFactory.getInstance().createMode("classic", { targetScore: 15 });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Round 1: p1 wins (5 pts)
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(200);

  // After round 1, p1 has 5 total points — not enough to end game
  assertEqual(engine.currentRound, 2, "Should advance to round 2");
  assert(engine.gameState !== "finished", "Game should not be finished yet");

  resetMovementConfig();
});

runner.test("Solo classic: game ends exactly when totalPoints equals targetScore", (engine) => {
  resetMovementConfig();
  disableTeams(); // Prevent stale TeamManager state from prior test suites
  // targetScore=5: one win is enough
  const mode = GameModeFactory.getInstance().createMode("classic", { targetScore: 5 });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Round 1: p1 wins (5 pts = targetScore)
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.gameState, "finished", "Game should end after one win when targetScore=5");

  resetMovementConfig();
});

runner.test("Solo role-based: game ends when player reaches targetScore", (engine) => {
  resetMovementConfig();
  disableTeams(); // Prevent stale TeamManager state from prior test suites
  const mode = GameModeFactory.getInstance().createMode("role-based", { targetScore: 10 });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Round 1: p1 wins (5 pts)
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(200);
  assertEqual(engine.currentRound, 2, "Should be on round 2");

  // Round 2: p1 wins again (5 pts → total 10)
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.gameState, "finished", "Role-based game should end when player reaches targetScore");

  resetMovementConfig();
});

runner.test("Classic with roundCount (no targetScore) still ends after fixed rounds", (engine) => {
  resetMovementConfig();
  disableTeams(); // Prevent stale TeamManager state from prior test suites
  // No targetScore → old behavior: ends after 2 rounds
  const mode = GameModeFactory.getInstance().createMode("classic", { roundCount: 2 });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Round 1
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(200);
  assertEqual(engine.currentRound, 2, "Should be on round 2");

  // Round 2 — game ends because currentRound === roundCount
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.gameState, "finished", "Game should end after roundCount rounds");

  resetMovementConfig();
});

// ============================================================================
// TEAM MANAGER MATCH POINTS TESTS
// ============================================================================

runner.test("TeamManager addMatchPoints and getMatchPoints", () => {
  const tm = TeamManager.getInstance();
  tm.reset();

  tm.addMatchPoints(0, 5);
  tm.addMatchPoints(1, 3);
  tm.addMatchPoints(0, 3);

  assertEqual(tm.getMatchPoints(0), 8, "Team 0 should have 8 match points");
  assertEqual(tm.getMatchPoints(1), 3, "Team 1 should have 3 match points");
  assertEqual(tm.getMatchPoints(2), 0, "Team 2 (unknown) should have 0 match points");

  tm.reset();
});

runner.test("TeamManager getTeamsSortedByMatchPoints returns sorted list", () => {
  const tm = TeamManager.getInstance();
  tm.reset();
  tm.configure(true, 3); // Must configure teamCount=3 before adding points for 3 teams

  tm.addMatchPoints(0, 3);
  tm.addMatchPoints(1, 8);
  tm.addMatchPoints(2, 5);

  const sorted = tm.getTeamsSortedByMatchPoints();
  assertEqual(sorted[0].teamId, 1, "First place should be team 1 (8 pts)");
  assertEqual(sorted[0].matchPoints, 8, "Team 1 has 8 match points");
  assertEqual(sorted[1].teamId, 2, "Second place should be team 2 (5 pts)");
  assertEqual(sorted[2].teamId, 0, "Third place should be team 0 (3 pts)");

  tm.reset();
});

runner.test("TeamManager resetMatchPoints clears all match points", () => {
  const tm = TeamManager.getInstance();
  tm.reset();

  tm.addMatchPoints(0, 10);
  tm.addMatchPoints(1, 7);

  tm.resetMatchPoints();

  assertEqual(tm.getMatchPoints(0), 0, "Team 0 match points should be 0 after reset");
  assertEqual(tm.getMatchPoints(1), 0, "Team 1 match points should be 0 after reset");

  tm.reset();
});

runner.test("TeamManager reset() also clears match points", () => {
  const tm = TeamManager.getInstance();
  tm.configure(true, 2);
  tm.addMatchPoints(0, 5);
  tm.addMatchPoints(1, 3);

  tm.reset();

  // reset() clears match points (but not enabled state — use configure() for that)
  assertEqual(tm.getMatchPoints(0), 0, "Match points should be cleared after reset()");
  assertEqual(tm.getMatchPoints(1), 0, "Match points should be cleared after reset()");
});

runner.test("TeamManager getTeamsSortedByMatchPoints returns all-zero entries with no points", () => {
  const tm = TeamManager.getInstance();
  tm.configure(true, 2);
  tm.resetMatchPoints();

  // getTeamsSortedByMatchPoints always returns teamCount entries (all 0 when no points)
  const sorted = tm.getTeamsSortedByMatchPoints();
  assertEqual(sorted.length, 2, "Should return 2 entries for teamCount=2");
  assert(sorted.every(t => t.matchPoints === 0), "All entries should have 0 match points");

  tm.reset();
});

// ============================================================================
// CLASSIC MODE ONROUNDEND - TEAM MATCH POINTS
// ============================================================================

runner.test("ClassicMode onRoundEnd awards team match points based on round placement", (engine) => {
  resetMovementConfig();

  const tm = TeamManager.getInstance();
  tm.reset();
  tm.configure(true, 2);

  const mode = new ClassicMode({ targetScore: 20 });
  engine.setGameMode(mode);

  // 2 players — one per team for a clean round-end scenario
  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  tm.assignSequential(["p1", "p2"]); // p1 → team 0, p2 → team 1

  // Kill team 1 player — team 0 wins this round
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(200);

  // Team 0 won → should have 5 match points; team 1 lost → should have 3 match points
  const team0Pts = tm.getMatchPoints(0);
  const team1Pts = tm.getMatchPoints(1);
  assert(team0Pts > team1Pts, "Team 0 (winners) should have more match points than team 1");
  assertEqual(team0Pts, 5, "Winning team should have 5 match points");

  tm.reset();
  resetMovementConfig();
});

runner.test("ClassicMode onRoundEnd returns gameEnded when team reaches targetScore", (engine) => {
  resetMovementConfig();

  const tm = TeamManager.getInstance();
  tm.reset();
  tm.configure(true, 2);

  // targetScore=5: one win (5 pts) should end the game for teams
  const mode = new ClassicMode({ targetScore: 5 });
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  tm.assignSequential(["p1", "p2"]); // p1 → team 0, p2 → team 1

  // p2 dies → p1 (team 0) wins → team 0 gets 5 match points = targetScore
  engine.getPlayerById("p2")!.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.gameState, "finished", "Game should be finished when team reaches targetScore");

  tm.reset();
  resetMovementConfig();
});

export async function runTargetScoreTests() {
  return runner.run();
}
