import { GameMode, type GameModeOptions } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { RespawnManager } from "@/managers/RespawnManager";
import { BaseManager } from "@/managers/BaseManager";
import { TeamManager, TEAM_DEFINITIONS } from "@/managers/TeamManager";
import { restoreMovementConfig, gameConfig, userPreferences } from "@/config/gameConfig";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export interface DominationModeOptions extends GameModeOptions {
  pointTarget?: number;
  controlIntervalMs?: number;
  respawnDelayMs?: number;
}

/**
 * DominationMode — Team-based objective mode with physical bases.
 *
 * Teams compete to control bases (phones placed in the play area).
 * Holding a base earns points over time. First team to the target wins.
 * No roles, no rounds — single continuous game.
 */
export class DominationMode extends GameMode {
  override name = "Domination";
  override description = "Control bases to earn points. First team to the target wins!";
  override minPlayers = 2;
  override maxPlayers = 20;
  override useRoles = false;
  override multiRound = false;
  override roundCount = 1;

  private teamScores: Map<number, number> = new Map();
  private deathCounts: Map<string, number> = new Map();
  private respawnManager: RespawnManager;
  private baseManager: BaseManager;
  private pointTarget: number;
  private controlIntervalMs: number;
  private captureDebounceTimers: Map<string, number> = new Map(); // baseId → gameTime of last capture

  constructor(options?: DominationModeOptions) {
    super(options);
    this.roundDuration = null; // No time limit
    this.pointTarget = options?.pointTarget ?? userPreferences.dominationPointTarget;
    this.controlIntervalMs = options?.controlIntervalMs ?? userPreferences.dominationControlInterval * 1000;
    const respawnDelay = options?.respawnDelayMs ?? userPreferences.dominationRespawnTime * 1000;
    this.respawnManager = new RespawnManager(respawnDelay);
    this.baseManager = BaseManager.getInstance();
  }

  override onModeSelected(engine: GameEngine): void {
    super.onModeSelected(engine);
    engine.setCountdownDuration(gameConfig.modeDefaults.domination.countdownSeconds);
  }

  override getRolePool(_playerCount: number): string[] {
    return [];
  }

  override getGameEvents(): string[] {
    return ["speed-shift"];
  }

  override onRoundStart(engine: GameEngine, roundNumber: number): void {
    super.onRoundStart(engine, roundNumber);

    // Initialize team scores
    const teamManager = TeamManager.getInstance();
    const teamCount = teamManager.getTeamCount();
    this.teamScores.clear();
    for (let i = 0; i < teamCount; i++) {
      this.teamScores.set(i, 0);
    }

    // Clear state
    this.deathCounts.clear();
    this.respawnManager.clear();
    this.captureDebounceTimers.clear();

    // Initialize death counts
    for (const player of engine.players) {
      this.deathCounts.set(player.id, 0);
    }

    // Reset all bases to neutral
    this.baseManager.resetOwnership(0);

    // Broadcast initial base status
    this.broadcastBaseStatus(0);
  }

  override onTick(engine: GameEngine, gameTime: number): void {
    // Check respawns first
    this.respawnManager.checkRespawns(engine, gameTime);

    // Check base point scoring
    const pointEvents = this.baseManager.checkPointScoring(gameTime, this.controlIntervalMs);
    for (const event of pointEvents) {
      // Award point to team
      const currentScore = this.teamScores.get(event.teamId) ?? 0;
      this.teamScores.set(event.teamId, currentScore + 1);

      // Emit base:point event
      gameEvents.emitBasePoint({
        baseId: event.baseId,
        baseNumber: event.baseNumber,
        teamId: event.teamId,
        teamScores: Object.fromEntries(this.teamScores),
      });

      logger.info("MODE", `Base ${event.baseNumber} scored for team ${event.teamId} (score: ${currentScore + 1})`);
    }

    // Broadcast base status each tick
    if (pointEvents.length > 0) {
      this.broadcastBaseStatus(gameTime);
    }

    // Run game events (SpeedShift etc.)
    super.onTick(engine, gameTime);
  }

  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    // Increment death count
    const currentDeaths = this.deathCounts.get(victim.id) ?? 0;
    this.deathCounts.set(victim.id, currentDeaths + 1);

