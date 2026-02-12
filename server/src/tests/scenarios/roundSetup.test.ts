import { TestRunner, assert, assertEqual } from "../testRunner";
import { RoundSetupManager } from "@/managers/RoundSetupManager";
import type { RoundSetupContext } from "@/managers/RoundSetupManager";
import { BasePlayer } from "@/models/BasePlayer";
import { GameEvents } from "@/utils/GameEvents";

const runner = new TestRunner();

// ============================================================================
// HELPER: create a minimal RoundSetupContext
// ============================================================================

function makeContext(overrides?: Partial<RoundSetupContext>): RoundSetupContext {
  const players = overrides?.players ?? [
    new BasePlayer({ id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" }),
    new BasePlayer({ id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" }),
  ];

  return {
    players,
    currentMode: overrides?.currentMode ?? null,
    currentRound: overrides?.currentRound ?? 1,
    resetReadyState: overrides?.resetReadyState ?? (() => {}),
    onCountdownComplete: overrides?.onCountdownComplete ?? (() => {}),
  };
}

// ============================================================================
// PLAYER STATE RESET TESTS
// ============================================================================

runner.test("RoundSetupManager: Player state is reset on startCountdown", (engine) => {
  const manager = new RoundSetupManager();
  manager.setCountdownDuration(0); // skip timer to keep test synchronous

  const player1 = new BasePlayer({ id: "p1", name: "Alice", socketId: "s1", isBot: true, behavior: "idle" });
  const player2 = new BasePlayer({ id: "p2", name: "Bob", socketId: "s2", isBot: true, behavior: "idle" });

  // Dirty up the player state
  player1.isAlive = false;
  player1.accumulatedDamage = 50;
  player1.points = 10;
  player2.isAlive = false;
  player2.accumulatedDamage = 30;
  player2.points = 5;

  const ctx = makeContext({ players: [player1, player2] });

  manager.startCountdown(ctx, () => {});

  assertEqual(player1.isAlive, true, "Player 1 should be alive after reset");
  assertEqual(player1.accumulatedDamage, 0, "Player 1 damage should be 0");
  assertEqual(player1.points, 0, "Player 1 points should be 0");
  assertEqual(player2.isAlive, true, "Player 2 should be alive after reset");
  assertEqual(player2.accumulatedDamage, 0, "Player 2 damage should be 0");
  assertEqual(player2.points, 0, "Player 2 points should be 0");

  manager.cancel();
});

// ============================================================================
// ZERO-DURATION COUNTDOWN TESTS
// ============================================================================

runner.test("RoundSetupManager: Zero-duration countdown calls onCountdownComplete immediately", (engine) => {
  const manager = new RoundSetupManager();
  manager.setCountdownDuration(0);

  let completed = false;
  const ctx = makeContext({
    onCountdownComplete: () => { completed = true; },
  });

  manager.startCountdown(ctx, () => {});

  assertEqual(completed, true, "onCountdownComplete should fire immediately for 0 duration");

  manager.cancel();
});

runner.test("RoundSetupManager: Zero-duration countdown emits 'go' phase", (engine) => {
  const gameEvents = GameEvents.getInstance();
  const manager = new RoundSetupManager();
  manager.setCountdownDuration(0);

  let receivedPhase: string | null = null;
  const listener = (payload: any) => {
    receivedPhase = payload.phase;
  };
  gameEvents.onCountdown(listener);

  const ctx = makeContext();
  manager.startCountdown(ctx, () => {});

  assertEqual(receivedPhase, "go", "Should emit 'go' phase for zero-duration countdown");

  gameEvents.removeListener("game:countdown", listener);
  manager.cancel();
});

// ============================================================================
// COUNTDOWN TIMER TESTS
// ============================================================================

runner.test("RoundSetupManager: Countdown emits initial countdown event", (engine) => {
  const gameEvents = GameEvents.getInstance();
  const manager = new RoundSetupManager();
  manager.setCountdownDuration(3);

  let receivedPayload: any = null;
  const listener = (payload: any) => {
    receivedPayload = payload;
  };
  gameEvents.onCountdown(listener);

  const ctx = makeContext();
  let stateSet: string | null = null;
  manager.startCountdown(ctx, (state) => { stateSet = state; });

  assert(receivedPayload !== null, "Should receive countdown event");
  assertEqual(receivedPayload.secondsRemaining, 3, "Should start at 3 seconds");
  assertEqual(receivedPayload.totalSeconds, 3, "Total should be 3");
  assertEqual(receivedPayload.phase, "countdown", "Phase should be 'countdown'");
  assertEqual(stateSet, "countdown", "Game state should be set to 'countdown'");

  gameEvents.removeListener("game:countdown", listener);
  manager.cancel();
});

// ============================================================================
// CANCEL TESTS
// ============================================================================

runner.test("RoundSetupManager: Cancel clears countdown interval", (engine) => {
  const manager = new RoundSetupManager();
  manager.setCountdownDuration(10);

  let completed = false;
  const ctx = makeContext({
    onCountdownComplete: () => { completed = true; },
  });

  manager.startCountdown(ctx, () => {});

  // Cancel immediately
  manager.cancel();

  // Wait a bit to ensure nothing fires
  // Since cancel clears the interval, completed should remain false
  assertEqual(completed, false, "onCountdownComplete should not fire after cancel");
});

runner.test("RoundSetupManager: Cancel during completion delay clears timeout", async (engine) => {
  const manager = new RoundSetupManager();
  manager.setCountdownDuration(0); // Will skip countdown but we need to test non-zero

  // For this test, we need to test that the completionTimer (the 1s setTimeout after "GO")
  // is properly cleared by cancel(). We simulate this by:
  // 1. Starting a very short countdown
  // 2. Letting it reach 0
  // 3. Calling cancel before the 1s completion delay fires

  // Use duration=1 so the interval fires once
  manager.setCountdownDuration(1);

  let completed = false;
  const ctx = makeContext({
    onCountdownComplete: () => { completed = true; },
  });

  manager.startCountdown(ctx, () => {});

  // Wait for the 1s interval to fire (countdown reaches 0, completionTimer starts)
  await new Promise<void>((resolve) => setTimeout(resolve, 1100));

  // Now cancel before the 1s completion delay finishes
  // Actually, the completion timer starts at t=1000ms and fires at t=2000ms
  // We're at t=1100ms, so the completion timer is still pending
  manager.cancel();

  // Wait for what would have been the completion time
  await new Promise<void>((resolve) => setTimeout(resolve, 1200));

  assertEqual(completed, false, "onCountdownComplete should not fire after cancel during completion delay");
});

// ============================================================================
// RESET READY STATE CALLBACK TEST
// ============================================================================

runner.test("RoundSetupManager: Calls resetReadyState during startCountdown", (engine) => {
  const manager = new RoundSetupManager();
  manager.setCountdownDuration(0);

  let readyStateReset = false;
  const ctx = makeContext({
    resetReadyState: () => { readyStateReset = true; },
  });

  manager.startCountdown(ctx, () => {});

  assertEqual(readyStateReset, true, "resetReadyState should be called during startCountdown");

  manager.cancel();
});

// ============================================================================
// COUNTDOWN DURATION TESTS
// ============================================================================

runner.test("RoundSetupManager: setCountdownDuration clamps negative to 0", (engine) => {
  const manager = new RoundSetupManager();
  manager.setCountdownDuration(-5);
  assertEqual(manager.getCountdownDuration(), 0, "Negative duration should be clamped to 0");
});

runner.test("RoundSetupManager: getCountdownDuration returns set value", (engine) => {
  const manager = new RoundSetupManager();
  manager.setCountdownDuration(7);
  assertEqual(manager.getCountdownDuration(), 7, "Should return the set duration");
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runRoundSetupTests() {
  return runner.run();
}

// Auto-run if executed directly
if (require.main === module) {
  runRoundSetupTests();
}
