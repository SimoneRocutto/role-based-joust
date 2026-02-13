import { Server as SocketIOServer } from "socket.io";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { TeamManager } from "@/managers/TeamManager";
import type { ScoreEntry } from "@/types/game.types";
import type { ClientScoreEntry, TeamScore } from "@shared/types";

const connectionManager = ConnectionManager.getInstance();
const teamManager = TeamManager.getInstance();

/**
 * Map ScoreEntry[] (with BasePlayer) to flat client objects with playerNumber + teamId.
 */
export function formatScoresForClient(scores: ScoreEntry[]): ClientScoreEntry[] {
  return scores.map((s) => ({
    playerId: s.player.id,
    playerName: s.player.name,
    playerNumber: connectionManager.getPlayerNumber(s.player.id) ?? 0,
    score: s.score,
    roundPoints: s.roundPoints,
    rank: s.rank,
    status: s.status,
    teamId: teamManager.isEnabled() ? teamManager.getPlayerTeam(s.player.id) : null,
  }));
}

/**
 * Build team score aggregations from individual player scores.
 */
export function buildTeamScores(scores: ClientScoreEntry[]): TeamScore[] {
  const teamCount = teamManager.getTeamCount();
  const teamScores: TeamScore[] = [];

  for (let i = 0; i < teamCount; i++) {
    const info = teamManager.getTeamInfo(i);
    const teamPlayers = scores.filter((s) => s.teamId === i);
    const totalScore = teamPlayers.reduce((sum, s) => sum + s.score, 0);
    const totalRoundPoints = teamPlayers.reduce((sum, s) => sum + s.roundPoints, 0);

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

  // Sort by score descending and assign ranks
  teamScores.sort((a, b) => b.score - a.score);
  teamScores.forEach((ts, idx) => {
    ts.rank = idx + 1;
  });

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
