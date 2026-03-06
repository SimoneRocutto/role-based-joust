import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CompactPlayerCard from '@/components/dashboard/CompactPlayerCard'

function createPlayer(overrides: Partial<{ id: string; name: string; number: number; isReady: boolean; isConnected: boolean; isKing: boolean }> = {}) {
  return {
    id: 'player-1',
    name: 'Test Player',
    number: 1,
    isReady: false,
    isConnected: true,
    ...overrides,
  }
}

describe('CompactPlayerCard', () => {
  describe('basic rendering', () => {
    it('renders player number and name', () => {
      render(<CompactPlayerCard player={createPlayer({ number: 3, name: 'Alice' })} teamColor="#ff0000" />)

      expect(screen.getByText('#3')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('shows ready check when player is ready', () => {
      render(<CompactPlayerCard player={createPlayer({ isReady: true })} teamColor="#ff0000" />)

      expect(screen.getByText('\u2713')).toBeInTheDocument()
    })

    it('shows OFFLINE when player is disconnected', () => {
      render(<CompactPlayerCard player={createPlayer({ isConnected: false })} teamColor="#ff0000" />)

      expect(screen.getByText('OFFLINE')).toBeInTheDocument()
    })
  })

  describe('king crown indicator', () => {
    it('shows crown for king player when isKingMode is true', () => {
      render(
        <CompactPlayerCard
          player={createPlayer({ isKing: true })}
          teamColor="#ff0000"
          isKingMode
        />
      )

      expect(screen.getByText('\uD83D\uDC51')).toBeInTheDocument()
    })

    it('does not show crown for non-king player when isKingMode is true', () => {
      render(
        <CompactPlayerCard
          player={createPlayer({ isKing: false })}
          teamColor="#ff0000"
          isKingMode
        />
      )

      expect(screen.queryByText('\uD83D\uDC51')).not.toBeInTheDocument()
    })

    it('does not show crown for king player when isKingMode is false', () => {
      render(
        <CompactPlayerCard
          player={createPlayer({ isKing: true })}
          teamColor="#ff0000"
          isKingMode={false}
        />
      )

      expect(screen.queryByText('\uD83D\uDC51')).not.toBeInTheDocument()
    })

    it('does not show crown for king player when isKingMode is not provided', () => {
      render(
        <CompactPlayerCard
          player={createPlayer({ isKing: true })}
          teamColor="#ff0000"
        />
      )

      expect(screen.queryByText('\uD83D\uDC51')).not.toBeInTheDocument()
    })
  })
})
