import { GameMode, type GameModeOptions } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";
import { RespawnManager } from "@/managers/RespawnManager";
import { restoreMovementConfig, gameConfig } from "@/config/gameConfig";
import { TeamManager } from "@/managers/TeamManager";

const logger = Logger.getInstance();

/**
 * DeathCountMode - Time-based survival with respawns
 *
 * Rules:
 * - No roles (everyone is BasePlayer)
 * - Rounds run on a fixed timer (default 90s)
 * - Players respawn 5s after dying
 * - Player with fewest deaths earns most points per round
 * - Points accumulate across rounds (default 3 rounds)
 */
export class DeathCountMode extends GameMode {
  override name = "Death Count";
  override description = "Timed rounds with respawns. Fewest deaths wins!";
  override minPlayers = 2;
  override maxPlayers = 20;
  override useRoles = false;

  private deathCounts: Map<string, number> = new Map();
  private respawnManager: RespawnManager;
  /** Points earned by each team in the most-recently-completed round (for roundPoints display). */
  private teamLastRoundPoints: Map<number, number> = new Map();

  constructor(options?: GameModeOptions) {
    super(options);
    if (options?.roundDuration !== undefined) {
      this.roundDuration = options.roundDuration;
    } else {
      this.roundDuration = gameConfig.modeDefaults.deathCount.defaultRoundDurationMs;
    }
    // Default to 3 rounds if not specified
    if (options?.roundCount === undefined) {
      this.roundCount = 3;
    }
    this.multiRound = true;
    const respawnDelayMs = options?.respawnDelayMs ?? gameConfig.modeDefaults.deathCount.respawnDelayMs;
    this.respawnManager = new RespawnManager(respawnDelayMs);
  }

  override onModeSelected(engine: GameEngine): void {
    super.onModeSelected(engine);
    engine.setCountdownDuration(gameConfig.modeDefaults.deathCount.countdownSeconds);
  }

  override getRolePool(_playerCount: number): string[] {
    return [];
  }

  /**
   * Return game events for this mode
   */
  override getGameEvents(): string[] {
    return ["speed-shift"];
  }

  override onRoundStart(engine: GameEngine, roundNumber: number): void {
    super.onRoundStart(engine, roundNumber);

    // Clear state for new round
    this.deathCounts.clear();
    this.respawnManager.clear();

    // Initialize death counts for all players
    for (const player of engine.players) {
      this.deathCounts.set(player.id, 0);
    }
    // Death events are handled by base class GameMode.onRoundStart listener
  }

  override onTick(engine: GameEngine, gameTime: number): void {
    super.onTick(engine, gameTime);

    // Check pending respawns
    this.respawnManager.checkRespawns(engine, gameTime);
  }

  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    // Increment death count
    const currentDeaths = this.deathCounts.get(victim.id) ?? 0;
    this.deathCounts.set(victim.id, currentDeaths + 1);

    const alive = this.getAliveCount(engine);
    logger.info(
      "MODE",
      `${victim.name} died (death #${currentDeaths + 1}). ${alive} player${
        alive !== 1 ? "s" : ""
      } remaining.`
    );

    super.onPlayerDeath(victim, engine);

    // Schedule respawn if there's enough time left
    const scheduled = this.respawnManager.scheduleRespawn(
      victim.id,
      engine.gameTime,
      this.roundDuration
    );

