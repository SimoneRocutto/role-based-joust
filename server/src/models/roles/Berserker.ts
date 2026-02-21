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
   * Apply Toughened after a damage burst ends (trailing-edge debounce).
   * This fires once per burst rather than on every damage tick, preventing
   * the effect from being applied mid-burst when the player is still taking hits.
   * Does not apply if already Toughened (prevents permanent Toughened loop).
   */
  override onDamageEvent(totalDamage: number, gameTime: number): void {
    if (this.isAlive && totalDamage > 0 && !this.hasStatusEffect(Toughened)) {
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
