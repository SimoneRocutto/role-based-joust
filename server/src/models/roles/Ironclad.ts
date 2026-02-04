import { BasePlayer } from "../BasePlayer";
import { Toughened } from "../statusEffects/Toughened";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();

/**
 * Ironclad - Defensive role with an activated toughness ability
 *
 * Has 1 charge that activates on tap, granting high toughness for 5 seconds.
 * No cooldown regeneration - single use per round.
 */
export class Ironclad extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.IRONCLAD;
  static displayName: string = "Ironclad";
  static description: string = "Tap to activate iron skin (5s of high defense)";
  static difficulty: string = "easy";

  private readonly toughnessValue: number;
  private readonly abilityDuration: number;

  constructor(data: PlayerData) {
    super(data);

    // Configure charges from roleConfig
    this.maxCharges = roleConfigs.ironclad.maxCharges;
    this.cooldownDuration = roleConfigs.ironclad.cooldownDuration;
    this.toughnessValue = roleConfigs.ironclad.toughnessValue;
    this.abilityDuration = roleConfigs.ironclad.abilityDuration;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    logger.logRoleAbility(this, "IRONCLAD_INIT", {
      charges: this.maxCharges,
      toughnessValue: this.toughnessValue,
      duration: this.abilityDuration,
    });
  }

  /**
   * Activate iron skin - applies Toughened effect
   */
  override onAbilityUse(gameTime: number): boolean {
    logger.logRoleAbility(this, "IRONCLAD_ACTIVATE", {
      toughnessValue: this.toughnessValue,
      duration: this.abilityDuration,
    });

    // Apply the Toughened status effect
    this.applyStatusEffect(
      Toughened,
      gameTime,
      this.abilityDuration,
      this.toughnessValue
    );

    return true;
  }
}
