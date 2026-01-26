import { useEffect } from 'react'
import { useGameState } from '@/hooks/useGameState'
import { useAudio } from '@/hooks/useAudio'
import { useGameStore } from '@/store/gameStore'
import { apiService } from '@/services/api'
import PlayerGrid from '@/components/dashboard/PlayerGrid'
import GameState from '@/components/dashboard/GameState'
import EventFeed from '@/components/dashboard/EventFeed'
import AdminControls from '@/components/dashboard/AdminControls'
import Scoreboard from '@/components/dashboard/Scoreboard'
import CountdownDisplay from '@/components/dashboard/CountdownDisplay'

function DashboardView() {
  const {
    isWaiting,
    isCountdown,
    isActive,
    isRoundEnded,
    isFinished,
    aliveCount,
  } = useGameState()

  const { updatePlayers, setGameState } = useGameStore()
  const { playMusic } = useAudio()

  // Fetch current state on mount (for page refresh)
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        // Fetch lobby players
        const lobbyResult = await apiService.getLobbyPlayers()
        if (lobbyResult.success && lobbyResult.players.length > 0) {
          const playerStates = lobbyResult.players.map((p) => ({
            id: p.id,
            name: p.name,
            number: p.number,
            role: '',
            isAlive: p.isAlive,
            points: 0,
            totalPoints: 0,
            toughness: 1.0,
            accumulatedDamage: 0,
            statusEffects: [],
          }))
          updatePlayers(playerStates)
        }

        // Fetch game state if game is running
        const gameResult = await apiService.getGameState()
        if (gameResult.success && gameResult.state) {
          const state = gameResult.state
          if (state.state !== 'waiting') {
            setGameState(state.state)
            // Update players from game state
            if (state.players && state.players.length > 0) {
              updatePlayers(state.players)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch initial state:', err)
      }
    }

    fetchInitialState()
  }, [])

  // Background music management
  useEffect(() => {
    if (isWaiting) {
      playMusic('music/lobby-music', { loop: true, volume: 0.4 })
    } else if (isCountdown) {
      // Play tension buildup music during countdown
      playMusic('music/tension-medium', { loop: true, volume: 0.4 })
    } else if (isActive) {
      if (aliveCount <= 3) {
        playMusic('music/tension-high', { loop: true, volume: 0.5 })
      } else {
        playMusic('music/tension-medium', { loop: true, volume: 0.4 })
      }
    } else if (isRoundEnded) {
      // Loop victory music between rounds so it doesn't stop
      playMusic('music/victory', { loop: true, volume: 0.5 })
    } else if (isFinished) {
      // Don't loop at game end - it's a final fanfare
      playMusic('music/victory', { loop: false, volume: 0.6 })
    }
  }, [isWaiting, isCountdown, isActive, isRoundEnded, isFinished, aliveCount])

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <GameState />

      {/* Countdown Overlay */}
      {isCountdown && <CountdownDisplay />}

      {/* Main Content */}
      <div className="p-6">
        {(isWaiting || isCountdown || isActive) && (
          <>
            {/* Admin Controls (only show in waiting) */}
            {isWaiting && (
              <div className="mb-6">
                <AdminControls />
              </div>
            )}

            {/* Player Grid */}
            <PlayerGrid />
          </>
        )}

        {/* Scoreboard (between rounds or finished) */}
        {(isRoundEnded || isFinished) && <Scoreboard />}
      </div>

      {/* Event Feed */}
      <EventFeed />
    </div>
  )
}

export default DashboardView