import { BasePlayer } from "../BasePlayer";
import { Beast } from "./Beast";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const hunterLogger = Logger.getInstance();
const hunterGameEvents = GameEvents.getInstance();

export class BeastHunter extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.BEAST_HUNTER;
  static displayName: string = "Beast Hunter";
  static description: string = "Gain bonus points for hunting the Beast";
  static difficulty: string = "normal";

  private readonly beastKillPoints: number;

  constructor(data: PlayerData) {
    super(data);
    this.beastKillPoints = roleConfigs.beastHunter.beastKillPoints;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);

    hunterGameEvents.onPlayerDeath((event) => {
      this.onPlayerDeath(event.victim, event.gameTime);
    });

    hunterLogger.logRoleAbility(this, "BEASTHUNTER_INIT", {
      bonus: `${this.beastKillPoints} points for Beast kill`,
    });
  }

  override onPlayerDeath(victim: BasePlayer, gameTime: number): void {
    if (victim instanceof Beast && this.isAlive) {
      hunterLogger.logRoleAbility(this, "BEAST_HUNTED", {
        pointsGained: this.beastKillPoints,
        beastName: victim.name,
      });

      this.addPoints(this.beastKillPoints, "beast_kill");
    }
  }
}
