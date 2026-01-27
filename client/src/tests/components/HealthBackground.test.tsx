import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import HealthBackground from '@/components/player/HealthBackground'
import type { PlayerState } from '@/types/player.types'

function createMockPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'player-1',
    name: 'Test Player',
    number: 1,
    role: 'Civilian',
    isAlive: true,
    points: 0,
    totalPoints: 0,
    toughness: 100,
    accumulatedDamage: 0,
    statusEffects: [],
    ...overrides,
  }
}

describe('HealthBackground', () => {
  describe('health-based backgrounds', () => {
    it('shows healthy gradient for 80%+ health', () => {
      const player = createMockPlayer({ accumulatedDamage: 15 }) // 85% health
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-healthy')
    })

    it('shows damaged gradient for 40-79% health', () => {
      const player = createMockPlayer({ accumulatedDamage: 50 }) // 50% health
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-damaged')
    })

    it('shows critical gradient for <40% health', () => {
      const player = createMockPlayer({ accumulatedDamage: 70 }) // 30% health
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-critical')
    })

    it('shows pulse effect for critical health', () => {
      const player = createMockPlayer({ accumulatedDamage: 70 }) // 30% health
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('pulse-glow')
    })

    it('no pulse effect for healthy/damaged state', () => {
      const player = createMockPlayer({ accumulatedDamage: 15 }) // 85% health
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).not.toHaveClass('pulse-glow')
      expect(container.firstChild).not.toHaveClass('heartbeat')
    })
  })

  describe('status effect overrides', () => {
    it('shows invulnerable gradient when has Invulnerability effect', () => {
      const player = createMockPlayer({
        accumulatedDamage: 70, // Would be critical, but invulnerability overrides
        statusEffects: [{ type: 'Invulnerability', priority: 100, timeLeft: 5000 }],
      })
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-invulnerable')
      expect(container.firstChild).toHaveClass('pulse-glow')
    })

    it('shows bloodlust gradient when has Bloodlust effect', () => {
      const player = createMockPlayer({
        accumulatedDamage: 10, // Would be healthy, but bloodlust overrides
        statusEffects: [{ type: 'Bloodlust', priority: 50, timeLeft: 3000 }],
      })
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-bloodlust')
      expect(container.firstChild).toHaveClass('heartbeat')
    })

    it('shows bloodlust gradient for VampireBloodlust effect', () => {
      const player = createMockPlayer({
        statusEffects: [{ type: 'VampireBloodlust', priority: 50, timeLeft: 3000 }],
      })
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-bloodlust')
    })

    it('invulnerability takes priority over bloodlust', () => {
      const player = createMockPlayer({
        statusEffects: [
          { type: 'Bloodlust', priority: 50, timeLeft: 3000 },
          { type: 'Invulnerability', priority: 100, timeLeft: 5000 },
        ],
      })
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-invulnerable')
      expect(container.firstChild).not.toHaveClass('gradient-bloodlust')
    })
  })

  describe('undefined statusEffects handling', () => {
    it('handles undefined statusEffects gracefully', () => {
      const player = createMockPlayer()
      // Simulate undefined statusEffects
      ;(player as any).statusEffects = undefined

      // Should not throw
      expect(() => render(<HealthBackground player={player} />)).not.toThrow()
    })
  })

  describe('boundary conditions', () => {
    it('handles exactly 80% health as healthy', () => {
      const player = createMockPlayer({ accumulatedDamage: 20 }) // Exactly 80%
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-healthy')
    })

    it('handles exactly 40% health as damaged', () => {
      const player = createMockPlayer({ accumulatedDamage: 60 }) // Exactly 40%
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-damaged')
    })

    it('handles 0% health as critical', () => {
      const player = createMockPlayer({ accumulatedDamage: 100 }) // 0% health
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-critical')
    })

    it('handles over-damage (negative health) as critical', () => {
      const player = createMockPlayer({ accumulatedDamage: 150 }) // -50% health (clamped to 0)
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-critical')
    })
  })

  describe('CSS classes', () => {
    it('always has absolute inset-0 positioning', () => {
      const player = createMockPlayer()
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('absolute')
      expect(container.firstChild).toHaveClass('inset-0')
    })
  })
})
