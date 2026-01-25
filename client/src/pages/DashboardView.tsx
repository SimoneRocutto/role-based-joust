import { useEffect } from 'react'
import { useGameState } from '@/hooks/useGameState'
import { useAudio } from '@/hooks/useAudio'
import PlayerGrid from '@/components/dashboard/PlayerGrid'
import GameState from '@/components/dashboard/GameState'
import EventFeed from '@/components/dashboard/EventFeed'
import AdminControls from '@/components/dashboard/AdminControls'
import Scoreboard from '@/components/dashboard/Scoreboard'

function DashboardView() {
  const {
    isWaiting,
    isActive,
    isRoundEnded,
    isFinished,
    aliveCount,
    players
  } = useGameState()

  const { playMusic, speak } = useAudio()

  // Background music management
  useEffect(() => {
    if (isWaiting) {
      playMusic('music/lobby-music', { loop: true, volume: 0.4 })
    } else if (isActive) {
      if (aliveCount <= 3) {
        playMusic('music/tension-high', { loop: true, volume: 0.5 })
      } else {
        playMusic('music/tension-medium', { loop: true, volume: 0.4 })
      }
    } else if (isRoundEnded || isFinished) {
      playMusic('music/victory', { loop: false, volume: 0.6 })
    }
  }, [isWaiting, isActive, isRoundEnded, isFinished, aliveCount])

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <GameState />

      {/* Main Content */}
      <div className="p-6">
        {(isWaiting || isActive) && (
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