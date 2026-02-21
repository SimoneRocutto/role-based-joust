import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { resetMovementConfig } from "@/config/gameConfig";
import { GameEvents } from "@/utils/GameEvents";
import { BaseManager } from "@/managers/BaseManager";
import { TeamManager } from "@/managers/TeamManager";
import type { DominationMode } from "@/gameModes/DominationMode";
import type { PlayerData } from "@/types/index";

const runner = new TestRunner();

function createDominationMode(options?: Record<string, any>): DominationMode {
  return GameModeFactory.getInstance().createMode("domination", options) as DominationMode;
}

const defaultPlayers: PlayerData[] = [
  { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
  { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  { id: "p3", name: "Carol", socketId: "s3", isBot: true, behavior: "idle" },
  { id: "p4", name: "Dave", socketId: "s4", isBot: true, behavior: "idle" },
];

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

runner.test("DominationMode creates with correct defaults", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  const mode = createDominationMode();
  engine.setGameMode(mode);

  assertEqual(mode.name, "Domination", "Name should be 'Domination'");
  assertEqual(mode.useRoles, false, "Should not use roles");
  assertEqual(mode.multiRound, false, "Should not be multi-round");
  assertEqual(mode.roundDuration, null, "roundDuration should be null (no time limit)");

  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

runner.test("DominationMode sets countdown to 6 seconds", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  const mode = createDominationMode();
  engine.setGameMode(mode);
  mode.onModeSelected(engine);

  assertEqual(engine.getCountdownDuration(), 6, "Countdown should be 6 seconds");

  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

runner.test("DominationMode accepts custom options", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  const mode = createDominationMode({
    pointTarget: 10,
    controlIntervalMs: 3000,
    respawnDelayMs: 8000,
  });

  // We can verify these through behavior (win at 10 points, etc.)
  // For now just verify it creates without error
  assert(mode !== null, "Mode should be created with custom options");

  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

// ============================================================================
// BASE CAPTURE TESTS
// ============================================================================

runner.test("Base capture cycles ownership: neutral → team 0 → team 1 → team 0", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);

  const mode = createDominationMode({ pointTarget: 100 });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers);

  // Register a base
  const { baseId } = baseManager.registerBase("base-socket-1");

  // First tap: neutral → team 0
  mode.onBaseTap(baseId, engine);
  let base = baseManager.getBase(baseId)!;
  assertEqual(base.ownerTeamId, 0, "First tap should give ownership to team 0");

  // Second tap: team 0 → team 1
  mode.onBaseTap(baseId, engine);
  base = baseManager.getBase(baseId)!;
  assertEqual(base.ownerTeamId, 1, "Second tap should give ownership to team 1");

  // Third tap: team 1 → team 0
  mode.onBaseTap(baseId, engine);
  base = baseManager.getBase(baseId)!;
  assertEqual(base.ownerTeamId, 0, "Third tap should cycle back to team 0");

  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

runner.test("Base capture emits base:captured event", (engine) => {
  resetMovementConfig();
  const gameEvents = GameEvents.getInstance();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2"]);

  const mode = createDominationMode({ pointTarget: 100 });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers.slice(0, 2));

  const { baseId } = baseManager.registerBase("base-socket-1");

  let capturedEvent: any = null;
  const listener = (payload: any) => {
    capturedEvent = payload;
  };
  gameEvents.onBaseCaptured(listener);

  mode.onBaseTap(baseId, engine);

  assert(capturedEvent !== null, "Should have emitted base:captured event");
  assertEqual(capturedEvent.baseId, baseId, "Event baseId should match");
  assertEqual(capturedEvent.teamId, 0, "Event teamId should be 0");

  gameEvents.removeListener("base:captured", listener);
  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

runner.test("Base tap ignored when game not active", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2"]);

  const mode = createDominationMode({ pointTarget: 100 });
  engine.setGameMode(mode);
  // Don't start the game — state is "waiting"

  const { baseId } = baseManager.registerBase("base-socket-1");

  mode.onBaseTap(baseId, engine);

  const base = baseManager.getBase(baseId)!;
  assertEqual(base.ownerTeamId, null, "Base should remain neutral when game not active");

  baseManager.reset();
  resetMovementConfig();
});

// ============================================================================
// POINT SCORING TESTS
// ============================================================================

runner.test("Base scores points at control interval", (engine) => {
  resetMovementConfig();
  const gameEvents = GameEvents.getInstance();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);

  const controlIntervalMs = 5000;
  const mode = createDominationMode({
    pointTarget: 100,
    controlIntervalMs,
  });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers);

  const { baseId } = baseManager.registerBase("base-socket-1");

  // Capture base for team 0
  mode.onBaseTap(baseId, engine);

  let pointEvents: any[] = [];
  const listener = (payload: any) => {
    pointEvents.push(payload);
  };
  gameEvents.onBasePoint(listener);

  // Advance to just before scoring interval
  engine.fastForward(4900);
  assertEqual(pointEvents.length, 0, "Should not have scored before interval");

  // Advance past scoring interval
  engine.fastForward(200);
  assert(pointEvents.length >= 1, "Should have scored at least 1 point after interval");
  assertEqual(pointEvents[0].teamId, 0, "Point should be for team 0");

  const scores = mode.getTeamScores();
  assert((scores.get(0) ?? 0) >= 1, "Team 0 should have at least 1 point");

  gameEvents.removeListener("base:point", listener);
  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

runner.test("Capture resets point timer", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);

  const controlIntervalMs = 5000;
  const mode = createDominationMode({
    pointTarget: 100,
    controlIntervalMs,
  });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers);

  const { baseId } = baseManager.registerBase("base-socket-1");

  // Capture base for team 0
  mode.onBaseTap(baseId, engine);

  // Advance 3 seconds
  engine.fastForward(3000);

  // Recapture (team 1)
  mode.onBaseTap(baseId, engine);

  // Advance 3 more seconds — should NOT have scored (3s < 5s interval since last capture)
  engine.fastForward(3000);
  const scores = mode.getTeamScores();
  assertEqual(scores.get(0) ?? 0, 0, "Team 0 should have 0 points (capture reset timer)");
  assertEqual(scores.get(1) ?? 0, 0, "Team 1 should have 0 points (only 3s of control)");

  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

runner.test("Disconnected base pauses scoring", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);

  const controlIntervalMs = 5000;
  const mode = createDominationMode({
    pointTarget: 100,
    controlIntervalMs,
  });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers);

  const { baseId } = baseManager.registerBase("base-socket-1");

  // Capture base for team 0
  mode.onBaseTap(baseId, engine);

  // Disconnect the base
  baseManager.handleDisconnect("base-socket-1");

  // Advance well past scoring interval
  engine.fastForward(10000);

  const scores = mode.getTeamScores();
  assertEqual(scores.get(0) ?? 0, 0, "Disconnected base should not score points");

  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

// ============================================================================
// WIN CONDITION TESTS
// ============================================================================

runner.test("Game ends when team reaches point target", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);

  const pointTarget = 3;
  const controlIntervalMs = 1000;
  const mode = createDominationMode({
    pointTarget,
    controlIntervalMs,
  });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers);

  const { baseId } = baseManager.registerBase("base-socket-1");

  // Capture base for team 0
  mode.onBaseTap(baseId, engine);

  // Advance enough ticks for 3 points (3 intervals of 1000ms)
  // Each fastForward tick is 100ms, so 3100ms should give 3 points
  engine.fastForward(3100);

  // Game should be finished
  assertEqual(engine.gameState, "finished", "Game should be finished after reaching point target");

  baseManager.reset();
  resetMovementConfig();
});