    if (scheduled) {
      this.respawnManager.emitRespawnPending(victim);
      logger.info("MODE", `${victim.name} will respawn at ${engine.gameTime + this.respawnManager.getDelay()}ms`);
    } else {
      logger.info(
        "MODE",
        `${victim.name} will NOT respawn (too close to round end)`
      );
    }
  }

  override checkWinCondition(engine: GameEngine): WinCondition {
    // Round ends when time is up
    if (this.roundDuration !== null && engine.gameTime >= this.roundDuration) {
      const roundEnded = true;
      const gameEnded = engine.currentRound >= this.roundCount;

      // Award points using "players beaten" scoring
      this.awardRoundPoints(engine);

      return {
        roundEnded,
        gameEnded,
        winner: null,
      };
    }

    return {
      roundEnded: false,
      gameEnded: false,
      winner: null,
    };
  }

  /**
   * Award round points using placement bonuses (5-3-1-0).
   *
   * Individual mode: rank players by death count (ascending) → award
   * placementBonuses[rank-1] to each player. Tied players share the same rank
   * and the same bonus.
   *
   * Team mode: sum each team's deaths → rank teams → award team placement
   * bonuses via TeamManager.addMatchPoints(). Individual players receive no
   * per-round points; team totals are tracked separately.
   */
  private awardRoundPoints(engine: GameEngine): void {
    const teamManager = TeamManager.getInstance();

    if (teamManager.isEnabled()) {
      this.awardTeamRoundPoints(engine, teamManager);
    } else {
      this.awardIndividualRoundPoints(engine);
    }
  }

  private awardIndividualRoundPoints(engine: GameEngine): void {
    // Sort players by deaths ascending (fewest = rank 1)
    const sorted = [...engine.players].sort(
      (a, b) => (this.deathCounts.get(a.id) ?? 0) - (this.deathCounts.get(b.id) ?? 0)
    );
    const ranks = GameMode.tiedRanks(sorted.map((p) => this.deathCounts.get(p.id) ?? 0));

    for (let i = 0; i < sorted.length; i++) {
      const bonus = this.placementBonuses[ranks[i] - 1] ?? 0;
      if (bonus > 0) {
        sorted[i].addPoints(bonus, "placement");
      }
    }

    const roundScores = sorted
      .map((p, i) => `${p.name}: ${this.deathCounts.get(p.id) ?? 0} deaths, +${sorted[i].points}pts`)
      .join(", ");
    logger.info("MODE", `Round ${engine.currentRound} individual scores: ${roundScores}`);
  }

  private awardTeamRoundPoints(engine: GameEngine, teamManager: TeamManager): void {
    const teamCount = teamManager.getTeamCount();

    // Sum deaths per team
    const teamDeaths: Array<{ teamId: number; totalDeaths: number }> = [];
    for (let i = 0; i < teamCount; i++) {
      const members = engine.players.filter(
        (p) => teamManager.getPlayerTeam(p.id) === i
      );
      const total = members.reduce(
        (sum, p) => sum + (this.deathCounts.get(p.id) ?? 0),
        0
      );
      teamDeaths.push({ teamId: i, totalDeaths: total });
    }

    // Sort teams by total deaths ascending (fewest = rank 1)
    teamDeaths.sort((a, b) => a.totalDeaths - b.totalDeaths);
    const teamRanks = GameMode.tiedRanks(teamDeaths.map((t) => t.totalDeaths));

    this.teamLastRoundPoints.clear();
    for (let i = 0; i < teamDeaths.length; i++) {
      const bonus = this.placementBonuses[teamRanks[i] - 1] ?? 0;
      teamManager.addMatchPoints(teamDeaths[i].teamId, bonus);
      this.teamLastRoundPoints.set(teamDeaths[i].teamId, bonus);
    }

    const roundScores = teamDeaths
      .map((t, i) => `Team ${t.teamId}: ${t.totalDeaths} deaths, +${this.teamLastRoundPoints.get(t.teamId) ?? 0}pts`)
      .join(", ");
    logger.info("MODE", `Round ${engine.currentRound} team scores: ${roundScores}`);
  }

  override onRoundEnd(engine: GameEngine): void {
    super.onRoundEnd(engine);

    // Transfer round points to total points
    engine.players.forEach((player) => {
      player.totalPoints += player.points;
    });

    // Log cumulative scores
    const cumulativeScores = [...engine.players]
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((p) => `${p.name}: ${p.points}pts (total: ${p.totalPoints})`)
      .join(", ");

    logger.info(
      "MODE",
      `Round ${engine.currentRound} cumulative: ${cumulativeScores}`
    );
  }

  override onGameEnd(engine: GameEngine): void {
    super.onGameEnd(engine);
    restoreMovementConfig();
  }

  override calculateFinalScores(engine: GameEngine): ScoreEntry[] {
    const teamManager = TeamManager.getInstance();

    if (teamManager.isEnabled()) {
      // In team mode, score = team's accumulated match points
      const sorted = [...engine.players].sort((a, b) => {
        const scoreA = teamManager.getMatchPoints(teamManager.getPlayerTeam(a.id) ?? 0);
        const scoreB = teamManager.getMatchPoints(teamManager.getPlayerTeam(b.id) ?? 0);
        return scoreB - scoreA;
      });
      const teamScoreList = sorted.map(
        (p) => teamManager.getMatchPoints(teamManager.getPlayerTeam(p.id) ?? 0)
      );
      const ranks = GameMode.tiedRanks(teamScoreList);
      return sorted.map((player, index) => ({
        player,
        score: teamScoreList[index],
        roundPoints: this.teamLastRoundPoints.get(teamManager.getPlayerTeam(player.id) ?? 0) ?? 0,
        rank: ranks[index],
        status: ranks[index] === 1 ? "Winner" : `Rank ${ranks[index]}`,
      }));
    }

    // Individual mode: sort by totalPoints
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
   * For team mode: supply team-level scores for the TeamScore payload builder,
   * so it shows accumulated match points instead of summing individual players.
   */
  override getTeamScoreData(): Map<number, { score: number; roundPoints: number }> | null {
    const teamManager = TeamManager.getInstance();
    if (!teamManager.isEnabled()) return null;

    const data = new Map<number, { score: number; roundPoints: number }>();
    for (let i = 0; i < teamManager.getTeamCount(); i++) {
      data.set(i, {
        score: teamManager.getMatchPoints(i),
        roundPoints: this.teamLastRoundPoints.get(i) ?? 0,
      });
    }
    return data;
  }

  override getPlayerDeathCount(playerId: string): number {
    return this.deathCounts.get(playerId) ?? 0;
  }
}
