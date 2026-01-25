import { useState, useEffect } from 'react'
import { useGameState } from '@/hooks/useGameState'
import { apiService } from '@/services/api'
import { socketService } from '@/services/socket'
import type { GameMode } from '@/types/game.types'

function AdminControls() {
  const { players } = useGameState()
  const [modes, setModes] = useState<GameMode[]>([])
  const [selectedMode, setSelectedMode] = useState('role-based')
  const [selectedTheme, setSelectedTheme] = useState('standard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available game modes
  useEffect(() => {
    apiService
      .getGameModes()
      .then((data) => {
        if (data.success) {
          setModes(data.modes)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch game modes:', err)
        setError('Failed to load game modes')
      })
  }, [])

  const handleCreateGame = async () => {
    setLoading(true)
    setError(null)

    try {
      // Create game with selected mode
      const result = await apiService.createGame({
        mode: selectedMode,
        theme: selectedMode === 'role-based' ? selectedTheme : undefined
      })

      if (!result.success) {
        throw new Error('Failed to create game')
      }

      console.log('Game created:', result)
    } catch (err) {
      console.error('Failed to create game:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleStartGame = async () => {
    if (players.length < 2) {
      setError('Need at least 2 players to start')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Start game with connected players
      const result = await apiService.startGame({
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          socketId: '' // Server will use current socket ID
        }))
      })

      if (!result.success) {
        throw new Error('Failed to start game')
      }

      console.log('Game started:', result)
    } catch (err) {
      console.error('Failed to start game:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4">Admin Controls</h2>

      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Game Mode</label>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
            disabled={loading}
          >
            {modes.map((mode) => (
              <option key={mode.key} value={mode.key}>
                {mode.name}
              </option>
            ))}
          </select>
        </div>

        {selectedMode === 'role-based' && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Theme</label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
              disabled={loading}
            >
              <option value="standard">Standard</option>
              <option value="halloween">Halloween</option>
              <option value="mafia">Mafia</option>
              <option value="fantasy">Fantasy</option>
              <option value="scifi">Sci-Fi</option>
            </select>
          </div>
        )}
      </div>

      {/* Connected Players */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">
          Connected Players: {players.length}
        </h3>
        {players.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="px-3 py-2 bg-gray-700 rounded text-sm"
              >
                #{p.number} {p.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No players connected yet...</p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleCreateGame}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>

        <button
          onClick={handleStartGame}
          disabled={loading || players.length < 2}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Starting...' : `Start Game (${players.length} players)`}
        </button>
      </div>
    </div>
  )
}

export default AdminControls