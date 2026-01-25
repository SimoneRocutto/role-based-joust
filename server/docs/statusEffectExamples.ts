// ============================================================================
// src/models/StatusEffect.ts - BASE CLASS
// ============================================================================

import type { BasePlayer } from "./BasePlayer";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance();

export abstract class StatusEffect {
  readonly id: string;
  readonly target: BasePlayer;
  duration: number | null; // Duration in ms, or null for infinite
  startTime: number | null = null;
  endTime: number | null = null;
  isActive: boolean = false;
  readonly priority: number;

  static priority: number = 0; // Override in subclasses
  static displayName: string = "Base Status";
  static description: string = "Base status effect";

  constructor(target: BasePlayer, duration: number | null = null) {
    this.id = `${this.constructor.name}_${Date.now()}_${Math.random()}`;
    this.target = target;
    this.duration = duration;
    this.priority = (this.constructor as typeof StatusEffect).priority;
  }

  // Abstract methods - must implement
  abstract onApply(gameTime: number): void;
  abstract onRemove(gameTime: number): void;

  // Optional hooks - override in subclasses
  onTick(gameTime: number, deltaTime: number): void {}

  onMovement(gameTime: number, movementIntensity: number): void {}

  modifyIncomingDamage(damage: number): number {
    return damage;
  }

  onPreventDeath(gameTime: number): boolean {
    return false;
  }

  onPlayerDeath(gameTime: number): void {}

  shouldExpire(gameTime: number): boolean {
    return (
      this.duration !== null &&
      this.endTime !== null &&
      gameTime >= this.endTime
    );
  }

  onRefresh(gameTime: number, newDuration?: number): void {
    if (newDuration !== undefined) {
      this.duration = newDuration;
      this.endTime = gameTime + newDuration;
    }
  }
}

// ============================================================================
// src/models/statusEffects/Invulnerability.ts
// ============================================================================

import { StatusEffect } from "../StatusEffect";
import type { BasePlayer } from "../BasePlayer";
import { Logger } from "../../utils/Logger";

const logger = Logger.getInstance();

export class Invulnerability extends StatusEffect {
  static override priority: number = 100; // CRITICAL
  static override displayName: string = "Invulnerability";
  static override description: string = "Immune to all damage";

  constructor(target: BasePlayer, duration: number | null = null) {
    super(target, duration);
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    // Set quick-check flag on player
    this.target.isInvulnerable = true;

    logger.info("STATUS", `${this.target.name} became invulnerable`, {
      duration: this.duration,
      endTime: this.endTime,
    });
  }

  onRemove(gameTime: number): void {
    this.isActive = false;

    // Remove quick-check flag
    this.target.isInvulnerable = false;

    logger.info("STATUS", `${this.target.name} lost invulnerability`);
  }

  modifyIncomingDamage(damage: number): number {
    logger.debug(
      "STATUS",
      `Invulnerability blocked ${damage} damage for ${this.target.name}`
    );
    return 0; // All damage negated
  }
}

// ============================================================================
// src/models/statusEffects/Weakened.ts
// ============================================================================

import { StatusEffect } from "../StatusEffect";
import type { BasePlayer } from "../BasePlayer";
import { Logger } from "../../utils/Logger";

const logger = Logger.getInstance();

export class Weakened extends StatusEffect {
  static override priority: number = 50; // HIGH
  static override displayName: string = "Weakened";
  static override description: string = "Reduced damage resistance";

  private readonly multiplier: number;
  private originalToughness: number | null = null;

  constructor(
    target: BasePlayer,
    duration: number | null,
    multiplier: number = 0.5
  ) {
    super(target, duration);
    this.multiplier = multiplier; // 0.5 = half toughness
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    // Store original and reduce toughness
    this.originalToughness = this.target.toughness;
    this.target.toughness *= this.multiplier;

    logger.info("STATUS", `${this.target.name} weakened`, {
      originalToughness: this.originalToughness,
      newToughness: this.target.toughness,
      multiplier: this.multiplier,
    });
  }

  onRemove(gameTime: number): void {
    this.isActive = false;

    // Restore original toughness
    if (this.originalToughness !== null) {
      this.target.toughness = this.originalToughness;
    }

    logger.info("STATUS", `${this.target.name} recovered from weakness`, {
      restoredToughness: this.target.toughness,
    });
  }
}

// ============================================================================
// src/models/statusEffects/Excited.ts
// ============================================================================

import { StatusEffect } from "../StatusEffect";
import type { BasePlayer } from "../BasePlayer";
import { Logger } from "../../utils/Logger";

const logger = Logger.getInstance();

export class Excited extends StatusEffect {
  static override priority: number = 10; // MEDIUM_LOW
  static override displayName: string = "Excited";
  static override description: string = "Must keep moving or die";

  private lastMovementTime: number | null = null;
  private readonly movementThreshold: number = 0.1;
  private readonly maxIdleTime: number = 2000; // 2 seconds

