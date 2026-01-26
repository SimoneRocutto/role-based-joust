import { GameMode } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry, ModeInfo } from "@/types/index";
import { roleThemes } from "@/config/roleThemes";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * RoleBasedMode - Roles with unique abilities
 *
 * Rules:
 * - Players assigned roles with special abilities
 * - Multi-round (default 3 rounds)
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
  override roundCount = 3;

  protected roleTheme: string;
  protected lastStandingBonus: number = 5;

  constructor(roleTheme: string = "standard") {
    super();
    this.roleTheme = roleTheme;
    this.description = `${this.description} Using ${roleTheme} roles.`;
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
   * (considers disconnection grace period)
   * Game ends after configured number of rounds
   */
  checkWinCondition(engine: GameEngine): WinCondition {
    // Use effectively alive to handle disconnections
    const effectivelyAlive = this.getEffectivelyAlivePlayers(engine);

    // Multiple players alive - continue round
    if (effectivelyAlive.length > 1) {
      return {
        roundEnded: false,
        gameEnded: false,
        winner: null,
      };
    }

    // Round is over (0 or 1 players effectively alive)
    const roundEnded = true;
    const gameEnded = engine.currentRound >= this.roundCount;

    // Award last standing bonus if there's a survivor
    if (effectivelyAlive.length === 1) {
      const [winner] = effectivelyAlive;
      winner.addPoints(this.lastStandingBonus, "last_standing");
      logger.info(
        "MODE",
        `${winner.name} is last standing! +${this.lastStandingBonus} points`
      );
    }

    return {
      roundEnded,
      gameEnded,
      winner: null, // Winner determined by total points
    };
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
   * Log player death with role info
   */
  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
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
