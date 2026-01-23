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

export const gameConfig: GameConfig = {
  movement: {
    dangerThreshold: 0.7, // 70% intensity is dangerous
    damageMultiplier: 100, // Damage = (intensity - threshold) * 100
    historySize: 5, // Average last 5 movements
    smoothingEnabled: true, // Use smoothing by default
  },

  damage: {
    baseThreshold: 100, // Takes 100 damage to die
    accumulatedMode: false, // Instant death model (not accumulated)
  },

  tick: {
    rate: parseInt(process.env.TICK_RATE || "100", 10), // 100ms per tick
  },
};
