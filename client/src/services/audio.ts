import { Howl, Howler } from "howler";
import { AUDIO_VOLUMES, PATHS } from "@/utils/constants";
import { useGameStore } from "@/store/gameStore";

class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private bannedSoundList: Set<string> = new Set();
  private currentMusic: Howl | null = null;
  private currentTrack: string | null = null;
  private originalMusicVolume: number = AUDIO_VOLUMES.MUSIC;
  private isMuted = false;
  private isSpeaking = false;
  private _isUnlocked = false;
  private unlockCallbacks: Array<() => void> = [];
  private pendingMusicTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingMusicTrack: string | null = null;

  async preload(soundPaths: string[]): Promise<void> {
    const promises = soundPaths.map(
      (path) =>
        new Promise<void>((resolve, reject) => {
          const sound = new Howl({
            src: [path],
            preload: true,
            html5: path.includes("music/"), // Stream music files
            onload: () => {
              this.sounds.set(path, sound);
              resolve();
            },
            onloaderror: (_id, error) => {
              console.error(`Failed to load sound: ${path}`, error);
              reject(error);
            },
          });
        })
    );

    try {
      await Promise.all(promises);
      console.log(`Preloaded ${soundPaths.length} sounds`);
    } catch (error) {
      console.error("Error preloading sounds:", error);
    }
  }

  // Music management
  // Uses debouncing to prevent multiple tracks playing when rapid state changes occur
  playMusic(track: string, options: { loop?: boolean; volume?: number } = {}) {
    // If same track is already playing or pending, skip
    if (track === this.currentTrack && !this.pendingMusicTimeout) return;
    if (track === this.pendingMusicTrack) return;

    const { loop = true, volume = AUDIO_VOLUMES.MUSIC } = options;

    // Clear any pending music change
    if (this.pendingMusicTimeout) {
      clearTimeout(this.pendingMusicTimeout);
      this.pendingMusicTimeout = null;
    }

    // Store the pending track
    this.pendingMusicTrack = track;

    // Debounce: wait a short time before actually changing music
    // This allows rapid state changes to settle on the final track
    this.pendingMusicTimeout = setTimeout(() => {
      this.pendingMusicTimeout = null;
      this.pendingMusicTrack = null;

      // Double-check we still need to change (might have been superseded)
      if (track === this.currentTrack) return;

      // Stop current music immediately
      if (this.currentMusic) {
        this.currentMusic.stop();
      }

      const fullPath = this.getSoundPath(`music/${track}`);
      // Get or create sound
      let sound = this.sounds.get(fullPath);

      if (!sound) {
        sound = this.getHowl(fullPath, options);
        this.sounds.set(track, sound);
      } else {
        // Ensure correct settings for existing sound
        sound.loop(loop);
        sound.volume(this.isMuted ? 0 : volume);
      }

      this.originalMusicVolume = volume;
      this.currentTrack = track;
      this.currentMusic = sound;

      this.setMusicRate(1.0);
      sound.play();
    }, 50); // 50ms debounce - enough to catch rapid state changes
  }

  /**
   * Gets howl sound based on trackPath. Uses mode-specific sounds, otherwise falls back to general directory.
   * @param trackPath Something like "music/lobby"
   * @param options
   * @returns
   */
  private getHowl(
    fullPath: string,
    options: { loop?: boolean; volume?: number } = {}
  ) {
    const { loop = false, volume = AUDIO_VOLUMES.MUSIC } = options;
    const sound = new Howl({
      src: [fullPath],
      loop: loop ?? false,
      html5: true,
      volume: volume ?? 1.0,
    });
    return sound;
  }

  private getSoundPath(trackPath: string) {
    const mode = useGameStore.getState().mode;
    const musicDir = mode ?? "general";
    const mainPath = `${PATHS.AUDIO}/${musicDir}/${trackPath}.mp3`;
    const fallbackPath = `${PATHS.AUDIO}/general/${trackPath}.mp3`;
    return this.sounds.has(mainPath) ? mainPath : fallbackPath;
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, 500);
      this.currentMusic.once("fade", () => {
        this.currentMusic?.stop();
        this.currentMusic = null;
      });
    }
  }

  fadeMusic(targetVolume: number, duration: number) {
    if (this.currentMusic && !this.isMuted) {
      this.currentMusic.fade(
        this.currentMusic.volume(),
        targetVolume,
        duration
      );
    }
  }

  setMusicRate(rate: number) {
    if (this.currentMusic) {
      this.currentMusic.rate(rate);
    }
  }

  // Sound effects
  playSfx(
    soundName: string,
    options: { volume?: number; noRepeatFor?: number } = {}
  ) {
    const volume = options.volume ?? AUDIO_VOLUMES.SFX;
    const fullPath = this.getSoundPath(`effects/${soundName}`);
    const sound = this.getHowl(fullPath, { volume });
    if (!sound) {
      console.warn(`Sound '${soundName}' not preloaded`);
      return;
    }

    if (this.bannedSoundList.has(soundName)) return;

    sound.volume(this.isMuted ? 0 : volume);
    sound.play();

    // Prevent the same sound for `noRepeatFor` ms
    if (options.noRepeatFor) {
      this.bannedSoundList.add(soundName);
      setTimeout(() => {
        this.bannedSoundList.delete(soundName);
      }, options.noRepeatFor);
    }
  }

  loop(soundName: string, options: { volume?: number } = {}) {
    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`Sound '${soundName}' not preloaded`);
      return;
    }

    const volume = options.volume ?? AUDIO_VOLUMES.SFX;
    sound.loop(true);
    sound.volume(this.isMuted ? 0 : volume);
    sound.play();
  }

  stop(soundName: string) {
    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.stop();
    }
  }

  isPlaying(soundName: string): boolean {
    const sound = this.sounds.get(soundName);
    return sound ? sound.playing() : false;
  }

  // Text-to-speech
  speak(text: string) {
    if (!window.speechSynthesis) {
      console.warn("Speech synthesis not supported");
      return;
    }

    // Duck music
    this.duck();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = this.isMuted ? 0 : AUDIO_VOLUMES.TTS;

    utterance.onend = () => {
      this.isSpeaking = false;
      this.unduck();
    };

    this.isSpeaking = true;
    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.unduck();
    }
  }

  // Audio ducking
  private duck() {
    if (this.currentMusic && !this.isMuted) {
      this.currentMusic.fade(
        this.currentMusic.volume(),
        AUDIO_VOLUMES.MUSIC_DUCKED,
        300
      );
    }
  }

  private unduck() {
    if (this.currentMusic && !this.isMuted) {
      this.currentMusic.fade(
        this.currentMusic.volume(),
        this.originalMusicVolume,
        500
      );
    }
  }

  // Master controls
  setMasterVolume(volume: number) {
    Howler.volume(volume);
  }

  mute() {
    this.isMuted = true;
    Howler.volume(0);
  }

  unmute() {
    this.isMuted = false;
    Howler.volume(1);
  }

  // Utility
  unlockAudio() {
    if (this._isUnlocked) return;

    // Play silent sound to unlock audio context on mobile
    const unlock = new Howl({
      src: [
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
      ],
      volume: 0,
    });
    unlock.play();

    this._isUnlocked = true;
    console.log("Audio context unlocked");

    // Notify all listeners
    this.unlockCallbacks.forEach((cb) => cb());
  }

  onUnlock(callback: () => void) {
    if (this._isUnlocked) {
      // Already unlocked, call immediately
      callback();
    } else {
      this.unlockCallbacks.push(callback);
    }
  }

  get isUnlocked() {
    return this._isUnlocked;
  }

  getStatus() {
    return {
      isMuted: this.isMuted,
      isSpeaking: this.isSpeaking,
      isPlayingMusic: this.currentMusic?.playing() || false,
      isUnlocked: this._isUnlocked,
    };
  }
}

// Singleton instance
export const audioManager = new AudioManager();

// Auto-unlock audio on first user interaction
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioManager.unlockAudio();
  audioUnlocked = true;
}

document.addEventListener("touchstart", unlockAudio, { once: true });
document.addEventListener("click", unlockAudio, { once: true });
