import { useGameState } from '@/hooks/useGameState'
import PlayerCard from './PlayerCard'

function PlayerGrid() {
  const { sortedPlayers, players } = useGameState()

  if (players.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-2xl text-gray-500">
          Waiting for players to join...
        </p>
      </div>
    )
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

export default PlayerGrid