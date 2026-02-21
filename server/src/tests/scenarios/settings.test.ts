import { TestRunner, assert, assertEqual } from "../testRunner";
import {
  gameConfig,
  sensitivityPresets,
  updateMovementConfig,
  resetMovementConfig,
  userPreferences,
  setRoundCountPreference,
  setDeathCountRespawnTimePreference,
} from "@/config/gameConfig";

const runner = new TestRunner();

// ============================================================================
// GAME SETTINGS TESTS
// ============================================================================

runner.test("sensitivityPresets has expected presets", (engine) => {
  assertEqual(sensitivityPresets.length, 5, "Should have 5 presets");

  const keys = sensitivityPresets.map((p) => p.key);
  assert(keys.includes("low"), "Should have low preset");
  assert(keys.includes("medium"), "Should have medium preset");
  assert(keys.includes("high"), "Should have high preset");
  assert(keys.includes("extreme"), "Should have extreme preset");
  assert(keys.includes("oneshot"), "Should have oneshot preset");
});

runner.test("Medium preset matches default config", (engine) => {
  resetMovementConfig();
  const medium = sensitivityPresets.find((p) => p.key === "medium")!;

  assertEqual(
    gameConfig.movement.damageMultiplier,
    medium.damageMultiplier,
    "Default damageMultiplier should match medium preset"
  );
});

runner.test("updateMovementConfig updates dangerThreshold", (engine) => {
  resetMovementConfig();
  updateMovementConfig({ dangerThreshold: 0.05 });

  assertEqual(
    gameConfig.movement.dangerThreshold,
    0.05,
    "dangerThreshold should be updated"
  );
  // Other fields unchanged
  assertEqual(
    gameConfig.movement.damageMultiplier,
    50,
    "damageMultiplier should remain default"
  );

  resetMovementConfig();
});

runner.test("updateMovementConfig updates damageMultiplier", (engine) => {
  resetMovementConfig();
  updateMovementConfig({ damageMultiplier: 100 });

  assertEqual(
    gameConfig.movement.damageMultiplier,
    100,
    "damageMultiplier should be updated"
  );
  assertEqual(
    gameConfig.movement.dangerThreshold,
    0.1,
    "dangerThreshold should remain default"
  );

  resetMovementConfig();
});

runner.test("updateMovementConfig updates both fields at once", (engine) => {
  resetMovementConfig();
  updateMovementConfig({ dangerThreshold: 0.02, damageMultiplier: 100 });

  assertEqual(
    gameConfig.movement.dangerThreshold,
    0.02,
    "dangerThreshold should be updated"
  );
  assertEqual(
    gameConfig.movement.damageMultiplier,
    100,
    "damageMultiplier should be updated"
  );

  resetMovementConfig();
});

runner.test("resetMovementConfig restores defaults", (engine) => {
  updateMovementConfig({ dangerThreshold: 0.99, damageMultiplier: 999 });
  resetMovementConfig();

  assertEqual(
    gameConfig.movement.dangerThreshold,
    0.1,
    "dangerThreshold should be reset to default"
  );
  assertEqual(
    gameConfig.movement.damageMultiplier,
    50,
    "damageMultiplier should be reset to default"
  );
});

runner.test("Applying a preset updates config correctly", (engine) => {
  resetMovementConfig();
  const highPreset = sensitivityPresets.find((p) => p.key === "high")!;

  updateMovementConfig({
    damageMultiplier: highPreset.damageMultiplier,
  });

  assertEqual(
    gameConfig.movement.damageMultiplier,
    70,
    "damageMultiplier should match high preset"
  );

  resetMovementConfig();
});

runner.test("Standard presets have increasing damageMultiplier", (engine) => {
  // Only check standard presets (exclude oneshot which has its own behavior)
  const standardPresets = sensitivityPresets.filter((p) => !p.oneshotMode);
  for (let i = 1; i < standardPresets.length; i++) {
    assert(
      standardPresets[i].damageMultiplier >
        standardPresets[i - 1].damageMultiplier,
      `Preset ${
        standardPresets[i].key
      } should have higher damageMultiplier than ${standardPresets[i - 1].key}`
    );
  }
});

runner.test("Oneshot preset has oneshotMode enabled", (engine) => {
  const oneshot = sensitivityPresets.find((p) => p.key === "oneshot")!;
  assert(oneshot !== undefined, "Oneshot preset should exist");
  assertEqual(
    oneshot.oneshotMode,
    true,
    "Oneshot preset should have oneshotMode=true"
  );
});

runner.test("Applying oneshot preset sets oneshotMode", (engine) => {
  resetMovementConfig();
  const oneshot = sensitivityPresets.find((p) => p.key === "oneshot")!;

  updateMovementConfig({
    damageMultiplier: oneshot.damageMultiplier,
    oneshotMode: oneshot.oneshotMode ?? false,
  });

  assertEqual(
    gameConfig.movement.oneshotMode,
    true,
    "oneshotMode should be enabled"
  );

  resetMovementConfig();
  assertEqual(
    gameConfig.movement.oneshotMode,
    false,
    "oneshotMode should be reset to false"
  );
});

// ============================================================================
// ROUND COUNT TESTS
// ============================================================================

runner.test("Default roundCount is 3", (engine) => {
  resetMovementConfig();
  assertEqual(
    userPreferences.roundCount,
    3,
    "Default roundCount should be 3"
  );
});

runner.test("setRoundCountPreference updates roundCount", (engine) => {
  resetMovementConfig();
  setRoundCountPreference(5);
  assertEqual(
    userPreferences.roundCount,
    5,
    "roundCount should be updated to 5"
  );
  resetMovementConfig();
});

runner.test("setRoundCountPreference clamps value to 1-10 range", (engine) => {
  resetMovementConfig();

  setRoundCountPreference(0);
  assertEqual(
    userPreferences.roundCount,
    1,
    "roundCount should be clamped to minimum 1"
  );

  setRoundCountPreference(15);
  assertEqual(
    userPreferences.roundCount,
    10,
    "roundCount should be clamped to maximum 10"
  );

  resetMovementConfig();
});

// ============================================================================
// DEATH COUNT RESPAWN TIME TESTS
// ============================================================================

runner.test("Default deathCountRespawnTime is 5", (engine) => {
  resetMovementConfig();
  assertEqual(
    userPreferences.deathCountRespawnTime,
    5,
    "Default deathCountRespawnTime should be 5"
  );
});

runner.test("setDeathCountRespawnTimePreference updates deathCountRespawnTime", (engine) => {
  resetMovementConfig();
  setDeathCountRespawnTimePreference(10);
  assertEqual(
    userPreferences.deathCountRespawnTime,
    10,
    "deathCountRespawnTime should be updated to 10"
  );
  resetMovementConfig();
});

runner.test("setDeathCountRespawnTimePreference clamps value to 3-30 range", (engine) => {
  resetMovementConfig();

  setDeathCountRespawnTimePreference(1);
  assertEqual(
    userPreferences.deathCountRespawnTime,
    3,
    "deathCountRespawnTime should be clamped to minimum 3"
  );

  setDeathCountRespawnTimePreference(60);
  assertEqual(
    userPreferences.deathCountRespawnTime,
    30,
    "deathCountRespawnTime should be clamped to maximum 30"
  );

  resetMovementConfig();
});

// Export for test runner
export async function runSettingsTests() {
  return runner.run();
}

// Allow direct execution
runSettingsTests();
