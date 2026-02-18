import { BasePlayer as HunterBasePlayer } from "../BasePlayer";
import { Beast as HunterBeast } from "./Beast";
import type { PlayerData as HunterPlayerData } from "@/types/player.types";
import { Logger as HunterLogger } from "@/utils/Logger";
import { GameEvents as HunterGameEvents } from "@/utils/GameEvents";
import { roleConfigs as hunterRoleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES as HUNTER_PRIORITIES } from "@/config/priorities";

const hunterLogger = HunterLogger.getInstance();
const hunterGameEvents = HunterGameEvents.getInstance();

export class BeastHunter extends HunterBasePlayer {
  static override priority: number = HUNTER_PRIORITIES.BEAST_HUNTER;
  static displayName: string = "Beast Hunter";
  static description: string = "Gain bonus points for hunting the Beast";
  static difficulty: string = "normal";

  private readonly beastKillPoints: number;

  constructor(data: HunterPlayerData) {
    super(data);
    this.beastKillPoints = hunterRoleConfigs.beastHunter.beastKillPoints;
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

  override onPlayerDeath(victim: HunterBasePlayer, gameTime: number): void {
    if (victim instanceof HunterBeast && this.isAlive) {
      hunterLogger.logRoleAbility(this, "BEAST_HUNTED", {
        pointsGained: this.beastKillPoints,
        beastName: victim.name,
      });

      this.addPoints(this.beastKillPoints, "beast_kill");
    }
  }
}