    const alive = this.getAliveCount(engine);
    logger.info(
      "MODE",
      `${victim.name} died (death #${currentDeaths + 1}). ${alive} alive.`
    );

    super.onPlayerDeath(victim, engine);

    // Always schedule respawn in domination (no round end to worry about)
    this.respawnManager.scheduleRespawn(victim.id, engine.gameTime);
    this.respawnManager.emitRespawnPending(victim);

    logger.info("MODE", `${victim.name} will respawn at ${engine.gameTime + this.respawnManager.getDelay()}ms`);
  }

  override onBaseTap(baseId: string, engine: GameEngine): void {
    if (engine.gameState !== "active") return;

    const teamManager = TeamManager.getInstance();
    const teamCount = teamManager.getTeamCount();

    // Cycle ownership
    const newTeamId = this.baseManager.cycleOwner(baseId, teamCount, engine.gameTime);

    const teamDef = TEAM_DEFINITIONS[newTeamId];

    // Emit captured event
    gameEvents.emitBaseCaptured({
      baseId,
      baseNumber: this.baseManager.getBase(baseId)?.baseNumber ?? 0,
      teamId: newTeamId,
      teamName: teamDef?.name ?? `Team ${newTeamId}`,
      teamColor: teamDef?.color ?? "#888888",
    });

    // Broadcast updated base status
    this.broadcastBaseStatus(engine.gameTime);
  }

  override checkWinCondition(engine: GameEngine): WinCondition {
    // Check if any team reached the point target
    for (const [teamId, score] of this.teamScores) {
      if (score >= this.pointTarget) {
        const teamDef = TEAM_DEFINITIONS[teamId];

        // Emit domination win event
        gameEvents.emitDominationWin({
          winningTeamId: teamId,
          winningTeamName: teamDef?.name ?? `Team ${teamId}`,
          teamScores: Object.fromEntries(this.teamScores),
        });

        logger.info("MODE", `Team ${teamId} wins with ${score} points!`);

        return {
          roundEnded: true,
          gameEnded: true,
          winner: null, // No individual winner in domination
        };
      }
    }

    return {
      roundEnded: false,
      gameEnded: false,
      winner: null,
    };
  }

  override calculateFinalScores(engine: GameEngine): ScoreEntry[] {
    // Sort players by team, then by death count
    const teamManager = TeamManager.getInstance();
    const sorted = [...engine.players].sort((a, b) => {
      const teamA = teamManager.getPlayerTeam(a.id) ?? 0;
      const teamB = teamManager.getPlayerTeam(b.id) ?? 0;
      const scoreA = this.teamScores.get(teamA) ?? 0;
      const scoreB = this.teamScores.get(teamB) ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA; // Higher team score first
      const deathA = this.deathCounts.get(a.id) ?? 0;
      const deathB = this.deathCounts.get(b.id) ?? 0;
      return deathA - deathB; // Fewer deaths first
    });

    return sorted.map((player, index) => {
      const teamId = teamManager.getPlayerTeam(player.id) ?? 0;
      const teamScore = this.teamScores.get(teamId) ?? 0;
      return {
        player,
        score: teamScore,
        roundPoints: 0,
        rank: index + 1,
        status: index === 0 ? "Winner" : `Rank ${index + 1}`,
      };
    });
  }

  override onGameEnd(engine: GameEngine): void {
    super.onGameEnd(engine);
    restoreMovementConfig();
  }

  override getPlayerDeathCount(playerId: string): number {
    return this.deathCounts.get(playerId) ?? 0;
  }

  /**
   * Get current team scores.
   */
  getTeamScores(): Map<number, number> {
    return this.teamScores;
  }

  private broadcastBaseStatus(gameTime: number): void {
    const bases = this.baseManager.getAllBases().map((base) => {
      let controlProgress = 0;
      if (base.ownerTeamId !== null && base.isConnected) {
        const elapsed = gameTime - base.lastPointTime;
        controlProgress = Math.min(1, elapsed / this.controlIntervalMs);
      }
      return {
        baseId: base.baseId,
        baseNumber: base.baseNumber,
        ownerTeamId: base.ownerTeamId,
        controlProgress,
        isConnected: base.isConnected,
      };
    });

    gameEvents.emitBaseStatus({ bases });
  }
}
