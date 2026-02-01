export interface MovementConfig {
  dangerThreshold: number; // 0-1, intensity above which damage occurs
  damageMultiplier: number; // Multiplier for excess movement damage
  historySize: number; // Number of movements to keep for smoothing
  smoothingEnabled: boolean; // Use averaged movement or instant
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
  dangerThreshold: number;
  damageMultiplier: number;
}

export const sensitivityPresets: SensitivityPreset[] = [
  { key: "low", label: "Low", description: "Forgiving — need big movements to take damage", dangerThreshold: 0.20, damageMultiplier: 30 },
  { key: "medium", label: "Medium", description: "Default — current behavior", dangerThreshold: 0.10, damageMultiplier: 50 },
  { key: "high", label: "High", description: "Punishing — small movements hurt", dangerThreshold: 0.05, damageMultiplier: 70 },
  { key: "extreme", label: "Extreme", description: "Brutal — almost any movement is deadly", dangerThreshold: 0.02, damageMultiplier: 100 },
];

const defaultMovement: MovementConfig = {
  dangerThreshold: 0.1, // 10% intensity is dangerous
  damageMultiplier: 50, // Damage = (intensity - threshold) * 100
  historySize: 5, // Average last 5 movements
  smoothingEnabled: true, // Use smoothing by default
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
