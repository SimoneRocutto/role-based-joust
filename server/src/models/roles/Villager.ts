import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { roleConfigs } from "@/config/roleConfig";
import { gameConfig } from "@/config/gameConfig";

const beastLogger = Logger.getInstance();

// TODO implement tests
export class Villager extends BasePlayer {
  static displayName: string = "Villager";
  static description: string =
    "Increased points if you are the last player alive";
  static difficulty: string = "easy";

  constructor(data: PlayerData) {
    super(data);
    this.placementBonusOverrides = this.getPlacementBonus();
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    beastLogger.logRoleAbility(this, "BEAST_INIT", {
      toughness: this.toughness,
      damageReduction: `${((1 - 1 / this.toughness) * 100).toFixed(0)}%`,
    });
  }

  // Increases placement score by placementBonusIncrease for the top N placements.
  private getPlacementBonus() {
    const config = roleConfigs.villager;
    return gameConfig.scoring.placementBonuses.map((value, i) =>
      i < config.topN ? value + config.placementBonusIncrease : value
    );
  }
}
