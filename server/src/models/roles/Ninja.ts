import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { roleConfigs } from "@/config/roleConfig";
import { gameConfig } from "@/config/gameConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();

/**
 * Ninja - High-risk stealth role
 *
 * Has a much higher movement threshold (harder to trigger damage),
 * but any damage that gets through is instantly lethal.
 */
export class Ninja extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.NINJA;
  static displayName: string = "Ninja";
  static description: string = "Move freely, but one hit means death";
  static difficulty: string = "easy";

  private readonly thresholdMultiplier: number;

  constructor(data: PlayerData) {
    super(data);
    this.thresholdMultiplier = roleConfigs.ninja.dangerThresholdMultiplier;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    logger.logRoleAbility(this, "NINJA_INIT", {
      thresholdMultiplier: this.thresholdMultiplier,
    });
  }

  /**
   * Override movement damage check with higher threshold and instant death.
   * Uses the global dangerThreshold multiplied by the ninja's multiplier.
   */
  protected override checkMovementDamage(
    intensity: number,
    gameTime: number
  ): void {
    const ninjaThreshold =
      gameConfig.movement.dangerThreshold * this.thresholdMultiplier;

    if (intensity > ninjaThreshold) {
      logger.logRoleAbility(this, "NINJA_ONESHOT", {
        intensity,
        threshold: ninjaThreshold,
      });
      // Deal lethal damage through normal pipeline (respects status effects)
      this.takeDamage(this.deathThreshold, gameTime);
    }
  }
}
