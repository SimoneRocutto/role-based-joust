import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusEffects from '@/components/player/StatusEffects'
import type { StatusEffectInfo } from '@/types/player.types'

describe('StatusEffects', () => {
  describe('rendering', () => {
    it('renders nothing when effects array is empty', () => {
      const { container } = render(<StatusEffects effects={[]} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders effects when provided', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Invulnerability', priority: 100, timeLeft: 5000 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('5s')).toBeInTheDocument()
    })

    it('renders up to 3 effects', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Invulnerability', priority: 100, timeLeft: 5000 },
        { type: 'Bloodlust', priority: 50, timeLeft: 3000 },
        { type: 'Stunned', priority: 20, timeLeft: 2000 },
        { type: 'Berserker', priority: 10, timeLeft: 1000 },
      ]

      const { container } = render(<StatusEffects effects={effects} />)

      // Should only show 3 effects (limited by slice)
      const effectElements = container.querySelectorAll('.flex.items-center.gap-2')
      expect(effectElements).toHaveLength(3)
    })

    it('sorts effects by priority (highest first)', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Stunned', priority: 20, timeLeft: 2000 },
        { type: 'Invulnerability', priority: 100, timeLeft: 5000 },
        { type: 'Bloodlust', priority: 50, timeLeft: 3000 },
      ]

      render(<StatusEffects effects={effects} />)

      // Invulnerability (shield) should appear first due to highest priority
      const icons = screen.getAllByText(/[🛡️🧛❄️]/)
      expect(icons[0].textContent).toBe('🛡️')
    })
  })

  describe('icons', () => {
    it('shows shield icon for Invulnerability', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Invulnerability', priority: 100, timeLeft: 5000 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('🛡️')).toBeInTheDocument()
    })

    it('shows vampire icon for Bloodlust', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Bloodlust', priority: 50, timeLeft: 3000 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('🧛')).toBeInTheDocument()
    })

    it('shows vampire icon for VampireBloodlust', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'VampireBloodlust', priority: 50, timeLeft: 3000 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('🧛')).toBeInTheDocument()
    })

    it('shows ice icon for Stunned', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Stunned', priority: 20, timeLeft: 2000 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('❄️')).toBeInTheDocument()
    })

    it('shows fire icon for Berserker', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Berserker', priority: 30, timeLeft: 4000 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('🔥')).toBeInTheDocument()
    })

    it('shows sparkle icon for unknown effects', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'UnknownEffect', priority: 10, timeLeft: 1000 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('✨')).toBeInTheDocument()
    })
  })

  describe('time formatting', () => {
    it('formats time in seconds', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Invulnerability', priority: 100, timeLeft: 5000 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('5s')).toBeInTheDocument()
    })

    it('rounds up partial seconds', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Invulnerability', priority: 100, timeLeft: 4100 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('5s')).toBeInTheDocument()
    })

    it('shows infinity symbol for permanent effects', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Invulnerability', priority: 100, timeLeft: null },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('∞')).toBeInTheDocument()
    })

    it('shows 1s for very short durations', () => {
      const effects: StatusEffectInfo[] = [
        { type: 'Stunned', priority: 20, timeLeft: 100 },
      ]

      render(<StatusEffects effects={effects} />)
      expect(screen.getByText('1s')).toBeInTheDocument()
    })
  })
})
