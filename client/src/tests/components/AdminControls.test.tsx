import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminControls from '@/components/dashboard/AdminControls'
import { useGameStore } from '@/store/gameStore'

// Mock qrcode module
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake-qr-code'),
  },
}))

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
        { key: 'oneshot', label: 'One Shot', description: 'Any movement above threshold = instant death' },
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

  it('renders a gear settings button', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByLabelText('Open advanced settings')).toBeInTheDocument()
    })
  })

  it('opens the settings modal when gear button is clicked', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByLabelText('Open advanced settings')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Open advanced settings'))

    await waitFor(() => {
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument()
    })
  })

  it('does not show settings modal before gear is clicked', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.queryByText('Advanced Settings')).not.toBeInTheDocument()
    })
  })

  it('shows movement threshold slider inside the settings modal', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByLabelText('Open advanced settings')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Open advanced settings'))

    await waitFor(() => {
      expect(screen.getByText(/Movement Threshold/)).toBeInTheDocument()
      expect(screen.getByText('How much movement is needed before taking damage')).toBeInTheDocument()
    })

    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveValue('10') // default 0.10 = 10%
  })

  it('calls updateSettings with dangerThreshold when slider changes inside modal', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByLabelText('Open advanced settings')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Open advanced settings'))

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } })

    await waitFor(() => {
      expect(apiService.updateSettings).toHaveBeenCalledWith({ dangerThreshold: 0.20 })
    })
  })

  it('auto-switches sensitivity to oneshot when classic mode is selected', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByText('Classic')).toBeInTheDocument()
    })

    // Select classic mode from combined mode dropdown (default is "role-based" = "Roles")
    fireEvent.change(screen.getByDisplayValue('Roles'), { target: { value: 'classic' } })

    await waitFor(() => {
      // Combined mode change persists the mode, teams, and auto-switched sensitivity
      expect(apiService.updateSettings).toHaveBeenCalledWith({
        gameMode: 'classic',
        teamsEnabled: false,
        sensitivity: 'oneshot',
      })
    })
  })

  it('auto-switches sensitivity to medium when switching from classic to role-based', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByText('Classic')).toBeInTheDocument()
    })

    // Select classic mode first
    fireEvent.change(screen.getByDisplayValue('Roles'), { target: { value: 'classic' } })

    await waitFor(() => {
      expect(apiService.updateSettings).toHaveBeenCalledWith({
        gameMode: 'classic',
        teamsEnabled: false,
        sensitivity: 'oneshot',
      })
    })

    vi.clearAllMocks()

    // Switch back to role-based
    fireEvent.change(screen.getByDisplayValue('Classic'), { target: { value: 'role-based' } })

    await waitFor(() => {
      // Combined mode change persists the mode, teams, and auto-switched sensitivity
      expect(apiService.updateSettings).toHaveBeenCalledWith({
        gameMode: 'role-based',
        teamsEnabled: false,
        sensitivity: 'medium',
      })
    })
  })

  it('renders QR code image with alt text', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      const qrImg = screen.getByAltText('Scan to join')
      expect(qrImg).toBeInTheDocument()
      expect(qrImg).toHaveAttribute('src', 'data:image/png;base64,fake-qr-code')
    })
  })

  it('displays the join URL text', async () => {
    render(<AdminControls />)

    await waitFor(() => {
      expect(screen.getByText(`${window.location.origin}/join`)).toBeInTheDocument()
    })
  })
})
