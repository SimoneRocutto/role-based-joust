import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { socketService } from '@/services/socket'
import { useGameState } from '@/hooks/useGameState'
import { generateUUID } from '@/utils/formatters'
import Logo from '@/components/shared/Logo'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

function JoinView() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  const { isConnected, setMyPlayer } = useGameState()

  // Listen for join response
  useEffect(() => {
    socketService.onPlayerJoined((data) => {
      if (data.success) {
        // Store session data
        localStorage.setItem('sessionToken', data.sessionToken)
        localStorage.setItem('playerId', data.playerId)
        localStorage.setItem('playerNumber', data.playerNumber.toString())

        // Update store
        setMyPlayer(data.playerId, data.playerNumber)

        // Navigate to player view
        navigate('/player')
      }
    })

    socketService.onError((errorData) => {
      setError(errorData.message)
      setJoining(false)
    })

    return () => {
      socketService.off('player:joined')
      socketService.off('error')
    }
  }, [navigate, setMyPlayer])

  const handleJoin = () => {
    const trimmedName = name.trim()

    // Validation
    if (trimmedName.length === 0) {
      setError('Name is required')
      return
    }

    if (trimmedName.length > 20) {
      setError('Name must be 20 characters or less')
      return
    }

    if (!isConnected) {
      setError('Not connected to server. Check your WiFi.')
      return
    }

    setError(null)
    setJoining(true)

    // Generate player ID and join
    const playerId = generateUUID()
    socketService.joinGame({
      playerId,
      name: trimmedName
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin()
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Logo size="lg" />
          <p className="mt-4 text-gray-400 text-lg">
            Motion-based party game
          </p>
        </div>

        {/* Connection Status */}
        <div className="text-center">
          {isConnected ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Connected to server</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-red-400">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span>Connecting to server...</span>
            </div>
          )}
        </div>

        {/* Join Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm text-gray-400 mb-2">
              Enter your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Your name..."
              maxLength={20}
              disabled={joining || !isConnected}
              className="w-full px-4 py-3 text-xl rounded-lg bg-gray-800 text-white border-2 border-gray-700 focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />
            <div className="mt-1 text-sm text-gray-500 text-right">
              {name.length}/20
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Join Button */}
          <button
            onClick={handleJoin}
            disabled={joining || !isConnected || name.trim().length === 0}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-bold rounded-lg transition-colors"
          >
            {joining ? (
              <div className="flex items-center justify-center gap-3">
                <LoadingSpinner size="sm" />
                <span>JOINING...</span>
              </div>
            ) : (
              'JOIN GAME'
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>📱 Make sure your phone is on the same WiFi network</p>
          <p>🎧 Use one earbud for private audio cues</p>
          <p>🔒 Keep your phone bound to your chest during gameplay</p>
        </div>

        {/* Lobby Code (optional, for future use) */}
        <div className="text-center text-xs text-gray-600">
          Lobby Code: #GAME-{Math.random().toString(36).substring(2, 6).toUpperCase()}
        </div>
      </div>
    </div>
  )
}

export default JoinView