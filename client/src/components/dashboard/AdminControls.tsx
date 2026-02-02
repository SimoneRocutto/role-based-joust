import { useState, useEffect } from 'react'
import { useGameState } from '@/hooks/useGameState'
import { useGameStore } from '@/store/gameStore'
import { apiService } from '@/services/api'
import type { GameMode } from '@/types/game.types'

function AdminControls() {
  const { players } = useGameState()
  const { isDevMode, readyCount } = useGameStore()
  const [modes, setModes] = useState<GameMode[]>([])
  const [selectedMode, setSelectedMode] = useState('role-based')
  const [selectedTheme, setSelectedTheme] = useState('standard')
  const [selectedSensitivity, setSelectedSensitivity] = useState('medium')
  const [sensitivityPresets, setSensitivityPresets] = useState<
    Array<{ key: string; label: string; description: string }>
  >([])
  const [dangerThreshold, setDangerThreshold] = useState(0.10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if all players are ready (for production mode)
  const allPlayersReady = readyCount.total > 0 && readyCount.ready === readyCount.total

  // Fetch available game modes and settings
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

    apiService
      .getSettings()
      .then((data) => {
        if (data.success) {
          setSensitivityPresets(data.presets)
          setSelectedSensitivity(data.sensitivity)
          setDangerThreshold(data.movement.dangerThreshold)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch settings:', err)
      })
  }, [])

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode)
    // Auto-switch sensitivity based on mode
    const targetSensitivity = mode === 'classic' ? 'oneshot' : 'medium'
    if (targetSensitivity !== selectedSensitivity) {
      handleSensitivityChange(targetSensitivity)
    }
  }

  const handleSensitivityChange = async (value: string) => {
    setSelectedSensitivity(value)
    try {
      const result = await apiService.updateSettings({ sensitivity: value })
      if (result.success) {
        setDangerThreshold(result.movement.dangerThreshold)
      }
    } catch (err) {
      console.error('Failed to update sensitivity:', err)
      setError('Failed to update sensitivity')
    }
  }

  const handleThresholdChange = async (value: number) => {
    setDangerThreshold(value)
    try {
      const result = await apiService.updateSettings({ dangerThreshold: value })
      if (result.success) {
        setSelectedSensitivity(result.sensitivity)
      }
    } catch (err) {
      console.error('Failed to update threshold:', err)
      setError('Failed to update threshold')
    }
  }

  const handleLaunchGame = async () => {
    if (players.length < 2) {
      setError('Need at least 2 players to start')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Launch game (create + start with countdown)
      const result = await apiService.launchGame({
        mode: selectedMode,
        theme: selectedMode === 'role-based' ? selectedTheme : undefined
      })

      if (!result.success) {
        throw new Error('Failed to launch game')
      }

      console.log('Game launched:', result)
    } catch (err) {
      console.error('Failed to launch game:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Admin Controls</h2>
        {isDevMode && (
          <span className="px-3 py-1 bg-yellow-600 text-yellow-100 text-sm font-semibold rounded">
            [DEV MODE]
          </span>
        )}
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Game Mode</label>
          <select
            value={selectedMode}
            onChange={(e) => handleModeChange(e.target.value)}
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

      {/* Sensitivity Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Movement Sensitivity</label>
        <div className="flex gap-2">
          {sensitivityPresets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handleSensitivityChange(preset.key)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSensitivity === preset.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {sensitivityPresets.find((p) => p.key === selectedSensitivity)?.description}
        </p>
      </div>

      {/* Movement Threshold */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Movement Threshold: {(dangerThreshold * 100).toFixed(0)}%
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Sensitive</span>
          <input
            type="range"
            min="1"
            max="50"
            value={Math.round(dangerThreshold * 100)}
            onChange={(e) => handleThresholdChange(parseInt(e.target.value) / 100)}
            disabled={loading}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-xs text-gray-500">Forgiving</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          How much movement is needed before taking damage
        </p>
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

      {/* Action Button */}
      <div className="flex gap-4 items-center">
        {/* In dev mode: always show start button */}
        {isDevMode && (
          <button
            onClick={handleLaunchGame}
            disabled={loading || players.length < 2}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-bold text-xl transition-colors"
          >
            {loading ? 'Starting...' : `🎮 Start Game (${players.length} players)`}
          </button>
        )}

        {/* In production mode: show status or start button when all ready */}
        {!isDevMode && (
          <>
            {allPlayersReady ? (
              <button
                onClick={handleLaunchGame}
                disabled={loading || players.length < 2}
                className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-bold text-xl transition-colors animate-pulse"
              >
                {loading ? 'Starting...' : `🎮 All Ready! Start Game`}
              </button>
            ) : (
              <div className="px-8 py-4 bg-gray-700 rounded-lg text-gray-400 text-xl">
                Waiting for all players to shake ready... ({readyCount.ready}/{readyCount.total})
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AdminControls