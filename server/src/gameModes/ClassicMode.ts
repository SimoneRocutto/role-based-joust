import { GameMode, type GameModeOptions } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";
import {
  restoreMovementConfig,
  gameConfig,
} from "@/config/gameConfig";

const logger = Logger.getInstance();

/**
 * ClassicMode - Pure survival mode
 *
 * Rules:
 * - No roles (everyone is BasePlayer)
 * - Configurable round count (default 1)
 * - Last player standing wins each round and earns points
 * - Points accumulate across rounds (if multi-round)
 */
export class ClassicMode extends GameMode {
  override name = "Classic";
  override description = "Pure movement survival. Last player standing wins!";
  override minPlayers = 2;
  override maxPlayers = 20;
  override useRoles = false;

  constructor(options?: GameModeOptions) {
    super(options);
    // Default to 1 round if not specified
    if (options?.roundCount === undefined) {
      this.roundCount = 1;
      this.multiRound = false;
    }
  }

  /**
   * Configure classic mode: 3s countdown + oneshot damage
   */
  override onModeSelected(engine: GameEngine): void {
    super.onModeSelected(engine);
    engine.setCountdownDuration(gameConfig.modeDefaults.classic.countdownSeconds);
  }

  /**
   * Return game events for this mode
   */
  override getGameEvents(): string[] {
    return ["speed-shift"];
  }

  /**
   * Accumulate points on round end
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
   * Restore movement config on game end
   */
  override onGameEnd(engine: GameEngine): void {
    super.onGameEnd(engine);
    restoreMovementConfig();
  }

  /**
   * No roles in classic mode
   */
  getRolePool(playerCount: number): string[] {
    return []; // Empty array = no roles
  }

  /**
   * Round ends when 1 or 0 players remain effectively alive
   * (considers disconnection grace period)
   * Game ends after configured number of rounds
   */
  checkWinCondition(engine: GameEngine): WinCondition {
    const effectivelyAlive = this.getEffectivelyAlivePlayers(engine);

    if (effectivelyAlive.length > 1) {
      return { roundEnded: false, gameEnded: false, winner: null };
    }

    const gameEnded = engine.currentRound >= this.roundCount;

    if (effectivelyAlive.length === 0) {
      logger.info(
        "MODE",
        "Classic mode round ended in a draw - all players eliminated or disconnected"
      );
    }

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
      status: index === 0 ? "Winner" : `Rank ${index + 1}`,
    }));
  }

  /**
   * Log elimination
   */
  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    super.onPlayerDeath(victim, engine);
    const alive = this.getAliveCount(engine);
    logger.info(
      "MODE",
      `${victim.name} eliminated. ${alive} player${
        alive !== 1 ? "s" : ""
      } remaining.`
    );
  }
}
