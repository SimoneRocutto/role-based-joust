import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameStore } from '@/store/gameStore'

// Track registered event handlers - must be at module level for hoisting
const socketEventHandlers: Map<string, Function[]> = new Map()

// Track connection status for mock
let mockConnected = true

// Mock socketService - factory must not reference variables defined after vi.mock
vi.mock('@/services/socket', () => ({
  socketService: {
    on: (event: string, callback: Function) => {
      if (!socketEventHandlers.has(event)) {
        socketEventHandlers.set(event, [])
      }
      socketEventHandlers.get(event)!.push(callback)
    },
    off: (event: string) => {
      socketEventHandlers.delete(event)
    },
    onPlayerReconnected: (callback: Function) => {
      if (!socketEventHandlers.has('player:reconnected')) {
        socketEventHandlers.set('player:reconnected', [])
      }
      socketEventHandlers.get('player:reconnected')!.push(callback)
    },
    reconnect: vi.fn(),
    getSocketId: () => 'mock-socket-id',
    getConnectionStatus: () => mockConnected,
    forceReconnect: vi.fn(),
  },
}))

// Mock constants
vi.mock('@/utils/constants', () => ({
  RECONNECTION_CONFIG: {
    MAX_ATTEMPTS: 5,
    RETRY_INTERVAL: 100, // Shortened for tests
    TIMEOUT: 500, // Shortened for tests (legacy, not used by hook anymore)
  },
}))

// Import after mocks
import { useReconnect } from '@/hooks/useReconnect'
import { socketService } from '@/services/socket'

// Helper to trigger socket events
function triggerSocketEvent(event: string, data?: any) {
  const handlers = socketEventHandlers.get(event)
  if (handlers) {
    handlers.forEach((handler) => handler(data))
  }
}

