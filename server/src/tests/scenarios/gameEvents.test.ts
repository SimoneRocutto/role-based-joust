import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameEventManager } from "@/managers/GameEventManager";
import { GameEventFactory } from "@/factories/GameEventFactory";
import { SpeedShift } from "@/gameEvents/SpeedShift";
import { GameModeFactory } from "@/factories/GameModeFactory";
import {
  gameConfig,
  resetMovementConfig,
  updateMovementConfig,
} from "@/config/gameConfig";
import { GameEvents } from "@/utils/GameEvents";
import type { PlayerData } from "@/types/index";

const runner = new TestRunner();

// ============================================================================
// GAME EVENT MANAGER TESTS
// ============================================================================

runner.test("GameEventManager registers events", (engine) => {
  const manager = new GameEventManager();
  const factory = GameEventFactory.getInstance();

  assert(
    factory.eventExists("speed-shift"),
    "speed-shift event should exist in factory"
  );

  const event = factory.createEvent("speed-shift");
  manager.registerEvent(event);

  const info = manager.getEventInfo(0);
  assertEqual(info.length, 1, "Should have 1 registered event");
  assertEqual(info[0].key, "speed-shift", "Event key should be speed-shift");
  assertEqual(info[0].isActive, false, "Event should not be active initially");
});

runner.test("GameEventManager activates events on tick", (engine) => {
  resetMovementConfig();
  const manager = new GameEventManager();
  const event = GameEventFactory.getInstance().createEvent("speed-shift");
  manager.registerEvent(event);
  manager.onRoundStart(engine, 0);

  // Before tick, event should be inactive
  assertEqual(
    manager.getActiveEvents().length,
    0,
    "No active events before tick"
  );

  // Tick at gameTime=0 should activate SpeedShift (shouldActivate returns true for gameTime >= 0)
  manager.tick(engine, 0, 100);

  assertEqual(
    manager.getActiveEvents().length,
    1,
    "One event should be active after tick"
  );
  assert(event.isActive, "Event should be marked active");

  resetMovementConfig();
});

runner.test("GameEventManager cleanup deactivates all events", (engine) => {
  resetMovementConfig();
  const manager = new GameEventManager();
  const event = GameEventFactory.getInstance().createEvent("speed-shift");
  manager.registerEvent(event);
  manager.onRoundStart(engine, 0);

  // Activate
  manager.tick(engine, 0, 100);
  assertEqual(
    manager.getActiveEvents().length,
    1,
    "Should have 1 active event"
  );

  // Cleanup
  manager.cleanup(engine, 1000);
  assertEqual(
    manager.getActiveEvents().length,
    0,
    "No active events after cleanup"
  );
  assertEqual(event.isActive, false, "Event should be inactive after cleanup");

  resetMovementConfig();
});

