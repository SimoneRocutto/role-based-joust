import type { PlayerState } from '@/types/player.types'
import { getHealthPercentage } from '@/utils/formatters'
import { getHealthBarColor, getHealthBarEmptyColor } from '@/utils/teamColors'

interface HealthBackgroundProps {
  player: PlayerState
  teamId?: number | null
}

function HealthBackground({ player, teamId }: HealthBackgroundProps) {
  const healthPercent = getHealthPercentage(player.accumulatedDamage)

  // Guard against undefined statusEffects
  const effects = player.statusEffects ?? []

  // Check for special states
  const hasInvulnerability = effects.some(
    (e) => e.type === 'Invulnerability'
  )
  const hasBloodlust = effects.some(
    (e) => e.type === 'Bloodlust' || e.type === 'VampireBloodlust'
  )

  // Special state overlays (invulnerability, bloodlust) still use full-screen gradient
  if (hasInvulnerability) {
    return <div className="absolute inset-0 gradient-invulnerable pulse-glow" />
  }

  if (hasBloodlust) {
    return <div className="absolute inset-0 gradient-bloodlust heartbeat" />
  }

  // Battery-style health bar
  const barColor = getHealthBarColor(healthPercent, teamId)
  const emptyColor = getHealthBarEmptyColor(teamId)
  const isCritical = healthPercent < 0.3

  const filledHeight = Math.round(healthPercent * 100)
  const emptyHeight = 100 - filledHeight

  return (
    <div className="absolute inset-0">
      {/* Empty portion (top) — represents missing health */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: `${emptyHeight}%`,
          backgroundColor: emptyColor,
          transition: 'height 0.3s ease-out',
        }}
      />
      {/* Filled portion (bottom) — represents remaining health */}
      <div
        className={`absolute inset-x-0 bottom-0 ${isCritical ? 'pulse-glow' : ''}`}
        style={{
          height: `${filledHeight}%`,
          backgroundColor: barColor,
          transition: 'height 0.3s ease-out, background-color 0.5s ease',
        }}
      />
    </div>
  )
}

export default HealthBackground
