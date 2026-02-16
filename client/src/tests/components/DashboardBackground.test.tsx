import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import DashboardView from '@/pages/DashboardView'
import { useGameStore } from '@/store/gameStore'
import { GAME_EVENT_DEFAULTS, MODE_EVENT_EFFECTS } from '@/utils/constants'

// Mock all dependencies
vi.mock('@/services/api', () => ({
  apiService: {
    getGameConfig: vi.fn().mockResolvedValue({ success: true, devMode: true }),
    getLobbyPlayers: vi.fn().mockResolvedValue({ success: true, players: [] }),
    getGameState: vi.fn().mockResolvedValue({ success: true, state: null }),
    stopGame: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('@/services/socket', () => ({
  socketService: {
    onPlayerReady: vi.fn(),
    onReadyCountUpdate: vi.fn(),
    onCountdown: vi.fn(),
    onModeEvent: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('@/services/audio', () => ({
  audioManager: {
    playMusic: vi.fn(),
    playSfx: vi.fn(),
    setMusicRate: vi.fn(),
    stopMusic: vi.fn(),
    initialize: vi.fn(),
  },
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

function getRootDiv(container: HTMLElement) {
  return container.firstElementChild as HTMLElement
}

describe('DashboardView - Background color', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStore.getState().reset()
  })

  it('uses default gray-900 fallback when no mode or event is active', () => {
    const { container } = render(<DashboardView />)
    const root = getRootDiv(container)

    expect(root.style.background).toBe('#111827')
  })

  it('applies game event default background when active with speed-shift event', () => {
    useGameStore.getState().setGameState('active')
    useGameStore.getState().setActiveGameEvents(['speed-shift'])

    const { container } = render(<DashboardView />)
    const root = getRootDiv(container)

    expect(root.style.background).toBe(GAME_EVENT_DEFAULTS['speed-shift'].background)
  })

  it('applies event background on speed-shift:start, overriding game event default', () => {
    useGameStore.getState().setGameState('active')
    useGameStore.getState().setActiveGameEvents(['speed-shift'])
    useGameStore.getState().setActiveModeEvent('speed-shift:start')

    const { container } = render(<DashboardView />)
    const root = getRootDiv(container)

    expect(root.style.background).toBe(MODE_EVENT_EFFECTS['speed-shift:start'].background)
  })

  it('returns to game event default background on speed-shift:end', () => {
    useGameStore.getState().setGameState('active')
    useGameStore.getState().setActiveGameEvents(['speed-shift'])
    useGameStore.getState().setActiveModeEvent('speed-shift:end')

    const { container } = render(<DashboardView />)
    const root = getRootDiv(container)

    expect(root.style.background).toBe(MODE_EVENT_EFFECTS['speed-shift:end'].background)
  })

  it('resets to gray-900 fallback when game is no longer active', () => {
    useGameStore.getState().setGameState('active')
    useGameStore.getState().setActiveGameEvents(['speed-shift'])
    useGameStore.getState().setActiveModeEvent('speed-shift:start')

    const { container, rerender } = render(<DashboardView />)
    const root = getRootDiv(container)

    expect(root.style.background).toBe(MODE_EVENT_EFFECTS['speed-shift:start'].background)

    // Transition to round-ended (no longer active)
    act(() => {
      useGameStore.getState().setGameState('round-ended')
    })

    rerender(<DashboardView />)

    // activeModeEvent cleared by useModeEvents, falls back to gray-900
    expect(root.style.background).toBe('#111827')
  })

  it('does not apply game event background when game is in waiting state', () => {
    useGameStore.getState().setGameState('waiting')
    useGameStore.getState().setActiveGameEvents(['speed-shift'])

    const { container } = render(<DashboardView />)
    const root = getRootDiv(container)

    expect(root.style.background).toBe('#111827')
  })

  it('uses gray-900 fallback when no game events and no mode event', () => {
    useGameStore.getState().setGameState('active')

    const { container } = render(<DashboardView />)
    const root = getRootDiv(container)

    expect(root.style.background).toBe('#111827')
  })

  it('has transition style for smooth background changes', () => {
    const { container } = render(<DashboardView />)
    const root = getRootDiv(container)

    expect(root.style.transition).toBe('background 0.5s ease-in-out')
  })
})

describe('gameStore - activeModeEvent', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('initializes activeModeEvent to null', () => {
    expect(useGameStore.getState().activeModeEvent).toBe(null)
  })

  it('setActiveModeEvent updates the value', () => {
    useGameStore.getState().setActiveModeEvent('speed-shift:start')
    expect(useGameStore.getState().activeModeEvent).toBe('speed-shift:start')
  })

  it('setActiveModeEvent can clear the value', () => {
    useGameStore.getState().setActiveModeEvent('speed-shift:start')
    useGameStore.getState().setActiveModeEvent(null)
    expect(useGameStore.getState().activeModeEvent).toBe(null)
  })

  it('resetReadyState clears activeModeEvent', () => {
    useGameStore.getState().setActiveModeEvent('speed-shift:start')
    useGameStore.getState().resetReadyState()
    expect(useGameStore.getState().activeModeEvent).toBe(null)
  })

  it('reset clears activeModeEvent', () => {
    useGameStore.getState().setActiveModeEvent('speed-shift:start')
    useGameStore.getState().reset()
    expect(useGameStore.getState().activeModeEvent).toBe(null)
  })
})
