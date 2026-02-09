import { useState } from 'react'
import { useGameState } from '@/hooks/useGameState'
import { useGameStore } from '@/store/gameStore'
import { apiService } from '@/services/api'
import type { ScoreEntry, TeamScore } from '@/types/game.types'
import { TEAM_COLORS } from '@/utils/teamColors'

function Scoreboard() {
  const {
    scores,
    currentRound,
    totalRounds,
    isFinished,
    isRoundEnded,
    readyCount
  } = useGameState()

  const { setGameState, setScores, updatePlayers, teamScores } = useGameStore()
  const [isResetting, setIsResetting] = useState(false)
  const [isStartingRound, setIsStartingRound] = useState(false)

  const handleNextRound = async () => {
    if (isStartingRound) return

    setIsStartingRound(true)
    try {
      const result = await apiService.startNextRound()
      if (!result.success) {
        console.error('Failed to start next round:', result.error)
      }
    } catch (error) {
      console.error('Failed to start next round:', error)
    } finally {
      setIsStartingRound(false)
    }
  }

  const handleNewGame = async () => {
    if (isResetting) return

    setIsResetting(true)
    try {
      await apiService.stopGame()
      setGameState('waiting')
      setScores([])

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
    } catch (error) {
      console.error('Failed to reset game:', error)
      window.location.reload()
    } finally {
      setIsResetting(false)
    }
  }

  const sortedScores = [...scores].sort((a, b) => a.rank - b.rank)
  const hasTeamScores = teamScores && teamScores.length > 0

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

      {/* Team Leaderboard (if team mode) */}
      {hasTeamScores && (
        <TeamLeaderboard
          teamScores={teamScores!}
          isRoundEnded={isRoundEnded}
        />
      )}

      {/* Individual Leaderboard (non-team mode, or below team leaderboard) */}
      {!hasTeamScores && (
        <IndividualLeaderboard
          scores={sortedScores}
          isRoundEnded={isRoundEnded}
        />
      )}

      {/* Ready count indicator for game end */}
      {isFinished && readyCount.total > 0 && (
        <div className="text-center mb-4">
          <p className="text-xl text-gray-300" data-testid="ready-count">
            {readyCount.ready}/{readyCount.total} players ready
            {readyCount.ready >= readyCount.total && readyCount.total >= 2
              ? ' — starting new game...'
              : ''}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="text-center flex justify-center gap-4">
        {isRoundEnded && !isFinished ? (
          <>
            <button
              onClick={handleNextRound}
              disabled={isStartingRound}
              className={`px-12 py-4 rounded-lg text-2xl font-bold transition-colors ${
                isStartingRound
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isStartingRound ? 'STARTING...' : 'NEXT ROUND →'}
            </button>
            <button
              onClick={handleNewGame}
              disabled={isResetting}
              className={`px-8 py-4 rounded-lg text-2xl font-bold transition-colors ${
                isResetting
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isResetting ? 'STOPPING...' : 'STOP GAME'}
            </button>
          </>
        ) : (
          <button
            onClick={handleNewGame}
            disabled={isResetting}
            className={`px-12 py-4 rounded-lg text-2xl font-bold transition-colors ${
              isResetting
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isResetting ? 'RESETTING...' : 'NEW GAME'}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Team leaderboard: shows team rankings with expandable individual scores.
 */
function TeamLeaderboard({
  teamScores,
  isRoundEnded,
}: {
  teamScores: TeamScore[]
  isRoundEnded: boolean
}) {
  const sortedTeams = [...teamScores].sort((a, b) => a.rank - b.rank)

  return (
    <div className="bg-gray-800 rounded-lg p-8 mb-8">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        TEAM LEADERBOARD
      </h2>

      <div className="space-y-4">
        {sortedTeams.map((team, index) => {
          const teamColor = TEAM_COLORS[team.teamId] || TEAM_COLORS[0]
          const isWinner = index === 0

          return (
            <div key={team.teamId}>
              {/* Team row */}
              <div
                className={`
                  flex items-center justify-between p-4 rounded-lg
                  ${isWinner ? 'border-2' : 'border'}
                `}
                style={{
                  borderColor: isWinner ? teamColor.primary : teamColor.border,
                  backgroundColor: teamColor.tint,
                }}
              >
                {/* Rank + Medal */}
                <div className="flex items-center gap-4">
                  <div className="text-4xl w-16 text-center">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
                  </div>
                  <div className="text-2xl font-bold" style={{ color: teamColor.primary }}>
                    {team.teamName}
                  </div>
                </div>

                {/* Team Points */}
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: teamColor.primary }}>
                    {team.score} pts
                  </div>
                  {isRoundEnded && (
                    <div className="text-sm text-gray-400">
                      (+{team.roundPoints} this round)
                    </div>
                  )}
                </div>
              </div>

              {/* Individual scores within team */}
              <div className="ml-8 mt-2 space-y-1">
                {(team.players || [])
                  .sort((a, b) => b.score - a.score)
                  .map((player) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between px-3 py-1 rounded text-sm bg-gray-700/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">#{player.playerNumber}</span>
                        <span className="text-gray-300">{player.playerName}</span>
                      </div>
                      <span className="text-gray-400">
                        {player.score} pts
                        {isRoundEnded && (
                          <span className="ml-1 text-xs">
                            (+{player.roundPoints})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Individual leaderboard (non-team mode).
 */
function IndividualLeaderboard({
  scores,
  isRoundEnded,
}: {
  scores: ScoreEntry[]
  isRoundEnded: boolean
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-8 mb-8">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        LEADERBOARD
      </h2>

      <div className="space-y-3">
        {scores.map((entry, index) => (
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
                  (+{entry.roundPoints} this round)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Scoreboard
