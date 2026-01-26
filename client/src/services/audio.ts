import { Howl, Howler } from "howler";
import { AUDIO_VOLUMES } from "@/utils/constants";

class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private currentMusic: Howl | null = null;
  private originalMusicVolume: number = AUDIO_VOLUMES.MUSIC;
  private isMuted = false;
  private isSpeaking = false;
  private _isUnlocked = false;
  private unlockCallbacks: Array<() => void> = [];

  async preload(soundFiles: string[]): Promise<void> {
    const promises = soundFiles.map(
      (file) =>
        new Promise<void>((resolve, reject) => {
          const sound = new Howl({
            src: [`/sounds/${file}.mp3`],
            preload: true,
            html5: file.includes("music/"), // Stream music files
            onload: () => {
              this.sounds.set(file, sound);
              resolve();
            },
            onloaderror: (_id, error) => {
              console.error(`Failed to load sound: ${file}`, error);
              reject(error);
            },
          });
        })
    );

    try {
      await Promise.all(promises);
      console.log(`Preloaded ${soundFiles.length} sounds`);
    } catch (error) {
      console.error("Error preloading sounds:", error);
    }
  }

  // Music management
  playMusic(track: string, options: { loop?: boolean; volume?: number } = {}) {
    const { loop = true, volume = AUDIO_VOLUMES.MUSIC } = options;

    // Stop current music
    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, 500);
      this.currentMusic.once("fade", () => this.currentMusic?.stop());
    }

    // Get or create sound
    let sound = this.sounds.get(track);
    if (!sound) {
      sound = new Howl({
        src: [`/sounds/${track}.mp3`],
        loop,
        html5: true,
        volume: 0,
      });
      this.sounds.set(track, sound);
    }

    this.originalMusicVolume = volume;
    this.currentMusic = sound;

    sound.play();
    sound.fade(0, this.isMuted ? 0 : volume, 1000);
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

  // Sound effects
  play(soundName: string, options: { volume?: number } = {}) {
    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`Sound '${soundName}' not preloaded`);
      return;
    }

    const volume = options.volume ?? AUDIO_VOLUMES.SFX;
    sound.volume(this.isMuted ? 0 : volume);
    sound.play();
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
