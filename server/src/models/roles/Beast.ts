import { BasePlayer as BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger as Logger } from "@/utils/Logger";
import { roleConfigs as beastRoleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const beastLogger = Logger.getInstance();

export class Beast extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.BEAST;
  static displayName: string = "Beast";
  static description: string =
    "Increased toughness, but hunted by BeastHunters";
  static difficulty: string = "easy";

  constructor(data: PlayerData) {
    super(data);
    this.toughness = beastRoleConfigs.beast.toughnessMultiplier;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    beastLogger.logRoleAbility(this, "BEAST_INIT", {
      toughness: this.toughness,
      damageReduction: `${((1 - 1 / this.toughness) * 100).toFixed(0)}%`,
    });
  }
}
