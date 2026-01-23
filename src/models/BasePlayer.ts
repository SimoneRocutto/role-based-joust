// ============================================================================
// src/models/BasePlayer.ts - Foundation Player Class
// ============================================================================

import type {
  PlayerData,
  MovementData,
  MovementConfig,
} from "@/types/player.types";
import type { StatusEffect } from "./StatusEffect";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { gameConfig } from "@/config/gameConfig";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * BasePlayer - Abstract base class for all players and roles
 *
 * This class handles:
 * - Movement processing and intensity calculation
 * - Damage calculation with status effect modifiers
 * - Status effect management (application, removal, priority sorting)
 * - Lifecycle hooks (onInit, onTick, beforeDeath, die, onDeath)
 * - Points tracking
 */
export abstract class BasePlayer {
  // ========== IDENTITY ==========
  readonly id: string;
  readonly name: string;
  socketId: string;

  // ========== GAME STATE ==========
  isAlive: boolean = true;
  points: number = 0;
  totalPoints: number = 0;
  toughness: number = 1.0;

  // ========== MOVEMENT ==========
  lastMovementData: MovementData | null = null;
  movementHistory: MovementData[] = [];
  readonly historySize: number;
  movementConfig: MovementConfig;

  // ========== DAMAGE ==========
  readonly deathThreshold: number;
  accumulatedDamage: number = 0;
  isInvulnerable: boolean = false;

  // ========== STATUS EFFECTS ==========
  statusEffects: Map<string, StatusEffect> = new Map();

  // ========== PRIORITY ==========
  readonly priority: number;
  static priority: number = 0;

  constructor(data: PlayerData) {
    this.id = data.id;
    this.name = data.name;
    this.socketId = data.socketId;
    this.historySize = gameConfig.movement.historySize;
    this.movementConfig = { ...gameConfig.movement };
    this.deathThreshold = gameConfig.damage.baseThreshold;
    this.priority = (this.constructor as typeof BasePlayer).priority;
  }

  // ========================================================================
  // MOVEMENT PROCESSING
  // ========================================================================

  /**
   * Process incoming movement data from controller
   * 1. Store movement in history
   * 2. Calculate intensity (0-1)
   * 3. Notify status effects
   * 4. Check if movement causes damage
   */
  updateMovement(movementData: MovementData, gameTime: number): void {
    this.lastMovementData = movementData;

    // Update history for smoothing
    this.movementHistory.push({ ...movementData, gameTime });
    if (this.movementHistory.length > this.historySize) {
      this.movementHistory.shift();
    }

    // Calculate intensity
    const intensity = this.calculateIntensity(movementData);
    movementData.intensity = intensity;

    // Notify status effects (priority order)
    const sortedEffects = this.getSortedStatusEffects();
    for (const effect of sortedEffects) {
      if (typeof effect.onMovement === "function") {
        effect.onMovement(gameTime, intensity);
      }
    }

    // Check if movement causes damage
    this.checkMovementDamage(intensity, gameTime);
  }

  /**
   * Calculate movement intensity from accelerometer data
   * Returns value between 0 and 1
   */
  protected calculateIntensity(movementData: MovementData): number {
    if (this.movementConfig.smoothingEnabled) {
      return this.calculateSmoothedIntensity();
    }
    return this.calculateInstantIntensity(movementData);
  }

  /**
   * Calculate instant intensity from current movement data
   */
  private calculateInstantIntensity(data: MovementData): number {
    const { x, y, z } = data;

    // Euclidean magnitude: sqrt(x² + y² + z²)
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // Normalize to 0-1 range
    // Max possible magnitude is sqrt(10² + 10² + 10²) ≈ 17.32
    const normalized = magnitude / 17.32;

    return Math.min(normalized, 1.0);
  }

  /**
   * Calculate smoothed intensity from movement history
   * Reduces spikes by averaging recent movements
   */
  private calculateSmoothedIntensity(): number {
    if (this.movementHistory.length === 0) return 0;

    const sum = this.movementHistory.reduce((acc, data) => {
      const { x, y, z } = data;
      return acc + Math.sqrt(x * x + y * y + z * z);
    }, 0);

    const avgMagnitude = sum / this.movementHistory.length;
    return Math.min(avgMagnitude / 17.32, 1.0);
  }

  /**
   * Check if movement intensity exceeds threshold and apply damage
   * Can be overridden by roles for custom behavior
   */
  protected checkMovementDamage(intensity: number, gameTime: number): void {
    const threshold = this.movementConfig.dangerThreshold;

    if (intensity > threshold) {
      const excess = intensity - threshold;
      const baseDamage = excess * this.movementConfig.damageMultiplier;

      logger.debug("MOVEMENT", `${this.name} excessive movement`, {
        intensity,
        threshold,
        excess,
        baseDamage,
      });

      this.takeDamage(baseDamage, gameTime);
    }
  }

  // ========================================================================
  // DAMAGE SYSTEM
  // ========================================================================

