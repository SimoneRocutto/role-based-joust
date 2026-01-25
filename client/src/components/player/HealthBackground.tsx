import type { PlayerState } from '@/types/player.types'
import { getHealthPercentage } from '@/utils/formatters'
import { getHealthBackgroundClass } from '@/hooks/useGameState'

interface HealthBackgroundProps {
  player: PlayerState
}

function HealthBackground({ player }: HealthBackgroundProps) {
  const healthPercent = getHealthPercentage(player.accumulatedDamage)

  // Check for special states
  const hasInvulnerability = player.statusEffects.some(
    (e) => e.type === 'Invulnerability'
  )
  const hasBloodlust = player.statusEffects.some(
    (e) => e.type === 'Bloodlust' || e.type === 'VampireBloodlust'
  )

  // Determine background
  let backgroundClass = ''
  let pulseClass = ''

  if (hasInvulnerability) {
    backgroundClass = 'gradient-invulnerable'
    pulseClass = 'pulse-glow'
  } else if (hasBloodlust) {
    backgroundClass = 'gradient-bloodlust'
    pulseClass = 'heartbeat'
  } else {
    // Health-based
    if (healthPercent >= 0.8) {
      backgroundClass = 'gradient-healthy'
    } else if (healthPercent >= 0.4) {
      backgroundClass = 'gradient-damaged'
    } else {
      backgroundClass = 'gradient-critical'
      pulseClass = 'pulse-glow'
    }
  }

  return (
    <div className={`absolute inset-0 ${backgroundClass} ${pulseClass}`} />
  )
}

export default HealthBackground