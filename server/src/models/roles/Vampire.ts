import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export class Vampire extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.VAMPIRE;
  static displayName: string = "Vampire";
  static description: string = "Enter bloodlust every 30s. Kill or be killed!";
  static difficulty: string = "hard";

  private readonly bloodlustCooldown: number;
  private readonly bloodlustDuration: number;
  private readonly bloodlustPoints: number;
  private bloodlustActive: boolean = false;
  private nextBloodlustTime: number;
  private bloodlustEndTime: number | null = null;
  private deathListener:
    | ((event: { victim: BasePlayer; gameTime: number }) => void)
    | null = null;

  constructor(data: PlayerData) {
    super(data);

    const config = roleConfigs.vampire;
    this.bloodlustCooldown = config.bloodlustCooldown;
    this.bloodlustDuration = config.bloodlustDuration;
    this.bloodlustPoints = config.bloodlustPoints;
    this.nextBloodlustTime = this.bloodlustCooldown;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    logger.logRoleAbility(this, "VAMPIRE_INIT", {
      firstBloodlustAt: this.nextBloodlustTime,
    });
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);

    if (
      !this.bloodlustActive &&
      gameTime >= this.nextBloodlustTime &&
      this.isAlive
    ) {
      this.enterBloodlust(gameTime);
    }

    if (
      this.bloodlustActive &&
      this.bloodlustEndTime &&
      gameTime >= this.bloodlustEndTime
    ) {
      logger.logRoleAbility(this, "BLOODLUST_TIMEOUT", {
        noDeath: true,
      });
      this.die(gameTime);
    }
  }

  private enterBloodlust(gameTime: number): void {
    this.bloodlustActive = true;
    this.bloodlustEndTime = gameTime + this.bloodlustDuration;

    logger.logRoleAbility(this, "BLOODLUST_START", {
      endTime: this.bloodlustEndTime,
      timeRemaining: this.bloodlustDuration,
    });

    this.deathListener = (event) => {
      if (this.bloodlustActive && event.victim.id !== this.id && this.isAlive) {
        this.onBloodlustKill(event.gameTime);
      }
    };

    gameEvents.on("player:death", this.deathListener);
    gameEvents.emitVampireBloodlustStart({ vampire: this, active: true });
  }

  private onBloodlustKill(gameTime: number): void {
    if (!this.bloodlustActive) return;

    logger.logRoleAbility(this, "BLOODLUST_SATISFIED", {
      pointsGained: this.bloodlustPoints,
    });

    this.exitBloodlust(gameTime, true);
  }

  private exitBloodlust(gameTime: number, successful: boolean): void {
    this.bloodlustActive = false;
    this.bloodlustEndTime = null;

    if (this.deathListener) {
      gameEvents.off("player:death", this.deathListener);
      this.deathListener = null;
    }

    logger.logRoleAbility(this, "BLOODLUST_END", {
      successful,
      pointsGained: successful ? this.bloodlustPoints : 0,
    });

    if (successful) {
      this.addPoints(this.bloodlustPoints, "bloodlust_kill");
    }

    this.nextBloodlustTime = gameTime + this.bloodlustCooldown;

    gameEvents.emitVampireBloodlustEnd({ vampire: this, active: false });
  }

  override onDeath(gameTime: number): void {
    super.onDeath(gameTime);

    if (this.deathListener) {
      gameEvents.off("player:death", this.deathListener);
      this.deathListener = null;
    }
  }
}
