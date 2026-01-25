import { StatusEffect as ExcitedStatusEffect } from "../StatusEffect";
import type { BasePlayer as ExcitedBasePlayer } from "../BasePlayer";
import { Logger as ExcitedLogger } from "@/utils/Logger";
import { Priority as ExcitedPriority } from "@/config/priorities";

const excitedLogger = ExcitedLogger.getInstance();

export class Excited extends ExcitedStatusEffect {
  static override priority: number = ExcitedPriority.MEDIUM_LOW;
  static override displayName: string = "Excited";
  static override description: string = "Must keep moving or die";

  private lastMovementTime: number | null = null;
  private readonly movementThreshold: number = 0.1;
  private readonly maxIdleTime: number = 2000;

  constructor(target: ExcitedBasePlayer, duration: number | null = null) {
    super(target, duration);
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;
    this.lastMovementTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    excitedLogger.info(
      "STATUS",
      `${this.target.name} is excited! Must keep moving!`,
      {
        maxIdleTime: this.maxIdleTime,
      }
    );
  }

  onTick(gameTime: number, deltaTime: number): void {
    if (this.lastMovementTime === null) return;

    const idleTime = gameTime - this.lastMovementTime;

    if (idleTime > this.maxIdleTime) {
      excitedLogger.warn(
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

      excitedLogger.debug("STATUS", `${this.target.name} moved (excited)`, {
        intensity: movementIntensity,
        resetTimer: true,
      });
    }
  }

  onRemove(gameTime: number): void {
    this.isActive = false;
    excitedLogger.info("STATUS", `${this.target.name} is no longer excited`);
  }
}
