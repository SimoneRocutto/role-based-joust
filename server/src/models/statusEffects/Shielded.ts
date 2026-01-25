import { StatusEffect as ShieldedStatusEffect } from "../StatusEffect";
import type { BasePlayer as ShieldedBasePlayer } from "../BasePlayer";
import { Logger as ShieldedLogger } from "@/utils/Logger";
import { Priority as ShieldedPriority } from "@/config/priorities";

const shieldedLogger = ShieldedLogger.getInstance();

export class Shielded extends ShieldedStatusEffect {
  static override priority: number = ShieldedPriority.VERY_HIGH;
  static override displayName: string = "Shielded";
  static override description: string = "Absorbs damage up to shield capacity";

  private readonly maxShield: number;
  private currentShield: number;

  constructor(
    target: ShieldedBasePlayer,
    duration: number | null,
    shieldAmount: number = 50
  ) {
    super(target, duration);
    this.maxShield = shieldAmount;
    this.currentShield = shieldAmount;
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;

    if (this.duration !== null) {
      this.endTime = gameTime + this.duration;
    }

    shieldedLogger.info("STATUS", `${this.target.name} gained shield`, {
      amount: this.currentShield,
    });
  }

  modifyIncomingDamage(damage: number): number {
    if (this.currentShield <= 0) {
      return damage;
    }

    if (damage <= this.currentShield) {
      this.currentShield -= damage;
      shieldedLogger.debug("STATUS", `Shield absorbed ${damage} damage`, {
        shieldRemaining: this.currentShield,
      });
      return 0;
    } else {
      const overflow = damage - this.currentShield;
      shieldedLogger.debug(
        "STATUS",
        `Shield absorbed ${this.currentShield}, ${overflow} overflow`,
        {
          shieldBroken: true,
        }
      );
      this.currentShield = 0;
      return overflow;
    }
  }

  onRemove(gameTime: number): void {
    this.isActive = false;
    shieldedLogger.info("STATUS", `${this.target.name} lost shield`);
  }

  get shieldPercentage(): number {
    return (this.currentShield / this.maxShield) * 100;
  }
}
