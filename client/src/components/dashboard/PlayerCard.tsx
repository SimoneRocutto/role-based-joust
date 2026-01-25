import type { PlayerState } from '@/types/player.types'
import { getHealthPercentage } from '@/utils/formatters'
import {
  getHealthBorderClass,
  getHealthGlowClass,
  getHealthTintClass
} from '@/hooks/useGameState'
import { STATUS_ICONS } from '@/utils/constants'

interface PlayerCardProps {
  player: PlayerState
}

function PlayerCard({ player }: PlayerCardProps) {
  const healthPercent = getHealthPercentage(player.accumulatedDamage)
  const isDead = !player.isAlive

  // Get status icon (priority: invulnerable > bloodlust > other)
  const getStatusIcon = () => {
    if (!player.isAlive) return null

    // Check for specific status effects
    const hasInvulnerability = player.statusEffects.some(
      (e) => e.type === 'Invulnerability'
    )
    if (hasInvulnerability) return STATUS_ICONS.INVULNERABLE

    // Check for bloodlust (Vampire)
    const hasBloodlust = player.statusEffects.some(
      (e) => e.type === 'Bloodlust'
    )
    if (hasBloodlust) return STATUS_ICONS.BLOODLUST

    // Check for other effects
    const hasStunned = player.statusEffects.some((e) => e.type === 'Stunned')
    if (hasStunned) return STATUS_ICONS.STUNNED

    return null
  }

  const statusIcon = getStatusIcon()

  return (
    <div
      className={`
        relative rounded-lg p-4 border-4 transition-all duration-300
        ${getHealthBorderClass(healthPercent, player.isAlive)}
        ${getHealthGlowClass(healthPercent, player.isAlive)}
        ${getHealthTintClass(healthPercent, player.isAlive)}
        ${isDead ? 'opacity-60' : ''}
      `}
    >
      {/* Number + Name */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-5xl font-bold text-white">
          #{player.number}
        </span>
        <span className="text-3xl text-gray-200 truncate">
          {player.name}
        </span>
      </div>

      {/* Status Icon or Dead Skull */}
      {isDead ? (
        <div className="text-6xl">💀</div>
      ) : statusIcon ? (
        <div className="text-4xl">{statusIcon}</div>
      ) : (
        <div className="h-12" /> // Spacer for consistent card height
      )}

      {/* Points (bottom right, small) */}
      {!isDead && (
        <div className="absolute bottom-2 right-2 text-sm text-gray-400">
          {player.points} pts
        </div>
      )}
    </div>
  )
}

export default PlayerCard