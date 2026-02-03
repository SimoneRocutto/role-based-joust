import { settingsStore, type PersistedSettings } from "./settingsStore";

export interface MovementConfig {
  dangerThreshold: number; // 0-1, intensity above which damage occurs
  damageMultiplier: number; // Multiplier for excess movement damage
  historySize: number; // Number of movements to keep for smoothing
  smoothingEnabled: boolean; // Use averaged movement or instant
  oneshotMode: boolean; // Any movement above threshold = instant death
}

export interface DamageConfig {
  baseThreshold: number; // Base damage required to kill player
  accumulatedMode: boolean; // Whether damage accumulates or is instant
}

export interface TickConfig {
  rate: number; // Milliseconds per game tick
}

export interface GameConfig {
  movement: MovementConfig;
  damage: DamageConfig;
  tick: TickConfig;
}

/**
 * User preferences that persist across server restarts.
 * These are the "remembered" settings.
 */
export interface UserPreferences {
  sensitivity: string; // Preset key or "custom"
  gameMode: string; // e.g., "classic", "role-based"
  theme: string; // e.g., "standard", "halloween"
}

export interface SensitivityPreset {
  key: string;
  label: string;
  description: string;
  damageMultiplier: number;
  oneshotMode?: boolean;
}

export const sensitivityPresets: SensitivityPreset[] = [
  {
    key: "low",
    label: "Low",
    description: "Forgiving — need big movements to take damage",
    damageMultiplier: 30,
  },
  {
    key: "medium",
    label: "Medium",
    description: "Default — current behavior",
    damageMultiplier: 50,
  },
  {
    key: "high",
    label: "High",
    description: "Punishing — small movements hurt",
    damageMultiplier: 70,
  },
  {
    key: "extreme",
    label: "Extreme",
    description: "Brutal — almost any movement is deadly",
    damageMultiplier: 100,
  },
  {
    key: "oneshot",
    label: "One Shot",
    description: "Any movement above threshold = instant death",
    damageMultiplier: 50,
    oneshotMode: true,
  },
];

const defaultMovement: MovementConfig = {
  dangerThreshold: 0.1, // 10% intensity is dangerous
  damageMultiplier: 50, // Damage = (intensity - threshold) * 100
  historySize: 5, // Average last 5 movements
  smoothingEnabled: true, // Use smoothing by default
  oneshotMode: false, // Normal damage calculation
};

const defaultPreferences: UserPreferences = {
  sensitivity: "medium",
  gameMode: "role-based",
  theme: "standard",
};

export const gameConfig: GameConfig = {
  movement: { ...defaultMovement },

  damage: {
    baseThreshold: 100, // Takes 100 damage to die
    accumulatedMode: false, // Instant death model (not accumulated)
  },

  tick: {
    rate: parseInt(process.env.TICK_RATE || "100", 10), // 100ms per tick
  },
};

/** Current user preferences (loaded from disk or defaults). */
export const userPreferences: UserPreferences = { ...defaultPreferences };

/** Saved state before game starts (for restoration after game ends). */
let savedMovementConfig: MovementConfig | null = null;
let savedSensitivity: string | null = null;

/** Save all settings to disk. */
function persistSettings(): void {
  const settings: PersistedSettings = {
    movement: gameConfig.movement,
    sensitivity: userPreferences.sensitivity,
    gameMode: userPreferences.gameMode,
    theme: userPreferences.theme,
  };
  settingsStore.save(settings);
}

/**
 * Save current movement config and sensitivity for later restoration.
 * Call this before game modes modify settings.
 */
export function saveMovementConfig(): void {
  savedMovementConfig = { ...gameConfig.movement };
  savedSensitivity = userPreferences.sensitivity;
}

/**
 * Restore movement config and sensitivity to what was saved before game started.
 * Falls back to persisted user settings if nothing was saved.
 */
export function restoreMovementConfig(): void {
  if (savedMovementConfig) {
    Object.assign(gameConfig.movement, savedMovementConfig);
    savedMovementConfig = null;
  }
  if (savedSensitivity) {
    userPreferences.sensitivity = savedSensitivity;
    savedSensitivity = null;
  }
  // If nothing was saved, reload from disk
  if (!savedMovementConfig && !savedSensitivity) {
    const saved = settingsStore.load();
    if (saved?.movement) {
      Object.assign(gameConfig.movement, saved.movement);
    }
    if (saved?.sensitivity) {
      userPreferences.sensitivity = saved.sensitivity;
    }
  }
}

/**
 * Temporarily modify movement config without persisting or updating sensitivity.
 * Used by game modes to apply temporary rules during gameplay.
 */
export function applyTemporaryMovementConfig(partial: Partial<MovementConfig>): void {
  Object.assign(gameConfig.movement, partial);
  // Don't persist, don't update sensitivity - this is temporary
}

export function updateMovementConfig(partial: Partial<MovementConfig>): void {
  Object.assign(gameConfig.movement, partial);
  persistSettings();
}

/**
 * Update sensitivity by preset key.
 * Returns true if preset was found and applied, false otherwise.
 */
export function setSensitivityPreset(presetKey: string): boolean {
  const preset = sensitivityPresets.find((p) => p.key === presetKey);
  if (!preset) return false;

  gameConfig.movement.damageMultiplier = preset.damageMultiplier;
  gameConfig.movement.oneshotMode = preset.oneshotMode ?? false;
  userPreferences.sensitivity = presetKey;
  persistSettings();
  return true;
}

/**
 * Update game mode preference.
 */
export function setGameModePreference(mode: string): void {
  userPreferences.gameMode = mode;
  persistSettings();
}

/**
 * Update theme preference.
 */
export function setThemePreference(theme: string): void {
  userPreferences.theme = theme;
  persistSettings();
}

export function resetMovementConfig(): void {
  Object.assign(gameConfig.movement, defaultMovement);
  Object.assign(userPreferences, defaultPreferences);
  settingsStore.flush();
}

/** Load persisted settings from disk (call once at startup). */
export function initSettings(): void {
  const saved = settingsStore.load();
  if (saved) {
    // Load movement config
    if (saved.movement) {
      Object.assign(gameConfig.movement, saved.movement);
    }
    // Load user preferences
    if (saved.sensitivity) {
      userPreferences.sensitivity = saved.sensitivity;
    }
    if (saved.gameMode) {
      userPreferences.gameMode = saved.gameMode;
    }
    if (saved.theme) {
      userPreferences.theme = saved.theme;
    }
  }
}
