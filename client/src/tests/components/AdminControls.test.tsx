import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminControls from '@/components/dashboard/AdminControls'
import { useGameStore } from '@/store/gameStore'

// Mock the api service
vi.mock('@/services/api', () => ({
  apiService: {
    getGameModes: vi.fn().mockResolvedValue({
      success: true,
      modes: [
        { key: 'classic', name: 'Classic' },
        { key: 'role-based', name: 'Role Based' },
      ],
    }),
    getSettings: vi.fn().mockResolvedValue({
      success: true,
      sensitivity: 'medium',
      movement: { dangerThreshold: 0.1, damageMultiplier: 50 },
      presets: [
        { key: 'low', label: 'Low', description: 'Forgiving — need big movements to take damage' },
        { key: 'medium', label: 'Medium', description: 'Default — current behavior' },
        { key: 'high', label: 'High', description: 'Punishing — small movements hurt' },
        { key: 'extreme', label: 'Extreme', description: 'Brutal — almost any movement is deadly' },
      ],
    }),
    updateSettings: vi.fn().mockResolvedValue({
      success: true,
      sensitivity: 'high',
      movement: { dangerThreshold: 0.05, damageMultiplier: 70 },
    }),
    launchGame: vi.fn().mockResolvedValue({
      success: true,
      gameId: 'game-1',
      mode: { key: 'role-based', name: 'Role Based' },
      playerCount: 2,
      state: 'countdown',
    }),
  },
}))

// Mock useGameState hook
vi.mock('@/hooks/useGameState', () => ({
  useGameState: () => ({
    players: [
      { id: 'p1', name: 'Alice', number: 1 },
      { id: 'p2', name: 'Bob', number: 2 },
    ],
  }),
}))

// Get the mocked module
import { apiService } from '@/services/api'

describe('AdminControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStore.getState().reset()
    useGameStore.getState().setDevMode(true)
  })

  it('renders sensitivity preset buttons after loading', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByText('Low')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('Extreme')).toBeInTheDocument()
    })
  })

  it('shows sensitivity label', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByText('Movement Sensitivity')).toBeInTheDocument()
    })
  })

  it('highlights the current sensitivity preset', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      const mediumBtn = screen.getByText('Medium')
      expect(mediumBtn.className).toContain('bg-blue-600')
    })
  })

  it('calls updateSettings when a preset is clicked', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByText('High')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('High'))

    await waitFor(() => {
      expect(apiService.updateSettings).toHaveBeenCalledWith({ sensitivity: 'high' })
    })
  })

  it('shows preset description text', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByText('Default — current behavior')).toBeInTheDocument()
    })
  })

  it('fetches settings on mount', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(apiService.getSettings).toHaveBeenCalledTimes(1)
    })
  })
})
