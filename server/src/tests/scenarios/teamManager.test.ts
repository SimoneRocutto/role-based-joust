import { TestRunner, assert, assertEqual } from "../testRunner";
import { TeamManager, TEAM_DEFINITIONS } from "@/managers/TeamManager";

const runner = new TestRunner();

/**
 * Get a fresh TeamManager instance for testing.
 * Since it's a singleton, we reset it between tests.
 */
function getTeamManager(): TeamManager {
  const tm = TeamManager.getInstance();
  tm.reset();
  return tm;
}

// ============================================================================
// TEAM MANAGER TESTS
// ============================================================================

runner.test("TeamManager is a singleton", () => {
  const tm1 = TeamManager.getInstance();
  const tm2 = TeamManager.getInstance();
  assert(tm1 === tm2, "Both instances should be the same object");
});

runner.test("Configure sets enabled and team count", () => {
  const tm = getTeamManager();
  tm.configure(true, 3);
  assert(tm.isEnabled() === true, "Should be enabled");
  assertEqual(tm.getTeamCount(), 3, "Team count should be 3");
});

runner.test("Configure clamps team count to 2-4 range", () => {
  const tm = getTeamManager();
  tm.configure(true, 1);
  assertEqual(tm.getTeamCount(), 2, "Team count below 2 should clamp to 2");

  tm.configure(true, 10);
  assertEqual(tm.getTeamCount(), 4, "Team count above 4 should clamp to 4");
});

runner.test("Sequential assignment distributes players round-robin", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);

  const playerIds = ["p1", "p2", "p3", "p4", "p5", "p6"];
  tm.assignSequential(playerIds);

  assertEqual(tm.getPlayerTeam("p1"), 0, "p1 should be on team 0");
  assertEqual(tm.getPlayerTeam("p2"), 1, "p2 should be on team 1");
  assertEqual(tm.getPlayerTeam("p3"), 0, "p3 should be on team 0");
  assertEqual(tm.getPlayerTeam("p4"), 1, "p4 should be on team 1");
  assertEqual(tm.getPlayerTeam("p5"), 0, "p5 should be on team 0");
  assertEqual(tm.getPlayerTeam("p6"), 1, "p6 should be on team 1");
});

runner.test("Sequential assignment with 3 teams", () => {
  const tm = getTeamManager();
  tm.configure(true, 3);

  const playerIds = ["p1", "p2", "p3", "p4", "p5", "p6"];
  tm.assignSequential(playerIds);

  assertEqual(tm.getPlayerTeam("p1"), 0, "p1 → team 0");
  assertEqual(tm.getPlayerTeam("p2"), 1, "p2 → team 1");
  assertEqual(tm.getPlayerTeam("p3"), 2, "p3 → team 2");
  assertEqual(tm.getPlayerTeam("p4"), 0, "p4 → team 0");
  assertEqual(tm.getPlayerTeam("p5"), 1, "p5 → team 1");
  assertEqual(tm.getPlayerTeam("p6"), 2, "p6 → team 2");
});

runner.test("CyclePlayerTeam cycles through teams", () => {
  const tm = getTeamManager();
  tm.configure(true, 3);
  tm.assignSequential(["p1"]);

  assertEqual(tm.getPlayerTeam("p1"), 0, "Initially on team 0");

  const newTeam1 = tm.cyclePlayerTeam("p1");
  assertEqual(newTeam1, 1, "After first cycle → team 1");

  const newTeam2 = tm.cyclePlayerTeam("p1");
  assertEqual(newTeam2, 2, "After second cycle → team 2");

  const newTeam3 = tm.cyclePlayerTeam("p1");
  assertEqual(newTeam3, 0, "After third cycle → wraps to team 0");
});

runner.test("GetTeamAssignments returns correct team groupings", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);
  tm.assignSequential(["p1", "p2", "p3", "p4"]);

  const assignments = tm.getTeamAssignments();
  assertEqual(assignments[0].length, 2, "Team 0 should have 2 players");
  assertEqual(assignments[1].length, 2, "Team 1 should have 2 players");
  assert(assignments[0].includes("p1"), "Team 0 should include p1");
  assert(assignments[0].includes("p3"), "Team 0 should include p3");
  assert(assignments[1].includes("p2"), "Team 1 should include p2");
  assert(assignments[1].includes("p4"), "Team 1 should include p4");
});

runner.test("ValidateTeams passes when all teams have players", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);
  tm.assignSequential(["p1", "p2"]);

  const result = tm.validateTeams();
  assert(result.valid, "Should be valid with players on each team");
});

runner.test("ValidateTeams fails when a team is empty", () => {
  const tm = getTeamManager();
  tm.configure(true, 3);
  // Only 2 players for 3 teams — one team will be empty
  tm.assignSequential(["p1", "p2"]);

  const result = tm.validateTeams();
  assert(!result.valid, "Should be invalid with empty team");
  assert(result.message!.includes("no players"), "Message should mention empty team");
});

runner.test("ValidateTeams always passes when disabled", () => {
  const tm = getTeamManager();
  tm.configure(false, 2);

  const result = tm.validateTeams();
  assert(result.valid, "Should always be valid when teams are disabled");
});

runner.test("GetPlayerTeam returns null when disabled", () => {
  const tm = getTeamManager();
  tm.configure(false, 2);
  tm.assignSequential(["p1"]);

  assertEqual(tm.getPlayerTeam("p1"), null, "Should return null when disabled");
});