describe('useReconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    socketEventHandlers.clear()
    useGameStore.getState().reset()
    mockConnected = true

    // Reset localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useReconnect())

      expect(result.current.isReconnecting).toBe(false)
      expect(result.current.isGivenUp).toBe(false)
      expect(result.current.attempts).toBe(0)
    })

    it('registers socket event listeners on mount', () => {
      renderHook(() => useReconnect())

      expect(socketEventHandlers.has('connection:change')).toBe(true)
      expect(socketEventHandlers.has('player:reconnected')).toBe(true)
    })

    it('cleans up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useReconnect())

      unmount()

      expect(socketEventHandlers.has('connection:change')).toBe(false)
    })
  })

  describe('disconnect handling', () => {
    it('does not start reconnecting without session token but reconnects transport', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const { result } = renderHook(() => useReconnect())

      act(() => {
        triggerSocketEvent('connection:change', false)
      })

      expect(result.current.isReconnecting).toBe(false)
      expect(socketService.forceReconnect).toHaveBeenCalled()
    })

    it('starts reconnecting when disconnected with session token', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      const { result } = renderHook(() => useReconnect())

      act(() => {
        triggerSocketEvent('connection:change', false)
      })

      expect(result.current.isReconnecting).toBe(true)
      expect(result.current.isGivenUp).toBe(false)
    })

    it('updates store reconnecting state on disconnect', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      renderHook(() => useReconnect())

      act(() => {
        triggerSocketEvent('connection:change', false)
      })

      const storeState = useGameStore.getState()
      expect(storeState.isReconnecting).toBe(true)
    })
  })

  describe('reconnection attempts', () => {
    it('sends player:reconnect on each interval tick', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      renderHook(() => useReconnect())
      // Clear proactive mount call (page-refresh restore) so we can test interval behavior in isolation
      vi.clearAllMocks()

      await act(async () => {
        triggerSocketEvent('connection:change', false)
      })

      expect(socketService.reconnect).not.toHaveBeenCalled()

      // First tick
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(socketService.reconnect).toHaveBeenCalledTimes(1)
    })

    it('gives up after MAX_ATTEMPTS', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      const { result } = renderHook(() => useReconnect())

      await act(async () => {
        triggerSocketEvent('connection:change', false)
      })

      expect(result.current.isReconnecting).toBe(true)

      // Advance past MAX_ATTEMPTS+1 ticks (100ms each, MAX_ATTEMPTS=5 → give up at tick 6 = 600ms)
      await act(async () => {
        vi.advanceTimersByTime(700)
      })

      expect(result.current.isReconnecting).toBe(false)
      expect(result.current.isGivenUp).toBe(true)
    })

    it('sets initial reconnecting state in store', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      renderHook(() => useReconnect())

      await act(async () => {
        triggerSocketEvent('connection:change', false)
      })

      expect(useGameStore.getState().isReconnecting).toBe(true)
      expect(useGameStore.getState().reconnectAttempts).toBe(0)
    })

    it('resets store after giving up', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      renderHook(() => useReconnect())

      await act(async () => {
        triggerSocketEvent('connection:change', false)
      })

      await act(async () => {
        vi.advanceTimersByTime(700)
      })

      expect(useGameStore.getState().isReconnecting).toBe(false)
      expect(useGameStore.getState().reconnectAttempts).toBe(0)
    })
  })

  describe('page refresh restore', () => {
    it('sends player:reconnect on mount when socket already connected and token exists', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')
      mockConnected = true

      renderHook(() => useReconnect())

      expect(socketService.reconnect).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'valid-token' })
      )
    })

    it('does not send player:reconnect on mount when no token', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)
      mockConnected = true

      renderHook(() => useReconnect())

      expect(socketService.reconnect).not.toHaveBeenCalled()
    })

    it('does not send player:reconnect on mount when socket disconnected', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')
      mockConnected = false

      renderHook(() => useReconnect())

      expect(socketService.reconnect).not.toHaveBeenCalled()
    })

    it('sends player:reconnect when connection:change fires true without being in reconnecting state', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')
      mockConnected = false // not connected on mount — no proactive call

      renderHook(() => useReconnect())
      vi.clearAllMocks()

      // Socket connects (e.g. page refresh — transport connects after effect registered)
      act(() => {
        triggerSocketEvent('connection:change', true)
      })

      expect(socketService.reconnect).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'valid-token' })
      )
    })
  })

  describe('successful reconnection', () => {
    it('sends player:reconnect immediately when transport reconnects during reconnection', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      renderHook(() => useReconnect())

      act(() => {
        triggerSocketEvent('connection:change', false)
      })

      // Transport reconnects while we're in reconnecting state
      act(() => {
        triggerSocketEvent('connection:change', true)
      })

      // Should have sent player:reconnect immediately on transport reconnect
      expect(socketService.reconnect).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'valid-token' })
      )
    })

    it('stops reconnecting on player:reconnected success', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      const { result } = renderHook(() => useReconnect())

      act(() => {
        triggerSocketEvent('connection:change', false)
      })

      expect(result.current.isReconnecting).toBe(true)

      act(() => {
        triggerSocketEvent('player:reconnected', { success: true })
      })

      expect(result.current.isReconnecting).toBe(false)
      expect(result.current.isGivenUp).toBe(false)
    })

    it('gives up immediately on player:reconnected failure', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      const { result } = renderHook(() => useReconnect())

      act(() => {
        triggerSocketEvent('connection:change', false)
      })

      expect(result.current.isReconnecting).toBe(true)

      // Server rejects token (e.g. server restarted)
      act(() => {
        triggerSocketEvent('player:reconnected', { success: false })
      })

      expect(result.current.isReconnecting).toBe(false)
      expect(result.current.isGivenUp).toBe(true)
    })
  })

  describe('retryOnce', () => {
    it('clears isGivenUp and sets isReconnecting on retry', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')
      mockConnected = true

      const { result } = renderHook(() => useReconnect())

      // Simulate given-up state
      act(() => {
        triggerSocketEvent('connection:change', false)
      })
      act(() => {
        triggerSocketEvent('player:reconnected', { success: false })
      })

      expect(result.current.isGivenUp).toBe(true)

      act(() => {
        result.current.retryOnce()
      })

      expect(result.current.isGivenUp).toBe(false)
      expect(result.current.isReconnecting).toBe(true)
    })

    it('sends player:reconnect immediately when socket is connected', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')
      mockConnected = true

      const { result } = renderHook(() => useReconnect())

      act(() => {
        triggerSocketEvent('connection:change', false)
      })
      act(() => {
        triggerSocketEvent('player:reconnected', { success: false })
      })

      act(() => {
        result.current.retryOnce()
      })

      expect(socketService.reconnect).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'valid-token' })
      )
    })

    it('gives up again after retryOnce timeout with no response', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')
      mockConnected = true

      const { result } = renderHook(() => useReconnect())

      act(() => {
        triggerSocketEvent('connection:change', false)
      })
      act(() => {
        triggerSocketEvent('player:reconnected', { success: false })
      })
      act(() => {
        result.current.retryOnce()
      })

      expect(result.current.isGivenUp).toBe(false)

      // Advance past the 5s retry timeout
      await act(async () => {
        vi.advanceTimersByTime(5100)
      })

      expect(result.current.isGivenUp).toBe(true)
      expect(result.current.isReconnecting).toBe(false)
    })
  })

  describe('visibility change auto-recovery', () => {
    it('triggers forceReconnect when tab becomes visible and disconnected', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')
      mockConnected = false

      renderHook(() => useReconnect())

      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
          configurable: true,
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(socketService.forceReconnect).toHaveBeenCalled()
    })

    it('does not trigger forceReconnect when tab becomes visible and already connected', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')
      mockConnected = true

      renderHook(() => useReconnect())

      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
          configurable: true,
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(socketService.forceReconnect).not.toHaveBeenCalled()
    })

    it('does not trigger forceReconnect when no session token', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)
      mockConnected = false

      renderHook(() => useReconnect())

      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
          configurable: true,
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(socketService.forceReconnect).not.toHaveBeenCalled()
    })

    it('does not trigger forceReconnect when tab becomes hidden', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')
      mockConnected = false

      renderHook(() => useReconnect())

      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true,
          configurable: true,
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(socketService.forceReconnect).not.toHaveBeenCalled()
    })

    it('cleans up visibilitychange listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useReconnect())

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    it('clears interval on unmount during reconnection', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token')

      const { result, unmount } = renderHook(() => useReconnect())

      act(() => {
        triggerSocketEvent('connection:change', false)
      })

      expect(result.current.isReconnecting).toBe(true)

      unmount()

      // Advancing time should not cause errors after unmount
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    })
  })
})
