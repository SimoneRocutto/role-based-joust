import { BasePlayer } from "../BasePlayer";
import { Toughened } from "../statusEffects/Toughened";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();

/**
 * Berserker - Reactive defense role
 *
 * When taking damage, gains tough skin for 3 seconds (very high toughness).
 * Promotes aggressive playstyle: go all in, take a hit, then finish the target
 * while toughened.
 */
export class Berserker extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.NEW_BERSERKER;
  static displayName: string = "Berserker";
  static description: string =
    "Taking damage gives you tough skin for 3 seconds";
  static difficulty: string = "easy";

  private readonly toughnessDuration: number;
  private readonly toughnessValue: number;

  constructor(data: PlayerData) {
    super(data);
    const config = roleConfigs.berserker;
    this.toughnessDuration = config.toughnessDuration;
    this.toughnessValue = config.toughnessValue;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    logger.logRoleAbility(this, "BERSERKER_INIT", {
      toughnessDuration: this.toughnessDuration,
      toughnessValue: this.toughnessValue,
    });
  }

  /**
   * Override takeDamage to apply Toughened effect when hit.
   * The Toughened effect is applied AFTER the damage is processed,
   * so the first hit lands normally but subsequent hits during the
   * buff are reduced.
   */
  override takeDamage(baseDamage: number, gameTime: number): void {
    super.takeDamage(baseDamage, gameTime);

    // Apply tough skin if still alive after taking damage
    if (this.isAlive && baseDamage > 0) {
      this.applyStatusEffect(
        Toughened,
        gameTime,
        this.toughnessDuration,
        this.toughnessValue
      );
      logger.logRoleAbility(this, "BERSERKER_TOUGH_SKIN", {
        duration: this.toughnessDuration,
        toughness: this.toughnessValue,
      });
    }
  }
}
