import { Server as SocketIOServer } from "socket.io";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { TeamManager } from "@/managers/TeamManager";
import type { ScoreEntry } from "@/types/game.types";
import type { ClientScoreEntry, TeamScore } from "@shared/types";

const connectionManager = ConnectionManager.getInstance();
const teamManager = TeamManager.getInstance();

/**
 * Map ScoreEntry[] (with BasePlayer) to flat client objects with playerNumber + teamId.
 * @param getDeathCount - Optional getter for per-player death count (used in death-tracking modes)
 */
export function formatScoresForClient(
  scores: ScoreEntry[],
  getDeathCount?: (playerId: string) => number
): ClientScoreEntry[] {
  return scores.map((s) => ({
    playerId: s.player.id,
    playerName: s.player.name,
    playerNumber: connectionManager.getPlayerNumber(s.player.id) ?? 0,
    score: s.score,
    roundPoints: s.roundPoints,
    rank: s.rank,
    status: s.status,
    teamId: teamManager.isEnabled() ? teamManager.getPlayerTeam(s.player.id) : null,
    deathCount: getDeathCount ? getDeathCount(s.player.id) : undefined,
  }));
}

/**
 * Build team score aggregations from individual player scores.
 *
 * @param teamScoreData - Optional override for modes that track team-level
 *   scores separately (e.g. DeathCountMode team scoring). When provided,
 *   score/roundPoints come from this map instead of summing player entries.
 */
export function buildTeamScores(
  scores: ClientScoreEntry[],
  teamScoreData?: Map<number, { score: number; roundPoints: number }> | null
): TeamScore[] {
  const teamCount = teamManager.getTeamCount();
  const teamScores: TeamScore[] = [];

  for (let i = 0; i < teamCount; i++) {
    const info = teamManager.getTeamInfo(i);
    const teamPlayers = scores.filter((s) => s.teamId === i);
    const override = teamScoreData?.get(i);
    const totalScore = override !== undefined
      ? override.score
      : teamPlayers.reduce((sum, s) => sum + s.score, 0);
    const totalRoundPoints = override !== undefined
      ? override.roundPoints
      : teamPlayers.reduce((sum, s) => sum + s.roundPoints, 0);

    teamScores.push({
      teamId: i,
      teamName: info.name,
      teamColor: info.color,
      score: totalScore,
      roundPoints: totalRoundPoints,
      rank: 0, // Will be set below
      players: teamPlayers,
    });
  }

  // Sort by score descending and assign tied ranks
  teamScores.sort((a, b) => b.score - a.score);
  let rank = 1;
  let i = 0;
  while (i < teamScores.length) {
    let j = i;
    while (j < teamScores.length && teamScores[j].score === teamScores[i].score) j++;
    for (let k = i; k < j; k++) teamScores[k].rank = rank;
    rank += j - i;
    i = j;
  }

  return teamScores;
}

/**
 * Build lobby player list with team info for broadcasting.
 */
export function getLobbyPlayersWithTeams() {
  const players = connectionManager.getLobbyPlayers();
  return players.map((p) => ({
    ...p,
    teamId: teamManager.isEnabled() ? teamManager.getPlayerTeam(p.id) : null,
  }));
}

/**
 * Broadcast lobby:update to all clients with current player list (enriched with teams).
 */
export function broadcastLobbyUpdate(io: SocketIOServer): void {
  io.emit("lobby:update", {
    players: getLobbyPlayersWithTeams(),
  });
}

/**
 * Broadcast team:update to all clients with current team assignments.
 */
export function broadcastTeamUpdate(io: SocketIOServer): void {
  if (teamManager.isEnabled()) {
    io.emit("team:update", {
      teams: teamManager.getTeamAssignments(),
    });
  }
}
