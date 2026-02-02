// ============================================================================
// src/gameEvents/GameEvent.ts - Base class for game-wide events
// ============================================================================

import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";

/**
 * GameEvent - Abstract base class for game-wide effects
 *
 * Game events are temporary, game-wide effects that alter gameplay for all
 * players simultaneously. Examples: speed shifts, environmental hazards, buffs.
 *
 * Lifecycle:
 * - shouldActivate() checked each tick while inactive
 * - onStart() called when activated
 * - onTick() called each tick while active
 * - shouldDeactivate() checked each tick while active
 * - onEnd() called when deactivated
 *
 * Subclasses must implement onStart and onEnd. Other hooks are optional.
 */
export abstract class GameEvent {
  // ===== IDENTITY =====
  readonly id: string;
  static readonly eventKey: string;
  static readonly displayName: string;
  static readonly description: string;

  // ===== STATE =====
  isActive: boolean = false;
  startTime: number | null = null;
  duration: number | null = null; // null = indefinite (event manages its own end)

  // ===== PRIORITY =====
  readonly priority: number;
  static priority: number = 10;

  constructor() {
    this.id = `${(this.constructor as typeof GameEvent).eventKey}-${Date.now()}`;
    this.priority = (this.constructor as typeof GameEvent).priority;
  }

  // ===== LIFECYCLE HOOKS =====

  /**
   * Called when the event activates.
   * Apply game-wide modifications here (config changes, player buffs, etc.)
   * Must emit a mode:event for the client to react.
   */
  abstract onStart(engine: GameEngine, gameTime: number): void;

  /**
   * Called when the event deactivates.
   * Revert all modifications made in onStart.
   * Must emit a mode:event to tell the client to revert.
   */
  abstract onEnd(engine: GameEngine, gameTime: number): void;

  /**
   * Called every game tick (100ms) while active.
   * Use for ongoing effects, state transitions, probability checks.
   */
  onTick(engine: GameEngine, gameTime: number, deltaTime: number): void {
    // Override as needed
  }

  // ===== TRIGGER LOGIC =====

  /**
   * Called every tick while the event is NOT active.
   * Return true to activate the event.
   */
  shouldActivate(engine: GameEngine, gameTime: number): boolean {
    return false;
  }

  /**
   * Called every tick while the event IS active.
   * Return true to deactivate. Also checked against duration.
   */
  shouldDeactivate(engine: GameEngine, gameTime: number): boolean {
    if (this.duration !== null && this.startTime !== null) {
      return gameTime - this.startTime >= this.duration;
    }
    return false;
  }

  // ===== OPTIONAL HOOKS =====

  /**
   * Called when a player dies while the event is active.
   */
  onPlayerDeath(victim: BasePlayer, engine: GameEngine, gameTime: number): void {
    // Override as needed
  }

  /**
   * Called on round start. Use to reset internal state.
   */
  onRoundStart(engine: GameEngine, gameTime: number): void {
    // Override as needed
  }

  // ===== QUERIES =====

  getRemainingTime(gameTime: number): number | null {
    if (this.duration === null || this.startTime === null) return null;
    return Math.max(0, this.duration - (gameTime - this.startTime));
  }

  getInfo(gameTime: number): GameEventInfo {
    return {
      id: this.id,
      key: (this.constructor as typeof GameEvent).eventKey,
      displayName: (this.constructor as typeof GameEvent).displayName,
      description: (this.constructor as typeof GameEvent).description,
      isActive: this.isActive,
      remainingTime: this.getRemainingTime(gameTime),
    };
  }
}

export interface GameEventInfo {
  id: string;
  key: string;
  displayName: string;
  description: string;
  isActive: boolean;
  remainingTime: number | null;
}
