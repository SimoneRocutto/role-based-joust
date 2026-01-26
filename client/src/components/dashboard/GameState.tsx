import { useGameState } from '@/hooks/useGameState'
import { formatTime } from '@/utils/formatters'
import { useAudio } from '@/hooks/useAudio'
import { Music2 } from 'lucide-react'
import ReadyCounter from './ReadyCounter'

function GameState() {
  const {
    mode,
    currentRound,
    totalRounds,
    gameTime,
    isActive,
    isWaiting
  } = useGameState()

  const { isPlayingMusic } = useAudio()

  // Calculate remaining time (default 5 minutes = 300000ms)
  const roundDuration = 300000 // 5 minutes
  const timeRemaining = isActive ? roundDuration - gameTime : 0

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Title + Round */}
        <div className="flex items-center gap-8">
          <h1 className="text-4xl font-bold tracking-wider">
            EXTENDED JOUST
          </h1>
          {!isWaiting && (
            <div className="text-xl text-gray-300">
              Round {currentRound}/{totalRounds}
            </div>
          )}
          {isWaiting && <ReadyCounter />}
        </div>

        {/* Center: Timer (only during active game) */}
        {isActive && timeRemaining > 0 && (
          <div className="text-3xl font-mono text-gray-200">
            ⏱️ {formatTime(timeRemaining)} remaining
          </div>
        )}

        {/* Right: Mode badge + Audio indicator */}
        <div className="flex items-center gap-4">
          {mode && (
            <div className="px-4 py-2 bg-blue-600 rounded-lg text-xl font-semibold uppercase">
              [{mode}]
            </div>
          )}
          {isPlayingMusic && (
            <div className="flex items-center gap-2 text-lg text-gray-400">
              <Music2 className="w-5 h-5 animate-pulse" />
              <span>Playing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameState