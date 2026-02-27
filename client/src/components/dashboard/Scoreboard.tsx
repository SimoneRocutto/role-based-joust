import { useMemo, useState } from 'react'
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
    readyCount,
  } = useGameState()

  const { setGameState, setScores, updatePlayers, teamScores, players } = useGameStore()
  const mode = useGameStore((state) => state.mode)
  const isDeathCountMode = mode === 'death-count'

  const [isResetting, setIsResetting] = useState(false)
  const [isStartingRound, setIsStartingRound] = useState(false)

  // Build playerId → deathCount map from live players state (current/last round)
  const deathCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of players) {
      map.set(p.id, p.deathCount ?? 0)
    }
    return map
  }, [players])

  const handleNextRound = async () => {
    if (isStartingRound) return
    setIsStartingRound(true)
    try {
      const result = await apiService.startNextRound()
      if (!result.success) console.error('Failed to start next round:', result.error)
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
    <div className="max-w-5xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-7xl font-black mb-2">
          {isRoundEnded ? `ROUND ${currentRound} COMPLETE` : 'GAME OVER'}
        </h1>
        {!isFinished && (
          <p className="text-3xl text-gray-400">
            {totalRounds != null
              ? `${totalRounds - currentRound} round${totalRounds - currentRound !== 1 ? 's' : ''} remaining`
              : 'Playing to target score'}
          </p>
        )}
      </div>

      {/* Team Leaderboard */}
      {hasTeamScores ? (
        <TeamLeaderboard
          teamScores={teamScores!}
          isRoundEnded={isRoundEnded}
          isDeathCountMode={isDeathCountMode}
          deathCountMap={deathCountMap}
        />
      ) : (
        <IndividualLeaderboard
          scores={sortedScores}
          isRoundEnded={isRoundEnded}
          isDeathCountMode={isDeathCountMode}
          deathCountMap={deathCountMap}
        />
      )}

      {/* Ready count indicator for game end */}
      {isFinished && readyCount.total > 0 && (
        <div className="text-center mb-6">
          <p className="text-2xl text-gray-300" data-testid="ready-count">
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
              className={`px-14 py-5 rounded-xl text-3xl font-black transition-colors ${
                isStartingRound ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isStartingRound ? 'STARTING...' : 'NEXT ROUND →'}
            </button>
            <button
              onClick={handleNewGame}
              disabled={isResetting}
              className={`px-10 py-5 rounded-xl text-3xl font-black transition-colors ${
                isResetting ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-700 hover:bg-red-600'
              }`}
            >
              {isResetting ? 'STOPPING...' : 'STOP GAME'}
            </button>
          </>
        ) : (
          <button
            onClick={handleNewGame}
            disabled={isResetting}
            className={`px-14 py-5 rounded-xl text-3xl font-black transition-colors ${
              isResetting ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isResetting ? 'RESETTING...' : 'NEW GAME'}
          </button>
        )}
      </div>
    </div>
  )
}

function rankMedal(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}

/**
 * Individual leaderboard (non-team mode).
 * In death count mode, shows deaths instead of points.
 */
function IndividualLeaderboard({
  scores,
  isRoundEnded,
  isDeathCountMode,
  deathCountMap,
}: {
  scores: ScoreEntry[]
  isRoundEnded: boolean
  isDeathCountMode: boolean
  deathCountMap: Map<string, number>
}) {
  return (
    <div className="mb-8 space-y-3">
      {scores.map((entry) => {
        const isWinner = entry.rank === 1
        const deaths = deathCountMap.get(entry.playerId) ?? 0

        return (
          <div
            key={entry.playerId}
            className={`flex items-center gap-6 px-8 py-5 rounded-2xl ${
              isWinner
                ? 'bg-yellow-500/20 border-2 border-yellow-400 shadow-lg shadow-yellow-500/20'
                : 'bg-gray-800'
            }`}
          >
            {/* Medal */}
            <div className="text-6xl w-20 text-center leading-none flex-shrink-0">
              {rankMedal(entry.rank)}
            </div>

            {/* Player number + name */}
            <div className="flex-1 flex items-center gap-5 min-w-0">
              <span
                className={`font-black flex-shrink-0 ${isWinner ? 'text-6xl text-yellow-300' : 'text-5xl text-white'}`}
              >
                #{entry.playerNumber}
              </span>
              <span
                className={`font-semibold truncate ${isWinner ? 'text-4xl text-yellow-100' : 'text-3xl text-gray-200'}`}
              >
                {entry.playerName}
              </span>
            </div>

            {/* Metric */}
            {isDeathCountMode ? (
              <div className="flex-shrink-0 text-right">
                <div
                  className={`font-black ${isWinner ? 'text-5xl' : 'text-4xl'} ${
                    deaths === 0 ? 'text-gray-400' : 'text-red-400'
                  }`}
                >
                  💀 {deaths}
                </div>
                {isRoundEnded && (
                  <div className="text-xl text-gray-500">this round</div>
                )}
              </div>
            ) : (
              <div className="flex-shrink-0 text-right">
                <div
                  className={`font-black text-green-400 ${isWinner ? 'text-5xl' : 'text-4xl'}`}
                >
                  {entry.score} pts
                </div>
                {isRoundEnded && entry.roundPoints > 0 && (
                  <div className="text-xl text-gray-400">+{entry.roundPoints} this round</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Team leaderboard: large colored team banners with individual breakdowns inside.
 */
function TeamLeaderboard({
  teamScores,
  isRoundEnded,
  isDeathCountMode,
  deathCountMap,
}: {
  teamScores: TeamScore[]
  isRoundEnded: boolean
  isDeathCountMode: boolean
  deathCountMap: Map<string, number>
}) {
  const sortedTeams = [...teamScores].sort((a, b) => a.rank - b.rank)

  return (
    <div className="mb-8 space-y-4">
      {sortedTeams.map((team) => {
        const teamColor = TEAM_COLORS[team.teamId] || TEAM_COLORS[0]
        const isWinner = team.rank === 1

        // Team deaths = sum of individual deaths from server-authoritative score entries
        const teamDeaths = (team.players || []).reduce(
          (sum, p) => sum + (p.deathCount ?? deathCountMap.get(p.playerId) ?? 0),
          0
        )

        return (
          <div
            key={team.teamId}
            className={`rounded-2xl overflow-hidden ${isWinner ? 'shadow-lg' : ''}`}
            style={{ boxShadow: isWinner ? `0 0 30px ${teamColor.primary}40` : undefined }}
          >
            {/* Team header banner */}
            <div
              className="flex items-center justify-between px-8 py-6"
              style={{ backgroundColor: teamColor.primary + 'cc' }}
            >
              <div className="flex items-center gap-5">
                <span className="text-7xl leading-none">{rankMedal(team.rank)}</span>
                <span className="text-5xl font-black text-white drop-shadow">
                  {team.teamName}
                </span>
              </div>
              {isDeathCountMode ? (
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="text-5xl font-black text-white">
                      {team.score} pts
                    </div>
                    {isRoundEnded && team.roundPoints > 0 && (
                      <div className="text-xl text-white/60">+{team.roundPoints} this round</div>
                    )}
                  </div>
                  <div className="font-black text-white text-5xl">
                    💀 {teamDeaths}
                  </div>
                </div>
              ) : (
                <div className="text-right">
                  <div className="text-5xl font-black text-white">
                    {team.score} pts
                  </div>
                  {isRoundEnded && (
                    <div className="text-xl text-white/60">+{team.roundPoints} this round</div>
                  )}
                </div>
              )}
            </div>

            {/* Individual player rows */}
            <div
              className="divide-y divide-white/10"
              style={{ backgroundColor: teamColor.tint }}
            >
              {(team.players || [])
                .sort((a, b) => {
                  if (isDeathCountMode) {
                    return (a.deathCount ?? deathCountMap.get(a.playerId) ?? 0) -
                           (b.deathCount ?? deathCountMap.get(b.playerId) ?? 0)
                  }
                  return b.score - a.score
                })
                .map((player) => {
                  const deaths = player.deathCount ?? deathCountMap.get(player.playerId) ?? 0
                  return (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between px-10 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-black text-white">
                          #{player.playerNumber}
                        </span>
                        <span className="text-2xl text-white/80">{player.playerName}</span>
                      </div>
                      {isDeathCountMode ? (
                        <span className={`text-2xl font-bold ${deaths === 0 ? 'text-white/40' : 'text-red-300'}`}>
                          💀 {deaths}
                        </span>
                      ) : (
                        <span className="text-2xl font-bold text-white/80">
                          {player.score} pts
                          {isRoundEnded && player.roundPoints > 0 && (
                            <span className="ml-2 text-lg text-white/40">+{player.roundPoints}</span>
                          )}
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Scoreboard
