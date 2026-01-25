import { BasePlayer as BeastBasePlayer } from "../BasePlayer";
import type { PlayerData as BeastPlayerData } from "@/types/player.types";
import { Logger as BeastLogger } from "@/utils/Logger";
import { roleConfigs as beastRoleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES as BEAST_PRIORITIES } from "@/config/priorities";

const beastLogger = BeastLogger.getInstance();

export class Beast extends BeastBasePlayer {
  static override priority: number = BEAST_PRIORITIES.BEAST;
  static displayName: string = "Beast";
  static description: string =
    "Increased toughness, but hunted by BeastHunters";
  static difficulty: string = "easy";

  constructor(data: BeastPlayerData) {
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
