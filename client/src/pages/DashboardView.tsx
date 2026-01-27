import { useEffect, useRef } from 'react'
import { useGameState } from '@/hooks/useGameState'
import { useAudio } from '@/hooks/useAudio'
import { useGameStore } from '@/store/gameStore'
import { apiService } from '@/services/api'
import { socketService } from '@/services/socket'
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

  const { updatePlayers, setGameState, setDevMode, setPlayerReady, setReadyCount } = useGameStore()
  const { playMusic, play, isAudioUnlocked } = useAudio()
  const lastReadyPlayerRef = useRef<string | null>(null)

  // Fetch current state on mount (for page refresh)
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        // Fetch dev mode config
        const configResult = await apiService.getGameConfig()
        if (configResult.success) {
          // Check for ?mode=production URL override
          const urlParams = new URLSearchParams(window.location.search)
          const modeOverride = urlParams.get('mode')
          const effectiveDevMode = modeOverride === 'production' ? false : configResult.devMode
          setDevMode(effectiveDevMode)
        }

        // Fetch lobby players
        const lobbyResult = await apiService.getLobbyPlayers()
        if (lobbyResult.success && lobbyResult.players.length > 0) {
          const playerStates = lobbyResult.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            number: p.number,
            role: '',
            isAlive: p.isAlive,
            isReady: p.isReady ?? false,
            points: 0,
            totalPoints: 0,
            toughness: 1.0,
            accumulatedDamage: 0,
            statusEffects: [],
          }))
          updatePlayers(playerStates)

          // Calculate initial ready count
          const readyCount = playerStates.filter((p: any) => p.isReady).length
          setReadyCount({ ready: readyCount, total: playerStates.length })
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

  // Listen for ready events
  useEffect(() => {
    socketService.onPlayerReady((data) => {
      setPlayerReady(data.playerId, data.isReady)

      // Play ready sound (only when becoming ready, not when dashboard first loads)
      if (data.isReady && lastReadyPlayerRef.current !== data.playerId) {
        lastReadyPlayerRef.current = data.playerId
        play('effects/ready', { volume: 0.5 })
      }
    })

    socketService.onReadyCountUpdate((data) => {
      setReadyCount(data)
    })

    return () => {
      socketService.off('player:ready')
      socketService.off('ready:update')
    }
  }, [setPlayerReady, setReadyCount, play])

  // Background music management
  useEffect(() => {
    // Only play music after user interaction (browser autoplay policy)
    if (!isAudioUnlocked) return;

    if (isWaiting) {
      playMusic('music/lobby-music', { loop: true, volume: 0.4 })
    } else if (isCountdown) {
      // Play tension buildup music during countdown
      playMusic('music/tension-medium', { loop: true, volume: 0.4 })
    } else if (isActive) {
      // Todo use a different music when only 3 players remain
      if (aliveCount <= 3) {
        playMusic('music/tension-medium', { loop: true, volume: 0.5 })
      } else {
        playMusic('music/tension-medium', { loop: true, volume: 0.4 })
      }
    } else if (isRoundEnded) {
      // Loop victory music between rounds so it doesn't stop
      // Todo add round victory music
      playMusic('music/tension-medium', { loop: true, volume: 0.5 })
    } else if (isFinished) {
      // Don't loop at game end - it's a final fanfare
      playMusic('music/victory', { loop: false, volume: 0.6 })
    }
  }, [isWaiting, isCountdown, isActive, isRoundEnded, isFinished, aliveCount, isAudioUnlocked])

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <GameState />

      {/* Countdown Overlay */}
      {isCountdown && <CountdownDisplay />}

      {/* Main Content */}
      <div className="p-6">
        {(isWaiting || isCountdown || isActive || isRoundEnded) && (
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

        {/* Scoreboard (only at game end) */}
        {isFinished && <Scoreboard />}
      </div>

      {/* Event Feed */}
      <EventFeed />
    </div>
  )
}

export default DashboardView