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

export interface TimingConfig {
  readyDelayMs: number; // Delay after round ends before players can ready up
}

export interface ConnectionConfig {
  disconnectionGracePeriodMs: number; // How long to wait before killing a disconnected player
}

export interface CountdownConfig {
  defaultDurationSeconds: number; // Default countdown duration when resetting after game stops
  goDelayMs: number; // Delay after "GO!" before round actually starts
}

export interface ScoringConfig {
  placementBonuses: number[]; // Points by placement: index 0 = 1st, 1 = 2nd, etc. (ClassicMode, RoleBasedMode)
}

export interface ModeDefaultsConfig {
  classic: {
    countdownSeconds: number; // Countdown duration for Classic mode
  };
  deathCount: {
    countdownSeconds: number; // Countdown duration for DeathCount mode
    respawnDelayMs: number; // Time before a dead player respawns
    defaultRoundDurationMs: number; // Default round duration
  };
  domination: {
    countdownSeconds: number; // Countdown duration for Domination mode
    respawnDelayMs: number; // Time before a dead player respawns
    controlIntervalMs: number; // Milliseconds of control needed per point
    pointTarget: number; // Points needed to win
    baseCount: number; // Expected number of bases
  };
}

export interface SpeedShiftConfig {
  checkIntervalMs: number; // How often to check for phase transition
  transitionDelayMs: number; // Delay before restoring threshold on fast→slow
  slowStayBase: number; // Base probability to stay in slow phase per check
  fastStayBase: number; // Base probability to stay in fast phase per check
  fastThresholdMultiplier: number; // Danger threshold multiplier during fast phase
}

export interface ExcitedEffectConfig {
  movementThreshold: number; // Minimum intensity to count as "moving"
  maxIdleTimeMs: number; // How long a player can stay idle before dying
}

export interface GameConfig {
  movement: MovementConfig;
  damage: DamageConfig;
  tick: TickConfig;
  timing: TimingConfig;
  connection: ConnectionConfig;
  countdown: CountdownConfig;
  scoring: ScoringConfig;
  modeDefaults: ModeDefaultsConfig;
  speedShift: SpeedShiftConfig;
  excitedEffect: ExcitedEffectConfig;
}

/**
 * User preferences that persist across server restarts.
 * These are the "remembered" settings.
 */
export interface UserPreferences {
  sensitivity: string; // Preset key or "custom"
  gameMode: string; // e.g., "classic", "role-based"
  theme: string; // e.g., "standard", "halloween"
  roundCount: number; // Number of rounds per game (1-10)
  roundDuration: number; // Round duration in seconds for timed modes (30-300)
  teamsEnabled: boolean; // Whether team mode is active
  teamCount: number; // Number of teams (2-4)
  dominationPointTarget: number; // Points needed to win domination (5-100)
  dominationControlInterval: number; // Seconds of control per point (3-15)
  dominationRespawnTime: number; // Seconds before respawn (5-30)
  dominationBaseCount: number; // Expected number of bases (1-3)
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
  roundCount: 3,
  roundDuration: 90,
  teamsEnabled: false,
  teamCount: 2,
  dominationPointTarget: 20,
  dominationControlInterval: 5,
  dominationRespawnTime: 10,
  dominationBaseCount: 1,
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

  timing: {
    readyDelayMs: 3000, // 3 second delay after round ends before players can ready up
  },

  connection: {
    disconnectionGracePeriodMs: 10000, // 10 seconds
  },

  countdown: {
    defaultDurationSeconds: 10, // Default countdown when resetting after stop
    goDelayMs: 1000, // 1 second "GO!" delay
  },

  scoring: {
    placementBonuses: [5, 3, 1], // 1st: 5pts, 2nd: 3pts, 3rd: 1pt (RoleBasedMode)
  },

