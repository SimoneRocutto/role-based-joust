import { GameMode, type GameModeOptions } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";
import {
  restoreMovementConfig,
  gameConfig,
} from "@/config/gameConfig";
import { TeamManager } from "@/managers/TeamManager";

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
    this.targetScore = options?.targetScore ?? null;
    if (this.targetScore !== null) {
      // Target score mode: always multi-round regardless of roundCount
      this.multiRound = true;
    } else if (options?.roundCount === undefined) {
      // No targetScore and no roundCount: default to 1 round
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
   * Accumulate points on round end.
   * If teams + target score: awards team match points and signals game end when a team hits the target.
   */
  override onRoundEnd(engine: GameEngine): { gameEnded?: boolean } | void {
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

    // Team match point scoring (target score mode only)
    const teamManager = TeamManager.getInstance();
    if (teamManager.isEnabled() && this.targetScore !== null) {
      // Rank players by their round points (highest first)
      const rankedPlayers = [...engine.players].sort(
        (a, b) => b.points - a.points
      );

      // First player per team (by their round ranking) determines team placement
      const scoredTeams = new Set<number>();
      const teamPlacement: number[] = [];
      for (const player of rankedPlayers) {
        const teamId = teamManager.getPlayerTeam(player.id);
        if (teamId !== null && !scoredTeams.has(teamId)) {
          scoredTeams.add(teamId);
          teamPlacement.push(teamId);
        }
      }

      // Award match points to teams based on placement (5, 3, 1, 0, ...)
      for (let i = 0; i < teamPlacement.length; i++) {
        const bonus = this.placementBonuses[i] ?? 0;
        if (bonus > 0) {
          teamManager.addMatchPoints(teamPlacement[i], bonus);
          logger.info(
            "MODE",
            `Team ${teamPlacement[i]} earned ${bonus} match points (placement #${i + 1})`
          );
        }
      }

      // Check if any team has reached the target score
      const topTeam = teamManager.getTeamsSortedByMatchPoints()[0];
      if (topTeam && topTeam.matchPoints >= this.targetScore) {
        logger.info(
          "MODE",
          `Team ${topTeam.teamId} reached target score ${this.targetScore} — game over`
        );
        return { gameEnded: true };
      }
    }
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
   * (considers disconnection grace period).
   * Game ends when a player reaches targetScore (if set) or after roundCount rounds.
   */
  checkWinCondition(engine: GameEngine): WinCondition {
    const effectivelyAlive = this.getEffectivelyAlivePlayers(engine);

    if (effectivelyAlive.length > 1) {
      return { roundEnded: false, gameEnded: false, winner: null };
    }

    if (effectivelyAlive.length === 0) {
      logger.info(
        "MODE",
        "Classic mode round ended in a draw - all players eliminated or disconnected"
      );
    }

    this.awardPlacementBonuses(effectivelyAlive);

    let gameEnded: boolean;
    if (this.targetScore !== null) {
      const teamManager = TeamManager.getInstance();
      if (teamManager.isEnabled()) {
        // Team game-end is determined in onRoundEnd after match points are updated
        gameEnded = false;
      } else {
        // Solo: game ends when any player's cumulative points reach the target
        gameEnded = engine.players.some(
          (p) => p.totalPoints + p.points >= this.targetScore!
        );
      }
    } else {
      gameEnded = engine.currentRound >= this.roundCount;
    }

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

    const ranks = GameMode.tiedRanks(sorted.map((p) => p.totalPoints));
    return sorted.map((player, index) => ({
      player,
      score: player.totalPoints,
      roundPoints: player.points,
      rank: ranks[index],
      status: ranks[index] === 1 ? "Winner" : `Rank ${ranks[index]}`,
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
