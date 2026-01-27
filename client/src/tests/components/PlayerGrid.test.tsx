import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import PlayerGrid from '@/components/dashboard/PlayerGrid'
import { useGameStore } from '@/store/gameStore'
import type { PlayerState } from '@/types/player.types'

function createMockPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: `player-${Math.random()}`,
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

function createPlayers(count: number): PlayerState[] {
  return Array.from({ length: count }, (_, i) =>
    createMockPlayer({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      number: i + 1,
    })
  )
}

describe('PlayerGrid', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  describe('empty state', () => {
    it('shows waiting message when no players', () => {
      render(<PlayerGrid />)

      expect(screen.getByText('Waiting for players to join...')).toBeInTheDocument()
    })
  })

  describe('rendering players', () => {
    it('renders all players', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(4))
      })

      render(<PlayerGrid />)

      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
      expect(screen.getByText('#3')).toBeInTheDocument()
      expect(screen.getByText('#4')).toBeInTheDocument()
    })

    it('renders player names', () => {
      act(() => {
        useGameStore.getState().updatePlayers([
          createMockPlayer({ id: 'p1', name: 'Alice', number: 1 }),
          createMockPlayer({ id: 'p2', name: 'Bob', number: 2 }),
        ])
      })

      render(<PlayerGrid />)

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  describe('player sorting', () => {
    it('shows alive players before dead players', () => {
      act(() => {
        useGameStore.getState().updatePlayers([
          createMockPlayer({ id: 'p1', name: 'Dead1', number: 1, isAlive: false }),
          createMockPlayer({ id: 'p2', name: 'Alive1', number: 2, isAlive: true }),
          createMockPlayer({ id: 'p3', name: 'Dead2', number: 3, isAlive: false }),
          createMockPlayer({ id: 'p4', name: 'Alive2', number: 4, isAlive: true }),
        ])
      })

      render(<PlayerGrid />)

      const playerNumbers = screen.getAllByText(/#\d/)
      const numbers = playerNumbers.map((el) => el.textContent)

      // Alive players (2, 4) should come before dead players (1, 3)
      expect(numbers.indexOf('#2')).toBeLessThan(numbers.indexOf('#1'))
      expect(numbers.indexOf('#4')).toBeLessThan(numbers.indexOf('#3'))
    })

    it('sorts alive players by number', () => {
      act(() => {
        useGameStore.getState().updatePlayers([
          createMockPlayer({ id: 'p3', name: 'Third', number: 3, isAlive: true }),
          createMockPlayer({ id: 'p1', name: 'First', number: 1, isAlive: true }),
          createMockPlayer({ id: 'p2', name: 'Second', number: 2, isAlive: true }),
        ])
      })

      render(<PlayerGrid />)

      const playerNumbers = screen.getAllByText(/#\d/)
      const numbers = playerNumbers.map((el) => el.textContent)

      expect(numbers.indexOf('#1')).toBeLessThan(numbers.indexOf('#2'))
      expect(numbers.indexOf('#2')).toBeLessThan(numbers.indexOf('#3'))
    })

    it('sorts dead players by number', () => {
      act(() => {
        useGameStore.getState().updatePlayers([
          createMockPlayer({ id: 'p3', name: 'Third', number: 3, isAlive: false }),
          createMockPlayer({ id: 'p1', name: 'First', number: 1, isAlive: false }),
          createMockPlayer({ id: 'p2', name: 'Second', number: 2, isAlive: false }),
        ])
      })

      render(<PlayerGrid />)

      const playerNumbers = screen.getAllByText(/#\d/)
      const numbers = playerNumbers.map((el) => el.textContent)

      expect(numbers.indexOf('#1')).toBeLessThan(numbers.indexOf('#2'))
      expect(numbers.indexOf('#2')).toBeLessThan(numbers.indexOf('#3'))
    })
  })

  describe('grid layout', () => {
    it('uses 4 columns for 12 or fewer players', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(8))
      })

      const { container } = render(<PlayerGrid />)
      const grid = container.querySelector('.grid')

      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' })
    })

    it('uses 4 columns for 13-16 players', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(14))
      })

      const { container } = render(<PlayerGrid />)
      const grid = container.querySelector('.grid')

      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' })
    })

    it('uses 5 columns for more than 16 players', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(18))
      })

      const { container } = render(<PlayerGrid />)
      const grid = container.querySelector('.grid')

      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' })
    })

    it('uses gap-4 for 16 or fewer players', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(12))
      })

      const { container } = render(<PlayerGrid />)
      const grid = container.querySelector('.grid')

      expect(grid).toHaveClass('gap-4')
    })

    it('uses gap-3 for more than 16 players', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(20))
      })

      const { container } = render(<PlayerGrid />)
      const grid = container.querySelector('.grid')

      expect(grid).toHaveClass('gap-3')
    })
  })

  describe('boundary cases', () => {
    it('handles exactly 12 players (4 columns)', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(12))
      })

      const { container } = render(<PlayerGrid />)
      const grid = container.querySelector('.grid')

      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' })
    })

    it('handles exactly 16 players (4 columns)', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(16))
      })

      const { container } = render(<PlayerGrid />)
      const grid = container.querySelector('.grid')

      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' })
    })

    it('handles exactly 17 players (5 columns)', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(17))
      })

      const { container } = render(<PlayerGrid />)
      const grid = container.querySelector('.grid')

      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' })
    })

    it('handles single player', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(1))
      })

      render(<PlayerGrid />)

      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('handles maximum players (20)', () => {
      act(() => {
        useGameStore.getState().updatePlayers(createPlayers(20))
      })

      render(<PlayerGrid />)

      // All 20 players should be rendered
      for (let i = 1; i <= 20; i++) {
        expect(screen.getByText(`#${i}`)).toBeInTheDocument()
      }
    })
  })

  describe('integration with PlayerCard', () => {
    it('passes correct player data to each card', () => {
      act(() => {
        useGameStore.getState().updatePlayers([
          createMockPlayer({ id: 'p1', name: 'Alice', number: 1, totalPoints: 100 }),
          createMockPlayer({ id: 'p2', name: 'Bob', number: 2, isAlive: false }),
        ])
      })

      render(<PlayerGrid />)

      // Check Alice's card
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('100 pts')).toBeInTheDocument()

      // Check Bob's card (dead player shows skull)
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('💀')).toBeInTheDocument()
    })
  })
})
