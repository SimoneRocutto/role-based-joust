import { BasePlayer as AssassinBasePlayer } from "../BasePlayer";
import type { PlayerData as AssassinPlayerData } from "@/types/player.types";
import { Logger as AssassinLogger } from "@/utils/Logger";
import { GameEvents as AssassinGameEvents } from "@/utils/GameEvents";
import { roleConfigs as assassinRoleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES as ASSASSIN_PRIORITIES } from "@/config/priorities";

const assassinLogger = AssassinLogger.getInstance();
const assassinGameEvents = AssassinGameEvents.getInstance();

export class Assassin extends AssassinBasePlayer {
  static override priority: number = ASSASSIN_PRIORITIES.ASSASSIN;
  static displayName: string = "Assassin";
  static description: string =
    "Assigned a target. Bonus points for eliminating them.";
  static difficulty: string = "hard";

  private target: AssassinBasePlayer | null = null;
  private targetId: string | null = null;
  private readonly targetKillPoints: number;

  constructor(data: AssassinPlayerData) {
    super(data);
    this.targetKillPoints = assassinRoleConfigs.assassin.targetKillPoints;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);

    const engine = (global as any).gameEngine;
    if (engine) {
      const others = engine.players.filter(
        (p: AssassinBasePlayer) => p.id !== this.id
      );
      if (others.length > 0) {
        this.target = others[Math.floor(Math.random() * others.length)];
        this.targetId = this.target.id;

        assassinLogger.logRoleAbility(this, "TARGET_ASSIGNED", {
          targetName: this.target.name,
          bonus: `${this.targetKillPoints} points if target dies first`,
        });
      }
    }

    assassinGameEvents.on(
      "player:death",
      (event: { victim: AssassinBasePlayer; gameTime: number }) => {
        this.onPlayerDeath(event.victim, event.gameTime);
      }
    );
  }

  override onPlayerDeath(victim: AssassinBasePlayer, gameTime: number): void {
    if (victim.id === this.targetId && this.isAlive) {
      assassinLogger.logRoleAbility(this, "TARGET_ELIMINATED", {
        pointsGained: this.targetKillPoints,
        victimName: victim.name,
      });

      this.addPoints(this.targetKillPoints, "assassination");
      this.target = null;
      this.targetId = null;
    }
  }
}
