import { TestRunner, assert, assertEqual } from "../testRunner";
import {
  gameConfig,
  sensitivityPresets,
  updateMovementConfig,
  resetMovementConfig,
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
    gameConfig.movement.dangerThreshold,
    medium.dangerThreshold,
    "Default dangerThreshold should match medium preset"
  );
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
    dangerThreshold: highPreset.dangerThreshold,
    damageMultiplier: highPreset.damageMultiplier,
  });

  assertEqual(
    gameConfig.movement.dangerThreshold,
    0.05,
    "dangerThreshold should match high preset"
  );
  assertEqual(
    gameConfig.movement.damageMultiplier,
    70,
    "damageMultiplier should match high preset"
  );

  resetMovementConfig();
});

runner.test("Standard presets have decreasing dangerThreshold", (engine) => {
  // Only check standard presets (exclude oneshot which has its own behavior)
  const standardPresets = sensitivityPresets.filter((p) => !p.oneshotMode);
  for (let i = 1; i < standardPresets.length; i++) {
    assert(
      standardPresets[i].dangerThreshold < standardPresets[i - 1].dangerThreshold,
      `Preset ${standardPresets[i].key} should have lower dangerThreshold than ${standardPresets[i - 1].key}`
    );
  }
});

runner.test("Standard presets have increasing damageMultiplier", (engine) => {
  // Only check standard presets (exclude oneshot which has its own behavior)
  const standardPresets = sensitivityPresets.filter((p) => !p.oneshotMode);
  for (let i = 1; i < standardPresets.length; i++) {
    assert(
      standardPresets[i].damageMultiplier > standardPresets[i - 1].damageMultiplier,
      `Preset ${standardPresets[i].key} should have higher damageMultiplier than ${standardPresets[i - 1].key}`
    );
  }
});

runner.test("Oneshot preset has oneshotMode enabled", (engine) => {
  const oneshot = sensitivityPresets.find((p) => p.key === "oneshot")!;
  assert(oneshot !== undefined, "Oneshot preset should exist");
  assertEqual(oneshot.oneshotMode, true, "Oneshot preset should have oneshotMode=true");
});

runner.test("Applying oneshot preset sets oneshotMode", (engine) => {
  resetMovementConfig();
  const oneshot = sensitivityPresets.find((p) => p.key === "oneshot")!;

  updateMovementConfig({
    dangerThreshold: oneshot.dangerThreshold,
    damageMultiplier: oneshot.damageMultiplier,
    oneshotMode: oneshot.oneshotMode ?? false,
  });

  assertEqual(gameConfig.movement.oneshotMode, true, "oneshotMode should be enabled");

  resetMovementConfig();
  assertEqual(gameConfig.movement.oneshotMode, false, "oneshotMode should be reset to false");
});

// Export for test runner
export async function runSettingsTests() {
  return runner.run();
}

// Allow direct execution
runSettingsTests();
