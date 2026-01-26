import { useState, useEffect } from 'react'
import type { PlayerState } from '@/types/player.types'
import { getHealthPercentage } from '@/utils/formatters'
import {
  getHealthBorderClass,
  getHealthGlowClass,
  getHealthTintClass,
  useGameState
} from '@/hooks/useGameState'
import { STATUS_ICONS } from '@/utils/constants'

interface PlayerCardProps {
  player: PlayerState
}

function PlayerCard({ player }: PlayerCardProps) {
  const { isWaiting, isRoundEnded } = useGameState()
  const [justBecameReady, setJustBecameReady] = useState(false)

  // Track when player becomes ready for animation
  useEffect(() => {
    if (player.isReady) {
      setJustBecameReady(true)
      const timer = setTimeout(() => setJustBecameReady(false), 300)
      return () => clearTimeout(timer)
    }
  }, [player.isReady])
  const healthPercent = getHealthPercentage(player.accumulatedDamage)
  const isDead = !player.isAlive

  // Check if this player is the round winner (alive when round ended)
  const isRoundWinner = isRoundEnded && player.isAlive

  // Get status icon (priority: invulnerable > bloodlust > other)
  const getStatusIcon = () => {
    if (!player.isAlive) return null

    // Guard against undefined statusEffects
    const effects = player.statusEffects ?? []

    // Check for specific status effects
    const hasInvulnerability = effects.some(
      (e) => e.type === 'Invulnerability'
    )
    if (hasInvulnerability) return STATUS_ICONS.INVULNERABLE

    // Check for bloodlust (Vampire)
    const hasBloodlust = effects.some(
      (e) => e.type === 'Bloodlust'
    )
    if (hasBloodlust) return STATUS_ICONS.BLOODLUST

    // Check for other effects
    const hasStunned = effects.some((e) => e.type === 'Stunned')
    if (hasStunned) return STATUS_ICONS.STUNNED

    return null
  }

  const statusIcon = getStatusIcon()
  const showReadyBadge = (isWaiting || isRoundEnded) && player.isReady

  return (
    <div
      className={`
        relative rounded-lg p-4 border-4 transition-all duration-300
        ${isRoundWinner
          ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] bg-yellow-500/20'
          : `${getHealthBorderClass(healthPercent, player.isAlive)} ${getHealthGlowClass(healthPercent, player.isAlive)} ${getHealthTintClass(healthPercent, player.isAlive)}`
        }
        ${isDead && !isRoundEnded ? 'opacity-60' : ''}
        ${justBecameReady ? 'animate-card-jump' : ''}
      `}
    >
      {/* Ready Badge (top-right corner) */}
      {showReadyBadge && (
        <div
          className={`
            absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full
            flex items-center justify-center text-white text-2xl font-bold
            shadow-lg border-2 border-white
            ${justBecameReady ? 'animate-bounce-once' : ''}
          `}
        >
          ✓
        </div>
      )}
      {/* Number + Name */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-5xl font-bold text-white">
          #{player.number}
        </span>
        <span className="text-3xl text-gray-200 truncate">
          {player.name}
        </span>
      </div>

      {/* Status Icon: Trophy for winner, Skull for dead, or status effect */}
      {isRoundWinner ? (
        <div className="text-6xl">🏆</div>
      ) : isDead ? (
        <div className="text-6xl">💀</div>
      ) : statusIcon ? (
        <div className="text-4xl">{statusIcon}</div>
      ) : (
        <div className="h-12" /> // Spacer for consistent card height
      )}

      {/* Points (bottom right, small) - show totalPoints for cumulative score */}
      {(!isDead || isRoundEnded) && (
        <div className="absolute bottom-2 right-2 text-sm text-gray-400">
          {player.totalPoints ?? player.points ?? 0} pts
        </div>
      )}
    </div>
  )
}

export default PlayerCard