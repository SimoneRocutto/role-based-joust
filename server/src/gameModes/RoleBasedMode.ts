import { GameMode, type GameModeOptions } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry, ModeInfo } from "@/types/index";
import { roleThemes } from "@/config/roleThemes";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * Options for RoleBasedMode
 */
export interface RoleBasedModeOptions extends GameModeOptions {
  theme?: string;
}

/**
 * RoleBasedMode - Roles with unique abilities
 *
 * Rules:
 * - Players assigned roles with special abilities
 * - Multi-round (configurable, default from settings)
 * - Points accumulate across rounds
 * - Last standing player each round gets bonus points
 */
export class RoleBasedMode extends GameMode {
  override name = "Role Based";
  override description =
    "Unique abilities. Earn points across multiple rounds!";
  override minPlayers = 2;
  override maxPlayers = 20;
  override useRoles = true;
  override multiRound = true;

  protected roleTheme: string;

  constructor(options?: RoleBasedModeOptions | string) {
    // Handle legacy string argument (theme only)
    const opts: RoleBasedModeOptions = typeof options === "string"
      ? { theme: options }
      : options || {};

    // Default roundCount to 3 for role-based mode if not specified
    if (opts.roundCount === undefined) {
      opts.roundCount = 3;
    }

    super(opts);

    this.roleTheme = opts.theme || "standard";
    this.description = `${this.description} Using ${this.roleTheme} roles.`;

    // Default to multiRound for role-based mode
    this.multiRound = true;
  }

  /**
   * Get role pool based on theme
   * Roles are repeated to match player count
   */
  getRolePool(playerCount: number): string[] {
    const theme = roleThemes[this.roleTheme];

    if (!theme || theme.length === 0) {
      logger.warn(
        "MODE",
        `Theme '${this.roleTheme}' not found or empty, using standard`
      );
      return roleThemes.standard || [];
    }

    // Build pool by repeating roles until we have enough
    const pool: string[] = [];
    while (pool.length < playerCount) {
      pool.push(...theme);
    }

    // Trim to exact player count
    return pool.slice(0, playerCount);
  }

  /**
   * Round ends when 1 or 0 players remain effectively alive
   * (or when all remaining share a victory group).
   * Game ends after configured number of rounds.
   */
  checkWinCondition(engine: GameEngine): WinCondition {
    const effectivelyAlive = this.getEffectivelyAlivePlayers(engine);

    // Multiple players alive - check if they share a victory group
    if (effectivelyAlive.length > 1) {
      const groupId = effectivelyAlive[0].victoryGroupId;
      const allShareGroup =
        groupId !== null &&
        effectivelyAlive.every((p) => p.victoryGroupId === groupId);

      if (!allShareGroup) {
        return { roundEnded: false, gameEnded: false, winner: null };
      }
    }

    // Round is over — award placement bonuses
    const gameEnded = engine.currentRound >= this.roundCount;
    this.awardPlacementBonuses(effectivelyAlive);

    return { roundEnded: true, gameEnded, winner: null };
  }

  /**
   * Sort by total points across all rounds
   */
  calculateFinalScores(engine: GameEngine): ScoreEntry[] {
    // Sort by total points (descending)
    const sorted = [...engine.players].sort(
      (a, b) => b.totalPoints - a.totalPoints
    );

    return sorted.map((player, index) => ({
      player,
      score: player.totalPoints,
      roundPoints: player.points,
      rank: index + 1,
      status: index === 0 ? "Champion" : `Rank ${index + 1}`,
    }));
  }

  /**
   * Log round start with theme info
   */
  override onRoundStart(engine: GameEngine, roundNumber: number): void {
    super.onRoundStart(engine, roundNumber);
    logger.info(
      "MODE",
      `Round ${roundNumber}/${this.roundCount} - Theme: ${this.roleTheme}`
    );
  }

  /**
   * Log elimination with role info
   */
  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    super.onPlayerDeath(victim, engine);
    const alive = this.getAliveCount(engine);
    logger.info(
      "MODE",
      `${victim.name} (${victim.constructor.name}) eliminated. ${alive} remaining.`
    );
  }

  /**
   * Accumulate round points to total points
   */
  override onRoundEnd(engine: GameEngine): void {
    super.onRoundEnd(engine);

    // Transfer round points to total points
    engine.players.forEach((player) => {
      player.totalPoints += player.points;
    });

    // Log round scores
    const roundScores = [...engine.players]
      .sort((a, b) => b.points - a.points)
      .map((p) => `${p.name}: ${p.points}pts (total: ${p.totalPoints})`)
      .join(", ");

    logger.info("MODE", `Round ${engine.currentRound} scores: ${roundScores}`);
  }

  /**
   * Get mode info with theme
   */
  override getInfo(): ModeInfo & { roleTheme: string } {
    return {
      ...super.getInfo(),
      roleTheme: this.roleTheme,
    };
  }
}
