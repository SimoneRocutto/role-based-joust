import { Howl, Howler } from "howler";
import { AUDIO_VOLUMES, PATHS } from "@/utils/constants";
import { useGameStore } from "@/store/gameStore";
import { useAudioStore } from "@/store/audioStore";

class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private bannedSoundList: Set<string> = new Set();
  private currentMusic: Howl | null = null;
  private currentTrack: string | null = null;
  private originalMusicVolume: number = AUDIO_VOLUMES.MUSIC;
  private _isInitialized = false;
  private pendingMusicTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingMusicTrack: string | null = null;

  // Initialize once
  async initialize(): Promise<void> {
    if (this._isInitialized) return;
    this._isInitialized = true;

    const soundModules: Record<string, { default: string }> = import.meta.glob(
      "/public/sounds/**/*.mp3",
      {
        eager: true,
        query: "?url",
      }
    );

    const soundPaths = Object.values(soundModules).map((item) => item?.default);

    await this.preload(soundPaths);
    useAudioStore.getState().setPreloaded(true);
    console.log("AudioManager initialized");
  }

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
    this.pendingMusicTimeout = setTimeout(() => {
      this.pendingMusicTimeout = null;
      this.pendingMusicTrack = null;

      // Double-check we still need to change
      if (track === this.currentTrack) return;

      // Stop current music immediately
      if (this.currentMusic) {
        this.currentMusic.stop();
      }

      const fullPath = this.getSoundPath(`music/${track}`);
      let sound = this.sounds.get(fullPath);

      if (!sound) {
        sound = this.getHowl(fullPath, options);
        this.sounds.set(track, sound);
      } else {
        sound.loop(loop);
        const isMuted = useAudioStore.getState().isMuted;
        sound.volume(isMuted ? 0 : volume);
      }

      this.originalMusicVolume = volume;
      this.currentTrack = track;
      this.currentMusic = sound;

      this.setMusicRate(1.0);
      sound.play();

      // Update store
      useAudioStore.getState().setPlayingMusic(true);
    }, 50);
  }

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
        useAudioStore.getState().setPlayingMusic(false);
      });
    }
  }

  fadeMusic(targetVolume: number, duration: number) {
    const isMuted = useAudioStore.getState().isMuted;
    if (this.currentMusic && !isMuted) {
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

    // Use preloaded sound (Web Audio API) instead of creating new Howl instances.
    // Creating new Howl with html5:true leaks HTMLAudioElements which breaks iOS
    // after a few consecutive plays.
    const sound = this.sounds.get(fullPath);
    if (!sound) {
      console.warn(`Sound '${soundName}' not preloaded`);
      return;
    }

    if (this.bannedSoundList.has(soundName)) return;

    const isMuted = useAudioStore.getState().isMuted;
    sound.volume(isMuted ? 0 : volume);
    sound.play();

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
    const isMuted = useAudioStore.getState().isMuted;
    sound.loop(true);
    sound.volume(isMuted ? 0 : volume);
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

    const isMuted = useAudioStore.getState().isMuted;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = isMuted ? 0 : AUDIO_VOLUMES.TTS;

    utterance.onstart = () => {
      useAudioStore.getState().setSpeaking(true);
    };

    utterance.onend = () => {
      useAudioStore.getState().setSpeaking(false);
      this.unduck();
    };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      useAudioStore.getState().setSpeaking(false);
      this.unduck();
    }
  }

  // Audio ducking
  private duck() {
    const isMuted = useAudioStore.getState().isMuted;
    if (this.currentMusic && !isMuted) {
      this.currentMusic.fade(
        this.currentMusic.volume(),
        AUDIO_VOLUMES.MUSIC_DUCKED,
        300
      );
    }
  }

  private unduck() {
    const isMuted = useAudioStore.getState().isMuted;
    if (this.currentMusic && !isMuted) {
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
    Howler.volume(0);
    useAudioStore.getState().setMuted(true);
  }

  unmute() {
    Howler.volume(1);
    useAudioStore.getState().setMuted(false);
  }

  toggleMute() {
    const isMuted = useAudioStore.getState().isMuted;
    if (isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  // Utility
  unlockAudio() {
    const isUnlocked = useAudioStore.getState().isAudioUnlocked;
    if (isUnlocked) return;

    // Play silent sound to unlock audio context on mobile
    const unlock = new Howl({
      src: [
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
      ],
      volume: 0,
    });
    unlock.play();

    useAudioStore.getState().setAudioUnlocked(true);
    console.log("Audio context unlocked");
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