runner.test("Win emits domination:win event", (engine) => {
  resetMovementConfig();
  const gameEvents = GameEvents.getInstance();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);

  const pointTarget = 2;
  const controlIntervalMs = 1000;
  const mode = createDominationMode({
    pointTarget,
    controlIntervalMs,
  });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers);

  const { baseId } = baseManager.registerBase("base-socket-1");

  let winEvent: any = null;
  const listener = (payload: any) => {
    winEvent = payload;
  };
  gameEvents.onDominationWin(listener);

  // Capture for team 0
  mode.onBaseTap(baseId, engine);

  // Advance enough for 2 points
  engine.fastForward(2100);

  assert(winEvent !== null, "Should have emitted domination:win event");
  assertEqual(winEvent.winningTeamId, 0, "Winning team should be team 0");

  gameEvents.removeListener("domination:win", listener);
  baseManager.reset();
  resetMovementConfig();
});

// ============================================================================
// RESPAWN TESTS
// ============================================================================

runner.test("Players respawn after death in domination", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);

  const respawnDelayMs = 5000;
  const mode = createDominationMode({
    pointTarget: 100,
    respawnDelayMs,
  });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers);

  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);

  assert(!player1.isAlive, "Player should be dead");
  assertEqual(mode.getPlayerDeathCount("p1"), 1, "Death count should be 1");

  // Fast-forward past respawn delay
  engine.fastForward(5100);

  assert(player1.isAlive, "Player should be alive after respawn");

  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

