import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();

/**
 * Survivor - Passive point generation role
 *
 * Gains 1 point every 30 seconds while alive.
 * Simple introductory role that rewards staying alive.
 */
export class Survivor extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.SURVIVOR;
  static displayName: string = "Survivor";
  static description: string = "Earn 1 point every 30 seconds by staying alive";
  static difficulty: string = "easy";

  private readonly pointInterval: number;
  private readonly pointsPerTick: number;
  private nextPointTime: number = 0;

  constructor(data: PlayerData) {
    super(data);
    const config = roleConfigs.survivor;
    this.pointInterval = config.pointInterval;
    this.pointsPerTick = config.pointsPerTick;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    this.nextPointTime = gameTime + this.pointInterval;
    logger.logRoleAbility(this, "SURVIVOR_INIT", {
      pointInterval: this.pointInterval,
    });
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);

    if (this.isAlive && gameTime >= this.nextPointTime) {
      this.addPoints(this.pointsPerTick, "survivor_alive");
      this.nextPointTime = gameTime + this.pointInterval;
      logger.logRoleAbility(this, "SURVIVOR_POINT", {
        nextAt: this.nextPointTime,
      });
    }
  }
}
