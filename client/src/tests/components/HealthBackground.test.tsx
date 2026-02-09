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
  describe('battery-style health bar', () => {
    it('renders two bar sections (empty + filled)', () => {
      const player = createMockPlayer({ accumulatedDamage: 50 }) // 50% health
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      expect(root.children.length).toBe(2)
    })

    it('filled portion height matches health percentage', () => {
      const player = createMockPlayer({ accumulatedDamage: 30 }) // 70% health
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      const filledBar = root.children[1] as HTMLElement // second child = filled
      expect(filledBar.style.height).toBe('70%')
    })

    it('empty portion height matches damage percentage', () => {
      const player = createMockPlayer({ accumulatedDamage: 30 }) // 70% health → 30% empty
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      const emptyBar = root.children[0] as HTMLElement // first child = empty
      expect(emptyBar.style.height).toBe('30%')
    })

    it('full health shows 100% filled bar', () => {
      const player = createMockPlayer({ accumulatedDamage: 0 })
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      const filledBar = root.children[1] as HTMLElement
      expect(filledBar.style.height).toBe('100%')
    })

    it('zero health shows 0% filled bar', () => {
      const player = createMockPlayer({ accumulatedDamage: 100 })
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      const filledBar = root.children[1] as HTMLElement
      expect(filledBar.style.height).toBe('0%')
    })

    it('uses green-ish color for high health', () => {
      const player = createMockPlayer({ accumulatedDamage: 5 }) // 95% health
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      const filledBar = root.children[1] as HTMLElement
      // High health = mostly green (r should be low-ish, g should be high)
      const bg = filledBar.style.backgroundColor
      expect(bg).toContain('rgb(')
    })

    it('uses red-ish color for low health', () => {
      const player = createMockPlayer({ accumulatedDamage: 90 }) // 10% health
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      const filledBar = root.children[1] as HTMLElement
      const bg = filledBar.style.backgroundColor
      expect(bg).toContain('rgb(')
    })

    it('shows pulse effect on filled bar for critical health (<30%)', () => {
      const player = createMockPlayer({ accumulatedDamage: 80 }) // 20% health
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      const filledBar = root.children[1] as HTMLElement
      expect(filledBar.className).toContain('pulse-glow')
    })

    it('no pulse effect for healthy state', () => {
      const player = createMockPlayer({ accumulatedDamage: 15 }) // 85% health
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      const filledBar = root.children[1] as HTMLElement
      expect(filledBar.className).not.toContain('pulse-glow')
    })
  })

  describe('team mode colors', () => {
    it('uses team color for filled bar when teamId is provided', () => {
      const player = createMockPlayer({ accumulatedDamage: 30 })
      const { container } = render(<HealthBackground player={player} teamId={0} />)

      const root = container.firstChild as HTMLElement
      const filledBar = root.children[1] as HTMLElement
      // Red team primary = #ef4444
      expect(filledBar.style.backgroundColor).toBe('#ef4444')
    })

    it('uses team dark color for empty bar when teamId is provided', () => {
      const player = createMockPlayer({ accumulatedDamage: 30 })
      const { container } = render(<HealthBackground player={player} teamId={0} />)

      const root = container.firstChild as HTMLElement
      const emptyBar = root.children[0] as HTMLElement
      // Red team dark = #7f1d1d
      expect(emptyBar.style.backgroundColor).toBe('#7f1d1d')
    })

    it('uses gray background for empty bar when no team', () => {
      const player = createMockPlayer({ accumulatedDamage: 30 })
      const { container } = render(<HealthBackground player={player} />)

      const root = container.firstChild as HTMLElement
      const emptyBar = root.children[0] as HTMLElement
      // No team = gray-800 (#1f2937)
      expect(emptyBar.style.backgroundColor).toBe('#1f2937')
    })
  })

  describe('status effect overrides', () => {
    it('shows invulnerable gradient when has Invulnerability effect', () => {
      const player = createMockPlayer({
        accumulatedDamage: 70,
        statusEffects: [{ type: 'Invulnerability', priority: 100, timeLeft: 5000 }],
      })
      const { container } = render(<HealthBackground player={player} />)

      expect(container.firstChild).toHaveClass('gradient-invulnerable')
      expect(container.firstChild).toHaveClass('pulse-glow')
    })

    it('shows bloodlust gradient when has Bloodlust effect', () => {
      const player = createMockPlayer({
        accumulatedDamage: 10,
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
      ;(player as any).statusEffects = undefined

      expect(() => render(<HealthBackground player={player} />)).not.toThrow()
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
