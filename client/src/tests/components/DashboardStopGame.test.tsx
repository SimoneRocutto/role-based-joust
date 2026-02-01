import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DashboardView from '@/pages/DashboardView'
import { useGameStore } from '@/store/gameStore'

// Mock all dependencies
vi.mock('@/services/api', () => ({
  apiService: {
    getGameConfig: vi.fn().mockResolvedValue({ success: true, devMode: true }),
    getLobbyPlayers: vi.fn().mockResolvedValue({
      success: true,
      players: [
        { id: 'p1', name: 'Alice', number: 1, isAlive: true, isReady: false },
        { id: 'p2', name: 'Bob', number: 2, isAlive: true, isReady: false },
      ],
    }),
    getGameState: vi.fn().mockResolvedValue({ success: true, state: null }),
    stopGame: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('@/services/socket', () => ({
  socketService: {
    onPlayerReady: vi.fn(),
    onReadyCountUpdate: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    playMusic: vi.fn(),
    play: vi.fn(),
    isAudioUnlocked: false,
  }),
}))

vi.mock('@/components/dashboard/GameState', () => ({
  default: () => <div data-testid="game-state">GameState</div>,
}))

vi.mock('@/components/dashboard/PlayerGrid', () => ({
  default: () => <div data-testid="player-grid">PlayerGrid</div>,
}))

vi.mock('@/components/dashboard/EventFeed', () => ({
  default: () => <div data-testid="event-feed">EventFeed</div>,
}))

vi.mock('@/components/dashboard/AdminControls', () => ({
  default: () => <div data-testid="admin-controls">AdminControls</div>,
}))

vi.mock('@/components/dashboard/Scoreboard', () => ({
  default: () => <div data-testid="scoreboard">Scoreboard</div>,
}))

vi.mock('@/components/dashboard/CountdownDisplay', () => ({
  default: () => <div data-testid="countdown-display">CountdownDisplay</div>,
}))

import { apiService } from '@/services/api'

describe('DashboardView - Stop Game button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStore.getState().reset()
  })

  it('does not show stop button in waiting state', async () => {
    useGameStore.getState().setGameState('waiting')

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.queryByText('STOP GAME')).not.toBeInTheDocument()
    })
  })

  it('shows stop button during countdown', async () => {
    useGameStore.getState().setGameState('countdown')

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.getByText('STOP GAME')).toBeInTheDocument()
    })
  })

  it('shows stop button during active state', async () => {
    useGameStore.getState().setGameState('active')

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.getByText('STOP GAME')).toBeInTheDocument()
    })
  })

  it('does not show stop button in finished state', async () => {
    useGameStore.getState().setGameState('finished')

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.queryByText('STOP GAME')).not.toBeInTheDocument()
    })
  })

  it('calls stopGame API when clicked', async () => {
    useGameStore.getState().setGameState('active')

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.getByText('STOP GAME')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('STOP GAME'))

    await waitFor(() => {
      expect(apiService.stopGame).toHaveBeenCalledTimes(1)
    })
  })

  it('resets game state to waiting after stopping', async () => {
    useGameStore.getState().setGameState('active')

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.getByText('STOP GAME')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('STOP GAME'))

    await waitFor(() => {
      expect(useGameStore.getState().gameState).toBe('waiting')
    })
  })

  it('fetches lobby players after stopping', async () => {
    useGameStore.getState().setGameState('active')

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.getByText('STOP GAME')).toBeInTheDocument()
    })

    // Clear the initial mount call
    vi.mocked(apiService.getLobbyPlayers).mockClear()

    fireEvent.click(screen.getByText('STOP GAME'))

    await waitFor(() => {
      expect(apiService.getLobbyPlayers).toHaveBeenCalledTimes(1)
    })
  })

  it('shows STOPPING... text while request is in progress', async () => {
    useGameStore.getState().setGameState('active')
    // Make stopGame hang
    vi.mocked(apiService.stopGame).mockImplementation(
      () => new Promise(() => {})
    )

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.getByText('STOP GAME')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('STOP GAME'))

    await waitFor(() => {
      expect(screen.getByText('STOPPING...')).toBeInTheDocument()
    })
  })

  it('shows Scoreboard during round-ended state', async () => {
    useGameStore.getState().setGameState('round-ended')

    render(<DashboardView />)

    await waitFor(() => {
      expect(screen.getByTestId('scoreboard')).toBeInTheDocument()
    })
  })
})
