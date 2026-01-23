import { BasePlayer as MedicBasePlayer } from "../BasePlayer";
import { Regenerating } from "../statusEffects/Regenerating";
import type { PlayerData as MedicPlayerData } from "@/types/player.types";
import { Logger as MedicLogger } from "@/utils/Logger";
import { roleConfigs as medicRoleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES as MEDIC_PRIORITIES } from "@/config/priorities";

const medicLogger = MedicLogger.getInstance();

export class Medic extends MedicBasePlayer {
  static override priority: number = MEDIC_PRIORITIES.MEDIC;
  static displayName: string = "Medic";
  static description: string = "Can heal nearby players";
  static difficulty: string = "normal";

  private readonly healCooldown: number;
  private nextHealTime: number;
  private readonly healDuration: number;
  private readonly healPerSecond: number;
  private readonly selfRegenerationRate: number;
  private readonly healPoints: number;

  constructor(data: MedicPlayerData) {
    super(data);

    const config = medicRoleConfigs.medic;
    this.healCooldown = config.healCooldown;
    this.nextHealTime = config.healCooldown;
    this.healDuration = config.healDuration;
    this.healPerSecond = config.healPerSecond;
    this.selfRegenerationRate = config.selfRegenerationRate;
    this.healPoints = config.healPoints;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);

    this.applyStatusEffect(
      Regenerating,
      gameTime,
      null,
      this.selfRegenerationRate
    );

    medicLogger.logRoleAbility(this, "MEDIC_INIT", {
      healCooldown: this.healCooldown,
    });
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);

    if (gameTime >= this.nextHealTime && this.isAlive) {
      this.attemptHeal(gameTime);
    }
  }

  private attemptHeal(gameTime: number): void {
    const engine = (global as any).gameEngine;
    if (!engine) return;

    const otherPlayers = engine.players.filter(
      (p: MedicBasePlayer) => p.isAlive && p.id !== this.id
    );

    if (otherPlayers.length > 0) {
      const target =
        otherPlayers[Math.floor(Math.random() * otherPlayers.length)];

      target.applyStatusEffect(
        Regenerating,
        gameTime,
        this.healDuration,
        this.healPerSecond
      );

      medicLogger.logRoleAbility(this, "HEAL", {
        target: target.name,
        healAmount: this.healPerSecond * (this.healDuration / 1000),
      });

      this.addPoints(this.healPoints, "heal");
      this.nextHealTime = gameTime + this.healCooldown;
    }
  }
}
