import { StatusEffect as ToughenedStatusEffect } from "../StatusEffect";
import type { BasePlayer as ToughenedBasePlayer } from "../BasePlayer";
import { Logger as ToughenedLogger } from "@/utils/Logger";
import { Priority as ToughenedPriority } from "@/config/priorities";

const toughenedLogger = ToughenedLogger.getInstance();

/**
 * Toughened - Sets toughness to a fixed value for a duration
 *
 * Unlike Strengthened (which multiplies toughness), this sets an absolute value.
 * Used by Ironclad role for defensive ability.
 */
export class Toughened extends ToughenedStatusEffect {
  static override priority: number = ToughenedPriority.HIGH;
  static override displayName: string = "Toughened";
  static override description: string = "Significantly increased damage resistance";

  private readonly toughnessValue: number;
  private originalToughness: number | null = null;

  constructor(
    target: ToughenedBasePlayer,
    duration: number | null,
    toughnessValue: number = 2.0
  ) {
    super(target, duration);
    this.toughnessValue = toughnessValue;
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    this.originalToughness = this.target.toughness;
    this.target.toughness = this.toughnessValue;

    toughenedLogger.info("STATUS", `${this.target.name} toughened`, {
      originalToughness: this.originalToughness,
      newToughness: this.target.toughness,
      toughnessValue: this.toughnessValue,
    });
  }

  onRemove(gameTime: number): void {
    this.isActive = false;

    if (this.originalToughness !== null) {
      this.target.toughness = this.originalToughness;
    }

    toughenedLogger.info(
      "STATUS",
      `${this.target.name} no longer toughened`
    );
  }
}
