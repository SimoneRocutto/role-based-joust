import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { socketService } from '@/services/socket'
import { useGameState } from '@/hooks/useGameState'
import { generateUUID } from '@/utils/formatters'
import { validateMotionAccess, requestWakeLock } from '@/utils/permissions'
import Logo from '@/components/shared/Logo'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

type PermissionState = 'pending' | 'testing' | 'granted' | 'denied';

// In development mode, skip motion validation for browser testing
// Use ?mode=production URL param to test production behavior in dev
const getEffectiveDevMode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const modeOverride = urlParams.get('mode');
  if (modeOverride === 'production') return false;
  return import.meta.env.DEV;
};

const isDevMode = getEffectiveDevMode();

function JoinView() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  // Auto-grant permission in dev mode to allow browser testing
  const [permissionState, setPermissionState] = useState<PermissionState>(isDevMode ? 'granted' : 'pending')

  const { isConnected, setMyPlayer, updatePlayer } = useGameState()

  // Listen for join response
  useEffect(() => {
    socketService.onPlayerJoined((data) => {
      if (data.success) {
        // Store session data
        localStorage.setItem('sessionToken', data.sessionToken)
        localStorage.setItem('playerId', data.playerId)
        localStorage.setItem('playerNumber', data.playerNumber.toString())
        localStorage.setItem('playerName', data.name || name)

        // Update store with player IDs
        setMyPlayer(data.playerId, data.playerNumber)

        // Set initial player state (alive, waiting for game)
        updatePlayer({
          id: data.playerId,
          name: data.name || name,
          number: data.playerNumber,
          role: '',
          isAlive: true,
          points: 0,
          totalPoints: 0,
          toughness: 1.0,
          accumulatedDamage: 0,
          statusEffects: [],
        })

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

  const handleEnableMotion = async () => {
    setError(null)
    setPermissionState('testing')

    // Validate motion access (requests permission + tests data flow)
    const result = await validateMotionAccess()

    if (result.success) {
      setPermissionState('granted')
      // Also request wake lock for mobile
      requestWakeLock()
    } else {
      setPermissionState('denied')
      setError(result.error || 'Motion access failed')
    }
  }

  const handleRetryPermission = () => {
    setPermissionState('pending')
    setError(null)
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

        {/* Motion Permission Gate */}
        {permissionState !== 'granted' && (
          <div className="space-y-4">
            {permissionState === 'pending' && (
              <button
                onClick={handleEnableMotion}
                className="w-full py-6 bg-purple-600 hover:bg-purple-700 text-white text-xl font-bold rounded-lg transition-colors flex flex-col items-center gap-2"
              >
                <span className="text-3xl">📱</span>
                <span>TAP TO ENABLE MOTION</span>
                <span className="text-sm font-normal text-purple-200">
                  Required for gameplay
                </span>
              </button>
            )}

            {permissionState === 'testing' && (
              <div className="p-6 bg-gray-800 rounded-lg text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-300">Testing motion sensors...</p>
                <p className="text-sm text-gray-500">Try moving your device</p>
              </div>
            )}

            {permissionState === 'denied' && (
              <div className="space-y-4">
                <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
                  <p className="text-red-200 font-semibold">Motion Access Required</p>
                  <p className="text-red-300 text-sm mt-2">
                    {error || 'Motion sensors are required to play.'}
                  </p>
                </div>
                <button
                  onClick={handleRetryPermission}
                  className="w-full py-4 bg-gray-700 hover:bg-gray-600 text-white text-lg font-semibold rounded-lg transition-colors"
                >
                  TRY AGAIN
                </button>
              </div>
            )}
          </div>
        )}

        {/* Join Form - Only shown after motion permission granted */}
        {permissionState === 'granted' && (
          <div className="space-y-4">
            {isDevMode ? (
              <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
                <span className="text-sm font-mono">[DEV MODE]</span>
                <span className="text-gray-400 text-sm">Motion check bypassed</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                <span className="text-xl">✓</span>
                <span>Motion enabled</span>
              </div>
            )}

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
        )}

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