  constructor(target: BasePlayer, duration: number | null = null) {
    super(target, duration);
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;
    this.lastMovementTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    logger.info("STATUS", `${this.target.name} is excited! Must keep moving!`, {
      maxIdleTime: this.maxIdleTime,
    });
  }

  onTick(gameTime: number, deltaTime: number): void {
    if (this.lastMovementTime === null) return;

    const idleTime = gameTime - this.lastMovementTime;

    if (idleTime > this.maxIdleTime) {
      logger.warn(
        "STATUS",
        `${this.target.name} stopped moving while excited!`,
        {
          idleTime,
          maxAllowed: this.maxIdleTime,
        }
      );

      this.target.die(gameTime);
    }
  }

  onMovement(gameTime: number, movementIntensity: number): void {
    if (movementIntensity > this.movementThreshold) {
      this.lastMovementTime = gameTime;

      logger.debug("STATUS", `${this.target.name} moved (excited)`, {
        intensity: movementIntensity,
        resetTimer: true,
      });
    }
  }

  onRemove(gameTime: number): void {
    this.isActive = false;
    logger.info("STATUS", `${this.target.name} is no longer excited`);
  }
}

// ============================================================================
// src/models/statusEffects/Shielded.ts
// ============================================================================

import { StatusEffect } from "../StatusEffect";
import type { BasePlayer } from "../BasePlayer";
import { Logger } from "../../utils/Logger";

const logger = Logger.getInstance();

export class Shielded extends StatusEffect {
  static override priority: number = 80; // VERY_HIGH
  static override displayName: string = "Shielded";
  static override description: string = "Absorbs damage up to shield capacity";

  private readonly maxShield: number;
  private currentShield: number;

  constructor(
    target: BasePlayer,
    duration: number | null,
    shieldAmount: number = 50
  ) {
    super(target, duration);
    this.maxShield = shieldAmount;
    this.currentShield = shieldAmount;
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    logger.info("STATUS", `${this.target.name} gained shield`, {
      amount: this.currentShield,
    });
  }

  modifyIncomingDamage(damage: number): number {
    if (this.currentShield <= 0) {
      return damage; // Shield broken
    }

    if (damage <= this.currentShield) {
      // Shield absorbs all damage
      this.currentShield -= damage;
      logger.debug("STATUS", `Shield absorbed ${damage} damage`, {
        shieldRemaining: this.currentShield,
      });
      return 0;
    } else {
      // Shield absorbs partial damage
      const overflow = damage - this.currentShield;
      logger.debug(
        "STATUS",
        `Shield absorbed ${this.currentShield}, ${overflow} overflow`,
        {
          shieldBroken: true,
        }
      );
      this.currentShield = 0;
      return overflow;
    }
  }

  onRemove(gameTime: number): void {
    this.isActive = false;
    logger.info("STATUS", `${this.target.name} lost shield`);
  }

  // Getter for UI display
  get shieldPercentage(): number {
    return (this.currentShield / this.maxShield) * 100;
  }
}

// ============================================================================
// src/models/statusEffects/Regenerating.ts
// ============================================================================

import { StatusEffect } from "../StatusEffect";
import type { BasePlayer } from "../BasePlayer";
import { Logger } from "../../utils/Logger";

const logger = Logger.getInstance();

export class Regenerating extends StatusEffect {
  static override priority: number = 20; // MEDIUM
  static override displayName: string = "Regenerating";
  static override description: string = "Gradually heals accumulated damage";

  private readonly healPerSecond: number;
  private readonly healPerTick: number;
  private totalHealed: number = 0;

  constructor(
    target: BasePlayer,
    duration: number | null,
    healPerSecond: number = 10
  ) {
    super(target, duration);
    this.healPerSecond = healPerSecond;
    this.healPerTick = healPerSecond / 10; // 100ms ticks = 10/second
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    logger.info("STATUS", `${this.target.name} started regenerating`, {
      healPerSecond: this.healPerSecond,
    });
  }

  onTick(gameTime: number, deltaTime: number): void {
    if (!this.target.isAlive) return;

    // Only heal if using accumulated damage system
    if (this.target.accumulatedDamage > 0) {
      const healAmount = this.healPerTick;
      this.target.accumulatedDamage = Math.max(
        0,
        this.target.accumulatedDamage - healAmount
      );
      this.totalHealed += healAmount;

      logger.debug("STATUS", `${this.target.name} regenerated`, {
        healed: healAmount,
        totalHealed: this.totalHealed,
        damageRemaining: this.target.accumulatedDamage,
      });
    }
  }

  onRemove(gameTime: number): void {
    this.isActive = false;
    logger.info("STATUS", `${this.target.name} stopped regenerating`, {
      totalHealed: this.totalHealed,
    });
  }
}

// ============================================================================
// src/models/statusEffects/Stunned.ts
// ============================================================================

import { StatusEffect } from "../StatusEffect";
import type { BasePlayer } from "../BasePlayer";
import { Logger } from "../../utils/Logger";

const logger = Logger.getInstance();