  /**
   * Apply damage to player with status effect modifiers
   * 1. Status effects modify damage (priority order)
   * 2. Apply toughness
   * 3. Check if damage is lethal
   */
  takeDamage(baseDamage: number, gameTime: number): void {
    if (!this.isAlive) return;

    let finalDamage = baseDamage;

    logger.debug("DAMAGE", `${this.name} taking damage`, {
      baseDamage,
      toughness: this.toughness,
      isInvulnerable: this.isInvulnerable,
    });

    // Apply status effect damage modifiers (priority order)
    const sorted = this.getSortedStatusEffects();
    for (const effect of sorted) {
      if (typeof effect.modifyIncomingDamage === "function") {
        finalDamage = effect.modifyIncomingDamage(finalDamage);
        if (finalDamage === 0) break; // Early exit if damage nullified
      }
    }

    // Apply toughness (higher toughness = less damage)
    const actualDamage = finalDamage / this.toughness;

    logger.logPlayerAction(this, "TOOK_DAMAGE", {
      baseDamage,
      finalDamage,
      actualDamage,
      toughness: this.toughness,
    });

    // Check if damage is lethal
    if (actualDamage >= this.deathThreshold && !this.isInvulnerable) {
      this.beforeDeath(gameTime);
    }
  }

  // ========================================================================
  // STATUS EFFECT MANAGEMENT
  // ========================================================================

  /**
   * Apply a status effect to this player
   * If effect already exists, refresh it instead
   */
  applyStatusEffect<T extends StatusEffect>(
    EffectClass: new (
      target: BasePlayer,
      duration: number | null,
      ...args: any[]
    ) => T,
    gameTime: number,
    duration: number | null,
    ...args: any[]
  ): T {
    const type = EffectClass.name;
    const existing = this.getStatusEffectByType(type);

    if (existing) {
      // Refresh existing effect
      existing.onRefresh(gameTime, duration ?? undefined);
      return existing as T;
    }

    // Create and apply new effect
    const effect = new EffectClass(this, duration, ...args);
    effect.onApply(gameTime);
    this.statusEffects.set(effect.id, effect);

    logger.logStatusEffect(this, effect, "APPLIED", { duration });
    return effect;
  }

  /**
   * Remove a status effect by ID
   */
  removeStatusEffect(id: string, gameTime: number): void {
    const effect = this.statusEffects.get(id);
    if (effect) {
      effect.onRemove(gameTime);
      this.statusEffects.delete(id);
      logger.logStatusEffect(this, effect, "REMOVED");
    }
  }

  /**
   * Get all status effects sorted by priority (high to low)
   */
  getSortedStatusEffects(): StatusEffect[] {
    return Array.from(this.statusEffects.values()).sort(
      (a, b) => b.priority - a.priority
    );
  }

  /**
   * Check if player has a specific type of status effect
   */
  hasStatusEffect(EffectClass: new (...args: any[]) => StatusEffect): boolean {
    return this.getStatusEffectByType(EffectClass.name) !== null;
  }

  /**
   * Get a status effect by its class name
   */
  getStatusEffectByType(type: string): StatusEffect | null {
    for (const effect of this.statusEffects.values()) {
      if (effect.constructor.name === type) return effect;
    }
    return null;
  }

  /**
   * Remove all status effects
   */
  clearStatusEffects(gameTime: number): void {
    this.statusEffects.forEach((effect, id) => {
      this.removeStatusEffect(id, gameTime);
    });
  }

  // ========================================================================
  // LIFECYCLE HOOKS
  // ========================================================================

  /**
   * Called once when round starts
   * Override in role classes for role-specific initialization
   */
  onInit(gameTime: number): void {
    logger.logPlayerAction(this, "INIT", { role: this.constructor.name });
  }

  /**
   * Called every game tick (100ms default)
   * Updates status effects and role-specific logic
   */
  onTick(gameTime: number, deltaTime: number): void {
    const sorted = this.getSortedStatusEffects();

    for (const effect of sorted) {
      if (!this.isAlive) break;

      effect.onTick(gameTime, deltaTime);

      // Remove expired effects
      if (effect.shouldExpire(gameTime)) {
        this.removeStatusEffect(effect.id, gameTime);
      }
    }
  }

  /**
   * Called before player dies
   * Status effects can prevent death here
   */
  beforeDeath(gameTime: number): void {
    const sorted = this.getSortedStatusEffects();

    // Check if any effect prevents death (priority order)
    for (const effect of sorted) {
      if (typeof effect.onPreventDeath === "function") {
        if (effect.onPreventDeath(gameTime)) {
          logger.info(
            "DEATH",
            `${this.name} death prevented by ${effect.constructor.name}`
          );
          return; // Death prevented
        }
      }
    }

    // No effect prevented death, proceed
    this.die(gameTime);
  }

  /**
   * Kill the player
   * Calls cleanup hooks and emits death event
   */
  die(gameTime: number): void {
    if (!this.isAlive) return;

    this.isAlive = false;

    logger.logPlayerAction(this, "DIED", {
      points: this.points,
      activeEffects: Array.from(this.statusEffects.keys()),
    });

    // Notify status effects
    const sorted = this.getSortedStatusEffects();
    for (const effect of sorted) {
      if (typeof effect.onPlayerDeath === "function") {
        effect.onPlayerDeath(gameTime);
      }
    }

    // Call role's onDeath hook
    this.onDeath(gameTime);

    // Emit death event for other players/roles
    gameEvents.emit("player:death", { victim: this, gameTime });
  }

  /**
   * Override in role classes for death-related cleanup
   */
  onDeath(gameTime: number): void {
    // Override in subclasses
  }

  /**
   * Called when OTHER players die
   * Override in role classes to react to deaths
   */
  onPlayerDeath(victim: BasePlayer, gameTime: number): void {
    // Override in subclasses
  }

  // ========================================================================
  // POINTS SYSTEM
  // ========================================================================

  /**
   * Add points to player's score
   */
  addPoints(amount: number, reason: string = ""): void {
    this.points += amount;
    logger.logPlayerAction(this, "POINTS", {
      amount,
      total: this.points,
      reason,
    });
  }
}
