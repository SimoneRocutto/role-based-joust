import type {
  PlayerData,
  MovementData,
  MovementConfig,
} from "@/types/player.types";
import type { BotBehavior, BotAction } from "@/types/bot.types";
import type { StatusEffect } from "./StatusEffect";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { gameConfig } from "@/config/gameConfig";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/** Max accelerometer magnitude: sqrt(10² + 10² + 10²). Derived from hardware limits. */
const MAX_ACCEL_MAGNITUDE = Math.sqrt(10 * 10 + 10 * 10 + 10 * 10);

/**
 * BasePlayer - Abstract base class for all players and roles
 *
 * This class handles:
 * - Movement processing and intensity calculation
 * - Damage calculation with status effect modifiers
 * - Status effect management (application, removal, priority sorting)
 * - Lifecycle hooks (onInit, onTick, beforeDeath, die, onDeath)
 * - Points tracking
 * - Bot behavior (when isBot = true)
 */
export class BasePlayer {
  // ========== IDENTITY ==========
  readonly id: string;
  readonly name: string;
  socketId: string;

  // ========== GAME STATE ==========
  isAlive: boolean = true;
  points: number = 0;
  totalPoints: number = 0;
  toughness: number = 1.0;

  // ========== CONNECTION STATE ==========
  disconnectedAt: number | null = null; // Timestamp when player disconnected, null if connected
  static readonly DISCONNECTION_GRACE_PERIOD = gameConfig.connection.disconnectionGracePeriodMs;

  // ========== MOVEMENT ==========
  lastMovementData: MovementData | null = null;
  movementHistory: MovementData[] = [];
  readonly historySize: number;
  movementConfig: MovementConfig;

  // ========== DAMAGE ==========
  readonly deathThreshold: number;
  accumulatedDamage: number = 0;
  isInvulnerable: boolean = false;

  // ========== DAMAGE EVENT DEBOUNCE ==========
  // Trailing-edge debounce: fire onDamageEvent once after 3 quiet ticks post-burst.
  private _damageEventAccumulator: number = 0;
  private _damageEventQuietTicks: number = 0;
  private static readonly DAMAGE_EVENT_QUIET_TICKS = 3;

  // ========== STATUS EFFECTS ==========
  statusEffects: Map<string, StatusEffect> = new Map();

  // ========== PRIORITY ==========
  readonly priority: number;
  static priority: number = 0;

  // ========== BOT BEHAVIOR ==========
  readonly isBot: boolean;
  readonly behavior: BotBehavior;
  private autoPlayEnabled: boolean = false;

  // ========== SCORING OVERRIDES ==========
  placementBonusOverrides: number[] | null = null; // Per-placement point overrides (null = use mode defaults)
  victoryGroupId: string | null = null; // Players with same non-null ID can win together

  // ========== TARGET INFO ==========
  targetPlayerId: string | null = null;
  targetPlayerName: string | null = null;

  // ========== ABILITY CHARGES ==========
  maxCharges: number = 0;
  currentCharges: number = 0;
  cooldownDuration: number = 0; // ms to regain 1 charge (0 = no regen)
  cooldownSpeedMultiplier: number = 1.0;
  private cooldownRemaining: number = 0;

  constructor(data: PlayerData) {
    this.id = data.id;
    this.name = data.name;
    this.socketId = data.socketId;
    this.historySize = gameConfig.movement.historySize;
    this.movementConfig = { ...gameConfig.movement };
    this.deathThreshold = gameConfig.damage.baseThreshold;
    this.priority = (this.constructor as typeof BasePlayer).priority;

    // Bot properties
    this.isBot = data.isBot || false;
    this.behavior = (data.behavior as BotBehavior) || "random";
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
    const normalized = magnitude / MAX_ACCEL_MAGNITUDE;

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
    return Math.min(avgMagnitude / MAX_ACCEL_MAGNITUDE, 1.0);
  }