export class Stunned extends StatusEffect {
  static override priority: number = 90; // VERY_HIGH
  static override displayName: string = "Stunned";
  static override description: string =
    "Cannot move without taking massive damage";

  private readonly stunDamageMultiplier: number = 5.0;

  constructor(target: BasePlayer, duration: number) {
    super(target, duration);
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;
    this.endTime = gameTime + (this.duration || 0);

    logger.info("STATUS", `${this.target.name} is stunned!`, {
      duration: this.duration,
    });
  }

  modifyIncomingDamage(damage: number): number {
    if (damage > 0) {
      const modified = damage * this.stunDamageMultiplier;
      logger.warn("STATUS", `${this.target.name} moved while stunned!`, {
        originalDamage: damage,
        modifiedDamage: modified,
        multiplier: this.stunDamageMultiplier,
      });
      return modified;
    }
    return damage;
  }

  onRemove(gameTime: number): void {
    this.isActive = false;
    logger.info("STATUS", `${this.target.name} recovered from stun`);
  }
}

// ============================================================================
// src/models/statusEffects/Blessed.ts
// ============================================================================

import { StatusEffect } from "../StatusEffect";
import type { BasePlayer } from "../BasePlayer";
import { Logger } from "../../utils/Logger";

const logger = Logger.getInstance();

export class Blessed extends StatusEffect {
  static override priority: number = 95; // VERY_HIGH
  static override displayName: string = "Blessed";
  static override description: string = "Prevents one death, then expires";

  private hasPreventedDeath: boolean = false;

  constructor(target: BasePlayer, duration: number | null = null) {
    super(target, duration);
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    logger.info("STATUS", `${this.target.name} has been blessed`, {
      duration: this.duration ?? "infinite",
    });
  }

  onPreventDeath(gameTime: number): boolean {
    if (!this.hasPreventedDeath) {
      this.hasPreventedDeath = true;

      logger.warn("STATUS", `Blessing saved ${this.target.name} from death!`);

      // Remove this effect immediately (consumed)
      this.target.removeStatusEffect(this.id, gameTime);

      return true; // Death prevented
    }
    return false; // Already used
  }

  onRemove(gameTime: number): void {
    this.isActive = false;
    logger.info("STATUS", `${this.target.name}'s blessing faded`, {
      wasUsed: this.hasPreventedDeath,
    });
  }
}

// ============================================================================
// src/models/statusEffects/Strengthened.ts
// ============================================================================

import { StatusEffect } from "../StatusEffect";
import type { BasePlayer } from "../BasePlayer";
import { Logger } from "../../utils/Logger";

const logger = Logger.getInstance();

export class Strengthened extends StatusEffect {
  static override priority: number = 60; // HIGH
  static override displayName: string = "Strengthened";
  static override description: string = "Increased damage resistance";

  private readonly multiplier: number;
  private originalToughness: number | null = null;

  constructor(
    target: BasePlayer,
    duration: number | null,
    multiplier: number = 1.5
  ) {
    super(target, duration);
    this.multiplier = multiplier; // 1.5 = 50% more toughness
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    this.originalToughness = this.target.toughness;
    this.target.toughness *= this.multiplier;

    logger.info("STATUS", `${this.target.name} strengthened`, {
      originalToughness: this.originalToughness,
      newToughness: this.target.toughness,
      multiplier: this.multiplier,
    });
  }

  onRemove(gameTime: number): void {
    this.isActive = false;

    if (this.originalToughness !== null) {
      this.target.toughness = this.originalToughness;
    }

    logger.info("STATUS", `${this.target.name} no longer strengthened`);
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// src/types/status.types.ts

export interface StatusEffectConfig {
  duration?: number | null;
  [key: string]: any; // Additional effect-specific params
}

export type StatusEffectConstructor = new (
  target: BasePlayer,
  duration: number | null,
  ...args: any[]
) => StatusEffect;

// ============================================================================
// USAGE EXAMPLES WITH TYPES
// ============================================================================

// In a role class:
import { Regenerating } from "../statusEffects/Regenerating";
import type { BasePlayer } from "../BasePlayer";

class Medic extends BasePlayer {
  onInit(gameTime: number): void {
    super.onInit(gameTime);

    // Apply regeneration to self - TypeScript ensures correct params
    this.applyStatusEffect(Regenerating, gameTime, 10000, 15); // 10s, 15hp/s
  }

  healAlly(ally: BasePlayer, gameTime: number): void {
    // Apply regeneration to ally
    ally.applyStatusEffect(Regenerating, gameTime, 5000, 20); // 5s, 20hp/s
  }
}

// Type guard for checking specific effects
export function hasInvulnerability(player: BasePlayer): boolean {
  return player.hasStatusEffect(Invulnerability);
}

// Get typed effect from player
export function getShieldPercentage(player: BasePlayer): number | null {
  const shield = player.getStatusEffectByType("Shielded") as Shielded | null;
  return shield?.shieldPercentage ?? null;
}
