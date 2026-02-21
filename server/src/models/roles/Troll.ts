import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();

/**
 * Troll - Delayed regeneration role
 *
 * Every time the Troll takes damage, it schedules an instant heal for 8 seconds later.
 * If the Troll takes any damage before that 8 seconds is up, the timer resets and the
 * new damage overwrites the past pending heal.
 *
 * This promotes a chip damage playstyle: you need sustained focus to kill the Troll,
 * since isolated hits will just heal off. But if everyone targets them at once, the
 * heal never fires.
 */
export class Troll extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.TROLL;
  static displayName: string = "Troll";
  static description: string =
    "Damage heals back after 8s if you aren't hit again";
  static difficulty: string = "easy";

  private pendingHeal: number = 0;
  private lastDamageEventTime: number = -Infinity;
  private readonly healDelay: number;

  constructor(data: PlayerData) {
    super(data);
    const config = roleConfigs.troll;
    this.healDelay = config.healDelay;
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    this.pendingHeal = 0;
    this.lastDamageEventTime = -Infinity;
    logger.logRoleAbility(this, "TROLL_INIT", { healDelay: this.healDelay });
  }

  /**
   * Called once per damage burst (trailing-edge debounce in BasePlayer).
   * Loses previous pending heal (stores the new one) and resets the heal timer.
   */
  override onDamageEvent(totalDamage: number, gameTime: number): void {
    if (!this.isAlive) return;

    this.pendingHeal = totalDamage;
    this.lastDamageEventTime = gameTime;

    logger.logRoleAbility(this, "TROLL_DAMAGE_TRACKED", {
      totalDamage,
      pendingHeal: this.pendingHeal,
      healIn: this.healDelay,
    });
  }

  /**
   * Every tick: if 8 seconds have passed since last hit and there's pending heal, apply it.
   */
  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);

    if (
      this.isAlive &&
      this.pendingHeal > 0 &&
      gameTime - this.lastDamageEventTime >= this.healDelay
    ) {
      const healed = Math.min(this.pendingHeal, this.accumulatedDamage);
      this.accumulatedDamage = Math.max(
        0,
        this.accumulatedDamage - this.pendingHeal
      );
      this.pendingHeal = 0;

      logger.logRoleAbility(this, "TROLL_HEALED", { healed });
    }
  }

  override onDeath(gameTime: number): void {
    super.onDeath(gameTime);
    this.pendingHeal = 0;
    this.lastDamageEventTime = -Infinity;
  }
}
