import { StatusEffect as StrengthenedStatusEffect } from "../StatusEffect";
import type { BasePlayer as StrengthenedBasePlayer } from "../BasePlayer";
import { Logger as StrengthenedLogger } from "@/utils/Logger";
import { Priority as StrengthenedPriority } from "@/config/priorities";

const strengthenedLogger = StrengthenedLogger.getInstance();

export class Strengthened extends StrengthenedStatusEffect {
  static override priority: number = StrengthenedPriority.HIGH;
  static override displayName: string = "Strengthened";
  static override description: string = "Increased damage resistance";

  private readonly multiplier: number;
  private originalToughness: number | null = null;

  constructor(
    target: StrengthenedBasePlayer,
    duration: number | null,
    multiplier: number = 1.5
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

    strengthenedLogger.info("STATUS", `${this.target.name} strengthened`, {
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

    strengthenedLogger.info(
      "STATUS",
      `${this.target.name} no longer strengthened`
    );
  }
}