runner.test("RemovePlayer removes from assignments", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);
  tm.assignSequential(["p1", "p2", "p3"]);

  assertEqual(tm.getPlayerTeam("p2"), 1, "p2 initially on team 1");
  tm.removePlayer("p2");
  assertEqual(tm.getPlayerTeam("p2"), null, "p2 should be null after removal");

  // Other players unaffected
  assertEqual(tm.getPlayerTeam("p1"), 0, "p1 still on team 0");
  assertEqual(tm.getPlayerTeam("p3"), 0, "p3 still on team 0");
});

runner.test("AddPlayer assigns to team with fewest members", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);
  tm.assignSequential(["p1", "p2", "p3"]); // team 0: p1, p3; team 1: p2

  // Team 0 has 2, team 1 has 1 → new player should go to team 1
  const teamId = tm.addPlayer("p4");
  assertEqual(teamId, 1, "New player should be assigned to team with fewer members");
});

runner.test("Shuffle distributes all players across teams", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);

  const playerIds = ["p1", "p2", "p3", "p4"];
  tm.shuffle(playerIds);

  // All players should be assigned
  for (const id of playerIds) {
    const team = tm.getPlayerTeam(id);
    assert(team !== null, `${id} should be assigned to a team`);
    assert(team! >= 0 && team! < 2, `${id} team should be 0 or 1`);
  }

  // Teams should be balanced (2 players each for 4 players / 2 teams)
  const sizes = tm.getTeamSizes();
  assertEqual(sizes[0], 2, "Team 0 should have 2 players");
  assertEqual(sizes[1], 2, "Team 1 should have 2 players");
});

runner.test("GetTeamSizes returns correct sizes", () => {
  const tm = getTeamManager();
  tm.configure(true, 3);
  tm.assignSequential(["p1", "p2", "p3", "p4", "p5"]);

  const sizes = tm.getTeamSizes();
  assertEqual(sizes[0], 2, "Team 0 should have 2 players");
  assertEqual(sizes[1], 2, "Team 1 should have 2 players");
  assertEqual(sizes[2], 1, "Team 2 should have 1 player");
});

runner.test("Reset clears all assignments", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);
  tm.assignSequential(["p1", "p2"]);

  tm.reset();

  assertEqual(tm.getPlayerTeam("p1"), null, "p1 should be unassigned after reset");
  assertEqual(tm.getPlayerTeam("p2"), null, "p2 should be unassigned after reset");
});

runner.test("GetTeamInfo returns correct team data", () => {
  const tm = getTeamManager();
  const info = tm.getTeamInfo(0);
  assertEqual(info.name, "Red Team", "Team 0 should be Red Team");
  assertEqual(info.color, "#ef4444", "Team 0 color should be red");

  const info1 = tm.getTeamInfo(1);
  assertEqual(info1.name, "Blue Team", "Team 1 should be Blue Team");
});

runner.test("GetTeamInfo handles invalid team ID", () => {
  const tm = getTeamManager();
  const info = tm.getTeamInfo(99);
  assertEqual(info.name, "Team 100", "Invalid team should get fallback name");
});

runner.test("TEAM_DEFINITIONS has 4 teams", () => {
  assertEqual(TEAM_DEFINITIONS.length, 4, "Should have 4 team definitions");
  assertEqual(TEAM_DEFINITIONS[0].name, "Red Team", "First team should be Red");
  assertEqual(TEAM_DEFINITIONS[1].name, "Blue Team", "Second team should be Blue");
  assertEqual(TEAM_DEFINITIONS[2].name, "Green Team", "Third team should be Green");
  assertEqual(TEAM_DEFINITIONS[3].name, "Yellow Team", "Fourth team should be Yellow");
});

// ============================================================================
// TEAM SELECTION TESTS
// ============================================================================

runner.test("startSelection sets selectionActive to true", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);

  assert(!tm.isSelectionActive(), "Should not be active initially");
  tm.startSelection(["p1", "p2"]);
  assert(tm.isSelectionActive(), "Should be active after startSelection");
});

runner.test("startSelection assigns teams if not already assigned", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);

  tm.startSelection(["p1", "p2", "p3", "p4"]);
  assertEqual(tm.getPlayerTeam("p1"), 0, "p1 should be on team 0");
  assertEqual(tm.getPlayerTeam("p2"), 1, "p2 should be on team 1");
  assertEqual(tm.getPlayerTeam("p3"), 0, "p3 should be on team 0");
  assertEqual(tm.getPlayerTeam("p4"), 1, "p4 should be on team 1");
});

runner.test("startSelection preserves existing assignments", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);

  // Pre-assign players
  tm.assignSequential(["p1", "p2"]);
  // Manually switch p1 to team 1
  tm.cyclePlayerTeam("p1");
  assertEqual(tm.getPlayerTeam("p1"), 1, "p1 should now be on team 1");

  // Start selection should NOT reassign
  tm.startSelection(["p1", "p2"]);
  assertEqual(tm.getPlayerTeam("p1"), 1, "p1 should still be on team 1");
  assertEqual(tm.getPlayerTeam("p2"), 1, "p2 should still be on team 1");
});

runner.test("endSelection sets selectionActive to false", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);

  tm.startSelection(["p1", "p2"]);
  assert(tm.isSelectionActive(), "Should be active");
  tm.endSelection();
  assert(!tm.isSelectionActive(), "Should not be active after endSelection");
});

runner.test("reset clears selectionActive", () => {
  const tm = getTeamManager();
  tm.configure(true, 2);

  tm.startSelection(["p1", "p2"]);
  assert(tm.isSelectionActive(), "Should be active");
  tm.reset();
  assert(!tm.isSelectionActive(), "Should not be active after reset");
});

// Export for test runner
export async function runTeamManagerTests() {
  return runner.run();
}

// Allow direct execution
runTeamManagerTests();
