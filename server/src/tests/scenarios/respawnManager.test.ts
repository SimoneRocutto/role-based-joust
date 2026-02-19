import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { resetMovementConfig } from "@/config/gameConfig";
import { GameEvents } from "@/utils/GameEvents";
import { RespawnManager } from "@/managers/RespawnManager";
import type { PlayerData } from "@/types/index";

const runner = new TestRunner();

// ============================================================================
// RESPAWN MANAGER UNIT TESTS
// ============================================================================

runner.test("RespawnManager schedules and checks respawns", (engine) => {
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

  const rm = new RespawnManager(5000);

  // Schedule a respawn at gameTime 0
  const scheduled = rm.scheduleRespawn("p1", 0);
  assert(scheduled, "scheduleRespawn should return true");
  assert(rm.hasPendingRespawn("p1"), "Should have pending respawn for p1");
  assert(!rm.hasPendingRespawn("p2"), "Should NOT have pending respawn for p2");

  // Kill the player so respawn has effect
  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);
  assert(!player1.isAlive, "Player should be dead");

  // Check at 4900ms — too early
  rm.checkRespawns(engine, 4900);
  assert(!player1.isAlive, "Player should still be dead at 4.9s");

  // Check at 5000ms — should respawn
  rm.checkRespawns(engine, 5000);
  assert(player1.isAlive, "Player should be alive after respawn at 5s");
  assert(!rm.hasPendingRespawn("p1"), "Pending respawn should be cleared");

  mode.onGameEnd(engine);
  resetMovementConfig();
});

runner.test("RespawnManager skips schedule when not enough time in round", (engine) => {
  resetMovementConfig();

  const rm = new RespawnManager(5000);

  // With roundDuration 10000, dying at 6000 means respawn at 11000 > 10000
  const scheduled = rm.scheduleRespawn("p1", 6000, 10000);
  assert(!scheduled, "Should not schedule respawn when not enough time");
  assert(!rm.hasPendingRespawn("p1"), "Should NOT have pending respawn");

  resetMovementConfig();
});

runner.test("RespawnManager schedules when enough time in round", (engine) => {
  resetMovementConfig();

  const rm = new RespawnManager(5000);

  // With roundDuration 10000, dying at 4000 means respawn at 9000 < 10000
  const scheduled = rm.scheduleRespawn("p1", 4000, 10000);
  assert(scheduled, "Should schedule respawn when enough time");
  assert(rm.hasPendingRespawn("p1"), "Should have pending respawn");

  resetMovementConfig();
});

runner.test("RespawnManager schedules without roundDuration", (engine) => {
  resetMovementConfig();

  const rm = new RespawnManager(5000);

  // No roundDuration (null) — always schedule
  const scheduled1 = rm.scheduleRespawn("p1", 100000, null);
  assert(scheduled1, "Should schedule with null roundDuration");

  // No roundDuration (undefined) — always schedule
  const scheduled2 = rm.scheduleRespawn("p2", 100000);
  assert(scheduled2, "Should schedule with undefined roundDuration");

  resetMovementConfig();
});

runner.test("RespawnManager clear removes all pending", (engine) => {
  resetMovementConfig();

  const rm = new RespawnManager(5000);
  rm.scheduleRespawn("p1", 0);
  rm.scheduleRespawn("p2", 0);

  assert(rm.hasPendingRespawn("p1"), "p1 should be pending");
  assert(rm.hasPendingRespawn("p2"), "p2 should be pending");

  rm.clear();

  assert(!rm.hasPendingRespawn("p1"), "p1 should NOT be pending after clear");
  assert(!rm.hasPendingRespawn("p2"), "p2 should NOT be pending after clear");

  resetMovementConfig();
});

runner.test("RespawnManager getDelay returns configured delay", (engine) => {
  resetMovementConfig();

  const rm = new RespawnManager(7500);
  assertEqual(rm.getDelay(), 7500, "getDelay should return configured delay");

  resetMovementConfig();
});

runner.test("RespawnManager emits respawn event on respawn", (engine) => {
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

  const rm = new RespawnManager(3000);
  let respawnEmitted = false;
  let respawnPlayerId = "";
  const listener = (payload: any) => {
    respawnEmitted = true;
    respawnPlayerId = payload.player.id;
  };
  gameEvents.onPlayerRespawn(listener);

  // Kill and schedule
  const player1 = engine.getPlayerById("p1")!;
  player1.die(engine.gameTime);
  rm.scheduleRespawn("p1", 0);

  // Trigger respawn
  rm.checkRespawns(engine, 3000);

  assert(respawnEmitted, "Should have emitted player:respawn event");
  assertEqual(respawnPlayerId, "p1", "Respawn event should be for p1");

  gameEvents.removeListener("player:respawn", listener);
  mode.onGameEnd(engine);
  resetMovementConfig();
});

runner.test("RespawnManager emitRespawnPending sends event", (engine) => {
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

  const rm = new RespawnManager(4000);
  let pendingEmitted = false;
  let pendingRespawnIn = 0;
  const listener = (payload: any) => {
    pendingEmitted = true;
    pendingRespawnIn = payload.respawnIn;
  };
  gameEvents.onPlayerRespawnPending(listener);

  const player1 = engine.getPlayerById("p1")!;
  rm.emitRespawnPending(player1);

  assert(pendingEmitted, "Should have emitted player:respawn-pending event");
  assertEqual(pendingRespawnIn, 4000, "respawnIn should be 4000ms");

  gameEvents.removeListener("player:respawn-pending", listener);
  mode.onGameEnd(engine);
  resetMovementConfig();
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runRespawnManagerTests() {
  return runner.run();
}

// Allow direct execution
runRespawnManagerTests();
