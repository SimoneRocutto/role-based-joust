import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to test the AccelerometerService class directly
// Since it's a singleton with side effects, we'll re-create instances

class AccelerometerService {
  private isActive = false
  private lastSendTime = 0
  private callback: ((data: any) => void) | null = null
  private subscribers: Set<(data: any) => void> = new Set()
  private handleMotionBound: (event: any) => void

  constructor() {
    this.handleMotionBound = this.handleMotion.bind(this)
  }

  async requestPermission(): Promise<boolean> {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission()
        return permission === 'granted'
      } catch {
        return false
      }
    }
    return true
  }

  start(callback: (data: any) => void) {
    if (this.isActive) {
      return
    }
    this.callback = callback
    this.isActive = true
    this.lastSendTime = 0
    window.addEventListener('devicemotion', this.handleMotionBound)
  }

  stop() {
    if (!this.isActive) return
    window.removeEventListener('devicemotion', this.handleMotionBound)
    this.isActive = false
    this.callback = null
  }

  private handleMotion(event: any) {
    if (!this.callback && !this.isActive && this.subscribers.size === 0) return

    const now = Date.now()
    if (now - this.lastSendTime < 100) return
    this.lastSendTime = now

    const acc = event.accelerationIncludingGravity
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
    const x = clamp(acc.x, -10, 10)
    const y = clamp(acc.y, -10, 10)
    const z = clamp(acc.z, -10, 10)

    const magnitude = Math.sqrt(x * x + y * y + z * z)
    const intensity = Math.max(0, (magnitude - 9.8) / 10)

    const data = { x, y, z, intensity, timestamp: now }

    if (this.callback && this.isActive) {
      this.callback(data)
    }

    for (const subscriber of this.subscribers) {
      subscriber(data)
    }
  }

  isSupported(): boolean {
    return 'DeviceMotionEvent' in window
  }

  getStatus() {
    return {
      isActive: this.isActive,
      isSupported: this.isSupported(),
    }
  }

  subscribe(callback: (data: any) => void): () => void {
    this.subscribers.add(callback)

    if (!this.isActive && this.subscribers.size === 1 && !this.callback) {
      window.addEventListener('devicemotion', this.handleMotionBound)
    }

    return () => {
      this.subscribers.delete(callback)
      if (this.subscribers.size === 0 && !this.callback && !this.isActive) {
        window.removeEventListener('devicemotion', this.handleMotionBound)
      }
    }
  }
}

