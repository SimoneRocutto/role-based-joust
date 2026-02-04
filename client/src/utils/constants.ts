// src/utils/constants.ts

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

export const SOUND_FILES = {
  // Music
  LOBBY_MUSIC: "music/lobby-music",
  TENSION_MEDIUM: "music/tension-medium",
  TENSION_HIGH: "music/tension-high",
  VICTORY: "music/victory",

  // Effects
  COUNTDOWN_BEEP: "effects/countdown-beep",
  COUNTDOWN_GO: "effects/countdown-go",
  DAMAGE: "effects/damage",
  DEATH: "effects/death",
  LOW_HEALTH_HEARTBEAT: "effects/low-health-heartbeat",
  PLAYER_READY: "effects/ready",
  NO_CHARGES: "effects/no-charges",
  POWER_ACTIVATION: "effects/power-activation",

  // Voice
  ROLE_REVEAL: "voice/role-reveal",
} as const;

export const STATUS_ICONS = {
  INVULNERABLE: "🛡️",
  BLOODLUST: "🧛",
  HUNTED: "🎯",
  BERSERKER: "🔥",
  STUNNED: "❄️",
} as const;
