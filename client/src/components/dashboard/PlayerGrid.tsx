import { useGameState } from '@/hooks/useGameState'
import { useGameStore } from '@/store/gameStore'
import PlayerCard from './PlayerCard'
import { TEAM_COLORS, getTeamName } from '@/utils/teamColors'
import { apiService } from '@/services/api'

function PlayerGrid() {
  const { sortedPlayers, players } = useGameState()
  const teamsEnabled = useGameStore((state) => state.teamsEnabled)

  if (players.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-2xl text-gray-500">
          Waiting for players to join...
        </p>
      </div>
    )
  }

  // Team lobby layout when teams are enabled and players have team assignments
  if (teamsEnabled && players.some((p) => p.teamId != null)) {
    return <TeamLobbyGrid players={players} />
  }

  // Determine grid layout based on player count
  const playerCount = players.length
  const gridCols = playerCount <= 12 ? 4 : playerCount <= 16 ? 4 : 5
  const gap = playerCount <= 16 ? 4 : 3

  return (
    <div
      className={`grid gap-${gap}`}
      style={{
        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
      }}
    >
      {sortedPlayers.map((player) => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  )
}

/**
 * Team-based lobby grid: splits players into team sections.
 * - 2 teams: 2 columns
 * - 3 teams: 3 columns
 * - 4 teams: 2x2 grid
 */
function TeamLobbyGrid({ players }: { players: ReturnType<typeof useGameState>['players'] }) {
  // Group players by team
  const teamGroups = new Map<number, typeof players>()
  const unassigned: typeof players = []

  for (const player of players) {
    const teamId = player.teamId
    if (teamId != null && teamId >= 0) {
      if (!teamGroups.has(teamId)) {
        teamGroups.set(teamId, [])
      }
      teamGroups.get(teamId)!.push(player)
    } else {
      unassigned.push(player)
    }
  }

  // Sort teams by ID
  const sortedTeamIds = [...teamGroups.keys()].sort((a, b) => a - b)
  const teamCount = sortedTeamIds.length || 2

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: teamCount <= 3
          ? `repeat(${teamCount}, minmax(0, 1fr))`
          : 'repeat(2, minmax(0, 1fr))',
      }}
    >
      {sortedTeamIds.map((teamId) => {
        const teamPlayers = teamGroups.get(teamId) || []
        const teamColor = TEAM_COLORS[teamId] || TEAM_COLORS[0]
        const teamName = getTeamName(teamId)

        return (
          <div
            key={teamId}
            className="rounded-lg p-4 border-2"
            style={{
              borderColor: teamColor.border,
              backgroundColor: teamColor.tint,
            }}
          >
            {/* Team header */}
            <h3
              className="text-lg font-bold mb-3 text-center"
              style={{ color: teamColor.primary }}
            >
              {teamName} ({teamPlayers.length})
            </h3>

            {/* Compact player cards */}
            <div className="flex flex-wrap gap-2">
              {teamPlayers
                .sort((a, b) => a.number - b.number)
                .map((player) => (
                  <CompactPlayerCard
                    key={player.id}
                    player={player}
                    teamColor={teamColor.primary}
                    showKick
                  />
                ))}
            </div>
          </div>
        )
      })}

      {/* Show unassigned players if any */}
      {unassigned.length > 0 && (
        <div className="rounded-lg p-4 border-2 border-gray-600 bg-gray-800/50">
          <h3 className="text-lg font-bold mb-3 text-center text-gray-400">
            Unassigned ({unassigned.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unassigned
              .sort((a, b) => a.number - b.number)
              .map((player) => (
                <CompactPlayerCard
                  key={player.id}
                  player={player}
                  teamColor="#6b7280"
                  showKick
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact player card for team lobby: just number + name + ready badge.
 */
function CompactPlayerCard({
  player,
  teamColor,
  showKick,
}: {
  player: { id: string; name: string; number: number; isReady?: boolean; isConnected?: boolean }
  teamColor: string
  showKick?: boolean
}) {
  const isDisconnected = player.isConnected === false

  return (
    <div
      className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 bg-gray-800/80 ${
        isDisconnected ? 'opacity-40' : ''
      }`}
      style={{ borderLeft: `3px solid ${isDisconnected ? '#4b5563' : teamColor}` }}
    >
      <span className="font-bold text-white">#{player.number}</span>
      <span className="text-gray-300 truncate max-w-[80px]">{player.name}</span>
      {isDisconnected ? (
        <span className="text-gray-500 text-xs font-bold">OFFLINE</span>
      ) : player.isReady ? (
        <span className="text-green-400 text-xs font-bold">✓</span>
      ) : null}
      {showKick && (
        <button
          onClick={() => apiService.kickPlayer(player.id)}
          className="ml-auto text-red-400 hover:text-red-300 text-xs font-bold px-1"
          title={`Kick ${player.name}`}
        >
          X
        </button>
      )}
    </div>
  )
}

export default PlayerGrid