  modeDefaults: {
    classic: {
      countdownSeconds: 3,
    },
    deathCount: {
      countdownSeconds: 3,
      respawnDelayMs: 5000, // 5 seconds
      defaultRoundDurationMs: 90000, // 90 seconds
    },
    domination: {
      countdownSeconds: 6,
      respawnDelayMs: 10000, // 10 seconds
      controlIntervalMs: 5000, // 5 seconds
      pointTarget: 20,
      baseCount: 1,
    },
  },

  speedShift: {
    checkIntervalMs: 5000, // 5 seconds
    transitionDelayMs: 1000, // 1 second
    slowStayBase: 0.75, // 75% chance to stay slow each check
    fastStayBase: 2 / 3, // ~67% chance to stay fast each check
    fastThresholdMultiplier: 2, // Fast threshold = saved * multiplier
  },

  excitedEffect: {
    movementThreshold: 0.1, // Minimum intensity to count as moving
    maxIdleTimeMs: 2000, // 2 seconds idle = death
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
    roundCount: userPreferences.roundCount,
    roundDuration: userPreferences.roundDuration,
    teamsEnabled: userPreferences.teamsEnabled,
    teamCount: userPreferences.teamCount,
    dominationPointTarget: userPreferences.dominationPointTarget,
    dominationControlInterval: userPreferences.dominationControlInterval,
    dominationRespawnTime: userPreferences.dominationRespawnTime,
    dominationBaseCount: userPreferences.dominationBaseCount,
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
export function applyTemporaryMovementConfig(
  partial: Partial<MovementConfig>
): void {
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

/**
 * Update round count preference.
 */
export function setRoundCountPreference(count: number): void {
  userPreferences.roundCount = Math.max(1, Math.min(10, count));
  persistSettings();
}

/**
 * Update round duration preference (for timed modes).
 */
export function setRoundDurationPreference(duration: number): void {
  userPreferences.roundDuration = Math.max(30, Math.min(300, duration));
  persistSettings();
}

/**
 * Update teamsEnabled preference.
 */
export function setTeamsEnabledPreference(enabled: boolean): void {
  userPreferences.teamsEnabled = enabled;
  persistSettings();
}

/**
 * Update teamCount preference.
 */
export function setTeamCountPreference(count: number): void {
  userPreferences.teamCount = Math.max(2, Math.min(4, count));
  persistSettings();
}

/**
 * Update domination point target preference.
 */
export function setDominationPointTargetPreference(target: number): void {
  userPreferences.dominationPointTarget = Math.max(5, Math.min(100, target));
  persistSettings();
}

/**
 * Update domination control interval preference (seconds).
 */
export function setDominationControlIntervalPreference(seconds: number): void {
  userPreferences.dominationControlInterval = Math.max(3, Math.min(15, seconds));
  persistSettings();
}

/**
 * Update domination respawn time preference (seconds).
 */
export function setDominationRespawnTimePreference(seconds: number): void {
  userPreferences.dominationRespawnTime = Math.max(5, Math.min(30, seconds));
  persistSettings();
}

/**
 * Update domination base count preference.
 */
export function setDominationBaseCountPreference(count: number): void {
  userPreferences.dominationBaseCount = Math.max(1, Math.min(3, count));
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
    if (saved.roundCount !== undefined) {
      userPreferences.roundCount = saved.roundCount;
    }
    if (saved.roundDuration !== undefined) {
      userPreferences.roundDuration = saved.roundDuration;
    }
    if (saved.teamsEnabled !== undefined) {
      userPreferences.teamsEnabled = saved.teamsEnabled;
    }
    if (saved.teamCount !== undefined) {
      userPreferences.teamCount = saved.teamCount;
    }
    if (saved.dominationPointTarget !== undefined) {
      userPreferences.dominationPointTarget = saved.dominationPointTarget;
    }
    if (saved.dominationControlInterval !== undefined) {
      userPreferences.dominationControlInterval = saved.dominationControlInterval;
    }
    if (saved.dominationRespawnTime !== undefined) {
      userPreferences.dominationRespawnTime = saved.dominationRespawnTime;
    }
    if (saved.dominationBaseCount !== undefined) {
      userPreferences.dominationBaseCount = saved.dominationBaseCount;
    }
  }
}