  /**
   * Check if movement intensity exceeds threshold and apply damage
   * Can be overridden by roles for custom behavior
   */
  protected checkMovementDamage(intensity: number, gameTime: number): void {
    // Read threshold from live global config so game events (e.g. SpeedShift)
    // can change it mid-round
    const threshold = gameConfig.movement.dangerThreshold;
    if (intensity > threshold) {
      if (gameConfig.movement.oneshotMode) {
        logger.debug("MOVEMENT", `${this.name} oneshot kill triggered`, {
          intensity,
          threshold,
        });
        this.takeDamage(this.deathThreshold, gameTime);
        return;
      }

      const excess = intensity - threshold;
      const baseDamage = excess * gameConfig.movement.damageMultiplier;

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

    // Accumulate damage
    this.accumulatedDamage += actualDamage;

    // Feed trailing-edge debounce accumulator
    if (actualDamage > 0) {
      this._damageEventAccumulator += actualDamage;
      this._damageEventQuietTicks = 0;
    }

    // Check if damage is lethal
    if (this.accumulatedDamage >= this.deathThreshold && !this.isInvulnerable) {
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
  // CONNECTION STATE
  // ========================================================================

  /**
   * Mark player as disconnected
   */
  setDisconnected(gameTime: number): void {
    if (this.disconnectedAt === null) {
      this.disconnectedAt = gameTime;
      logger.info("PLAYER", `${this.name} disconnected`, {
        playerId: this.id,
        gameTime,
      });
    }
  }

  /**
   * Mark player as reconnected
   */
  setReconnected(newSocketId: string): void {
    if (this.disconnectedAt !== null) {
      logger.info("PLAYER", `${this.name} reconnected`, {
        playerId: this.id,
        disconnectedFor: Date.now() - this.disconnectedAt,
      });
      this.disconnectedAt = null;
    }
    this.socketId = newSocketId;
  }

  /**
   * Check if player is currently disconnected
   */
  isDisconnected(): boolean {
    return this.disconnectedAt !== null;
  }

  /**
   * Check if player has been disconnected longer than the grace period
   */
  isDisconnectedBeyondGrace(currentGameTime: number): boolean {
    if (this.disconnectedAt === null) return false;
    return (
      currentGameTime - this.disconnectedAt >=
      BasePlayer.DISCONNECTION_GRACE_PERIOD
    );
  }

  /**
   * Get time remaining in grace period (or 0 if grace period expired)
   */
  getGraceTimeRemaining(currentGameTime: number): number {
    if (this.disconnectedAt === null)
      return BasePlayer.DISCONNECTION_GRACE_PERIOD;
    const elapsed = currentGameTime - this.disconnectedAt;
    return Math.max(0, BasePlayer.DISCONNECTION_GRACE_PERIOD - elapsed);
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
    this.initializeCharges();
  }

  /**
   * Called after all players are created but before role assignments are emitted.
   * Used by target-based roles (Executioner, Bodyguard) to pick targets.
   */
  onPreRoundSetup(allPlayers: BasePlayer[]): void {
    // Override in subclasses
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

    // Process ability cooldown
    this.processCooldown(gameTime, deltaTime);

    // Process trailing-edge damage event
    if (this._damageEventAccumulator > 0 && this.isAlive) {
      this._damageEventQuietTicks++;
      if (this._damageEventQuietTicks >= BasePlayer.DAMAGE_EVENT_QUIET_TICKS) {
        const totalDamage = this._damageEventAccumulator;
        this._damageEventAccumulator = 0;
        this._damageEventQuietTicks = 0;
        this.onDamageEvent(totalDamage, gameTime);
        gameEvents.emitPlayerDamageEvent({ player: this, totalDamage, gameTime });
      }
    }

    // Execute bot behavior if this is a bot
    if (this.isBot && this.autoPlayEnabled && this.isAlive) {
      this.executeBotBehavior(gameTime);
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
    gameEvents.emitPlayerDeath({ victim: this, gameTime });
  }

  /**
   * Override in role classes for death-related cleanup
   */
  onDeath(gameTime: number): void {
    // Reset these in case of future respawn
    this.lastMovementData = null;
    this.accumulatedDamage = 0;
    this.movementHistory = [];
    this._damageEventAccumulator = 0;
    this._damageEventQuietTicks = 0;
  }

  /**
   * Called once after a burst of damage ends (3 consecutive quiet ticks).
   * Override in role classes to react to damage events.
   * @param totalDamage - accumulated actual damage from the entire burst
   */
  onDamageEvent(totalDamage: number, gameTime: number): void {
    // Override in role subclasses
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

  // ========================================================================
  // ABILITY SYSTEM
  // ========================================================================

  /**
   * Initialize or reset charges to max
   * Called in onInit() at round start
   */
  initializeCharges(): void {
    this.currentCharges = this.maxCharges;
    this.cooldownRemaining = 0;

    if (this.maxCharges > 0) {
      logger.debug("ABILITY", `${this.name} charges initialized`, {
        current: this.currentCharges,
        max: this.maxCharges,
      });
    }
  }

  /**
   * Attempt to use the player's ability
   * Returns result with success status and reason
   */
  useAbility(gameTime: number): {
    success: boolean;
    reason?: string;
    charges: { current: number; max: number; cooldownRemaining: number };
  } {
    const chargeInfo = this.getChargeInfo();

    // Check if player has an ability
    if (this.maxCharges <= 0) {
      logger.debug("ABILITY", `${this.name} has no ability`, {
        current: this.currentCharges,
        max: this.maxCharges,
      });
      return {
        success: false,
        reason: "no_ability",
        charges: chargeInfo,
      };
    }

    // Check if player has charges
    if (this.currentCharges <= 0) {
      logger.debug("ABILITY", `${this.name} ability failed - no charges`, {
        current: this.currentCharges,
        max: this.maxCharges,
      });
      return {
        success: false,
        reason: "no_charges",
        charges: chargeInfo,
      };
    }

    // Consume a charge
    this.currentCharges--;

    // Start cooldown if applicable
    if (this.cooldownDuration > 0 && this.currentCharges < this.maxCharges) {
      this.cooldownRemaining = this.cooldownDuration;
    }

    logger.logPlayerAction(this, "ABILITY_USED", {
      chargesRemaining: this.currentCharges,
      maxCharges: this.maxCharges,
    });

    // Call the role's ability implementation
    const abilityResult = this.onAbilityUse(gameTime);

    if (!abilityResult) {
      // Refund the charge if ability failed
      this.currentCharges++;
      this.cooldownRemaining = 0;
      return {
        success: false,
        reason: "ability_failed",
        charges: this.getChargeInfo(),
      };
    }

    return {
      success: true,
      charges: this.getChargeInfo(),
    };
  }

  /**
   * Hook for roles to implement their ability
   * Override in role classes
   * Return true if ability was used successfully, false otherwise
   */
  onAbilityUse(gameTime: number): boolean {
    // Default: no ability
    return false;
  }

  /**
   * Process cooldown each tick
   * Regenerates charges when cooldownDuration > 0
   * Uses tickRate (100ms) instead of deltaTime for consistent behavior in tests
   */
  processCooldown(gameTime: number, deltaTime: number): void {
    // Skip if no cooldown system or already at max charges
    if (this.cooldownDuration <= 0 || this.currentCharges >= this.maxCharges) {
      return;
    }

    // Skip if not on cooldown
    if (this.cooldownRemaining <= 0) {
      return;
    }

    // Reduce cooldown using tick rate for consistent behavior
    // This ensures fast-forward works correctly in tests
    const effectiveDelta = gameConfig.tick.rate * this.cooldownSpeedMultiplier;
    this.cooldownRemaining -= effectiveDelta;

    // Check if cooldown completed
    if (this.cooldownRemaining <= 0) {
      this.currentCharges++;
      this.cooldownRemaining = 0;

      logger.debug("ABILITY", `${this.name} charge regenerated`, {
        current: this.currentCharges,
        max: this.maxCharges,
      });

      // If still not at max, start new cooldown
      if (this.currentCharges < this.maxCharges) {
        this.cooldownRemaining = this.cooldownDuration;
      }
    }
  }

  /**
   * Get current charge info for client
   */
  getChargeInfo(): { current: number; max: number; cooldownRemaining: number } {
    return {
      current: this.currentCharges,
      max: this.maxCharges,
      cooldownRemaining: Math.max(0, this.cooldownRemaining),
    };
  }

  // ========================================================================
  // BOT BEHAVIOR (Only active when isBot = true)
  // ========================================================================

  /**
   * Enable autonomous bot behavior
   */
  enableAutoPlay(): void {
    if (!this.isBot) {
      logger.warn("PLAYER", `Cannot enable autoplay for non-bot ${this.name}`);
      return;
    }
    this.autoPlayEnabled = true;
  }

  /**
   * Disable autonomous bot behavior
   */
  disableAutoPlay(): void {
    this.autoPlayEnabled = false;
  }

  /**
   * Execute bot behavior pattern
   */
  private executeBotBehavior(gameTime: number): void {
    let intensity: number;

    switch (this.behavior) {
      case "aggressive":
        intensity = this.aggressiveBehavior();
        break;
      case "defensive":
        intensity = this.defensiveBehavior();
        break;
      case "idle":
        intensity = this.idleBehavior();
        break;
      case "chaotic":
        intensity = this.chaoticBehavior();
        break;
      case "random":
      default:
        intensity = this.randomBehavior();
        break;
    }

    this.simulateMovement(intensity, gameTime);
  }

  /**
   * Aggressive behavior: High movement intensity
   */
  private aggressiveBehavior(): number {
    return 0.8 + Math.random() * 0.2; // 0.8-1.0
  }

  /**
   * Defensive behavior: Low, careful movement
   */
  private defensiveBehavior(): number {
    return 0.1 + Math.random() * 0.3; // 0.1-0.4
  }

  /**
   * Idle behavior: Minimal to no movement
   */
  private idleBehavior(): number {
    return Math.random() * 0.05; // 0-0.05
  }

  /**
   * Chaotic behavior: Random bursts of movement
   */
  private chaoticBehavior(): number {
    const shouldMove = Math.random() > 0.5;
    return shouldMove ? Math.random() : 0;
  }

  /**
   * Random behavior: Unpredictable
   */
  private randomBehavior(): number {
    return Math.random(); // 0-1
  }

  /**
   * Simulate movement data from intensity
   */
  private simulateMovement(intensity: number, gameTime: number): void {
    // Generate random direction
    const theta = Math.random() * 2 * Math.PI; // Random angle
    const phi = Math.random() * Math.PI; // Random angle

    // Convert spherical coordinates to Cartesian
    // Scale by intensity and max magnitude
    const magnitude = intensity * MAX_ACCEL_MAGNITUDE;

    const movementData: MovementData = {
      x: magnitude * Math.sin(phi) * Math.cos(theta),
      y: magnitude * Math.sin(phi) * Math.sin(theta),
      z: magnitude * Math.cos(phi),
      intensity,
      timestamp: gameTime,
    };

    this.updateMovement(movementData, gameTime);
  }

  /**
   * Force bot to die (for testing)
   */
  forceDeath(gameTime: number): void {
    if (!this.isBot) {
      logger.warn("PLAYER", `Cannot force death for non-bot ${this.name}`);
      return;
    }
    console.log(`[BOT] Forcing ${this.name} to die`);
    this.die(gameTime);
  }

  /**
   * Manually trigger specific bot actions
   */
  triggerAction(action: BotAction, gameTime: number, ...args: any[]): void {
    if (!this.isBot) {
      logger.warn("PLAYER", `Cannot trigger action for non-bot ${this.name}`);
      return;
    }

    console.log(`[BOT] ${this.name} triggered action: ${action}`);

    switch (action) {
      case "shake":
        this.simulateMovement(0.9, gameTime);
        break;
      case "still":
        this.simulateMovement(0, gameTime);
        break;
      case "die":
        this.forceDeath(gameTime);
        break;
      case "damage":
        const damageAmount = (args[0] as number) || 100;
        this.takeDamage(damageAmount, gameTime);
        break;
      default:
        console.warn(`[BOT] Unknown action: ${action}`);
    }
  }

  /**
   * Get bot state for debugging
   */
  getBotState(): {
    isBot: boolean;
    behavior: BotBehavior;
    autoPlayEnabled: boolean;
    isAlive: boolean;
    lastIntensity: number;
  } {
    return {
      isBot: this.isBot,
      behavior: this.behavior,
      autoPlayEnabled: this.autoPlayEnabled,
      isAlive: this.isAlive,
      lastIntensity: this.lastMovementData?.intensity || 0,
    };
  }
}
