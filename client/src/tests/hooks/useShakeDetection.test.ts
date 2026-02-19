import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock accelerometerService before importing the hook
const mockSubscribers = new Set<(data: any) => void>()
vi.mock('@/services/accelerometer', () => ({
  accelerometerService: {
    subscribe: vi.fn((callback: (data: any) => void) => {
      mockSubscribers.add(callback)
      return () => {
        mockSubscribers.delete(callback)
      }
    }),
  },
}))

import { useShakeDetection } from '@/hooks/useShakeDetection'

// Helper to simulate accelerometer data
function simulateMotion(intensity: number) {
  const data = {
    x: 0,
    y: 0,
    z: 9.8,
    intensity,
    timestamp: Date.now(),
  }
  mockSubscribers.forEach((cb) => cb(data))
}

describe('useShakeDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSubscribers.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useShakeDetection())

      expect(result.current.isShaking).toBe(false)
      expect(result.current.shakeProgress).toBe(0)
      expect(result.current.isOnCooldown).toBe(false)
      expect(result.current.lastIntensity).toBe(0)
    })

    it('subscribes to accelerometer on mount', () => {
      renderHook(() => useShakeDetection())
      expect(mockSubscribers.size).toBe(1)
    })

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() => useShakeDetection())
      expect(mockSubscribers.size).toBe(1)

      unmount()
      expect(mockSubscribers.size).toBe(0)
    })
  })

  describe('shake detection', () => {
    it('sets isShaking true when intensity exceeds threshold', () => {
      const { result } = renderHook(() =>
        useShakeDetection({ threshold: 0.5 })
      )

      act(() => {
        simulateMotion(0.6)
      })

      expect(result.current.isShaking).toBe(true)
      expect(result.current.lastIntensity).toBe(0.6)
    })

    it('keeps isShaking false when intensity is below threshold', () => {
      const { result } = renderHook(() =>
        useShakeDetection({ threshold: 0.5 })
      )

      act(() => {
        simulateMotion(0.3)
      })

      expect(result.current.isShaking).toBe(false)
    })

    it('resets isShaking when intensity drops below threshold', () => {
      const { result } = renderHook(() =>
        useShakeDetection({ threshold: 0.5 })
      )

      act(() => {
        simulateMotion(0.6)
      })
      expect(result.current.isShaking).toBe(true)

      act(() => {
        simulateMotion(0.3)
      })
      expect(result.current.isShaking).toBe(false)
    })
  })

  describe('shake progress', () => {
    it('calculates progress based on shake duration', () => {
      // Use real timers for this test since Date.now() is used internally
      vi.useRealTimers()

      const { result } = renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 500,
        })
      )

      // Start shaking
      act(() => {
        simulateMotion(0.6)
      })

      // At time 0, progress should be 0
      expect(result.current.shakeProgress).toBe(0)

      // Restore fake timers for other tests
      vi.useFakeTimers()
    })

    it('resets progress when shake stops', () => {
      const { result } = renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 500,
        })
      )

      // Start shaking
      act(() => {
        simulateMotion(0.6)
      })

      act(() => {
        vi.advanceTimersByTime(250)
        simulateMotion(0.6)
      })

      expect(result.current.shakeProgress).toBeGreaterThan(0)

      // Stop shaking
      act(() => {
        simulateMotion(0.3)
      })

      expect(result.current.shakeProgress).toBe(0)
    })
  })

  describe('onShake callback', () => {
    it('calls onShake when shake duration is reached', () => {
      const onShake = vi.fn()
      renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 500,
          onShake,
        })
      )

      // Shake for the full duration
      act(() => {
        simulateMotion(0.6)
      })

      act(() => {
        vi.advanceTimersByTime(500)
        simulateMotion(0.6)
      })

      expect(onShake).toHaveBeenCalledTimes(1)
    })

    it('does not call onShake if shake is interrupted', () => {
      const onShake = vi.fn()
      renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 500,
          onShake,
        })
      )

      // Start shaking
      act(() => {
        simulateMotion(0.6)
      })

      act(() => {
        vi.advanceTimersByTime(250)
        simulateMotion(0.6)
      })

      // Stop shaking before duration complete
      act(() => {
        simulateMotion(0.3)
      })

      // Start again
      act(() => {
        simulateMotion(0.6)
      })

      act(() => {
        vi.advanceTimersByTime(250)
        simulateMotion(0.6)
      })

      // Should not have been called yet (timer restarted)
      expect(onShake).not.toHaveBeenCalled()
    })
  })

  describe('cooldown', () => {
    it('enters cooldown after successful shake', () => {
      const onShake = vi.fn()
      const { result } = renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 500,
          cooldown: 1000,
          onShake,
        })
      )

      // Complete a shake
      act(() => {
        simulateMotion(0.6)
      })

      act(() => {
        vi.advanceTimersByTime(500)
        simulateMotion(0.6)
      })

      expect(result.current.isOnCooldown).toBe(true)
      expect(result.current.isShaking).toBe(false)
    })

    it('exits cooldown after cooldown duration', async () => {
      const { result } = renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 100, // Short duration for testing
          cooldown: 200,
        })
      )

      // Complete a shake - need to set up Date.now to advance
      const startTime = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(startTime)

      act(() => {
        simulateMotion(0.6)
      })

      // Advance past required duration
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 150)

      act(() => {
        simulateMotion(0.6)
      })

      expect(result.current.isOnCooldown).toBe(true)

      // Wait for cooldown - run all pending timers
      await act(async () => {
        vi.runAllTimers()
      })

      expect(result.current.isOnCooldown).toBe(false)
    })

    it('ignores shake input during cooldown', () => {
      const onShake = vi.fn()
      const { result } = renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 500,
          cooldown: 1000,
          onShake,
        })
      )

      // Complete first shake
      act(() => {
        simulateMotion(0.6)
      })

      act(() => {
        vi.advanceTimersByTime(500)
        simulateMotion(0.6)
      })

      expect(onShake).toHaveBeenCalledTimes(1)

      // Try to shake again during cooldown
      act(() => {
        simulateMotion(0.6)
      })

      expect(result.current.isShaking).toBe(false)
      expect(result.current.shakeProgress).toBe(0)
    })
  })

  describe('enabled option', () => {
    it('does not detect shakes when disabled', () => {
      const onShake = vi.fn()
      const { result } = renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 500,
          onShake,
          enabled: false,
        })
      )

      act(() => {
        simulateMotion(0.6)
      })

      expect(result.current.isShaking).toBe(false)
      expect(onShake).not.toHaveBeenCalled()
    })

    it('resumes detection when re-enabled', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useShakeDetection({
            threshold: 0.5,
            enabled,
          }),
        { initialProps: { enabled: false } }
      )

      act(() => {
        simulateMotion(0.6)
      })

      expect(result.current.isShaking).toBe(false)

      // Re-enable
      rerender({ enabled: true })

      act(() => {
        simulateMotion(0.6)
      })

      expect(result.current.isShaking).toBe(true)
    })
  })

  describe('custom thresholds', () => {
    it('respects custom threshold', () => {
      const { result } = renderHook(() =>
        useShakeDetection({ threshold: 0.8 })
      )

      // Below custom threshold
      act(() => {
        simulateMotion(0.7)
      })

      expect(result.current.isShaking).toBe(false)

      // Above custom threshold
      act(() => {
        simulateMotion(0.9)
      })

      expect(result.current.isShaking).toBe(true)
    })

    it('respects custom required duration', () => {
      const onShake = vi.fn()
      renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 200,
          onShake,
        })
      )

      act(() => {
        simulateMotion(0.6)
      })

      act(() => {
        vi.advanceTimersByTime(200)
        simulateMotion(0.6)
      })

      expect(onShake).toHaveBeenCalledTimes(1)
    })

    it('respects custom cooldown', async () => {
      const { result } = renderHook(() =>
        useShakeDetection({
          threshold: 0.5,
          requiredDuration: 100,
          cooldown: 500,
        })
      )

      // Set up Date.now mock
      const startTime = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(startTime)

      // Start shake
      act(() => {
        simulateMotion(0.6)
      })

      // Complete shake
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 150)

      act(() => {
        simulateMotion(0.6)
      })

      expect(result.current.isOnCooldown).toBe(true)

      // Run all timers to exit cooldown
      await act(async () => {
        vi.runAllTimers()
      })

      expect(result.current.isOnCooldown).toBe(false)
    })
  })

  describe('lastIntensity tracking', () => {
    it('tracks last received intensity', () => {
      const { result } = renderHook(() => useShakeDetection())

      act(() => {
        simulateMotion(0.3)
      })

      expect(result.current.lastIntensity).toBe(0.3)

      act(() => {
        simulateMotion(0.7)
      })

      expect(result.current.lastIntensity).toBe(0.7)
    })
  })
})
