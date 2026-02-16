import { apiService } from '@/services/api'

interface CompactPlayerCardProps {
  player: { id: string; name: string; number: number; isReady?: boolean; isConnected?: boolean }
  teamColor: string
  showKick?: boolean
}

/**
 * Compact player card: just number + name + ready badge + optional kick button.
 * Used in team lobby grid and lobby action bar.
 */
function CompactPlayerCard({ player, teamColor, showKick }: CompactPlayerCardProps) {
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

export default CompactPlayerCard
