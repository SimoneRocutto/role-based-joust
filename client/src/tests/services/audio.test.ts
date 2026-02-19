import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create a mock Howl class for testing
function createMockHowl() {
  return {
    play: vi.fn().mockReturnValue(1),
    stop: vi.fn(),
    pause: vi.fn(),
    fade: vi.fn(),
    volume: vi.fn().mockReturnValue(0.5),
    loop: vi.fn(),
    rate: vi.fn(),
    playing: vi.fn().mockReturnValue(false),
    once: vi.fn((event: string, cb: () => void) => {
      if (event === 'fade') setTimeout(cb, 0)
    }),
    on: vi.fn(),
    off: vi.fn(),
  }
}

// AudioManager class for testing (simplified, without Howler dependency)
class AudioManager {
  private sounds: Map<string, ReturnType<typeof createMockHowl>> = new Map()
  private currentMusic: ReturnType<typeof createMockHowl> | null = null
  private isMuted = false
  private isSpeaking = false
  private _isUnlocked = false
  private unlockCallbacks: Array<() => void> = []
  private createSound: () => ReturnType<typeof createMockHowl>

  constructor(createSoundFn: () => ReturnType<typeof createMockHowl>) {
    this.createSound = createSoundFn
  }

  async preload(soundFiles: string[]): Promise<void> {
    for (const file of soundFiles) {
      const sound = this.createSound()
      this.sounds.set(file, sound)
    }
  }

  playMusic(track: string, options: { loop?: boolean; volume?: number } = {}) {
    const { volume = 0.4 } = options

    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, 500)
      this.currentMusic.once('fade', () => this.currentMusic?.stop())
    }

    let sound = this.sounds.get(track)
    if (!sound) {
      sound = this.createSound()
      this.sounds.set(track, sound)
    }

    this.currentMusic = sound

    sound.play()
    sound.fade(0, this.isMuted ? 0 : volume, 1000)
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, 500)
      this.currentMusic.once('fade', () => {
        this.currentMusic?.stop()
        this.currentMusic = null
      })
    }
  }

  fadeMusic(targetVolume: number, duration: number) {
    if (this.currentMusic && !this.isMuted) {
      this.currentMusic.fade(this.currentMusic.volume(), targetVolume, duration)
    }
  }

  setMusicRate(rate: number) {
    if (this.currentMusic) {
      this.currentMusic.rate(rate)
    }
  }

  play(soundName: string, options: { volume?: number } = {}) {
    const sound = this.sounds.get(soundName)
    if (!sound) return

    const volume = options.volume ?? 0.5
    sound.volume(this.isMuted ? 0 : volume)
    sound.play()
  }

  loop(soundName: string, options: { volume?: number } = {}) {
    const sound = this.sounds.get(soundName)
    if (!sound) return

    const volume = options.volume ?? 0.5
    sound.loop(true)
    sound.volume(this.isMuted ? 0 : volume)
    sound.play()
  }

  stop(soundName: string) {
    const sound = this.sounds.get(soundName)
    if (sound) {
      sound.stop()
    }
  }

  isPlaying(soundName: string): boolean {
    const sound = this.sounds.get(soundName)
    return sound ? sound.playing() : false
  }

  speak(text: string) {
    if (!window.speechSynthesis) return

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.1
    utterance.pitch = 1.0
    utterance.volume = this.isMuted ? 0 : 1.0

    this.isSpeaking = true
    window.speechSynthesis.speak(utterance)
  }

  stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      this.isSpeaking = false
    }
  }

  mute() {
    this.isMuted = true
  }

  unmute() {
    this.isMuted = false
  }

  unlockAudio() {
    if (this._isUnlocked) return

    // Simulate playing a silent sound
    this.createSound().play()

    this._isUnlocked = true
    this.unlockCallbacks.forEach((cb) => cb())
  }

  onUnlock(callback: () => void) {
    if (this._isUnlocked) {
      callback()
    } else {
      this.unlockCallbacks.push(callback)
    }
  }

  get isUnlocked() {
    return this._isUnlocked
  }

  getStatus() {
    return {
      isMuted: this.isMuted,
      isSpeaking: this.isSpeaking,
      isPlayingMusic: this.currentMusic?.playing() || false,
      isUnlocked: this._isUnlocked,
    }
  }
}

