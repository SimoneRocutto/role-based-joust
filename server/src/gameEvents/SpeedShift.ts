// ============================================================================
// src/gameEvents/SpeedShift.ts - Speed Shift game event
// ============================================================================

import { GameEvent } from "./GameEvent";
import type { GameEngine } from "@/managers/GameEngine";
import { updateMovementConfig, gameConfig } from "@/config/gameConfig";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";

const gameEvents = GameEvents.getInstance();
const logger = Logger.getInstance();

/**
 * SpeedShift - Alternates between slow (normal) and fast (relaxed threshold) phases
 *
 * Probability-based transitions with escalating chance:
 * - Slow phase: 3/4 base chance to stay each 5s check, escalating as (3/4)^n
 * - Fast phase: 2/3 base chance to stay each 5s check, escalating as (2/3)^n
 *
 * During fast phase, the danger threshold is raised so players can move more freely,
 * and the client speeds up the music to 2x.
 */
export class SpeedShift extends GameEvent {
  static readonly eventKey = "speed-shift";
  static readonly displayName = "Speed Shift";
  static readonly description = "Threshold changes — move faster!";
  static priority = 10;

  // Internal state
  private phase: "slow" | "fast" = "slow";
  private consecutiveChecks: number = 0;
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL = 5000; // 5 seconds

  // Config
  private readonly SLOW_STAY_BASE = 3 / 4; // 75% chance to stay slow each check
  private readonly FAST_STAY_BASE = 2 / 3; // 67% chance to stay fast each check
  static readonly FAST_THRESHOLD_MULTIPLIER = 2; // Fast threshold = saved * multiplier
  private savedThreshold: number = 0; // Remember the original threshold

  onRoundStart(engine: GameEngine, gameTime: number): void {
    this.phase = "slow";
    this.consecutiveChecks = 0;
    this.lastCheckTime = 0;
  }

  // Activate on first tick — stays active for the whole round
  shouldActivate(engine: GameEngine, gameTime: number): boolean {
    return gameTime >= 0;
  }

  shouldDeactivate(engine: GameEngine, gameTime: number): boolean {
    return false; // Stays active for the whole round
  }

  onStart(engine: GameEngine, gameTime: number): void {
    this.savedThreshold = gameConfig.movement.dangerThreshold;
    this.lastCheckTime = gameTime;
    logger.info("SPEED_SHIFT", "Speed shift event started", {
      savedThreshold: this.savedThreshold,
    });
  }

  onEnd(engine: GameEngine, gameTime: number): void {
    // Restore threshold when round ends
    if (this.phase === "fast") {
      updateMovementConfig({ dangerThreshold: this.savedThreshold });
      gameEvents.emitModeEvent({
        modeName: engine.currentMode?.name || "Classic",
        eventType: "speed-shift:end",
        data: { phase: "slow", dangerThreshold: this.savedThreshold },
      });
    }
    logger.info("SPEED_SHIFT", "Speed shift event ended");
  }

  onTick(engine: GameEngine, gameTime: number, deltaTime: number): void {
    // Check every CHECK_INTERVAL ms
    if (gameTime - this.lastCheckTime < this.CHECK_INTERVAL) return;
    this.lastCheckTime = gameTime;
    this.consecutiveChecks++;

    const stayBase =
      this.phase === "slow" ? this.SLOW_STAY_BASE : this.FAST_STAY_BASE;
    const stayProbability = Math.pow(stayBase, this.consecutiveChecks);

    // Roll the dice
    if (Math.random() > stayProbability) {
      this.transition(engine, gameTime);
    }
  }

  private transition(engine: GameEngine, gameTime: number): void {
    this.consecutiveChecks = 0; // Reset counter

    const modeName = engine.currentMode?.name || "Classic";

    if (this.phase === "slow") {
      this.phase = "fast";
      const fastThreshold =
        this.savedThreshold * SpeedShift.FAST_THRESHOLD_MULTIPLIER;
      updateMovementConfig({ dangerThreshold: fastThreshold });
      gameEvents.emitModeEvent({
        modeName,
        eventType: "speed-shift:start",
        data: { phase: "fast", dangerThreshold: fastThreshold },
      });
      logger.info("SPEED_SHIFT", "Shifted to FAST phase", {
        threshold: fastThreshold,
      });
    } else {
      this.phase = "slow";
      updateMovementConfig({ dangerThreshold: this.savedThreshold });
      gameEvents.emitModeEvent({
        modeName,
        eventType: "speed-shift:end",
        data: { phase: "slow", dangerThreshold: this.savedThreshold },
      });
      logger.info("SPEED_SHIFT", "Shifted to SLOW phase", {
        threshold: this.savedThreshold,
      });
    }
  }

  /**
   * Get current phase (for testing)
   */
  getPhase(): "slow" | "fast" {
    return this.phase;
  }
}
