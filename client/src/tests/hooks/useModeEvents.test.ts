import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useModeEvents } from '@/hooks/useModeEvents'
import { useGameStore } from '@/store/gameStore'
import { MODE_EVENT_EFFECTS, DASHBOARD_MODE_BACKGROUNDS } from '@/utils/constants'

// Capture the callback registered with onModeEvent
let modeEventCallback: ((data: { eventType: string }) => void) | null = null

const { mockPlaySfx, mockSetMusicRate } = vi.hoisted(() => ({
  mockPlaySfx: vi.fn(),
  mockSetMusicRate: vi.fn(),
}))

vi.mock('@/services/socket', () => ({
  socketService: {
    onModeEvent: vi.fn((cb: any) => {
      modeEventCallback = cb
    }),
    off: vi.fn(),
  },
}))

vi.mock('@/services/audio', () => ({
  audioManager: {
    playSfx: mockPlaySfx,
    setMusicRate: mockSetMusicRate,
    playMusic: vi.fn(),
    stopMusic: vi.fn(),
    initialize: vi.fn(),
  },
}))

import { socketService } from '@/services/socket'

describe('useModeEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    modeEventCallback = null
    useGameStore.getState().reset()
  })

  it('registers mode:event socket listener on mount', () => {
    renderHook(() => useModeEvents())
    expect(socketService.onModeEvent).toHaveBeenCalledTimes(1)
    expect(modeEventCallback).toBeInstanceOf(Function)
  })

  it('cleans up mode:event listener on unmount', () => {
    const { unmount } = renderHook(() => useModeEvents())
    unmount()
    expect(socketService.off).toHaveBeenCalledWith('mode:event')
  })

  describe('speed-shift:start event', () => {
    it('plays speed-up SFX', () => {
      renderHook(() => useModeEvents())

      act(() => {
        modeEventCallback!({ eventType: 'speed-shift:start' })
      })

      expect(mockPlaySfx).toHaveBeenCalledWith('speed-up')
    })

    it('sets music rate to 2.0', () => {
      renderHook(() => useModeEvents())

      act(() => {
        modeEventCallback!({ eventType: 'speed-shift:start' })
      })

      expect(mockSetMusicRate).toHaveBeenCalledWith(2.0)
    })

    it('sets activeModeEvent in the store', () => {
      renderHook(() => useModeEvents())

      act(() => {
        modeEventCallback!({ eventType: 'speed-shift:start' })
      })

      expect(useGameStore.getState().activeModeEvent).toBe('speed-shift:start')
    })
  })

  describe('speed-shift:end event', () => {
    it('plays speed-down SFX', () => {
      renderHook(() => useModeEvents())

      act(() => {
        modeEventCallback!({ eventType: 'speed-shift:end' })
      })

      expect(mockPlaySfx).toHaveBeenCalledWith('speed-down')
    })

    it('resets music rate to 1.0', () => {
      renderHook(() => useModeEvents())

      act(() => {
        modeEventCallback!({ eventType: 'speed-shift:end' })
      })

      expect(mockSetMusicRate).toHaveBeenCalledWith(1.0)
    })
  })

  describe('unknown events', () => {
    it('ignores events not in MODE_EVENT_EFFECTS', () => {
      renderHook(() => useModeEvents())

      act(() => {
        modeEventCallback!({ eventType: 'unknown-event' })
      })

      expect(mockPlaySfx).not.toHaveBeenCalled()
      expect(mockSetMusicRate).not.toHaveBeenCalled()
      expect(useGameStore.getState().activeModeEvent).toBe(null)
    })
  })

  describe('background resolution', () => {
    it('returns fallback when no mode or event is active', () => {
      const { result } = renderHook(() => useModeEvents())
      expect(result.current.background).toBe('#111827')
    })

    it('returns mode default when game is active with known mode', () => {
      useGameStore.getState().setGameState('active')
      useGameStore.getState().setMode('classic')

      const { result } = renderHook(() => useModeEvents())
      expect(result.current.background).toBe(DASHBOARD_MODE_BACKGROUNDS['classic'].background)
    })

    it('returns event background, overriding mode default', () => {
      useGameStore.getState().setGameState('active')
      useGameStore.getState().setMode('classic')
      useGameStore.getState().setActiveModeEvent('speed-shift:start')

      const { result } = renderHook(() => useModeEvents())
      expect(result.current.background).toBe(MODE_EVENT_EFFECTS['speed-shift:start'].background)
    })

    it('does not apply mode background when game is not active', () => {
      useGameStore.getState().setGameState('waiting')
      useGameStore.getState().setMode('classic')

      const { result } = renderHook(() => useModeEvents())
      expect(result.current.background).toBe('#111827')
    })

    it('clears activeModeEvent when game becomes inactive', () => {
      useGameStore.getState().setGameState('active')
      useGameStore.getState().setActiveModeEvent('speed-shift:start')

      const { rerender } = renderHook(() => useModeEvents())

      act(() => {
        useGameStore.getState().setGameState('round-ended')
      })

      rerender()

      expect(useGameStore.getState().activeModeEvent).toBe(null)
    })
  })
})
