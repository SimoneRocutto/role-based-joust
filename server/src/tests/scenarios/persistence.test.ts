import { join } from "path";
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { TestRunner, assert, assertEqual } from "../testRunner";
import { SettingsStore, type PersistedSettings } from "@/config/settingsStore";
import {
  gameConfig,
  updateMovementConfig,
  resetMovementConfig,
  initSettings,
  userPreferences,
  type MovementConfig,
} from "@/config/gameConfig";
import { settingsStore } from "@/config/settingsStore";
import { tmpdir } from "os";

const runner = new TestRunner();

/** Create a SettingsStore pointing at a temp file. */
function createTempStore(): {
  store: SettingsStore;
  filePath: string;
  dir: string;
} {
  const dir = join(
    tmpdir(),
    `joust-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const filePath = join(dir, "settings.json");
  return { store: new SettingsStore(filePath), filePath, dir };
}

/** Clean up a temp directory. */
function cleanup(dir: string): void {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true });
    }
  } catch {
    // best-effort
  }
}

/** Create a full PersistedSettings object for testing. */
function createTestSettings(
  overrides?: Partial<PersistedSettings>
): PersistedSettings {
  return {
    movement: {
      dangerThreshold: 0.1,
      damageMultiplier: 50,
      historySize: 5,
      smoothingEnabled: true,
      oneshotMode: false,
    },
    sensitivity: "medium",
    gameMode: "role-based",
    theme: "standard",
    roundCount: 3,
    roundDuration: 90,
    teamsEnabled: false,
    teamCount: 2,
    dominationPointTarget: 20,
    dominationControlInterval: 5,
    dominationRespawnTime: 10,
    dominationBaseCount: 1,
    deathCountRespawnTime: 5,
    withEarbud: false,
    ...overrides,
  };
}

// ============================================================================
// PERSISTENCE TESTS
// ============================================================================

runner.test("Settings persist to disk", () => {
  const { store, filePath, dir } = createTempStore();
  try {
    const settings = createTestSettings({
      movement: {
        dangerThreshold: 0.2,
        damageMultiplier: 80,
        historySize: 5,
        smoothingEnabled: true,
        oneshotMode: false,
      },
      sensitivity: "high",
    });
    store.save(settings);

    assert(existsSync(filePath), "Settings file should exist after save");

    const loaded = store.load();
    assert(loaded !== null, "load() should return non-null");
    assertEqual(
      loaded!.movement?.damageMultiplier,
      80,
      "Loaded damageMultiplier should match saved value"
    );
    assertEqual(
      loaded!.movement?.dangerThreshold,
      0.2,
      "Loaded dangerThreshold should match saved value"
    );
    assertEqual(
      loaded!.sensitivity,
      "high",
      "Loaded sensitivity should match saved value"
    );
  } finally {
    cleanup(dir);
  }
});

runner.test("Settings load on init with new format", () => {
  const { store, filePath, dir } = createTempStore();
  try {
    // Write a settings file in new format
    mkdirSync(dir, { recursive: true });
    const settings: PersistedSettings = createTestSettings({
      movement: {
        dangerThreshold: 0.1,
        damageMultiplier: 99,
        historySize: 5,
        smoothingEnabled: true,
        oneshotMode: false,
      },
      sensitivity: "custom",
      gameMode: "classic",
      theme: "easy",
      roundCount: 5,
    });
    writeFileSync(filePath, JSON.stringify(settings), "utf-8");

    const loaded = store.load();
    assert(loaded !== null, "load() should return non-null for valid file");
    assertEqual(
      loaded!.movement?.damageMultiplier,
      99,
      "Should load the written damageMultiplier"
    );
    assertEqual(
      loaded!.gameMode,
      "classic",
      "Should load the written gameMode"
    );
    assertEqual(loaded!.theme, "easy", "Should load the written theme");
    assertEqual(loaded!.roundCount, 5, "Should load the written roundCount");
  } finally {
    cleanup(dir);
  }
});

runner.test("Legacy format (flat MovementConfig) migrated on load", () => {
  const { store, filePath, dir } = createTempStore();
  try {
    // Write a settings file in legacy flat format
    mkdirSync(dir, { recursive: true });
    const legacySettings = {
      dangerThreshold: 0.15,
      damageMultiplier: 70,
      historySize: 5,
      smoothingEnabled: true,
      oneshotMode: false,
    };
    writeFileSync(filePath, JSON.stringify(legacySettings), "utf-8");

    const loaded = store.load();
    assert(loaded !== null, "load() should return non-null for legacy file");
    assertEqual(
      loaded!.movement?.damageMultiplier,
      70,
      "Should migrate damageMultiplier to movement object"
    );
    assertEqual(
      loaded!.movement?.dangerThreshold,
      0.15,
      "Should migrate dangerThreshold to movement object"
    );
    assertEqual(
      loaded!.sensitivity,
      "custom",
      "Legacy format should get sensitivity=custom"
    );
  } finally {
    cleanup(dir);
  }
});

runner.test("Flush removes persisted settings", () => {
  const { store, filePath, dir } = createTempStore();
  try {
    store.save(createTestSettings());
    assert(existsSync(filePath), "File should exist after save");

    store.flush();
    assert(!existsSync(filePath), "File should be deleted after flush");

    const loaded = store.load();
    assertEqual(loaded, null, "load() should return null after flush");
  } finally {
    cleanup(dir);
  }
});

runner.test("Disabled store does not write", () => {
  const { store, filePath, dir } = createTempStore();
  try {
    store.disable();
    store.save(createTestSettings());

    assert(
      !existsSync(filePath),
      "File should not exist when store is disabled"
    );

    const loaded = store.load();
    assertEqual(loaded, null, "load() should return null when disabled");
  } finally {
    store.enable();
    cleanup(dir);
  }
});

runner.test("Corrupt file handled gracefully", () => {
  const { store, filePath, dir } = createTempStore();
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, "not valid json {{{", "utf-8");

    const loaded = store.load();
    assertEqual(loaded, null, "load() should return null for corrupt file");
  } finally {
    cleanup(dir);
  }
});

runner.test("Missing directory auto-created on save", () => {
  const dir = join(
    tmpdir(),
    `joust-test-nested-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const filePath = join(dir, "sub", "deep", "settings.json");
  const store = new SettingsStore(filePath);
  try {
    store.save(createTestSettings());

    assert(
      existsSync(filePath),
      "File should be created even with missing parent dirs"
    );
  } finally {
    cleanup(dir);
  }
});

