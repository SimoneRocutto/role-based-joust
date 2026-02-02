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

export function updateMovementConfig(partial: Partial<MovementConfig>): void {
  Object.assign(gameConfig.movement, partial);
}

export function resetMovementConfig(): void {
  Object.assign(gameConfig.movement, defaultMovement);
}
