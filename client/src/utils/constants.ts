// src/utils/constants.ts

export const PATHS = {
  AUDIO: "/public/sounds",
} as const;

export const HEALTH_COLORS = {
  HEALTHY: { from: "#065f46", to: "#047857" },
  DAMAGED: { from: "#92400e", to: "#d97706" },
  CRITICAL: { from: "#7f1d1d", to: "#dc2626" },
  DEAD: "#1f2937",
  INVULNERABLE: { from: "#e5e5e5", to: "#ffffff" },
  BLOODLUST: { from: "#450a0a", to: "#dc2626" },
} as const;

export const HEALTH_THRESHOLDS = {
  HEALTHY: 0.8, // 80%+
  DAMAGED: 0.4, // 40-79%
  CRITICAL: 0.0, // <40%
} as const;

export const PLAYER_NUMBER_SIZES = {
  SMALL: "180px", // <375px width
  NORMAL: "220px", // 375-767px
  LARGE: "280px", // >768px
} as const;

export const ACCELEROMETER_CONFIG = {
  SEND_INTERVAL: 100, // 100ms = 10Hz
  MIN_VALUE: -10,
  MAX_VALUE: 10,
  MAX_MAGNITUDE: 17.32, // sqrt(10² + 10² + 10²) ≈ 17.32
} as const;

export const RECONNECTION_CONFIG = {
  MAX_ATTEMPTS: 5,
  RETRY_INTERVAL: 2000, // 2 seconds
  TIMEOUT: 10000, // 10 seconds total
} as const;

export const AUDIO_VOLUMES = {
  MUSIC: 0.4,
  MUSIC_DUCKED: 0.2,
  SFX: 0.5,
  DAMAGE: 0.3,
  HEARTBEAT: 0.4,
  ROLE_REVEAL: 0.7,
  TTS: 1.0,
} as const;

// Default dashboard background per game mode (applied when game is active)
export const DASHBOARD_MODE_BACKGROUNDS: Record<string, { background: string }> = {
  "classic": { background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #1e3a5f 100%)" },
};

// Effects triggered by mode events (background, sfx, music rate).
// Adding a new event = one entry here.
export const MODE_EVENT_EFFECTS: Record<string, {
  background?: string;
  sfx?: string;
  musicRate?: number;
}> = {
  "speed-shift:start": {
    background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)",
    sfx: "speed-up",
    musicRate: 2.0,
  },
  "speed-shift:end": {
    background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #1e3a5f 100%)",
    sfx: "speed-down",
    musicRate: 1.0,
  },
};

export const SHAKE_DETECTION_CONFIG = {
  DEFAULT_THRESHOLD: 0.5,
  DEFAULT_REQUIRED_DURATION: 500, // 500ms = 5 samples at 10Hz
  DEFAULT_COOLDOWN: 1000,
} as const;

export const DAMAGE_FLASH_CONFIG = {
  DURATION_MS: 400,
} as const;

export const STATUS_ICONS = {
  INVULNERABLE: "🛡️",
  BLOODLUST: "🧛",
  HUNTED: "🎯",
  BERSERKER: "🔥",
  STUNNED: "❄️",
} as const;
