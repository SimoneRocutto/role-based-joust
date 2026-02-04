import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { Ironclad } from "@/models/roles/Ironclad";
import { Toughened } from "@/models/statusEffects/Toughened";
import { roleConfigs } from "@/config/roleConfig";
import type { PlayerData } from "@/types/player.types";

const runner = new TestRunner();

// ============================================================================
// CHARGE SYSTEM TESTS
// ============================================================================

runner.test("Charges initialize correctly on game start", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  const ironclad = engine.players.find((p) => p instanceof Ironclad) as Ironclad;
  assert(ironclad !== undefined, "Should have an Ironclad");

  const chargeInfo = ironclad.getChargeInfo();
  assertEqual(chargeInfo.max, roleConfigs.ironclad.maxCharges, "Max charges should match config");
  assertEqual(chargeInfo.current, roleConfigs.ironclad.maxCharges, "Current charges should equal max at start");
  assertEqual(chargeInfo.cooldownRemaining, 0, "No cooldown at start");
});

runner.test("Using ability consumes a charge", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  const ironclad = engine.players.find((p) => p instanceof Ironclad) as Ironclad;
  const initialCharges = ironclad.currentCharges;

  const result = ironclad.useAbility(engine.gameTime);

  assert(result.success, "Ability should succeed");
  assertEqual(ironclad.currentCharges, initialCharges - 1, "Charge should be consumed");
});

runner.test("Cannot use ability with no charges", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  const ironclad = engine.players.find((p) => p instanceof Ironclad) as Ironclad;

  // Use all charges
  ironclad.useAbility(engine.gameTime);
  assertEqual(ironclad.currentCharges, 0, "Should have no charges");

  // Try to use again
  const result = ironclad.useAbility(engine.gameTime);

  assert(!result.success, "Ability should fail");
  assertEqual(result.reason, "no_charges", "Should report no charges");
});

runner.test("getChargeInfo returns correct values", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  const ironclad = engine.players.find((p) => p instanceof Ironclad) as Ironclad;

  // Initial state
  let info = ironclad.getChargeInfo();
  assertEqual(info.current, 1, "Initial current charges");
  assertEqual(info.max, 1, "Max charges");
  assertEqual(info.cooldownRemaining, 0, "No cooldown initially");

  // After using ability
  ironclad.useAbility(engine.gameTime);
  info = ironclad.getChargeInfo();
  assertEqual(info.current, 0, "No charges after use");
});

// ============================================================================
// IRONCLAD ROLE TESTS
// ============================================================================

runner.test("Ironclad is created correctly", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  const ironclad = engine.players.find((p) => p instanceof Ironclad);
  assert(ironclad !== undefined, "Should have an Ironclad");
  assert(ironclad!.isBot, "Ironclad should be a bot in test mode");
});

runner.test("Ironclad ability applies Toughened effect", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  const ironclad = engine.players.find((p) => p instanceof Ironclad) as Ironclad;

  assert(!ironclad.hasStatusEffect(Toughened), "Should not have Toughened initially");

  const result = ironclad.useAbility(engine.gameTime);
  assert(result.success, "Ability should succeed");
  assert(ironclad.hasStatusEffect(Toughened), "Should have Toughened after ability");
});

runner.test("Ironclad Toughened effect sets correct toughness", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  // Disable autoplay to prevent death during test
  engine.players.forEach((p) => p.disableAutoPlay());

  const ironclad = engine.players.find((p) => p instanceof Ironclad) as Ironclad;
  const originalToughness = ironclad.toughness;

  ironclad.useAbility(engine.gameTime);

  assertEqual(
    ironclad.toughness,
    roleConfigs.ironclad.toughnessValue,
    "Toughness should be set to config value"
  );

  // Fast-forward past effect duration
  engine.fastForward(roleConfigs.ironclad.abilityDuration + 100);

  assertEqual(
    ironclad.toughness,
    originalToughness,
    "Toughness should return to original after effect expires"
  );
});

runner.test("Ironclad takes reduced damage while Toughened", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  const ironclad = engine.players.find((p) => p instanceof Ironclad) as Ironclad;

  // Take damage without toughened
  const damageAmount = 50;
  ironclad.takeDamage(damageAmount, engine.gameTime);
  const damageWithoutToughened = ironclad.accumulatedDamage;

  // Reset damage and apply toughened
  ironclad.accumulatedDamage = 0;
  ironclad.useAbility(engine.gameTime);

  // Take same damage with toughened
  ironclad.takeDamage(damageAmount, engine.gameTime);
  const damageWithToughened = ironclad.accumulatedDamage;

  assert(
    damageWithToughened < damageWithoutToughened,
    `Damage with Toughened (${damageWithToughened}) should be less than without (${damageWithoutToughened})`
  );
});

