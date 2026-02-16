import { GameMode, type GameModeOptions } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";
import {
  applyTemporaryMovementConfig,
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

  protected lastStandingBonus: number = gameConfig.scoring.lastStandingBonus;

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
  protected override getGameEvents(): string[] {
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
    } else {
      // No players remain - draw
      logger.info(
        "MODE",
        "Classic mode round ended in a draw - all players eliminated or disconnected"
      );
    }

    return {
      roundEnded,
      gameEnded,
      winner: null, // Winner determined by total points at game end
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
      roundPoints: player.points,
      rank: index + 1,
      status: index === 0 ? "Winner" : `Rank ${index + 1}`,
    }));
  }

  /**
   * Log elimination
   */
  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    const alive = this.getAliveCount(engine);
    logger.info(
      "MODE",
      `${victim.name} eliminated. ${alive} player${
        alive !== 1 ? "s" : ""
      } remaining.`
    );
    super.onPlayerDeath(victim, engine);
  }
}
