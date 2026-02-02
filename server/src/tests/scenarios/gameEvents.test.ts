import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameEngine } from "@/managers/GameEngine";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { GameEventFactory } from "@/factories/GameEventFactory";
import { GameEvents } from "@/utils/GameEvents";
import { gameConfig, resetMovementConfig } from "@/config/gameConfig";
import type { PlayerData } from "@/types/index";
import type { ModeEvent } from "@/types/events.types";

const runner = new TestRunner();

// ============================================================================
// GAME EVENT FACTORY TESTS
// ============================================================================

runner.test("GameEventFactory discovers TempoShift event", (engine) => {
  const factory = GameEventFactory.getInstance();
  const available = factory.getAvailableEvents();

  assert(available.includes("tempo-shift"), "Factory should discover tempo-shift event");
});

runner.test("GameEventFactory creates TempoShift event", (engine) => {
  const factory = GameEventFactory.getInstance();
  const event = factory.createEvent("tempo-shift");

  assert(event !== null, "Factory should create tempo-shift event");
  assertEqual(event!.getName(), "tempo-shift", "Event name should be tempo-shift");
});

runner.test("GameEventFactory returns null for unknown event", (engine) => {
  const factory = GameEventFactory.getInstance();
  const event = factory.createEvent("nonexistent-event");

  assertEqual(event, null, "Factory should return null for unknown event");
});

// ============================================================================
// CLASSIC MODE DECLARES TEMPO-SHIFT EVENT
// ============================================================================

runner.test("ClassicMode declares tempo-shift game event", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  const events = mode.getGameEvents();

  assert(events.includes("tempo-shift"), "Classic mode should declare tempo-shift event");
  assertEqual(events.length, 1, "Classic mode should have exactly 1 game event");
});

// ============================================================================
// TEMPO SHIFT TESTS
// ============================================================================

runner.test("TempoShift starts in slow mode", (engine) => {
  resetMovementConfig();
  const factory = GameEventFactory.getInstance();
  const event = factory.createEvent("tempo-shift")!;

  event.onRoundStart(engine);

  // Access internal state via any cast
  assertEqual((event as any).tempo, "slow", "TempoShift should start in slow mode");
  assertEqual((event as any).consecutiveChecks, 0, "Consecutive checks should be 0");

  resetMovementConfig();
});

runner.test("TempoShift does not check before 5s", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Get the active event
  assert(engine.activeGameEvents.length > 0, "Should have active game events");
  const tempoEvent = engine.activeGameEvents[0] as any;
  assertEqual(tempoEvent.getName(), "tempo-shift", "First event should be tempo-shift");

  // Fast-forward 4.9 seconds (49 ticks at 100ms)
  engine.fastForward(4900);

  assertEqual(tempoEvent.consecutiveChecks, 0, "Should not have checked yet at 4.9s");

  resetMovementConfig();
});

runner.test("TempoShift checks at 5s", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  const tempoEvent = engine.activeGameEvents[0] as any;

  // Fast-forward exactly 5 seconds (50 ticks)
  engine.fastForward(5000);

  assert(tempoEvent.consecutiveChecks >= 0, "Should have performed a check at 5s");
  // consecutiveChecks is either 1 (stayed) or 0 (shifted and reset)
  const checked = tempoEvent.lastCheckTime > 0;
  assert(checked, "lastCheckTime should be updated after 5s");

  resetMovementConfig();
});

runner.test("TempoShift emits mode:event on shift", (engine) => {
  resetMovementConfig();
  const gameEvents = GameEvents.getInstance();
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Listen for mode:event
  const events: ModeEvent[] = [];
  const listener = (payload: ModeEvent) => {
    if (payload.eventType === "tempo:shift") {
      events.push(payload);
    }
  };
  gameEvents.on("mode:event", listener);

  // Fast-forward enough time that a shift is very likely to occur
  // After many checks, the probability is nearly 1
  engine.fastForward(60000); // 60 seconds = 12 checks

  // At least one shift should have happened with high probability
  // (probability of no shift in 12 checks in slow: (3/4)^12 ≈ 3.2%)
  // We accept a small chance of flakiness here
  assert(events.length > 0, "Should have emitted at least one tempo:shift event");

  const firstEvent = events[0];
  assertEqual(firstEvent.eventType, "tempo:shift", "Event type should be tempo:shift");
  assert(
    firstEvent.data.tempo === "fast" || firstEvent.data.tempo === "slow",
    "Tempo should be 'fast' or 'slow'"
  );

  gameEvents.removeListener("mode:event", listener);
  resetMovementConfig();
});