describe('AudioManager', () => {
  let audioManager: AudioManager
  let mockCreateSound: ReturnType<typeof vi.fn>
  let createdSounds: ReturnType<typeof createMockHowl>[]

  beforeEach(() => {
    createdSounds = []
    mockCreateSound = vi.fn(() => {
      const sound = createMockHowl()
      createdSounds.push(sound)
      return sound
    })
    audioManager = new AudioManager(mockCreateSound as () => ReturnType<typeof createMockHowl>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('preload', () => {
    it('creates sound instances for each sound file', async () => {
      await audioManager.preload(['effects/damage', 'effects/death'])
      expect(mockCreateSound).toHaveBeenCalledTimes(2)
    })
  })

  describe('playMusic', () => {
    it('creates new sound if track not preloaded', () => {
      audioManager.playMusic('music/new-track')
      expect(mockCreateSound).toHaveBeenCalled()
    })

    it('plays the sound', async () => {
      await audioManager.preload(['music/lobby'])
      audioManager.playMusic('music/lobby')

      expect(createdSounds[0].play).toHaveBeenCalled()
    })

    it('fades in from 0 to target volume', async () => {
      await audioManager.preload(['music/lobby'])
      audioManager.playMusic('music/lobby', { volume: 0.5 })

      expect(createdSounds[0].fade).toHaveBeenCalledWith(0, 0.5, 1000)
    })

    it('fades out current music before playing new', async () => {
      await audioManager.preload(['music/track1', 'music/track2'])

      audioManager.playMusic('music/track1')
      const firstTrack = createdSounds[0]

      audioManager.playMusic('music/track2')

      expect(firstTrack.fade).toHaveBeenCalledWith(expect.anything(), 0, 500)
    })
  })

  describe('stopMusic', () => {
    it('fades out current music', async () => {
      await audioManager.preload(['music/lobby'])
      audioManager.playMusic('music/lobby')
      audioManager.stopMusic()

      expect(createdSounds[0].fade).toHaveBeenCalledWith(expect.anything(), 0, 500)
    })

    it('does nothing if no music is playing', () => {
      expect(() => audioManager.stopMusic()).not.toThrow()
    })
  })

  describe('fadeMusic', () => {
    it('fades current music to target volume', async () => {
      await audioManager.preload(['music/lobby'])
      audioManager.playMusic('music/lobby')

      // Clear previous calls from playMusic
      createdSounds[0].fade.mockClear()

      audioManager.fadeMusic(0.2, 300)

      expect(createdSounds[0].fade).toHaveBeenCalledWith(expect.anything(), 0.2, 300)
    })

    it('does nothing when muted', async () => {
      await audioManager.preload(['music/lobby'])
      audioManager.playMusic('music/lobby')

      createdSounds[0].fade.mockClear()

      audioManager.mute()
      audioManager.fadeMusic(0.5, 300)

      expect(createdSounds[0].fade).not.toHaveBeenCalled()
    })
  })

  describe('play (SFX)', () => {
    it('plays preloaded sound', async () => {
      await audioManager.preload(['effects/damage'])
      audioManager.play('effects/damage')

      expect(createdSounds[0].play).toHaveBeenCalled()
    })

    it('sets volume before playing', async () => {
      await audioManager.preload(['effects/damage'])
      audioManager.play('effects/damage', { volume: 0.3 })

      expect(createdSounds[0].volume).toHaveBeenCalledWith(0.3)
    })

    it('plays at 0 volume when muted', async () => {
      await audioManager.preload(['effects/damage'])
      audioManager.mute()
      audioManager.play('effects/damage')

      expect(createdSounds[0].volume).toHaveBeenCalledWith(0)
    })

    it('does nothing if sound not preloaded', () => {
      expect(() => audioManager.play('nonexistent')).not.toThrow()
    })
  })

  describe('loop', () => {
    it('sets loop true and plays', async () => {
      await audioManager.preload(['effects/heartbeat'])
      audioManager.loop('effects/heartbeat')

      expect(createdSounds[0].loop).toHaveBeenCalledWith(true)
      expect(createdSounds[0].play).toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('stops the sound', async () => {
      await audioManager.preload(['effects/damage'])
      audioManager.play('effects/damage')
      audioManager.stop('effects/damage')

      expect(createdSounds[0].stop).toHaveBeenCalled()
    })

    it('does nothing if sound not found', () => {
      expect(() => audioManager.stop('nonexistent')).not.toThrow()
    })
  })

  describe('isPlaying', () => {
    it('returns false if sound not loaded', () => {
      expect(audioManager.isPlaying('nonexistent')).toBe(false)
    })

    it('returns sound playing status', async () => {
      await audioManager.preload(['effects/damage'])
      expect(audioManager.isPlaying('effects/damage')).toBe(false)
    })
  })

  describe('speak (TTS)', () => {
    it('uses speechSynthesis to speak', () => {
      audioManager.speak('Hello world')
      expect(window.speechSynthesis.speak).toHaveBeenCalled()
    })

    it('sets speaking flag to true', () => {
      audioManager.speak('Hello')
      expect(audioManager.getStatus().isSpeaking).toBe(true)
    })
  })

  describe('stopSpeaking', () => {
    it('cancels speechSynthesis', () => {
      audioManager.speak('Hello')
      audioManager.stopSpeaking()
      expect(window.speechSynthesis.cancel).toHaveBeenCalled()
    })

    it('sets speaking flag to false', () => {
      audioManager.speak('Hello')
      audioManager.stopSpeaking()
      expect(audioManager.getStatus().isSpeaking).toBe(false)
    })
  })

  describe('mute/unmute', () => {
    it('getStatus reflects muted state', () => {
      expect(audioManager.getStatus().isMuted).toBe(false)
      audioManager.mute()
      expect(audioManager.getStatus().isMuted).toBe(true)
      audioManager.unmute()
      expect(audioManager.getStatus().isMuted).toBe(false)
    })
  })

  describe('unlockAudio', () => {
    it('plays silent sound to unlock audio context', () => {
      audioManager.unlockAudio()
      expect(mockCreateSound).toHaveBeenCalled()
      expect(createdSounds[0].play).toHaveBeenCalled()
    })

    it('sets isUnlocked to true', () => {
      expect(audioManager.isUnlocked).toBe(false)
      audioManager.unlockAudio()
      expect(audioManager.isUnlocked).toBe(true)
    })

    it('only unlocks once', () => {
      audioManager.unlockAudio()
      const callCount = mockCreateSound.mock.calls.length
      audioManager.unlockAudio()
      expect(mockCreateSound.mock.calls.length).toBe(callCount)
    })

    it('calls registered unlock callbacks', () => {
      const callback = vi.fn()
      audioManager.onUnlock(callback)
      audioManager.unlockAudio()
      expect(callback).toHaveBeenCalled()
    })
  })

  describe('onUnlock', () => {
    it('calls callback immediately if already unlocked', () => {
      audioManager.unlockAudio()
      const callback = vi.fn()
      audioManager.onUnlock(callback)
      expect(callback).toHaveBeenCalled()
    })

    it('queues callback if not yet unlocked', () => {
      const callback = vi.fn()
      audioManager.onUnlock(callback)
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('setMusicRate', () => {
    it('sets playback rate on current music', async () => {
      await audioManager.preload(['music/lobby'])
      audioManager.playMusic('music/lobby')
      audioManager.setMusicRate(2.0)

      expect(createdSounds[0].rate).toHaveBeenCalledWith(2.0)
    })

    it('does nothing if no music is playing', () => {
      expect(() => audioManager.setMusicRate(1.5)).not.toThrow()
    })

    it('can reset rate back to normal', async () => {
      await audioManager.preload(['music/lobby'])
      audioManager.playMusic('music/lobby')
      audioManager.setMusicRate(2.0)
      audioManager.setMusicRate(1.0)

      expect(createdSounds[0].rate).toHaveBeenCalledWith(1.0)
    })
  })

  describe('getStatus', () => {
    it('returns current audio status', () => {
      const status = audioManager.getStatus()
      expect(status).toEqual({
        isMuted: false,
        isSpeaking: false,
        isPlayingMusic: false,
        isUnlocked: false,
      })
    })
  })
})
