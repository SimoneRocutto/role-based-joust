import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * Bodyguard - Observation-based protection role
 *
 * Assigned a player to protect. Earns bonus points if the protected
 * player finishes in the top 3 alive. Has a reduced last-standing bonus.
 */
export class Bodyguard extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.BODYGUARD;
  static displayName: string = "Bodyguard";
  static description: string =
    "Protect your target. 4 points if they finish top 3";
  static difficulty: string = "normal";

  private readonly protectionBonus: number;
  private readonly topN: number;
  private allPlayers: BasePlayer[] = [];
  private bonusAwarded: boolean = false;
  private deathListener:
    | ((event: { victim: BasePlayer; gameTime: number }) => void)
    | null = null;

  constructor(data: PlayerData) {
    super(data);
    const config = roleConfigs.bodyguard;
    this.protectionBonus = config.protectionBonus;
    this.topN = config.topN;
    this.lastStandingBonusOverride = config.lastStandingBonus;
  }

  override onPreRoundSetup(allPlayers: BasePlayer[]): void {
    this.allPlayers = allPlayers;
    if (this.targetPlayerId === null) {
      this.pickTarget();
    }
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    this.bonusAwarded = false;

    this.deathListener = (event) => {
      if (this.bonusAwarded) return;
      this.checkProtectionBonus();
    };
    gameEvents.on("player:death", this.deathListener);

    logger.logRoleAbility(this, "BODYGUARD_INIT", {
      targetName: this.targetPlayerName,
      protectionBonus: this.protectionBonus,
      topN: this.topN,
    });
  }

  private pickTarget(): void {
    const candidates = this.allPlayers.filter((p) => p.id !== this.id);

    if (candidates.length === 0) {
      this.targetPlayerId = null;
      this.targetPlayerName = null;
      return;
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    this.targetPlayerId = target.id;
    this.targetPlayerName = target.name;
  }

  private checkProtectionBonus(): void {
    if (this.bonusAwarded || !this.targetPlayerId) return;

    const aliveCount = this.allPlayers.filter((p) => p.isAlive).length;
    const target = this.allPlayers.find((p) => p.id === this.targetPlayerId);

    if (!target) return;

    // If alive count is at topN or fewer and target is still alive, award bonus
    if (aliveCount <= this.topN && target.isAlive) {
      this.bonusAwarded = true;
      this.addPoints(this.protectionBonus, "bodyguard_protection");
      logger.logRoleAbility(this, "BODYGUARD_BONUS", {
        targetName: this.targetPlayerName,
        aliveCount,
        points: this.protectionBonus,
      });
    }
  }
}
