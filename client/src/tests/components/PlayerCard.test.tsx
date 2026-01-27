import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import PlayerCard from '@/components/dashboard/PlayerCard'
import { useGameStore } from '@/store/gameStore'
import type { PlayerState } from '@/types/player.types'

function createMockPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'player-1',
    name: 'Test Player',
    number: 1,
    role: 'Civilian',
    isAlive: true,
    points: 0,
    totalPoints: 10,
    toughness: 100,
    accumulatedDamage: 0,
    statusEffects: [],
    ...overrides,
  }
}

describe('PlayerCard', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  describe('basic rendering', () => {
    it('renders player number', () => {
      const player = createMockPlayer({ number: 5 })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('#5')).toBeInTheDocument()
    })

    it('renders player name', () => {
      const player = createMockPlayer({ name: 'Alice' })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('renders player points', () => {
      const player = createMockPlayer({ totalPoints: 25 })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('25 pts')).toBeInTheDocument()
    })

    it('falls back to points if totalPoints undefined', () => {
      const player = createMockPlayer({ points: 15 })
      ;(player as any).totalPoints = undefined
      render(<PlayerCard player={player} />)

      expect(screen.getByText('15 pts')).toBeInTheDocument()
    })
  })

  describe('alive/dead state', () => {
    it('shows skull emoji for dead player', () => {
      const player = createMockPlayer({ isAlive: false })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('💀')).toBeInTheDocument()
    })

    it('does not show skull for alive player', () => {
      const player = createMockPlayer({ isAlive: true })
      render(<PlayerCard player={player} />)

      expect(screen.queryByText('💀')).not.toBeInTheDocument()
    })

    it('applies opacity to dead player card (not during round-ended)', () => {
      const player = createMockPlayer({ isAlive: false })
      const { container } = render(<PlayerCard player={player} />)

      expect(container.firstChild).toHaveClass('opacity-60')
    })

    it('does not apply opacity to dead player during round-ended', () => {
      act(() => {
        useGameStore.getState().setGameState('round-ended')
      })

      const player = createMockPlayer({ isAlive: false })
      const { container } = render(<PlayerCard player={player} />)

      expect(container.firstChild).not.toHaveClass('opacity-60')
    })
  })

  describe('round winner', () => {
    it('shows trophy for alive player when round ended', () => {
      act(() => {
        useGameStore.getState().setGameState('round-ended')
      })

      const player = createMockPlayer({ isAlive: true })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('🏆')).toBeInTheDocument()
    })

    it('applies winner styling when round ended and alive', () => {
      act(() => {
        useGameStore.getState().setGameState('round-ended')
      })

      const player = createMockPlayer({ isAlive: true })
      const { container } = render(<PlayerCard player={player} />)

      expect(container.firstChild).toHaveClass('border-yellow-400')
    })

    it('does not show trophy for dead player when round ended', () => {
      act(() => {
        useGameStore.getState().setGameState('round-ended')
      })

      const player = createMockPlayer({ isAlive: false })
      render(<PlayerCard player={player} />)

      expect(screen.queryByText('🏆')).not.toBeInTheDocument()
    })
  })

  describe('status effects icons', () => {
    it('shows shield icon for invulnerable player', () => {
      const player = createMockPlayer({
        statusEffects: [{ type: 'Invulnerability', priority: 100, timeLeft: 5000 }],
      })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('🛡️')).toBeInTheDocument()
    })

    it('shows vampire icon for bloodlust', () => {
      const player = createMockPlayer({
        statusEffects: [{ type: 'Bloodlust', priority: 50, timeLeft: 3000 }],
      })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('🧛')).toBeInTheDocument()
    })

    it('shows ice icon for stunned', () => {
      const player = createMockPlayer({
        statusEffects: [{ type: 'Stunned', priority: 20, timeLeft: 2000 }],
      })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('❄️')).toBeInTheDocument()
    })

    it('invulnerability takes priority over bloodlust', () => {
      const player = createMockPlayer({
        statusEffects: [
          { type: 'Bloodlust', priority: 50, timeLeft: 3000 },
          { type: 'Invulnerability', priority: 100, timeLeft: 5000 },
        ],
      })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('🛡️')).toBeInTheDocument()
      expect(screen.queryByText('🧛')).not.toBeInTheDocument()
    })

    it('does not show status icon for dead player', () => {
      const player = createMockPlayer({
        isAlive: false,
        statusEffects: [{ type: 'Invulnerability', priority: 100, timeLeft: 5000 }],
      })
      render(<PlayerCard player={player} />)

      expect(screen.queryByText('🛡️')).not.toBeInTheDocument()
    })

    it('handles undefined statusEffects', () => {
      const player = createMockPlayer()
      ;(player as any).statusEffects = undefined

      expect(() => render(<PlayerCard player={player} />)).not.toThrow()
    })
  })

  describe('ready badge', () => {
    it('shows ready badge when player is ready in waiting state', () => {
      act(() => {
        useGameStore.getState().setGameState('waiting')
      })

      const player = createMockPlayer({ isReady: true })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('shows ready badge when player is ready in round-ended state', () => {
      act(() => {
        useGameStore.getState().setGameState('round-ended')
      })

      const player = createMockPlayer({ isReady: true })
      render(<PlayerCard player={player} />)

      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('does not show ready badge when not ready', () => {
      act(() => {
        useGameStore.getState().setGameState('waiting')
      })

      const player = createMockPlayer({ isReady: false })
      render(<PlayerCard player={player} />)

      expect(screen.queryByText('✓')).not.toBeInTheDocument()
    })

    it('does not show ready badge during active game', () => {
      act(() => {
        useGameStore.getState().setGameState('active')
      })

      const player = createMockPlayer({ isReady: true })
      render(<PlayerCard player={player} />)

      expect(screen.queryByText('✓')).not.toBeInTheDocument()
    })
  })

  describe('health-based styling', () => {
    it('applies green styling for high health', () => {
      const player = createMockPlayer({ accumulatedDamage: 10 }) // 90% health
      const { container } = render(<PlayerCard player={player} />)

      expect(container.firstChild).toHaveClass('border-green-500/80')
    })

    it('applies amber styling for medium health', () => {
      const player = createMockPlayer({ accumulatedDamage: 50 }) // 50% health
      const { container } = render(<PlayerCard player={player} />)

      expect(container.firstChild).toHaveClass('border-amber-500/80')
    })

    it('applies red styling for low health', () => {
      const player = createMockPlayer({ accumulatedDamage: 75 }) // 25% health
      const { container } = render(<PlayerCard player={player} />)

      expect(container.firstChild).toHaveClass('border-red-500/90')
    })

    it('applies gray styling for dead player', () => {
      const player = createMockPlayer({ isAlive: false })
      const { container } = render(<PlayerCard player={player} />)

      expect(container.firstChild).toHaveClass('border-gray-500/30')
    })
  })

  describe('animation classes', () => {
    it('has transition classes for smooth updates', () => {
      const player = createMockPlayer()
      const { container } = render(<PlayerCard player={player} />)

      expect(container.firstChild).toHaveClass('transition-all')
      expect(container.firstChild).toHaveClass('duration-300')
    })

    it('has rounded border', () => {
      const player = createMockPlayer()
      const { container } = render(<PlayerCard player={player} />)

      expect(container.firstChild).toHaveClass('rounded-lg')
      expect(container.firstChild).toHaveClass('border-4')
    })
  })
})
