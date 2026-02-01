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
  assertEqual(sensitivityPresets.length, 4, "Should have 4 presets");

  const keys = sensitivityPresets.map((p) => p.key);
  assert(keys.includes("low"), "Should have low preset");
  assert(keys.includes("medium"), "Should have medium preset");
  assert(keys.includes("high"), "Should have high preset");
  assert(keys.includes("extreme"), "Should have extreme preset");
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

runner.test("Presets have decreasing dangerThreshold", (engine) => {
  for (let i = 1; i < sensitivityPresets.length; i++) {
    assert(
      sensitivityPresets[i].dangerThreshold < sensitivityPresets[i - 1].dangerThreshold,
      `Preset ${sensitivityPresets[i].key} should have lower dangerThreshold than ${sensitivityPresets[i - 1].key}`
    );
  }
});

runner.test("Presets have increasing damageMultiplier", (engine) => {
  for (let i = 1; i < sensitivityPresets.length; i++) {
    assert(
      sensitivityPresets[i].damageMultiplier > sensitivityPresets[i - 1].damageMultiplier,
      `Preset ${sensitivityPresets[i].key} should have higher damageMultiplier than ${sensitivityPresets[i - 1].key}`
    );
  }
});

// Export for test runner
export async function runSettingsTests() {
  return runner.run();
}

// Allow direct execution
runSettingsTests();