runner.test("Global settingsStore is disabled during tests", () => {
  // The TestRunner disables the global settingsStore before running tests
  assertEqual(
    settingsStore.isEnabled(),
    false,
    "Global settingsStore should be disabled in tests"
  );
});

runner.test("Saved settings include all preferences", () => {
  const { store, filePath, dir } = createTempStore();
  try {
    const settings = createTestSettings({
      gameMode: "classic",
      theme: "fantasy",
      sensitivity: "extreme",
      roundCount: 7,
    });
    store.save(settings);

    // Read raw file to verify structure
    const raw = JSON.parse(readFileSync(filePath, "utf-8"));
    assert("movement" in raw, "Saved file should have movement object");
    assert("sensitivity" in raw, "Saved file should have sensitivity");
    assert("gameMode" in raw, "Saved file should have gameMode");
    assert("theme" in raw, "Saved file should have theme");
    assert("roundCount" in raw, "Saved file should have roundCount");
    assertEqual(raw.gameMode, "classic", "Saved gameMode should match");
    assertEqual(raw.theme, "fantasy", "Saved theme should match");
    assertEqual(raw.sensitivity, "extreme", "Saved sensitivity should match");
    assertEqual(raw.roundCount, 7, "Saved roundCount should match");
  } finally {
    cleanup(dir);
  }
});

// Export for test runner
export async function runPersistenceTests() {
  return runner.run();
}

// Allow direct execution
runPersistenceTests();