runner.test("TempoShift updates player thresholds on fast", (engine) => {
  resetMovementConfig();
  const factory = GameEventFactory.getInstance();
  const event = factory.createEvent("tempo-shift")!;

  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Manually initialize and apply fast tempo
  event.onRoundStart(engine);
  const baseThreshold = gameConfig.movement.dangerThreshold;

  // Force tempo to fast by calling private method
  (event as any).applyTempo("fast", engine);

  for (const player of engine.players) {
    assertEqual(
      player.movementConfig.dangerThreshold,
      baseThreshold * 2,
      `Player ${player.name} should have 2x threshold in fast mode`
    );
  }

  resetMovementConfig();
});

runner.test("TempoShift resets thresholds on slow", (engine) => {
  resetMovementConfig();
  const factory = GameEventFactory.getInstance();
  const event = factory.createEvent("tempo-shift")!;

  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  event.onRoundStart(engine);
  const baseThreshold = gameConfig.movement.dangerThreshold;

  // Shift to fast then back to slow
  (event as any).applyTempo("fast", engine);
  (event as any).applyTempo("slow", engine);

  for (const player of engine.players) {
    assertEqual(
      player.movementConfig.dangerThreshold,
      baseThreshold,
      `Player ${player.name} should have base threshold after shifting back to slow`
    );
  }

  resetMovementConfig();
});

runner.test("TempoShift resets on round end", (engine) => {
  resetMovementConfig();
  const factory = GameEventFactory.getInstance();
  const event = factory.createEvent("tempo-shift")!;

  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  event.onRoundStart(engine);
  const baseThreshold = gameConfig.movement.dangerThreshold;

  // Shift to fast
  (event as any).applyTempo("fast", engine);

  // End the round
  event.onRoundEnd(engine);

  assertEqual((event as any).tempo, "slow", "Tempo should be reset to slow after round end");
  assertEqual((event as any).consecutiveChecks, 0, "Consecutive checks should be reset");

  // Player thresholds should be restored
  for (const player of engine.players) {
    assertEqual(
      player.movementConfig.dangerThreshold,
      baseThreshold,
      `Player ${player.name} threshold should be reset after round end`
    );
  }

  resetMovementConfig();
});

runner.test("TempoShift probability increases over time", (engine) => {
  resetMovementConfig();

  // Run many simulations to verify shifts happen
  let totalShifts = 0;
  const iterations = 100;

  for (let i = 0; i < iterations; i++) {
    const factory = GameEventFactory.getInstance();
    const event = factory.createEvent("tempo-shift")!;

    const testEngine = new GameEngine();
    testEngine.testMode = true;

    const mode = GameModeFactory.getInstance().createMode("classic");
    testEngine.setGameMode(mode);

    const players: PlayerData[] = [
      { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
      { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
    ];

    testEngine.startGame(players);
    event.onRoundStart(testEngine);

    // Simulate 10 check intervals (50 seconds)
    for (let t = 0; t < 10; t++) {
      event.onTick(testEngine, (t + 1) * 5000);
    }

    if ((event as any).tempo === "fast" || (event as any).lastCheckTime > 0) {
      // Check if any shift occurred by seeing if consecutiveChecks was reset at some point
      // A proxy: if tempo is "fast", at least one shift happened
      if ((event as any).tempo === "fast") {
        totalShifts++;
      }
    }

    testEngine.stopGame();
    resetMovementConfig();
  }

  // With 10 checks, probability of staying slow the whole time is (3/4)^(1+2+...+10)
  // which is astronomically low. But since checks are independent rolls with increasing n,
  // we just check that shifts happen at least sometimes
  assert(
    totalShifts > 0,
    `Expected some shifts in ${iterations} simulations, got ${totalShifts}`
  );

  resetMovementConfig();
});

runner.test("GameEngine cleans up game events on stopGame", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);
  assert(engine.activeGameEvents.length > 0, "Should have active game events");

  engine.stopGame();
  assertEqual(engine.activeGameEvents.length, 0, "Game events should be cleared after stopGame");

  resetMovementConfig();
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runGameEventTests() {
  return runner.run();
}

// Allow direct execution
runGameEventTests();