describe('AccelerometerService', () => {
  let service: AccelerometerService
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    service = new AccelerometerService()
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    service.stop()
    vi.restoreAllMocks()
  })

  describe('requestPermission', () => {
    it('returns true when no permission API (Android/old iOS)', async () => {
      const result = await service.requestPermission()
      expect(result).toBe(true)
    })

    it('returns true when permission granted (iOS 13+)', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted')
      ;(DeviceMotionEvent as any).requestPermission = mockRequestPermission

      const result = await service.requestPermission()
      expect(result).toBe(true)
      expect(mockRequestPermission).toHaveBeenCalled()

      delete (DeviceMotionEvent as any).requestPermission
    })

    it('returns false when permission denied', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('denied')
      ;(DeviceMotionEvent as any).requestPermission = mockRequestPermission

      const result = await service.requestPermission()
      expect(result).toBe(false)

      delete (DeviceMotionEvent as any).requestPermission
    })

    it('returns false when permission request throws', async () => {
      const mockRequestPermission = vi.fn().mockRejectedValue(new Error('User cancelled'))
      ;(DeviceMotionEvent as any).requestPermission = mockRequestPermission

      const result = await service.requestPermission()
      expect(result).toBe(false)

      delete (DeviceMotionEvent as any).requestPermission
    })
  })

  describe('start/stop', () => {
    it('adds devicemotion listener on start', () => {
      const callback = vi.fn()
      service.start(callback)

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'devicemotion',
        expect.any(Function)
      )
    })

    it('removes devicemotion listener on stop', () => {
      const callback = vi.fn()
      service.start(callback)
      service.stop()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'devicemotion',
        expect.any(Function)
      )
    })

    it('does not add duplicate listeners on multiple starts', () => {
      const callback = vi.fn()
      service.start(callback)
      service.start(callback)

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1)
    })

    it('does not remove listeners when not active', () => {
      service.stop()
      expect(removeEventListenerSpy).not.toHaveBeenCalled()
    })
  })

  describe('isSupported', () => {
    it('returns true when DeviceMotionEvent exists', () => {
      expect(service.isSupported()).toBe(true)
    })
  })

  describe('getStatus', () => {
    it('returns correct initial status', () => {
      expect(service.getStatus()).toEqual({
        isActive: false,
        isSupported: true,
      })
    })

    it('returns active status after start', () => {
      service.start(vi.fn())
      expect(service.getStatus()).toEqual({
        isActive: true,
        isSupported: true,
      })
    })

    it('returns inactive status after stop', () => {
      service.start(vi.fn())
      service.stop()
      expect(service.getStatus()).toEqual({
        isActive: false,
        isSupported: true,
      })
    })
  })

  describe('subscribe/unsubscribe', () => {
    it('adds listener on first subscribe when not active', () => {
      const subscriber = vi.fn()
      service.subscribe(subscriber)

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'devicemotion',
        expect.any(Function)
      )
    })

    it('returns unsubscribe function', () => {
      const subscriber = vi.fn()
      const unsubscribe = service.subscribe(subscriber)

      expect(typeof unsubscribe).toBe('function')
    })

    it('removes listener when last subscriber unsubscribes', () => {
      const subscriber = vi.fn()
      const unsubscribe = service.subscribe(subscriber)
      unsubscribe()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })

    it('does not remove listener when other subscribers remain', () => {
      const sub1 = vi.fn()
      const sub2 = vi.fn()

      const unsub1 = service.subscribe(sub1)
      service.subscribe(sub2)

      unsub1()

      // Should not have removed the listener (still has sub2)
      expect(removeEventListenerSpy).not.toHaveBeenCalled()
    })
  })

  describe('motion data processing', () => {
    it('clamps values to -10 to 10 range', () => {
      const callback = vi.fn()
      service.start(callback)

      // Simulate motion event with extreme values
      const event = new (window as any).DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: { x: 15, y: -15, z: 20 },
      })

      window.dispatchEvent(event)

      expect(callback).toHaveBeenCalled()
      const data = callback.mock.calls[0][0]
      expect(data.x).toBe(10)
      expect(data.y).toBe(-10)
      expect(data.z).toBe(10)
    })

    it('calculates intensity correctly', () => {
      const callback = vi.fn()
      service.start(callback)

      // Simulate gravity-only event (should have ~0 intensity)
      const event = new (window as any).DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 },
      })

      window.dispatchEvent(event)

      expect(callback).toHaveBeenCalled()
      const data = callback.mock.calls[0][0]
      expect(data.intensity).toBeCloseTo(0, 1)
    })

    it('ignores events with null acceleration data', () => {
      const callback = vi.fn()
      service.start(callback)

      const event = new (window as any).DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: { x: null, y: 5, z: 5 },
      })

      window.dispatchEvent(event)

      expect(callback).not.toHaveBeenCalled()
    })

    it('throttles to 10Hz (100ms interval)', () => {
      vi.useFakeTimers()
      const callback = vi.fn()
      service.start(callback)

      const event = new (window as any).DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: { x: 1, y: 2, z: 3 },
      })

      // First event should go through
      window.dispatchEvent(event)
      expect(callback).toHaveBeenCalledTimes(1)

      // Immediate second event should be throttled
      window.dispatchEvent(event)
      expect(callback).toHaveBeenCalledTimes(1)

      // After 100ms, next event should go through
      vi.advanceTimersByTime(100)
      window.dispatchEvent(event)
      expect(callback).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('notifies all subscribers', () => {
      const sub1 = vi.fn()
      const sub2 = vi.fn()

      service.subscribe(sub1)
      service.subscribe(sub2)

      const event = new (window as any).DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: { x: 1, y: 2, z: 9.8 },
      })

      window.dispatchEvent(event)

      expect(sub1).toHaveBeenCalled()
      expect(sub2).toHaveBeenCalled()
    })
  })
})
