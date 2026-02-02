import { GameEvent } from "./GameEvent";
import type { GameEngine } from "@/managers/GameEngine";
import { GameEvents } from "@/utils/GameEvents";
import { gameConfig } from "@/config/gameConfig";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

type Tempo = "slow" | "fast";

const CHECK_INTERVAL = 5000; // Check every 5 seconds of game time

/**
 * TempoShift - Alternates between slow and fast movement thresholds
 *
 * In slow mode, players use the normal danger threshold.
 * In fast mode, the danger threshold doubles (more forgiving).
 *
 * The probability of shifting increases with each consecutive check
 * in the same state:
 * - slow->fast: shift chance = 1 - (3/4)^n
 * - fast->slow: shift chance = 1 - (2/3)^n
 */
export class TempoShift extends GameEvent {
  private tempo: Tempo = "slow";
  private consecutiveChecks: number = 0;
  private lastCheckTime: number = 0;
  private baseThreshold: number = 0;

  getName(): string {
    return "tempo-shift";
  }

  getDescription(): string {
    return "Alternates between slow and fast movement thresholds with compounding probability";
  }

  getTempo(): Tempo {
    return this.tempo;
  }

  getConsecutiveChecks(): number {
    return this.consecutiveChecks;
  }

  override onRoundStart(engine: GameEngine): void {
    this.tempo = "slow";
    this.consecutiveChecks = 0;
    this.lastCheckTime = 0;
    this.baseThreshold = gameConfig.movement.dangerThreshold;

    logger.info("MODE", "TempoShift initialized", {
      baseThreshold: this.baseThreshold,
    });
  }

  override onTick(engine: GameEngine, gameTime: number): void {
    // Check if it's time for a tempo check
    if (gameTime - this.lastCheckTime < CHECK_INTERVAL) {
      return;
    }

    this.lastCheckTime = gameTime;
    this.consecutiveChecks++;

    const shouldShift = this.rollForShift();

    if (shouldShift) {
      const newTempo: Tempo = this.tempo === "slow" ? "fast" : "slow";
      this.applyTempo(newTempo, engine);
      this.consecutiveChecks = 0;
    }
  }

  override onRoundEnd(engine: GameEngine): void {
    // Reset thresholds to base values
    if (this.tempo === "fast") {
      this.resetThresholds(engine);
    }

    this.tempo = "slow";
    this.consecutiveChecks = 0;
    this.lastCheckTime = 0;

    logger.info("MODE", "TempoShift reset on round end");
  }

  private rollForShift(): boolean {
    const n = this.consecutiveChecks;

    if (this.tempo === "slow") {
      // Stay-slow chance = (3/4)^n, so shift chance = 1 - (3/4)^n
      const stayChance = Math.pow(3 / 4, n);
      return Math.random() >= stayChance;
    } else {
      // Stay-fast chance = (2/3)^n, so shift chance = 1 - (2/3)^n
      const stayChance = Math.pow(2 / 3, n);
      return Math.random() >= stayChance;
    }
  }

  private applyTempo(newTempo: Tempo, engine: GameEngine): void {
    this.tempo = newTempo;

    if (newTempo === "fast") {
      const fastThreshold = this.baseThreshold * 2;
      for (const player of engine.players) {
        if (player.isAlive) {
          player.movementConfig.dangerThreshold = fastThreshold;
        }
      }
    } else {
      this.resetThresholds(engine);
    }

    logger.info("MODE", `Tempo shifted to ${newTempo}`, {
      threshold: newTempo === "fast" ? this.baseThreshold * 2 : this.baseThreshold,
    });

    gameEvents.emitModeEvent({
      modeName: engine.currentMode?.name || "Unknown",
      eventType: "tempo:shift",
      data: { tempo: newTempo },
    });
  }

  private resetThresholds(engine: GameEngine): void {
    for (const player of engine.players) {
      player.movementConfig.dangerThreshold = this.baseThreshold;
    }
  }
}
