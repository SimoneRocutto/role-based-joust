import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();

/**
 * Masochist - Low-HP point generation role
 *
 * While below 30% HP, earns 1 point every 10 seconds.
 * Rewards risky playstyle of staying alive while damaged.
 */
export class Masochist extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.MASOCHIST;
  static displayName: string = "Masochist";
  static description: string = "Earn 1 point every 10s while below 30% HP";
  static difficulty: string = "normal";

  private readonly hpThresholdPercent: number;
  private readonly pointInterval: number;
  private readonly pointsPerTick: number;
  private nextPointTime: number | null = null;

  constructor(data: PlayerData) {
    super(data);
    const config = roleConfigs.masochist;
    this.hpThresholdPercent = config.hpThresholdPercent;
    this.pointInterval = config.pointInterval;
    this.pointsPerTick = config.pointsPerTick;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    this.nextPointTime = null;
    logger.logRoleAbility(this, "MASOCHIST_INIT", {
      hpThreshold: `${this.hpThresholdPercent * 100}%`,
      pointInterval: this.pointInterval,
    });
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);

    if (!this.isAlive) return;

    const hpPercent = 1 - this.accumulatedDamage / this.deathThreshold;
    const belowThreshold = hpPercent < this.hpThresholdPercent;

    if (belowThreshold) {
      // Start timer if not already running
      if (this.nextPointTime === null) {
        this.nextPointTime = gameTime + this.pointInterval;
        logger.logRoleAbility(this, "MASOCHIST_THRESHOLD_ENTERED", {
          hpPercent: (hpPercent * 100).toFixed(0) + "%",
        });
      }

      // Award points when timer expires
      if (gameTime >= this.nextPointTime) {
        this.addPoints(this.pointsPerTick, "masochist_low_hp");
        this.nextPointTime = gameTime + this.pointInterval;
        logger.logRoleAbility(this, "MASOCHIST_POINT", {
          hpPercent: (hpPercent * 100).toFixed(0) + "%",
        });
      }
    } else {
      // Reset timer when above threshold
      if (this.nextPointTime !== null) {
        this.nextPointTime = null;
      }
    }
  }
}
