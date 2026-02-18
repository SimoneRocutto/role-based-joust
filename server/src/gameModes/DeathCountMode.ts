import { GameMode, type GameModeOptions } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { restoreMovementConfig, gameConfig } from "@/config/gameConfig";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

const RESPAWN_DELAY = gameConfig.modeDefaults.deathCount.respawnDelayMs;

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
  private pendingRespawns: Map<string, number> = new Map(); // playerId → respawnAtTime

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
    this.pendingRespawns.clear();

    // Initialize death counts for all players
    for (const player of engine.players) {
      this.deathCounts.set(player.id, 0);
    }

    // Listen for player deaths via GameEvents (round-scoped, auto-cleaned)
    gameEvents.onPlayerDeath((payload) => {
      this.onPlayerDeath(payload.victim, engine);
    });
  }

  override onTick(engine: GameEngine, gameTime: number): void {
    super.onTick(engine, gameTime);

    // Check pending respawns
    for (const [playerId, respawnAt] of this.pendingRespawns) {
      if (gameTime >= respawnAt) {
        this.respawnPlayer(playerId, engine, gameTime);
      }
    }
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
    if (
      this.roundDuration !== null &&
      engine.gameTime + RESPAWN_DELAY < this.roundDuration
    ) {
      const respawnAt = engine.gameTime + RESPAWN_DELAY;
      this.pendingRespawns.set(victim.id, respawnAt);

      // Emit respawn-pending to the dying player
      gameEvents.emitPlayerRespawnPending({
        player: victim,
        respawnIn: RESPAWN_DELAY,
      });

      logger.info("MODE", `${victim.name} will respawn at ${respawnAt}ms`);
    } else {
      logger.info(
        "MODE",
        `${victim.name} will NOT respawn (too close to round end)`
      );
    }
  }

  private respawnPlayer(
    playerId: string,
    engine: GameEngine,
    gameTime: number
  ): void {
    const player = engine.getPlayerById(playerId);
    if (!player) return;

    this.pendingRespawns.delete(playerId);

    player.isAlive = true;
    player.clearStatusEffects(gameTime);

    // Emit respawn event
    gameEvents.emitPlayerRespawn({ player, gameTime });

    logger.info("MODE", `${player.name} respawned at ${gameTime}ms`);
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
   * Award round points using "players beaten" scoring:
   * Each player's round points = number of players who died MORE times than them.
   */
  private awardRoundPoints(engine: GameEngine): void {
    const playerDeaths: Array<{ player: BasePlayer; deaths: number }> = [];

    for (const player of engine.players) {
      playerDeaths.push({
        player,
        deaths: this.deathCounts.get(player.id) ?? 0,
      });
    }

    for (const entry of playerDeaths) {
      const playersBeaten = playerDeaths.filter(
        (other) => other.deaths > entry.deaths
      ).length;
      if (playersBeaten > 0) {
        entry.player.addPoints(playersBeaten, "players_beaten");
      }
    }

    // Log round scores
    const roundScores = playerDeaths
      .sort((a, b) => a.deaths - b.deaths)
      .map((e) => `${e.player.name}: ${e.deaths} deaths, ${e.player.points}pts`)
      .join(", ");

    logger.info("MODE", `Round ${engine.currentRound} scores: ${roundScores}`);
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

  override getPlayerDeathCount(playerId: string): number {
    return this.deathCounts.get(playerId) ?? 0;
  }
}