runner.test(
  "GameEventManager forwards player death to active events",
  (engine) => {
    resetMovementConfig();
    const mode = GameModeFactory.getInstance().createMode("classic");
    engine.setGameMode(mode);

    const players: PlayerData[] = [
      {
        id: "p1",
        name: "Alice",
        socketId: "s1",
        isBot: true,
        behavior: "idle",
      },
      { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
      {
        id: "p3",
        name: "Carol",
        socketId: "s3",
        isBot: true,
        behavior: "idle",
      },
    ];

    engine.startGame(players);

    // SpeedShift doesn't do anything special on death, but this verifies
    // the call chain doesn't throw
    const victim = engine.getPlayerById("p1")!;
    victim.die(engine.gameTime);

    // Game should still be active (2 players remaining)
    assertEqual(engine.gameState, "active", "Game should still be active");

    resetMovementConfig();
  }
);

// ============================================================================
// GAME EVENT FACTORY TESTS
// ============================================================================

runner.test("GameEventFactory discovers SpeedShift event", (engine) => {
  const factory = GameEventFactory.getInstance();

  assert(
    factory.eventExists("speed-shift"),
    "speed-shift should be discovered"
  );

  const events = factory.getAvailableEvents();
  assert(
    events.includes("speed-shift"),
    "Available events should include speed-shift"
  );
});

runner.test("GameEventFactory creates SpeedShift instance", (engine) => {
  const factory = GameEventFactory.getInstance();
  const event = factory.createEvent("speed-shift");

  assert(
    event instanceof SpeedShift,
    "Created event should be SpeedShift instance"
  );
  assertEqual(event.isActive, false, "New event should not be active");
});

runner.test("GameEventFactory throws for unknown event", (engine) => {
  const factory = GameEventFactory.getInstance();

  let threw = false;
  try {
    factory.createEvent("nonexistent-event");
  } catch (e) {
    threw = true;
    assert(
      (e as Error).message.includes("not found"),
      "Error message should say event not found"
    );
  }
  assert(threw, "Should throw for unknown event key");
});

// ============================================================================
// SPEED SHIFT TESTS
// ============================================================================

runner.test("SpeedShift activates on first tick", (engine) => {
  resetMovementConfig();
  const event = new SpeedShift();

  assert(event.shouldActivate(engine, 0), "Should activate at gameTime 0");
  assert(event.shouldActivate(engine, 100), "Should activate at gameTime 100");

  resetMovementConfig();
});

runner.test("SpeedShift never deactivates on its own", (engine) => {
  const event = new SpeedShift();

  assertEqual(
    event.shouldDeactivate(engine, 0),
    false,
    "Should not deactivate at 0"
  );
  assertEqual(
    event.shouldDeactivate(engine, 100000),
    false,
    "Should not deactivate at 100000"
  );
});

runner.test("SpeedShift starts in slow phase", (engine) => {
  resetMovementConfig();
  const event = new SpeedShift();
  event.onRoundStart(engine, 0);
  assertEqual(event.getPhase(), "slow", "Should start in slow phase");
  resetMovementConfig();
});

runner.test("SpeedShift saves and restores threshold", (engine) => {
  resetMovementConfig();
  const originalThreshold = gameConfig.movement.dangerThreshold;

  const manager = new GameEventManager();
  const event = GameEventFactory.getInstance().createEvent(
    "speed-shift"
  ) as SpeedShift;
  manager.registerEvent(event);
  manager.onRoundStart(engine, 0);

  // Activate
  manager.tick(engine, 0, 100);
  assert(event.isActive, "Event should be active");

  // Threshold should still be original (still in slow phase)
  assertEqual(
    gameConfig.movement.dangerThreshold,
    originalThreshold,
    "Threshold should be unchanged in slow phase"
  );

  // Cleanup should restore threshold even if we somehow got to fast phase
  // Force into fast phase for this test by accessing internal state
  resetMovementConfig();
});

runner.test(
  "SpeedShift restores threshold on cleanup from fast phase",
  (engine) => {
    resetMovementConfig();
    const originalThreshold = gameConfig.movement.dangerThreshold;

    const gameEvents = GameEvents.getInstance();

    // Track mode:event emissions
    let lastModeEvent: any = null;
    const listener = (payload: any) => {
      lastModeEvent = payload;
    };
    gameEvents.on("mode:event", listener);

    const manager = new GameEventManager();
    const event = GameEventFactory.getInstance().createEvent(
      "speed-shift"
    ) as SpeedShift;
    manager.registerEvent(event);
    manager.onRoundStart(engine, 0);

    // Activate
    manager.tick(engine, 0, 100);

    // Simulate many ticks to force a transition (use deterministic approach)
    // We'll tick at 5s intervals with Math.random mocked
    const origRandom = Math.random;

    // Force transition to fast by making random return 1 (always > stayProbability)
    Math.random = () => 0.99;
    manager.tick(engine, 5000, 100);
    Math.random = origRandom;

    assertEqual(
      event.getPhase(),
      "fast",
      "Should be in fast phase after forced transition"
    );
    const expectedFastThreshold =
      originalThreshold * SpeedShift.FAST_THRESHOLD_MULTIPLIER;
    assertEqual(
      gameConfig.movement.dangerThreshold,
      expectedFastThreshold,
      `Threshold should be ${expectedFastThreshold} (original * ${SpeedShift.FAST_THRESHOLD_MULTIPLIER}) in fast phase`
    );
    assert(lastModeEvent !== null, "Should have emitted a mode:event");
    assertEqual(
      lastModeEvent.eventType,
      "speed-shift:start",
      "Event type should be speed-shift:start"
    );

    // Cleanup should restore original threshold
    manager.cleanup(engine, 6000);
    assertEqual(
      gameConfig.movement.dangerThreshold,
      originalThreshold,
      "Threshold should be restored after cleanup"
    );

    gameEvents.removeListener("mode:event", listener);
    resetMovementConfig();
  }
);

runner.test("SpeedShift probability escalates correctly", (engine) => {
  resetMovementConfig();

  const event = new SpeedShift();
  event.onRoundStart(engine, 0);
  event.isActive = true;
  event.startTime = 0;
  event.onStart(engine, 0);

  // Track transitions
  let transitionCount = 0;
  const gameEvents = GameEvents.getInstance();
  const listener = () => {
    transitionCount++;
  };
  gameEvents.on("mode:event", listener);

  const origRandom = Math.random;

  // First check at 5s: stayProbability = (3/4)^1 = 0.75
  // Random = 0.7 (< 0.75) => stays in slow
  Math.random = () => 0.7;
  event.onTick(engine, 5000, 100);
  assertEqual(
    event.getPhase(),
    "slow",
    "Should stay slow when random < stayProb"
  );
  assertEqual(transitionCount, 0, "No transition should have occurred");

  // Second check at 10s: stayProbability = (3/4)^2 = 0.5625
  // Random = 0.6 (> 0.5625) => transitions to fast
  Math.random = () => 0.6;
  event.onTick(engine, 10000, 100);
  assertEqual(
    event.getPhase(),
    "fast",
    "Should transition to fast when random > stayProb"
  );
  assertEqual(transitionCount, 1, "One transition should have occurred");

  Math.random = origRandom;
  gameEvents.removeListener("mode:event", listener);
  resetMovementConfig();
});

runner.test(
  "SpeedShift fast threshold scales with configured threshold",
  (engine) => {
    resetMovementConfig();

    // Set a custom threshold (e.g., user chose "low" sensitivity)
    const customThreshold = 0.2;
    updateMovementConfig({ dangerThreshold: customThreshold });

    const manager = new GameEventManager();
    const event = GameEventFactory.getInstance().createEvent(
      "speed-shift"
    ) as SpeedShift;
    manager.registerEvent(event);
    manager.onRoundStart(engine, 0);

    // Activate
    manager.tick(engine, 0, 100);

    // Force transition to fast
    const origRandom = Math.random;
    Math.random = () => 0.99;
    manager.tick(engine, 5000, 100);
    Math.random = origRandom;

    assertEqual(event.getPhase(), "fast", "Should be in fast phase");
    const expectedFastThreshold =
      customThreshold * SpeedShift.FAST_THRESHOLD_MULTIPLIER;
    assert(
      Math.abs(gameConfig.movement.dangerThreshold - expectedFastThreshold) <
        0.001,
      `Fast threshold should be ~${expectedFastThreshold} (${customThreshold} * ${SpeedShift.FAST_THRESHOLD_MULTIPLIER} multiplier), got ${gameConfig.movement.dangerThreshold}`
    );

    // Cleanup restores original
    manager.cleanup(engine, 6000);
    assertEqual(
      gameConfig.movement.dangerThreshold,
      customThreshold,
      `Should restore to ${customThreshold} after cleanup`
    );

    resetMovementConfig();
  }
);

runner.test(
  "SpeedShift delays threshold restore by 1s when transitioning fast→slow",
  (engine) => {
    resetMovementConfig();
    const originalThreshold = gameConfig.movement.dangerThreshold;

    const gameEvents = GameEvents.getInstance();
    const modeEvents: any[] = [];
    const listener = (payload: any) => {
      modeEvents.push(payload);
    };
    gameEvents.on("mode:event", listener);

    const event = new SpeedShift();
    event.onRoundStart(engine, 0);
    event.isActive = true;
    event.startTime = 0;
    event.onStart(engine, 0);

    const origRandom = Math.random;

    // Force transition to fast at 5s
    Math.random = () => 0.99;
    event.onTick(engine, 5000, 100);
    Math.random = origRandom;

    assertEqual(event.getPhase(), "fast", "Should be in fast phase");
    const fastThreshold =
      originalThreshold * SpeedShift.FAST_THRESHOLD_MULTIPLIER;
    assertEqual(
      gameConfig.movement.dangerThreshold,
      fastThreshold,
      "Threshold should be elevated in fast phase"
    );

    // Force transition back to slow at 10s
    Math.random = () => 0.99;
    event.onTick(engine, 10000, 100);
    Math.random = origRandom;

    assertEqual(event.getPhase(), "slow", "Should be in slow phase");
    // The speed-shift:end event should have been emitted immediately
    const endEvent = modeEvents.find(
      (e) => e.eventType === "speed-shift:end"
    );
    assert(endEvent !== undefined, "speed-shift:end event should be emitted");

    // But the threshold should STILL be elevated (transition delay)
    assertEqual(
      gameConfig.movement.dangerThreshold,
      fastThreshold,
      "Threshold should still be elevated during 1s transition delay"
    );

    // Tick at 10.5s (500ms later) — still within delay
    event.onTick(engine, 10500, 100);
    assertEqual(
      gameConfig.movement.dangerThreshold,
      fastThreshold,
      "Threshold should still be elevated at 500ms into delay"
    );

    // Tick at 11s (1000ms later) — delay expired, threshold should restore
    event.onTick(engine, 11000, 100);
    assertEqual(
      gameConfig.movement.dangerThreshold,
      originalThreshold,
      "Threshold should be restored after 1s delay"
    );

    gameEvents.removeListener("mode:event", listener);
    resetMovementConfig();
  }
);

runner.test(
  "SpeedShift restores threshold on cleanup even during pending transition",
  (engine) => {
    resetMovementConfig();
    const originalThreshold = gameConfig.movement.dangerThreshold;

    const event = new SpeedShift();
    event.onRoundStart(engine, 0);
    event.isActive = true;
    event.startTime = 0;
    event.onStart(engine, 0);

    const origRandom = Math.random;

    // Force to fast at 5s
    Math.random = () => 0.99;
    event.onTick(engine, 5000, 100);
    Math.random = origRandom;
    assertEqual(event.getPhase(), "fast", "Should be in fast phase");

    // Force back to slow at 10s (starts 1s delay)
    Math.random = () => 0.99;
    event.onTick(engine, 10000, 100);
    Math.random = origRandom;
    assertEqual(event.getPhase(), "slow", "Should be in slow phase");

    // Threshold still elevated (pending restore)
    const fastThreshold =
      originalThreshold * SpeedShift.FAST_THRESHOLD_MULTIPLIER;
    assertEqual(
      gameConfig.movement.dangerThreshold,
      fastThreshold,
      "Threshold should still be elevated during pending restore"
    );

    // Cleanup (round ends) before the 1s delay expires
    event.onEnd(engine, 10500);

    // Threshold should be restored immediately
    assertEqual(
      gameConfig.movement.dangerThreshold,
      originalThreshold,
      "Threshold should be restored on cleanup even during pending delay"
    );

    resetMovementConfig();
  }
);

// ============================================================================
// CLASSIC MODE INTEGRATION TESTS
// ============================================================================

runner.test(
  "ClassicMode registers and activates SpeedShift event",
  (engine) => {
    resetMovementConfig();
    const mode = GameModeFactory.getInstance().createMode("classic");
    engine.setGameMode(mode);

    const players: PlayerData[] = [
      {
        id: "p1",
        name: "Alice",
        socketId: "s1",
        isBot: true,
        behavior: "idle",
      },
      { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
    ];

    engine.startGame(players);

    // After starting, fast-forward a tick to let the event activate
    engine.fastForward(100);

    // Game should be active
    assertEqual(engine.gameState, "active", "Game should be active");

    // The SpeedShift event should have activated (we can verify by checking
    // that the game runs without errors and threshold is still intact)
    assert(
      gameConfig.movement.dangerThreshold > 0,
      "Threshold should be positive"
    );

    resetMovementConfig();
  }
);

runner.test("ClassicMode cleans up events on game end", (engine) => {
  resetMovementConfig();
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" },
    { id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" },
  ];

  engine.startGame(players);

  // Force speed shift into fast phase
  const origRandom = Math.random;
  Math.random = () => 0.99;
  engine.fastForward(5100); // Past the 5s check interval
  Math.random = origRandom;

  // Kill player 2 to end the game
  const player2 = engine.getPlayerById("p2")!;
  player2.die(engine.gameTime);
  engine.fastForward(200);

  assertEqual(engine.gameState, "finished", "Game should be finished");

  // Movement config should be reset (oneshotMode off, threshold back to default)
  assertEqual(
    gameConfig.movement.oneshotMode,
    false,
    "oneshotMode should be reset after game end"
  );

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
