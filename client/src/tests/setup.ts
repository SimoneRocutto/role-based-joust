import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

// Mock DeviceMotionEvent
class MockDeviceMotionEvent extends Event {
  accelerationIncludingGravity: { x: number | null; y: number | null; z: number | null }
  acceleration: { x: number | null; y: number | null; z: number | null }
  rotationRate: { alpha: number | null; beta: number | null; gamma: number | null }
  interval: number

  constructor(type: string, eventInitDict?: DeviceMotionEventInit & {
    accelerationIncludingGravity?: { x: number | null; y: number | null; z: number | null }
    acceleration?: { x: number | null; y: number | null; z: number | null }
    rotationRate?: { alpha: number | null; beta: number | null; gamma: number | null }
    interval?: number
  }) {
    super(type, eventInitDict)
    this.accelerationIncludingGravity = eventInitDict?.accelerationIncludingGravity ?? { x: null, y: null, z: null }
    this.acceleration = eventInitDict?.acceleration ?? { x: null, y: null, z: null }
    this.rotationRate = eventInitDict?.rotationRate ?? { alpha: null, beta: null, gamma: null }
    this.interval = eventInitDict?.interval ?? 16
  }

  static requestPermission?: () => Promise<'granted' | 'denied'>
}

Object.defineProperty(window, 'DeviceMotionEvent', { value: MockDeviceMotionEvent })

// Mock speechSynthesis
const speechSynthesisMock = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
  pause: vi.fn(),
  resume: vi.fn(),
  pending: false,
  speaking: false,
  paused: false,
  onvoiceschanged: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => true),
}
Object.defineProperty(window, 'speechSynthesis', { value: speechSynthesisMock })

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text: string
  rate = 1
  pitch = 1
  volume = 1
  lang = ''
  voice: SpeechSynthesisVoice | null = null
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => void) | null = null
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null
  onpause: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null
  onresume: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null
  onmark: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null
  onboundary: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null

  constructor(text?: string) {
    this.text = text ?? ''
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true }
}

Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockSpeechSynthesisUtterance })

// Mock Howler with class that can be instantiated
vi.mock('howler', () => {
  const MockHowl = vi.fn().mockImplementation(function(this: any) {
    this.play = vi.fn().mockReturnValue(1)
    this.stop = vi.fn()
    this.pause = vi.fn()
    this.fade = vi.fn()
    this.volume = vi.fn().mockReturnValue(0.5)
    this.loop = vi.fn()
    this.playing = vi.fn().mockReturnValue(false)
    this.once = vi.fn((event: string, cb: () => void) => { if (event === 'fade') setTimeout(cb, 0) })
    this.on = vi.fn()
    this.off = vi.fn()
    return this
  })

  return {
    Howl: MockHowl,
    Howler: {
      volume: vi.fn(),
    },
  }
})

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'mock-socket-id',
  })),
}))

// Reset all mocks before each test
afterEach(() => {
  vi.clearAllMocks()
})
