import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * Team color definitions matching the client-side TEAM_COLORS.
 */
export const TEAM_DEFINITIONS = [
  { id: 0, name: "Red Team", color: "#ef4444" },
  { id: 1, name: "Blue Team", color: "#3b82f6" },
  { id: 2, name: "Green Team", color: "#22c55e" },
  { id: 3, name: "Yellow Team", color: "#eab308" },
] as const;

export interface TeamInfo {
  id: number;
  name: string;
  color: string;
}

/**
 * TeamManager — Manages team assignments for players.
 *
 * Responsibilities:
 * - Assign players to teams (sequential by player number)
 * - Handle team switching (cycling)
 * - Shuffle team assignments
 * - Validate team constraints (at least 1 player per team)
 * - Provide team data for lobby updates, scoring, etc.
 */
export class TeamManager {
  private static instance: TeamManager;

  /** Map: playerId → teamId */
  private assignments: Map<string, number> = new Map();
  private teamCount: number = 2;
  private enabled: boolean = false;
  private selectionActive: boolean = false;

  private constructor() {}

  static getInstance(): TeamManager {
    if (!TeamManager.instance) {
      TeamManager.instance = new TeamManager();
    }
    return TeamManager.instance;
  }

  /**
   * Configure teams (called when settings change or game starts).
   */
  configure(enabled: boolean, teamCount: number): void {
    this.enabled = enabled;
    this.teamCount = Math.max(2, Math.min(4, teamCount));
    logger.info("TEAMS", `Teams configured: enabled=${enabled}, count=${this.teamCount}`);
  }

  /**
   * Whether teams are currently enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the current team count.
   */
  getTeamCount(): number {
    return this.teamCount;
  }

  /**
   * Assign players to teams sequentially by their position in the array.
   * Players are distributed round-robin: player 0 → team 0, player 1 → team 1, etc.
   * @param playerIds - Array of player IDs in order (typically sorted by player number)
   */
  assignSequential(playerIds: string[]): void {
    this.assignments.clear();
    for (let i = 0; i < playerIds.length; i++) {
      this.assignments.set(playerIds[i], i % this.teamCount);
    }
    logger.info("TEAMS", `Sequential assignment: ${playerIds.length} players across ${this.teamCount} teams`);
  }

  /**
   * Shuffle all players randomly across teams.
   * Ensures balanced distribution (difference of at most 1 between teams).
   */
  shuffle(playerIds: string[]): void {
    // Fisher-Yates shuffle
    const shuffled = [...playerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    this.assignments.clear();
    for (let i = 0; i < shuffled.length; i++) {
      this.assignments.set(shuffled[i], i % this.teamCount);
    }
    logger.info("TEAMS", `Shuffled: ${playerIds.length} players across ${this.teamCount} teams`);
  }

  /**
   * Cycle a player to the next team.
   * Returns the new teamId.
   */
  cyclePlayerTeam(playerId: string): number {
    const currentTeam = this.assignments.get(playerId) ?? 0;
    const newTeam = (currentTeam + 1) % this.teamCount;
    this.assignments.set(playerId, newTeam);
    logger.debug("TEAMS", `Player ${playerId} switched: team ${currentTeam} → ${newTeam}`);
    return newTeam;
  }

  /**
   * Get team assignment for a player.
   * Returns null if teams are disabled or player not assigned.
   */
  getPlayerTeam(playerId: string): number | null {
    if (!this.enabled) return null;
    return this.assignments.get(playerId) ?? null;
  }

  /**
   * Get all team assignments as a map: teamId → playerId[]
   */
  getTeamAssignments(): Record<number, string[]> {
    const teams: Record<number, string[]> = {};
    for (let i = 0; i < this.teamCount; i++) {
      teams[i] = [];
    }
    for (const [playerId, teamId] of this.assignments) {
      if (!teams[teamId]) teams[teamId] = [];
      teams[teamId].push(playerId);
    }
    return teams;
  }

  /**
   * Get team info (name, color) for a team ID.
   */
  getTeamInfo(teamId: number): TeamInfo {
    if (teamId >= 0 && teamId < TEAM_DEFINITIONS.length) {
      return { ...TEAM_DEFINITIONS[teamId] };
    }
    return { id: teamId, name: `Team ${teamId + 1}`, color: "#6b7280" };
  }

  /**
   * Validate that no team is empty.
   * Returns true if all teams have at least 1 player.
   */
  validateTeams(): { valid: boolean; message?: string } {
    if (!this.enabled) return { valid: true };

    const teams = this.getTeamAssignments();
    for (let i = 0; i < this.teamCount; i++) {
      if (!teams[i] || teams[i].length === 0) {
        return {
          valid: false,
          message: `${this.getTeamInfo(i).name} has no players. At least 1 player per team is required.`,
        };
      }
    }
    return { valid: true };
  }

  /**
   * Remove a player from team assignments.
   */
  removePlayer(playerId: string): void {
    this.assignments.delete(playerId);
  }

  /**
   * Add a player to teams using sequential logic based on current team sizes.
   * Assigns to the team with the fewest members.
   */
  addPlayer(playerId: string): number {
    // Find team with fewest members
    const teams = this.getTeamAssignments();
    let minTeam = 0;
    let minCount = Infinity;
    for (let i = 0; i < this.teamCount; i++) {
      const count = teams[i]?.length ?? 0;
      if (count < minCount) {
        minCount = count;
        minTeam = i;
      }
    }
    this.assignments.set(playerId, minTeam);
    return minTeam;
  }

  /**
   * Start the team selection phase.
   * Assigns teams sequentially if no assignments exist yet.
   */
  startSelection(playerIds: string[]): void {
    this.selectionActive = true;
    // Only assign if not already assigned
    const hasAssignments = playerIds.some((id) => this.assignments.has(id));
    if (!hasAssignments) {
      this.assignSequential(playerIds);
    }
    logger.info("TEAMS", `Team selection started with ${playerIds.length} players`);
  }

  /**
   * End the team selection phase.
   */
  endSelection(): void {
    this.selectionActive = false;
    logger.debug("TEAMS", "Team selection ended");
  }

  /**
   * Whether the team selection phase is currently active.
   */
  isSelectionActive(): boolean {
    return this.selectionActive;
  }

  /**
   * Clear all team assignments. Called on game stop / new game.
   */
  reset(): void {
    this.assignments.clear();
    this.selectionActive = false;
    logger.debug("TEAMS", "Team assignments cleared");
  }

  /**
   * Get the number of players assigned to each team.
   */
  getTeamSizes(): number[] {
    const sizes = new Array(this.teamCount).fill(0);
    for (const teamId of this.assignments.values()) {
      if (teamId < sizes.length) {
        sizes[teamId]++;
      }
    }
    return sizes;
  }
}
