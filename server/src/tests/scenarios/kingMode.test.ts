import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { TeamManager } from "@/managers/TeamManager";
import type { PlayerData } from "@/types/index";

const runner = new TestRunner();

function setupKingGame(engine: any, playerCount: number = 4, teamCount: number = 2) {
  const mode = GameModeFactory.getInstance().createMode("long-live-the-king");
  engine.setGameMode(mode);

  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, teamCount);

  const players: PlayerData[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    socketId: `s${i + 1}`,
    isBot: true,
    behavior: "idle" as const,
  }));

  // Block-assign teams: first half → team 0, second half → team 1
  // This avoids sequential round-robin so p1..pN/2 are on team 0.
  const half = Math.ceil(playerCount / teamCount);
  players.forEach((p, i) => {
    teamManager["assignments"].set(p.id, Math.floor(i / half));
  });

  engine.startGame(players);

  return { mode, players };
}

/** Return player IDs on a given team */
function teamMembers(teamId: number): string[] {
  const teamManager = TeamManager.getInstance();
  const assignments = teamManager["assignments"] as Map<string, number>;
  return Array.from(assignments.entries())
    .filter(([, t]) => t === teamId)
    .map(([id]) => id);
}

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

runner.test("KingMode creates with correct defaults", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("long-live-the-king");
  engine.setGameMode(mode);

  assertEqual(mode.name, "Long live the king", "Name should be 'Long live the king'");
  assertEqual(mode.useRoles, false, "Should not use roles");
  assertEqual(mode.multiRound, true, "Should be multi-round");
  assertEqual(mode.roundCount, 3, "Default roundCount should be 3");

  TeamManager.getInstance().reset();
});

runner.test("KingMode accepts custom roundCount", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("long-live-the-king", {
    roundCount: 5,
  });

  assertEqual(mode.roundCount, 5, "roundCount should be 5");

  TeamManager.getInstance().reset();
});

// ============================================================================
// KING ASSIGNMENT TESTS
// ============================================================================

runner.test("One king is assigned per team at round start", (engine) => {
  const { mode } = setupKingGame(engine, 4, 2);
  const teamManager = TeamManager.getInstance();

  const team0Players = teamMembers(0);
  const team1Players = teamMembers(1);

  assert(team0Players.some((id) => mode.getIsKing(id)), "Team 0 should have a king");
  assert(team1Players.some((id) => mode.getIsKing(id)), "Team 1 should have a king");

  assertEqual(team0Players.filter((id) => mode.getIsKing(id)).length, 1, "Team 0 should have exactly 1 king");
  assertEqual(team1Players.filter((id) => mode.getIsKing(id)).length, 1, "Team 1 should have exactly 1 king");

  teamManager.reset();
});

runner.test("getIsKing returns false for non-king players", (engine) => {
  const { mode } = setupKingGame(engine, 4, 2);

  const team0Players = teamMembers(0);
  const team0King = team0Players.find((id) => mode.getIsKing(id))!;
  const team0NonKing = team0Players.find((id) => id !== team0King)!;

  assert(!mode.getIsKing(team0NonKing), "Non-king should return false from getIsKing");

  TeamManager.getInstance().reset();
});

// ============================================================================
// KING DEATH CASCADES
// ============================================================================

runner.test("When king dies, all teammates die instantly", (engine) => {
  const { mode } = setupKingGame(engine, 4, 2);

  const team0Players = teamMembers(0);
  const team0King = team0Players.find((id) => mode.getIsKing(id))!;
  const team0NonKing = team0Players.find((id) => id !== team0King)!;

  const king = engine.getPlayerById(team0King)!;
  const teammate = engine.getPlayerById(team0NonKing)!;

  assert(king.isAlive, "King should be alive before death");
  assert(teammate.isAlive, "Teammate should be alive before king death");

  king.die(engine.gameTime);

  assert(!king.isAlive, "King should be dead after die()");
  assert(!teammate.isAlive, "Teammate should die when king dies");

  TeamManager.getInstance().reset();
});

runner.test("Non-king death does not kill teammates", (engine) => {
  const { mode } = setupKingGame(engine, 4, 2);

  const team0Players = teamMembers(0);
  const team0King = team0Players.find((id) => mode.getIsKing(id))!;
  const team0NonKing = team0Players.find((id) => id !== team0King)!;

  const nonKing = engine.getPlayerById(team0NonKing)!;
  const king = engine.getPlayerById(team0King)!;

  nonKing.die(engine.gameTime);

  assert(!nonKing.isAlive, "Non-king should be dead after die()");
  assert(king.isAlive, "King should stay alive when non-king dies");

  TeamManager.getInstance().reset();
});

runner.test("King death on one team does not affect the other team", (engine) => {
  const { mode } = setupKingGame(engine, 4, 2);

  const team0King = teamMembers(0).find((id) => mode.getIsKing(id))!;
  const king = engine.getPlayerById(team0King)!;

  const team1Players = teamMembers(1).map((id) => engine.getPlayerById(id)!);

  king.die(engine.gameTime);

  for (const p of team1Players) {
    assert(p.isAlive, `Team 1 player ${p.name} should still be alive after team 0 king dies`);
  }

  TeamManager.getInstance().reset();
});

// ============================================================================
// WIN CONDITION TESTS
// ============================================================================

