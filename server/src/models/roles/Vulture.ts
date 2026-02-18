import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * Vulture - Chained death tracker
 *
 * Gains points when a player dies within a time window of a previous death.
 * The vulture must be alive, and their own death doesn't count.
 * Promotes predatory gameplay by rewarding rapid kills.
 */
export class Vulture extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.VULTURE;
  static displayName: string = "Vulture";
  static description: string =
    "Earn 2 points when deaths happen in quick succession";
  static difficulty: string = "normal";

  private lastDeathTime: number | null = null;
  private readonly deathWindowMs: number;
  private readonly pointsPerChainedDeath: number;

  constructor(data: PlayerData) {
    super(data);
    this.deathWindowMs = roleConfigs.vulture.deathWindowMs;
    this.pointsPerChainedDeath = roleConfigs.vulture.pointsPerChainedDeath;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);

    gameEvents.onPlayerDeath((event) => {
      this.onOtherPlayerDeath(event.victim, event.gameTime);
    });

    logger.logRoleAbility(this, "VULTURE_INIT", {
      deathWindowMs: this.deathWindowMs,
      pointsPerChainedDeath: this.pointsPerChainedDeath,
    });
  }

  private onOtherPlayerDeath(victim: BasePlayer, gameTime: number): void {
    // Ignore own death
    if (victim.id === this.id) return;

    // Must be alive to gain points
    if (!this.isAlive) return;

    // Check if this death is within the window of the previous death
    if (
      this.lastDeathTime !== null &&
      gameTime - this.lastDeathTime <= this.deathWindowMs
    ) {
      logger.logRoleAbility(this, "VULTURE_CHAINED_DEATH", {
        victimName: victim.name,
        timeSinceLastDeath: gameTime - this.lastDeathTime,
        points: this.pointsPerChainedDeath,
      });

      this.addPoints(this.pointsPerChainedDeath, "vulture_chained_death");
    }

    // Update last death time (always, even if no points awarded)
    this.lastDeathTime = gameTime;
  }
}
