import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import Scoreboard from '@/components/dashboard/Scoreboard'
import { useGameStore } from '@/store/gameStore'

// Mock the api service
vi.mock('@/services/api', () => ({
  apiService: {
    stopGame: vi.fn().mockResolvedValue({ success: true }),
    startNextRound: vi.fn().mockResolvedValue({ success: true }),
    getLobbyPlayers: vi.fn().mockResolvedValue({
      success: true,
      players: [
        { id: 'p1', name: 'Alice', number: 1, isAlive: true },
        { id: 'p2', name: 'Bob', number: 2, isAlive: true },
      ],
    }),
  },
}))

import { apiService } from '@/services/api'

const mockScores = [
  { playerId: 'p1', playerName: 'Alice', playerNumber: 1, score: 10, roundPoints: 5, rank: 1, status: 'Winner' },
  { playerId: 'p2', playerName: 'Bob', playerNumber: 2, score: 0, roundPoints: 0, rank: 2, status: 'Rank 2' },
]

describe('Scoreboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStore.getState().reset()
  })

  describe('during round-ended state', () => {
    beforeEach(() => {
      act(() => {
        useGameStore.getState().setGameState('round-ended')
        useGameStore.getState().setScores(mockScores)
        useGameStore.getState().setRound(1, 3)
      })
    })

    it('shows both NEXT ROUND and STOP GAME buttons', () => {
      render(<Scoreboard />)

      expect(screen.getByText('NEXT ROUND →')).toBeInTheDocument()
      expect(screen.getByText('STOP GAME')).toBeInTheDocument()
    })

    it('calls stopGame API when STOP GAME is clicked', async () => {
      render(<Scoreboard />)

      fireEvent.click(screen.getByText('STOP GAME'))

      await waitFor(() => {
        expect(apiService.stopGame).toHaveBeenCalledTimes(1)
      })
    })

    it('resets game state to waiting when STOP GAME is clicked', async () => {
      render(<Scoreboard />)

      fireEvent.click(screen.getByText('STOP GAME'))

      await waitFor(() => {
        expect(useGameStore.getState().gameState).toBe('waiting')
      })
    })

    it('clears scores when STOP GAME is clicked', async () => {
      render(<Scoreboard />)

      fireEvent.click(screen.getByText('STOP GAME'))

      await waitFor(() => {
        expect(useGameStore.getState().scores).toEqual([])
      })
    })

    it('fetches lobby players after stopping', async () => {
      render(<Scoreboard />)

      fireEvent.click(screen.getByText('STOP GAME'))

      await waitFor(() => {
        expect(apiService.getLobbyPlayers).toHaveBeenCalledTimes(1)
      })
    })

    it('calls startNextRound API when NEXT ROUND is clicked', async () => {
      render(<Scoreboard />)

      fireEvent.click(screen.getByText('NEXT ROUND →'))

      await waitFor(() => {
        expect(apiService.startNextRound).toHaveBeenCalledTimes(1)
      })
    })

    it('shows round complete title', () => {
      render(<Scoreboard />)

      expect(screen.getByText('ROUND 1 COMPLETE')).toBeInTheDocument()
    })

    it('shows remaining rounds', () => {
      render(<Scoreboard />)

      expect(screen.getByText('2 rounds remaining')).toBeInTheDocument()
    })
  })

  describe('during finished state', () => {
    beforeEach(() => {
      act(() => {
        useGameStore.getState().setGameState('finished')
        useGameStore.getState().setScores(mockScores)
        useGameStore.getState().setRound(3, 3)
      })
    })

    it('shows only NEW GAME button, not STOP GAME', () => {
      render(<Scoreboard />)

      expect(screen.getByText('NEW GAME')).toBeInTheDocument()
      expect(screen.queryByText('STOP GAME')).not.toBeInTheDocument()
    })

    it('shows game complete title', () => {
      render(<Scoreboard />)

      expect(screen.getByText('GAME COMPLETE')).toBeInTheDocument()
    })

    it('calls stopGame API when NEW GAME is clicked', async () => {
      render(<Scoreboard />)

      fireEvent.click(screen.getByText('NEW GAME'))

      await waitFor(() => {
        expect(apiService.stopGame).toHaveBeenCalledTimes(1)
      })
    })

    it('shows ready count when players are readying up', () => {
      act(() => {
        useGameStore.getState().setReadyCount({ ready: 2, total: 5 })
      })

      render(<Scoreboard />)

      expect(screen.getByTestId('ready-count')).toHaveTextContent('2/5 players ready')
    })

    it('shows starting message when all players are ready', () => {
      act(() => {
        useGameStore.getState().setReadyCount({ ready: 3, total: 3 })
      })

      render(<Scoreboard />)

      expect(screen.getByTestId('ready-count')).toHaveTextContent('3/3 players ready')
      expect(screen.getByTestId('ready-count')).toHaveTextContent('starting new game')
    })

    it('does not show ready count when total is 0', () => {
      act(() => {
        useGameStore.getState().setReadyCount({ ready: 0, total: 0 })
      })

      render(<Scoreboard />)

      expect(screen.queryByTestId('ready-count')).not.toBeInTheDocument()
    })
  })

  describe('leaderboard rendering', () => {
    beforeEach(() => {
      act(() => {
        useGameStore.getState().setGameState('finished')
        useGameStore.getState().setScores(mockScores)
      })
    })

    it('shows player names and scores', () => {
      render(<Scoreboard />)

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('10 pts')).toBeInTheDocument()
      expect(screen.getByText('0 pts')).toBeInTheDocument()
    })
  })

  describe('round points display', () => {
    it('shows roundPoints (not total score) as "this round" during round-ended', () => {
      act(() => {
        useGameStore.getState().setGameState('round-ended')
        useGameStore.getState().setScores(mockScores)
        useGameStore.getState().setRound(2, 3)
      })

      render(<Scoreboard />)

      // mockScores: Alice has score=10, roundPoints=5; Bob has score=0, roundPoints=0
      // Should show roundPoints, not total score
      expect(screen.getByText('(+5 this round)')).toBeInTheDocument()
      expect(screen.getByText('(+0 this round)')).toBeInTheDocument()
      // Should NOT show total score as "this round"
      expect(screen.queryByText('(+10 this round)')).not.toBeInTheDocument()
    })

    it('does not show "this round" text when game is finished', () => {
      act(() => {
        useGameStore.getState().setGameState('finished')
        useGameStore.getState().setScores(mockScores)
        useGameStore.getState().setRound(3, 3)
      })

      render(<Scoreboard />)

      expect(screen.queryByText('(+5 this round)')).not.toBeInTheDocument()
      expect(screen.queryByText('(+0 this round)')).not.toBeInTheDocument()
    })
  })
})