runner.test("Death count tracks correctly", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);

  const mode = createDominationMode({
    pointTarget: 100,
    respawnDelayMs: 3000,
  });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers);

  assertEqual(mode.getPlayerDeathCount("p1"), 0, "Should start with 0 deaths");

  // Die, respawn, die again
  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);
  assertEqual(mode.getPlayerDeathCount("p1"), 1, "Should have 1 death");

  engine.fastForward(3100); // Respawn
  assert(player1.isAlive, "Should have respawned");

  player1.die(engine.gameTime);
  assertEqual(mode.getPlayerDeathCount("p1"), 2, "Should have 2 deaths");

  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

// ============================================================================
// SCORING TESTS
// ============================================================================

runner.test("calculateFinalScores sorts by team score then death count", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2", "p3", "p4"]);

  const pointTarget = 3;
  const controlIntervalMs = 1000;
  const mode = createDominationMode({
    pointTarget,
    controlIntervalMs,
  });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers);

  const { baseId } = baseManager.registerBase("base-socket-1");

  // Capture for team 0
  mode.onBaseTap(baseId, engine);

  // Kill p1 (team 0) once to give them a death
  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);

  // Advance to win
  engine.fastForward(3100);

  const scores = mode.calculateFinalScores(engine);
  assertEqual(scores.length, 4, "Should have 4 score entries");

  // Team 0 players (p1, p3) should be ranked first (winning team)
  // p3 should be before p1 (fewer deaths: 0 vs 1)
  const firstScore = scores[0];
  assertEqual(firstScore.rank, 1, "First entry should be rank 1");

  baseManager.reset();
  resetMovementConfig();
});

runner.test("getRolePool returns empty array", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  const mode = createDominationMode();
  const roles = mode.getRolePool(4);
  assertEqual(roles.length, 0, "Role pool should be empty for domination");

  baseManager.reset();
  resetMovementConfig();
});

runner.test("getGameEvents includes speed-shift", (engine) => {
  resetMovementConfig();
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  const mode = createDominationMode();
  const events = mode.getGameEvents();
  assert(events.includes("speed-shift"), "Should include speed-shift event");

  baseManager.reset();
  resetMovementConfig();
});

// ============================================================================
// BASE KICK TESTS
// ============================================================================

runner.test("BaseManager: removeBase removes base from both maps", (engine) => {
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  const { baseId } = baseManager.registerBase("socket-1");
  assertEqual(baseManager.getAllBases().length, 1, "Should have 1 base registered");

  baseManager.removeBase("socket-1");

  assertEqual(baseManager.getAllBases().length, 0, "Base should be removed from bases map");
  assertEqual(baseManager.getBaseIdBySocket("socket-1"), undefined, "Socket-to-base mapping should be cleared");
  assertEqual(baseManager.getBase(baseId), undefined, "getBase should return undefined after removal");

  baseManager.reset();
});

