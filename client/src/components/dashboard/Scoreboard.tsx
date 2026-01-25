import { useGameState } from '@/hooks/useGameState'
import { apiService } from '@/services/api'

function Scoreboard() {
  const {
    scores,
    currentRound,
    totalRounds,
    isFinished,
    isRoundEnded
  } = useGameState()

  const handleNextRound = async () => {
    // TODO: Implement next round logic
    console.log('Starting next round...')
  }

  const handleNewGame = () => {
    window.location.reload()
  }

  // Sort scores by rank
  const sortedScores = [...scores].sort((a, b) => a.rank - b.rank)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2">
          {isRoundEnded
            ? `ROUND ${currentRound} COMPLETE`
            : 'GAME COMPLETE'}
        </h1>
        {!isFinished && (
          <p className="text-2xl text-gray-400">
            {totalRounds - currentRound} rounds remaining
          </p>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-800 rounded-lg p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          🏆 LEADERBOARD
        </h2>

        <div className="space-y-3">
          {sortedScores.map((entry, index) => (
            <div
              key={entry.playerId}
              className={`
                flex items-center justify-between p-4 rounded-lg
                ${index === 0 ? 'bg-yellow-600/20 border-2 border-yellow-500' : 'bg-gray-700'}
              `}
            >
              {/* Rank + Medal */}
              <div className="flex items-center gap-4">
                <div className="text-4xl w-16 text-center">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
                </div>
                <div className="text-2xl font-bold w-12">
                  {entry.rank}
                  {entry.rank === 1 ? 'st' : entry.rank === 2 ? 'nd' : entry.rank === 3 ? 'rd' : 'th'}
                </div>
              </div>

              {/* Player Info */}
              <div className="flex-1 flex items-center gap-4">
                <span className="text-3xl font-bold">
                  #{entry.playerNumber}
                </span>
                <span className="text-2xl">{entry.playerName}</span>
              </div>

              {/* Points */}
              <div className="text-right">
                <div className="text-3xl font-bold text-green-400">
                  {entry.score} pts
                </div>
                {isRoundEnded && (
                  <div className="text-sm text-gray-400">
                    (+{entry.score} this round)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="text-center">
        {isRoundEnded && !isFinished ? (
          <button
            onClick={handleNextRound}
            className="px-12 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-2xl font-bold transition-colors"
          >
            NEXT ROUND →
          </button>
        ) : (
          <button
            onClick={handleNewGame}
            className="px-12 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-2xl font-bold transition-colors"
          >
            NEW GAME
          </button>
        )}
      </div>
    </div>
  )
}

export default Scoreboard