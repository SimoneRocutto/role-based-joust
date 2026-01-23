import { StatusEffect as WeakenedStatusEffect } from "../StatusEffect";
import type { BasePlayer as WeakenedBasePlayer } from "../BasePlayer";
import { Logger as WeakenedLogger } from "@/utils/Logger";
import { Priority as WeakenedPriority } from "@/config/priorities";

const weakenedLogger = WeakenedLogger.getInstance();

export class Weakened extends WeakenedStatusEffect {
  static override priority: number = WeakenedPriority.HIGH;
  static override displayName: string = "Weakened";
  static override description: string = "Reduced damage resistance";

  private readonly multiplier: number;
  private originalToughness: number | null = null;

  constructor(
    target: WeakenedBasePlayer,
    duration: number | null,
    multiplier: number = 0.5
  ) {
    super(target, duration);
    this.multiplier = multiplier;
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    this.originalToughness = this.target.toughness;
    this.target.toughness *= this.multiplier;

    weakenedLogger.info("STATUS", `${this.target.name} weakened`, {
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

    weakenedLogger.info(
      "STATUS",
      `${this.target.name} recovered from weakness`,
      {
        restoredToughness: this.target.toughness,
      }
    );
  }
}