runner.test("Round ends when only one team remains", (engine) => {
  setupKingGame(engine, 4, 2);

  assertEqual(engine.currentRound, 1, "Should start in round 1");

  // Kill team 0's king → kills all of team 0
  const team0King = teamMembers(0).find((id) => engine.currentMode!.getIsKing(id))!;
  engine.getPlayerById(team0King)!.die(engine.gameTime);

  // Advance one tick to trigger win condition check
  // In test mode the engine auto-advances to the next round, so currentRound goes to 2
  engine.fastForward(100);

  assertEqual(engine.currentRound, 2, "Round should have ended and auto-advanced to round 2");

  TeamManager.getInstance().reset();
});

runner.test("Round does not end while multiple teams are alive", (engine) => {
  setupKingGame(engine, 4, 2);

  // Kill a non-king from team 0 only
  const team0Players = teamMembers(0);
  const team0King = team0Players.find((id) => engine.currentMode!.getIsKing(id))!;
  const team0NonKing = team0Players.find((id) => id !== team0King)!;

  engine.getPlayerById(team0NonKing)!.die(engine.gameTime);

  engine.fastForward(100);

  assertEqual(engine.gameState, "active", "Round should still be active with both teams alive");

  TeamManager.getInstance().reset();
});

// ============================================================================
// SCORING TESTS
// ============================================================================

runner.test("Winning team receives most placement bonus points", (engine) => {
  const { mode } = setupKingGame(engine, 4, 2);
  const teamManager = TeamManager.getInstance();

  // Kill team 0's king to eliminate team 0 (team 1 wins)
  const team0King = teamMembers(0).find((id) => mode.getIsKing(id))!;
  engine.getPlayerById(team0King)!.die(engine.gameTime);

  engine.fastForward(100);

  // Team 1 should have more match points than team 0
  const team0Pts = teamManager.getMatchPoints(0);
  const team1Pts = teamManager.getMatchPoints(1);

  assert(team1Pts > team0Pts, `Winning team 1 (${team1Pts}) should have more points than team 0 (${team0Pts})`);

  teamManager.reset();
});

runner.test("Eliminated team receives lower placement bonus than winner", (engine) => {
  const { mode } = setupKingGame(engine, 4, 2);
  const teamManager = TeamManager.getInstance();

  const team0King = teamMembers(0).find((id) => mode.getIsKing(id))!;
  engine.getPlayerById(team0King)!.die(engine.gameTime);

  engine.fastForward(100);

  // Winning team (team 1) should have 5 pts, losing team (team 0) should have 3 pts
  const team1Pts = teamManager.getMatchPoints(1);
  const team0Pts = teamManager.getMatchPoints(0);

  assertEqual(team1Pts, 5, "Winner should have 5 match points");
  assertEqual(team0Pts, 3, "Second place should have 3 match points");

  teamManager.reset();
});

runner.test("Three-team elimination: correct placement order", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("long-live-the-king");
  engine.setGameMode(mode);

  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 3);

  // 6 players, block-assign: p1,p2 → team 0; p3,p4 → team 1; p5,p6 → team 2
  const players: PlayerData[] = [
    { id: "p1", name: "A1", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "A2", socketId: "s2", isBot: true, behavior: "idle" },
    { id: "p3", name: "B1", socketId: "s3", isBot: true, behavior: "idle" },
    { id: "p4", name: "B2", socketId: "s4", isBot: true, behavior: "idle" },
    { id: "p5", name: "C1", socketId: "s5", isBot: true, behavior: "idle" },
    { id: "p6", name: "C2", socketId: "s6", isBot: true, behavior: "idle" },
  ];
  teamManager["assignments"].set("p1", 0);
  teamManager["assignments"].set("p2", 0);
  teamManager["assignments"].set("p3", 1);
  teamManager["assignments"].set("p4", 1);
  teamManager["assignments"].set("p5", 2);
  teamManager["assignments"].set("p6", 2);

  engine.startGame(players);

  const king0 = ["p1", "p2"].find((id) => mode.getIsKing(id))!;
  const king1 = ["p3", "p4"].find((id) => mode.getIsKing(id))!;

  // Eliminate team 0 first, then team 1, team 2 wins
  engine.getPlayerById(king0)!.die(engine.gameTime);
  engine.fastForward(50);

  engine.getPlayerById(king1)!.die(engine.gameTime);
  engine.fastForward(50);

  engine.fastForward(100);

  const pts0 = teamManager.getMatchPoints(0);
  const pts1 = teamManager.getMatchPoints(1);
  const pts2 = teamManager.getMatchPoints(2);

  assert(pts2 > pts1 && pts1 > pts0, `Points should be descending: team2=${pts2}, team1=${pts1}, team0=${pts0}`);
  assertEqual(pts2, 5, "Winning team 2 should have 5 pts");
  assertEqual(pts1, 3, "Second-place team 1 should have 3 pts");
  assertEqual(pts0, 1, "Third-place team 0 should have 1 pt");

  teamManager.reset();
});

// ============================================================================
// MULTI-ROUND TESTS
// ============================================================================

runner.test("Kings are re-assigned each round", (engine) => {
  const { mode } = setupKingGame(engine, 4, 2);

  const t0 = teamMembers(0);
  const t1 = teamMembers(1);

  // Eliminate team 0 to end round 1
  const round1King0 = t0.find((id) => mode.getIsKing(id))!;
  engine.getPlayerById(round1King0)!.die(engine.gameTime);
  engine.fastForward(200);

  // Now in round 2 (test mode auto-advances)
  assertEqual(engine.currentRound, 2, "Should be in round 2");

  // Check that king assignment is valid (at least one king per team)
  assert(t0.some((id) => mode.getIsKing(id)), "Team 0 should have a king in round 2");
  assert(t1.some((id) => mode.getIsKing(id)), "Team 1 should have a king in round 2");

  TeamManager.getInstance().reset();
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runKingModeTests() {
  return runner.run();
}
