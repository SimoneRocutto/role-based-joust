import { GameMode, type GameModeOptions } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";
import { TeamManager } from "@/managers/TeamManager";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { GameEvents } from "@/utils/GameEvents";
import { gameConfig } from "@/config/gameConfig";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * KingMode — "Long live the king"
 *
 * Rules:
 * - Team-based (teams required)
 * - At round start, one player per team is randomly chosen as king
 * - When a king dies, all their teammates die instantly
 * - Round ends when only one team remains alive
 * - Points: placement bonuses per round (5-3-1-0) for teams
 * - Multi-round (default 3 rounds)
 */
export class KingMode extends GameMode {
  override name = "Long live the king";
  override description = "Protect your king! Teams lose when their king falls.";
  override minPlayers = 2;
  override maxPlayers = 20;
  override useRoles = false;

  /** playerId of the king for each team this round */
  private teamKings: Map<number, string> = new Map();

  /** Teams in elimination order (first eliminated first) */
  private eliminationOrder: number[] = [];

  /** Track which team was just checked to avoid double-recording */
  private eliminatedTeams: Set<number> = new Set();

  /** Last-round team placement bonus earned (for score display) */
  private teamLastRoundPoints: Map<number, number> = new Map();

  constructor(options?: GameModeOptions) {
    super(options);
    if (options?.roundCount === undefined) {
      this.roundCount = 3;
    }
    this.multiRound = true;
  }

  override onModeSelected(engine: GameEngine): void {
    super.onModeSelected(engine);
    engine.setCountdownDuration(gameConfig.modeDefaults.classic.countdownSeconds);
  }

  override getRolePool(_playerCount: number): string[] {
    return [];
  }

  override onRoundStart(engine: GameEngine, roundNumber: number): void {
    super.onRoundStart(engine, roundNumber);

    this.teamKings.clear();
    this.eliminationOrder = [];
    this.eliminatedTeams.clear();

    const teamManager = TeamManager.getInstance();
    const teamCount = teamManager.getTeamCount();

    for (let teamId = 0; teamId < teamCount; teamId++) {
      const members = engine.players.filter(
        (p) => teamManager.getPlayerTeam(p.id) === teamId && p.isAlive
      );
      if (members.length === 0) continue;

      const king = members[Math.floor(Math.random() * members.length)];
      this.teamKings.set(teamId, king.id);

      logger.info("MODE", `Team ${teamId} king: ${king.name} (${king.id})`);

      // Use ConnectionManager for the current socketId — player.socketId can be
      // stale if the socket reconnected between game launch and round start.
      const currentSocketId =
        ConnectionManager.getInstance().getSocketId(king.id) ?? king.socketId;
      gameEvents.emitKingCrowned({ playerId: king.id, socketId: currentSocketId });
    }
  }

  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    super.onPlayerDeath(victim, engine);

    const teamManager = TeamManager.getInstance();
    const victimTeam = teamManager.getPlayerTeam(victim.id);
    if (victimTeam === null) return;

    const isKing = this.teamKings.get(victimTeam) === victim.id;

    if (isKing) {
      logger.info("MODE", `King ${victim.name} (team ${victimTeam}) died — killing teammates`);

      // Kill all alive teammates
      const teammates = engine.players.filter(
        (p) => p.id !== victim.id && teamManager.getPlayerTeam(p.id) === victimTeam && p.isAlive
      );
      for (const teammate of teammates) {
        teammate.die(engine.gameTime);
      }
    }

    // Check if this team is now fully eliminated
    if (!this.eliminatedTeams.has(victimTeam)) {
      const teamAlive = engine.players.some(
        (p) => teamManager.getPlayerTeam(p.id) === victimTeam && p.isAlive
      );
      if (!teamAlive) {
        this.eliminatedTeams.add(victimTeam);
        this.eliminationOrder.push(victimTeam);
        logger.info("MODE", `Team ${victimTeam} eliminated (position ${this.eliminationOrder.length})`);
      }
    }
  }

  override checkWinCondition(engine: GameEngine): WinCondition {
    const teamManager = TeamManager.getInstance();
    const teamCount = teamManager.getTeamCount();

    // Count teams with at least one effectively alive player
    const aliveTeams: number[] = [];
    for (let teamId = 0; teamId < teamCount; teamId++) {
      const hasAlive = engine.players.some(
        (p) => teamManager.getPlayerTeam(p.id) === teamId &&
               p.isAlive &&
               !p.isDisconnectedBeyondGrace(engine.gameTime)
      );
      if (hasAlive) aliveTeams.push(teamId);
    }

    if (aliveTeams.length > 1) {
      return { roundEnded: false, gameEnded: false, winner: null };
    }

    // Award team placement bonuses before round ends
    this.awardTeamRoundPoints(teamCount, aliveTeams[0] ?? null);

    const gameEnded = engine.currentRound >= this.roundCount;
    return { roundEnded: true, gameEnded, winner: null };
  }

  private awardTeamRoundPoints(teamCount: number, survivingTeamId: number | null): void {
    const teamManager = TeamManager.getInstance();

    // Build ranked order: surviving team first, then reversed elimination order
    const ranked: number[] = [];
    if (survivingTeamId !== null) ranked.push(survivingTeamId);
    for (let i = this.eliminationOrder.length - 1; i >= 0; i--) {
      ranked.push(this.eliminationOrder[i]);
    }
    // Add any teams not yet in ranked (edge case: teams with no players assigned)
    for (let t = 0; t < teamCount; t++) {
      if (!ranked.includes(t)) ranked.push(t);
    }

    this.teamLastRoundPoints.clear();
    for (let i = 0; i < ranked.length; i++) {
      const bonus = this.placementBonuses[i] ?? 0;
      teamManager.addMatchPoints(ranked[i], bonus);
      this.teamLastRoundPoints.set(ranked[i], bonus);
      logger.info("MODE", `Team ${ranked[i]} earned ${bonus} match points (rank ${i + 1})`);
    }
  }

  override calculateFinalScores(engine: GameEngine): ScoreEntry[] {
    const teamManager = TeamManager.getInstance();

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

  override getIsKing(playerId: string): boolean {
    for (const kingId of this.teamKings.values()) {
      if (kingId === playerId) return true;
    }
    return false;
  }
}