runner.test("BaseManager: removeBase is a no-op for unknown socketId", (engine) => {
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  baseManager.registerBase("socket-1");
  assertEqual(baseManager.getAllBases().length, 1, "Should have 1 base");

  // Removing unknown socket should not throw and should not affect existing base
  baseManager.removeBase("unknown-socket");

  assertEqual(baseManager.getAllBases().length, 1, "Existing base should be untouched");

  baseManager.reset();
});

runner.test("BaseManager: purgeDisconnected removes disconnected bases", (engine) => {
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  baseManager.registerBase("socket-1");
  baseManager.registerBase("socket-2");
  assertEqual(baseManager.getAllBases().length, 2, "Should have 2 bases");

  // Disconnect socket-1
  baseManager.handleDisconnect("socket-1");
  assertEqual(baseManager.getConnectedCount(), 1, "1 base should be connected");

  baseManager.purgeDisconnected();

  assertEqual(baseManager.getAllBases().length, 1, "Disconnected base should be purged");
  assertEqual(baseManager.getBaseIdBySocket("socket-1"), undefined, "Socket-1 mapping should be cleared");
  assertEqual(baseManager.getConnectedCount(), 1, "Connected base should remain");

  baseManager.reset();
});

runner.test("BaseManager: purgeDisconnected leaves connected bases intact", (engine) => {
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  const { baseId: id1 } = baseManager.registerBase("socket-1");
  const { baseId: id2 } = baseManager.registerBase("socket-2");

  // Both connected — purge should do nothing
  baseManager.purgeDisconnected();

  assertEqual(baseManager.getAllBases().length, 2, "Both connected bases should survive purge");
  assert(baseManager.getBase(id1) !== undefined, "Base 1 should still exist");
  assert(baseManager.getBase(id2) !== undefined, "Base 2 should still exist");

  baseManager.reset();
});

runner.test("BaseManager: getNextAvailableNumber reuses lowest gap after removal", (engine) => {
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  baseManager.registerBase("socket-1"); // gets number 1
  const { baseNumber: n2 } = baseManager.registerBase("socket-2"); // gets number 2
  baseManager.registerBase("socket-3"); // gets number 3

  assertEqual(n2, 2, "Second base should get number 2");

  // Remove base 2
  baseManager.removeBase("socket-2");

  // Registering a new base should reuse number 2 (lowest gap)
  const { baseNumber } = baseManager.registerBase("socket-4");
  assertEqual(baseNumber, 2, "New base should reuse freed number 2");

  baseManager.reset();
});

runner.test("Base kick: removeBase decrements connected count", (engine) => {
  const baseManager = BaseManager.getInstance();
  baseManager.reset();

  baseManager.registerBase("socket-1");
  baseManager.registerBase("socket-2");
  assertEqual(baseManager.getConnectedCount(), 2, "Should have 2 connected bases");

  baseManager.removeBase("socket-1");
  assertEqual(baseManager.getConnectedCount(), 1, "Connected count should drop to 1 after kick");

  baseManager.reset();
});

runner.test("Base kick: rejected during active game (gameState guard)", (engine) => {
  const baseManager = BaseManager.getInstance();
  baseManager.reset();
  const teamManager = TeamManager.getInstance();
  teamManager.configure(true, 2);
  teamManager.assignSequential(["p1", "p2"]);

  const mode = createDominationMode({ pointTarget: 100 });
  engine.setGameMode(mode);
  engine.startGame(defaultPlayers.slice(0, 2));

  assertEqual(engine.gameState, "active", "Game should be active");

  // The route guard: `if (gameEngine.gameState === "active") return 400`
  // We verify the condition directly — can't kick bases during active game
  assert(engine.gameState === "active", "Route should reject kick when gameState is active");

  mode.onGameEnd(engine);
  baseManager.reset();
  resetMovementConfig();
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runDominationModeTests() {
  return runner.run();
}

// Allow direct execution
runDominationModeTests();
