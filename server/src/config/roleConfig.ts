export interface VampireConfig {
  bloodlustCooldown: number; // Time between bloodlust activations
  bloodlustDuration: number; // How long bloodlust lasts
  bloodlustPoints: number; // Points gained on successful bloodlust
}

export interface BeastConfig {
  toughnessMultiplier: number; // Damage resistance multiplier
}

export interface BeastHunterConfig {
  beastKillPoints: number; // Points for killing the Beast
}

export interface AngelConfig {
  invulnerabilityDuration: number; // Divine protection duration
}

export interface IroncladConfig {
  maxCharges: number; // Number of ability uses
  cooldownDuration: number; // ms to regain 1 charge (0 = no regen)
  toughnessValue: number; // Toughness value when ability active
  abilityDuration: number; // Duration of toughened effect
}

export interface SurvivorConfig {
  pointInterval: number; // ms between point awards
  pointsPerTick: number; // Points awarded each interval
}

export interface ExecutionerConfig {
  targetKillPoints: number; // Points for target dying
}

export interface BodyguardConfig {
  protectionBonus: number; // Points if target finishes in top N
  topN: number; // Target must finish in top N alive
  placementBonusOverrides: number[]; // Reduced last-standing bonus
}

export interface BerserkerConfig {
  toughnessDuration: number; // Duration of tough skin after taking damage
  toughnessValue: number; // Toughness value during tough skin
}

export interface NinjaConfig {
  dangerThresholdMultiplier: number; // Multiplier on global dangerThreshold
}

export interface MasochistConfig {
  hpThresholdPercent: number; // HP percentage below which points are earned (0-1)
  pointInterval: number; // ms between point awards
  pointsPerTick: number; // Points awarded each interval
}

export interface SiblingConfig {
  toughnessBonus: number; // Toughness multiplier for siblings
  sharedDamageRatio: number; // Ratio of damage forwarded to sibling (1.0 = 100%)
}

export interface VillagerConfig {
  placementBonusIncrease: number; // Amount of extra points earned if in topN players
  topN: number; // Placements for which he earns extra points
}

export interface VultureConfig {
  deathWindowMs: number; // Time window for chained deaths (ms)
  pointsPerChainedDeath: number; // Points awarded per chained death
}

export interface TrollConfig {
  healDelay: number; // ms after last hit before heal fires
}

export interface RoleConfigs {
  vampire: VampireConfig;
  beast: BeastConfig;
  beastHunter: BeastHunterConfig;
  angel: AngelConfig;
  ironclad: IroncladConfig;
  survivor: SurvivorConfig;
  executioner: ExecutionerConfig;
  bodyguard: BodyguardConfig;
  berserker: BerserkerConfig;
  ninja: NinjaConfig;
  masochist: MasochistConfig;
  sibling: SiblingConfig;
  villager: VillagerConfig;
  vulture: VultureConfig;
  troll: TrollConfig;
}

export const roleConfigs: RoleConfigs = {
  vampire: {
    bloodlustCooldown: 30000, // 30 seconds
    bloodlustDuration: 5000, // 5 seconds
    bloodlustPoints: 5,
  },

  beast: {
    toughnessMultiplier: 1.5, // 50% more resistant
  },

  beastHunter: {
    beastKillPoints: 3,
  },

  angel: {
    invulnerabilityDuration: 3000, // 3 seconds
  },

  ironclad: {
    maxCharges: 1, // Single use per round
    cooldownDuration: 0, // No regen
    toughnessValue: 2.0, // Double damage resistance
    abilityDuration: 5000, // 5 seconds
  },

  survivor: {
    pointInterval: 30000, // 30 seconds
    pointsPerTick: 1,
  },

  executioner: {
    targetKillPoints: 2,
  },

  bodyguard: {
    protectionBonus: 4, // Points if target finishes in top N
    topN: 3, // Top 3 alive
    placementBonusOverrides: [2, 2, 1], // Reduced from default [5, 3, 1]
  },

  berserker: {
    toughnessDuration: 3000, // 3 seconds of tough skin
    toughnessValue: 3.0, // Very high toughness
  },

  ninja: {
    dangerThresholdMultiplier: 2.0, // 2x harder to trigger damage
  },

  masochist: {
    hpThresholdPercent: 0.5, // Below 50% HP
    pointInterval: 15000, // 15 seconds
    pointsPerTick: 1,
  },

  sibling: {
    toughnessBonus: 1.5, // 50% more resistant
    sharedDamageRatio: 1.0, // 100% of damage forwarded
  },

  villager: {
    placementBonusIncrease: 3,
    topN: 1,
  },

  vulture: {
    deathWindowMs: 5000, // 5 seconds
    pointsPerChainedDeath: 2,
  },

  troll: {
    healDelay: 8000, // 8 seconds after last hit
  },
};