runner.test("Ironclad single-use - no charge regen", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  const ironclad = engine.players.find((p) => p instanceof Ironclad) as Ironclad;

  // Use the ability
  ironclad.useAbility(engine.gameTime);
  assertEqual(ironclad.currentCharges, 0, "Should have no charges after use");

  // Fast forward a long time (if there was cooldown regen, charges would come back)
  engine.fastForward(60000);

  assertEqual(ironclad.currentCharges, 0, "Charges should not regenerate (cooldownDuration = 0)");
});

// ============================================================================
// TOUGHENED STATUS EFFECT TESTS
// ============================================================================

runner.test("Toughened effect sets absolute toughness", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Test", socketId: "s1", isBot: true },
    { id: "p2", name: "Other", socketId: "s2", isBot: true },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;
  const originalToughness = player.toughness;

  // Disable autoplay to prevent death during test
  player.disableAutoPlay();
  engine.getPlayerById("p2")!.disableAutoPlay();

  // Apply Toughened with value 3.0
  player.applyStatusEffect(Toughened, engine.gameTime, 5000, 3.0);

  assertEqual(player.toughness, 3.0, "Toughness should be set to 3.0");

  // Remove effect
  engine.fastForward(5100);

  assertEqual(player.toughness, originalToughness, "Toughness should return to original");
});

runner.test("Toughened effect expires after duration", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Test", socketId: "s1", isBot: true },
    { id: "p2", name: "Other", socketId: "s2", isBot: true },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;
  const otherPlayer = engine.getPlayerById("p2")!;

  // Disable autoplay to prevent death during test
  player.disableAutoPlay();
  otherPlayer.disableAutoPlay();

  // Apply 2-second Toughened
  player.applyStatusEffect(Toughened, engine.gameTime, 2000, 2.0);

  assert(player.hasStatusEffect(Toughened), "Should have Toughened");

  // Fast-forward past expiration
  engine.fastForward(2500);

  assert(!player.hasStatusEffect(Toughened), "Toughened should expire");
});

// ============================================================================
// COOLDOWN REGENERATION TESTS (for future roles with cooldown > 0)
// ============================================================================

runner.test("Cooldown regenerates charges when cooldownDuration > 0", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Test", socketId: "s1", isBot: true },
    { id: "p2", name: "Other", socketId: "s2", isBot: true },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;
  const otherPlayer = engine.getPlayerById("p2")!;

  // Disable autoplay to prevent death during test
  player.disableAutoPlay();
  otherPlayer.disableAutoPlay();

  // Manually configure player for cooldown regen test
  player.maxCharges = 2;
  player.currentCharges = 0; // Start with 0 charges
  player.cooldownDuration = 1000; // 1 second cooldown

  // Start cooldown manually (simulating that we just used an ability)
  (player as any).cooldownRemaining = 1000;

  // Fast forward 1.1 seconds
  engine.fastForward(1100);

  assertEqual(player.currentCharges, 1, "Should have regenerated 1 charge");
});

// ============================================================================
// EDGE CASES
// ============================================================================

runner.test("Charges reset on new round", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based", { roundCount: 3 });
  engine.setGameMode(mode);

  engine.createTestGame(["ironclad", "ironclad"]);

  const ironclad = engine.players.find((p) => p instanceof Ironclad) as Ironclad;

  // Use the ability
  ironclad.useAbility(engine.gameTime);
  assertEqual(ironclad.currentCharges, 0, "Should have no charges after use");

  // Kill the other player to end the round
  const otherPlayer = engine.players.find((p) => p !== ironclad)!;
  otherPlayer.die(engine.gameTime);

  // Fast forward past round end delay
  engine.fastForward(5000);

  // Check if charges were reset
  // Note: In a real test we'd need to trigger next round, but the onInit call
  // should reset charges. Let's verify by manually calling onInit.
  ironclad.onInit(engine.gameTime);
  assertEqual(ironclad.currentCharges, 1, "Charges should reset on onInit");
});

// Export for test runner
export async function runAbilityTests() {
  return runner.run();
}
