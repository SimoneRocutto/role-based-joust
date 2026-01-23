import { BasePlayer as BerserkerBasePlayer } from "../BasePlayer";
import type { PlayerData as BerserkerPlayerData } from "@/types/player.types";
import { Logger as BerserkerLogger } from "@/utils/Logger";
import { roleConfigs as berserkerRoleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES as BERSERKER_PRIORITIES } from "@/config/priorities";

const berserkerLogger = BerserkerLogger.getInstance();

export class Berserker extends BerserkerBasePlayer {
  static override priority: number = 15; // MEDIUM_LOW
  static displayName: string = "Berserker";
  static description: string =
    "Less damage from movement, gains points for aggression";
  static difficulty: string = "hard";

  private aggressiveMovementPoints: number = 0;
  private readonly aggressiveMovementsForPoint: number;

  constructor(data: BerserkerPlayerData) {
    super(data);

    const config = berserkerRoleConfigs.berserker;
    this.movementConfig = {
      ...this.movementConfig,
      dangerThreshold: config.dangerThreshold,
      damageMultiplier: config.damageMultiplier,
    };
    this.aggressiveMovementsForPoint = config.aggressiveMovementsForPoint;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    berserkerLogger.logRoleAbility(this, "BERSERKER_INIT", {
      dangerThreshold: this.movementConfig.dangerThreshold,
    });
  }

  override checkMovementDamage(intensity: number, gameTime: number): void {
    super.checkMovementDamage(intensity, gameTime);

    if (intensity > 0.8) {
      this.aggressiveMovementPoints++;

      if (this.aggressiveMovementPoints >= this.aggressiveMovementsForPoint) {
        this.addPoints(1, "berserker_rage");
        this.aggressiveMovementPoints = 0;
        berserkerLogger.logRoleAbility(this, "BERSERKER_RAGE", {
          bonus: "1 point for aggressive play",
        });
      }
    }
  }
}
