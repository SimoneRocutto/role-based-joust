import type { BasePlayer } from "./BasePlayer";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * StatusEffect - Abstract base class for all status effects
 *
 * Status effects are temporary or permanent modifications to a player.
 * They can:
 * - Modify incoming damage
 * - Prevent death
 * - React to movement
 * - Execute logic every tick
 * - React to player death
 *
 * Status effects execute in priority order (highest first).
 */
export abstract class StatusEffect {
  readonly id: string;
  readonly target: BasePlayer;
  duration: number | null;
  startTime: number | null = null;
  endTime: number | null = null;
  isActive: boolean = false;
  readonly priority: number;

  // Static properties that subclasses override
  static priority: number = 0;
  static displayName: string = "Base Status";
  static description: string = "Base status effect";

  constructor(target: BasePlayer, duration: number | null = null) {
    this.id = `${this.constructor.name}_${Date.now()}_${Math.random()}`;
    this.target = target;
    this.duration = duration;
    this.priority = (this.constructor as typeof StatusEffect).priority;
  }

  // ========================================================================
  // ABSTRACT METHODS - Must implement in subclasses
  // ========================================================================

  /**
   * Called when effect is first applied to player
   * Use this to set up the effect (modify stats, set flags, etc.)
   */
  abstract onApply(gameTime: number): void;

  /**
   * Called when effect is removed from player
   * Use this to clean up (restore stats, remove flags, etc.)
   */
  abstract onRemove(gameTime: number): void;

  // ========================================================================
  // OPTIONAL HOOKS - Override in subclasses as needed
  // ========================================================================

  /**
   * Called every game tick (100ms) while effect is active
   * Use for time-based effects (e.g., Excited checking idle time)
   */
  onTick(gameTime: number, deltaTime: number): void {
    // Override in subclasses if needed
  }

  /**
   * Called when player moves
   * Use for effects that care about movement (e.g., Excited tracking activity)
   */
  onMovement(gameTime: number, movementIntensity: number): void {
    // Override in subclasses if needed
  }

  /**
   * Modify incoming damage
   * Called in priority order before damage is applied
   * Return modified damage value
   *
   * Examples:
   * - Invulnerability: return 0 (block all damage)
   * - Shield: return damage - shieldAmount (absorb some damage)
   * - Weakness: return damage * 2 (amplify damage)
   */
  modifyIncomingDamage(damage: number): number {
    return damage; // Default: no modification
  }

  /**
   * Attempt to prevent death
   * Called in priority order when player would die
   * Return true to prevent death, false to allow
   *
   * Note: If death is prevented, effect should handle what happens next
   * (e.g., Angel applies invulnerability)
   */
  onPreventDeath(gameTime: number): boolean {
    return false; // Default: don't prevent death
  }

  /**
   * Called when the player with this effect dies
   * Use for cleanup or final actions
   */
  onPlayerDeath(gameTime: number): void {
    // Override in subclasses if needed
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Check if effect should expire based on duration
   */
  shouldExpire(gameTime: number): boolean {
    return (
      this.duration !== null &&
      this.endTime !== null &&
      gameTime >= this.endTime
    );
  }

  /**
   * Refresh effect duration (called when same effect applied again)
   */
  onRefresh(gameTime: number, newDuration?: number): void {
    if (newDuration !== undefined) {
      this.duration = newDuration;
      this.endTime = gameTime + newDuration;

      logger.debug("STATUS", `${this.constructor.name} refreshed`, {
        target: this.target.name,
        newDuration,
        newEndTime: this.endTime,
      });
    }
  }

  /**
   * Get remaining time in milliseconds
   */
  getRemainingTime(gameTime: number): number | null {
    if (!this.endTime) return null;
    return Math.max(0, this.endTime - gameTime);
  }

  /**
   * Get effect info for UI/debugging
   */
  getInfo(gameTime: number): {
    type: string;
    displayName: string;
    description: string;
    priority: number;
    isActive: boolean;
    remainingTime: number | null;
  } {
    const constructor = this.constructor as typeof StatusEffect;

    return {
      type: this.constructor.name,
      displayName: constructor.displayName,
      description: constructor.description,
      priority: this.priority,
      isActive: this.isActive,
      remainingTime: this.getRemainingTime(gameTime),
    };
  }
}
