import { useGameState } from '@/hooks/useGameState'

function ConnectionStatus() {
  const { isConnected, isReconnecting, reconnectAttempts } = useGameState()

  if (isConnected && !isReconnecting) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <div className="w-3 h-3 bg-green-500 rounded-full" />
        <span>Connected</span>
      </div>
    )
  }

  if (isReconnecting) {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-400">
        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
        <span>Reconnecting... ({reconnectAttempts}/5)</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-400">
      <div className="w-3 h-3 bg-red-500 rounded-full" />
      <span>Disconnected</span>
    </div>
  )
}

export default ConnectionStatus