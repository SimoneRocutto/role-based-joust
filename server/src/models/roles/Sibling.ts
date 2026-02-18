import { BasePlayer } from "../BasePlayer";
import type { PlayerData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";
import { roleConfigs } from "@/config/roleConfig";
import { ROLE_PRIORITIES } from "@/config/priorities";

const logger = Logger.getInstance();

/**
 * Sibling - Linked pair role
 *
 * Two Siblings are linked together. They know each other, share damage,
 * and have increased toughness. When one takes damage, the same base damage
 * is forwarded to the other. A flag prevents infinite recursion.
 *
 * If only one Sibling exists (odd pool cycling), they play as a tough
 * player with no link.
 */
export class Sibling extends BasePlayer {
  static override priority: number = ROLE_PRIORITIES.SIBLING;
  static displayName: string = "Sibling";
  static description: string =
    "Linked to another player. Share damage, share fate";
  static difficulty: string = "normal";

  private siblingPlayer: BasePlayer | null = null;
  private sharingDamage: boolean = false;
  private readonly sharedDamageRatio: number;

  constructor(data: PlayerData) {
    super(data);
    this.toughness = roleConfigs.sibling.toughnessBonus;
    this.sharedDamageRatio = roleConfigs.sibling.sharedDamageRatio;
  }

  override onPreRoundSetup(allPlayers: BasePlayer[]): void {
    // Find the other sibling
    const otherSibling = allPlayers.find(
      (p) => p instanceof Sibling && p.id !== this.id
    );

    // All siblings share a victory group so they can win together
    this.victoryGroupId = "sibling";

    if (otherSibling) {
      this.siblingPlayer = otherSibling;
      this.targetPlayerId = otherSibling.id;
      this.targetPlayerName = otherSibling.name;
    }
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);

    logger.logRoleAbility(this, "SIBLING_INIT", {
      toughness: this.toughness,
      siblingName: this.targetPlayerName ?? "none",
      hasSibling: this.siblingPlayer !== null,
    });
  }

  override takeDamage(baseDamage: number, gameTime: number): void {
    if (!this.isAlive) return;

    // Apply damage to self normally
    super.takeDamage(baseDamage, gameTime);

    // Forward damage to sibling if not already sharing
    if (
      this.siblingPlayer &&
      this.siblingPlayer.isAlive &&
      !this.sharingDamage
    ) {
      // Check if sibling is currently sharing damage to us (loop prevention)
      const siblingRole =
        this.siblingPlayer instanceof Sibling ? this.siblingPlayer : null;
      if (siblingRole && siblingRole.sharingDamage) {
        return; // Sibling is already forwarding to us, don't loop
      }

      this.sharingDamage = true;
      const sharedDamage = baseDamage * this.sharedDamageRatio;

      logger.logRoleAbility(this, "SIBLING_SHARE_DAMAGE", {
        siblingName: this.siblingPlayer.name,
        sharedDamage,
      });

      this.siblingPlayer.takeDamage(sharedDamage, gameTime);
      this.sharingDamage = false;
    }
  }
}
