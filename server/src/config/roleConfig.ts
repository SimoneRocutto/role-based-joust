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

export interface BerserkerConfig {
  dangerThreshold: number; // Custom movement threshold
  damageMultiplier: number; // Custom damage multiplier
  aggressiveMovementsForPoint: number; // High intensity movements for 1 point
}

export interface MedicConfig {
  healCooldown: number; // Time between heals
  healDuration: number; // Duration of regeneration effect
  healPerSecond: number; // HP healed per second
  selfRegenerationRate: number; // Passive self-healing rate
  healPoints: number; // Points gained per heal
}

export interface AssassinConfig {
  targetKillPoints: number; // Points for killing assigned target
}

export interface IroncladConfig {
  maxCharges: number; // Number of ability uses
  cooldownDuration: number; // ms to regain 1 charge (0 = no regen)
  toughnessValue: number; // Toughness value when ability active
  abilityDuration: number; // Duration of toughened effect
}

export interface RoleConfigs {
  vampire: VampireConfig;
  beast: BeastConfig;
  beastHunter: BeastHunterConfig;
  angel: AngelConfig;
  berserker: BerserkerConfig;
  medic: MedicConfig;
  assassin: AssassinConfig;
  ironclad: IroncladConfig;
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

  berserker: {
    dangerThreshold: 0.9, // Can move more wildly
    damageMultiplier: 50, // Takes less damage
    aggressiveMovementsForPoint: 10,
  },

  medic: {
    healCooldown: 15000, // 15 seconds
    healDuration: 5000, // 5 seconds
    healPerSecond: 20, // 20 HP/s
    selfRegenerationRate: 5, // 5 HP/s passive
    healPoints: 2,
  },

  assassin: {
    targetKillPoints: 10,
  },

  ironclad: {
    maxCharges: 1, // Single use per round
    cooldownDuration: 0, // No regen
    toughnessValue: 2.0, // Double damage resistance
    abilityDuration: 5000, // 5 seconds
  },
};
