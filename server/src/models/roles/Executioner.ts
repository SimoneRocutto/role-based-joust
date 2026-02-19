import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * Executioner - Target-based scoring role
 *
 * Has a randomly assigned target. When the target dies (any cause),
 * gains points and gets a new random target. The executioner doesn't
 * need to cause the death themselves.
 */
export class Executioner extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.EXECUTIONER;
  static displayName: string = "Executioner";
  static description: string = "Your target dies, you earn 2 points and get a new one";
  static difficulty: string = "normal";

  private readonly targetKillPoints: number;
  private allPlayers: BasePlayer[] = [];

  constructor(data: PlayerData) {
    super(data);
    this.targetKillPoints = roleConfigs.executioner.targetKillPoints;
  }

  override onPreRoundSetup(allPlayers: BasePlayer[]): void {
    this.allPlayers = allPlayers;
    if (this.targetPlayerId === null) {
      this.pickTarget();
    }
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);

    gameEvents.onPlayerDeath((event) => {
      if (!this.isAlive) return;
      if (event.victim.id === this.targetPlayerId) {
        this.onTargetDeath(event.gameTime);
      }
    });

    logger.logRoleAbility(this, "EXECUTIONER_INIT", {
      targetName: this.targetPlayerName,
    });
  }

  private pickTarget(): void {
    const candidates = this.allPlayers.filter(
      (p) => p.id !== this.id && p.isAlive && p.id !== this.targetPlayerId
    );

    if (candidates.length === 0) {
      this.targetPlayerId = null;
      this.targetPlayerName = null;
      return;
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    this.targetPlayerId = target.id;
    this.targetPlayerName = target.name;
  }

  private onTargetDeath(gameTime: number): void {
    logger.logRoleAbility(this, "EXECUTIONER_TARGET_KILLED", {
      targetName: this.targetPlayerName,
      points: this.targetKillPoints,
    });

    this.addPoints(this.targetKillPoints, "executioner_target");
    this.pickTarget();

    // Notify client of new target via role:updated (not role:assigned)
    if (this.targetPlayerName && this.targetPlayerId) {
      const connectionManager = ConnectionManager.getInstance();
      gameEvents.emitRoleUpdated({
        playerId: this.id,
        socketId: this.socketId,
        name: "executioner",
        displayName: Executioner.displayName,
        description: Executioner.description,
        difficulty: Executioner.difficulty,
        targetName: this.targetPlayerName,
        targetNumber:
          connectionManager.getPlayerNumber(this.targetPlayerId) ?? 0,
      });
    }

    logger.logRoleAbility(this, "EXECUTIONER_NEW_TARGET", {
      newTarget: this.targetPlayerName,
    });
  }

  override onDeath(gameTime: number): void {
    super.onDeath(gameTime);
  }
}
