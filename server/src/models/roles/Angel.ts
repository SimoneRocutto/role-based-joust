import { BasePlayer } from "../BasePlayer";
import { Invulnerability } from "../statusEffects/Invulnerability";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export class Angel extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.ANGEL;
  static displayName: string = "Angel";
  static description: string = "Divine protection prevents first death";
  static difficulty: string = "normal";

  private hasUsedDivineProtection: boolean = false;
  private readonly divineProtectionDuration: number;

  constructor(data: PlayerData) {
    super(data);
    this.divineProtectionDuration = roleConfigs.angel.invulnerabilityDuration;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    logger.logRoleAbility(this, "ANGEL_INIT", {
      protectionAvailable: true,
      duration: this.divineProtectionDuration,
    });
  }

  override beforeDeath(gameTime: number): void {
    if (!this.hasUsedDivineProtection) {
      this.hasUsedDivineProtection = true;

      logger.logRoleAbility(this, "DIVINE_PROTECTION_ACTIVATED", {
        duration: this.divineProtectionDuration,
      });

      this.applyStatusEffect(
        Invulnerability,
        gameTime,
        this.divineProtectionDuration
      );

      logger.info(
        "ANGEL",
        `${this.name} will die in ${this.divineProtectionDuration}ms`
      );

      return;
    }

    logger.logRoleAbility(this, "DIVINE_PROTECTION_EXHAUSTED");
    super.beforeDeath(gameTime);
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);

    if (
      this.hasUsedDivineProtection &&
      !this.hasStatusEffect(Invulnerability) &&
      this.isAlive
    ) {
      logger.logRoleAbility(this, "INVULNERABILITY_EXPIRED", {
        finalDeath: true,
      });

      this.isAlive = false;
      this.onDeath(gameTime);

      gameEvents.emitPlayerDeath({ victim: this, gameTime });
    }
  }
}
