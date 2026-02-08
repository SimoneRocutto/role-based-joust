# Audio System

## Architecture

Three independent audio layers running simultaneously:

1. **Background Music** - Continuous ambient/tension music (Dashboard + Players)
2. **TTS Announcements** - Text-to-speech for events (Dashboard only)
3. **Sound Effects** - Event-triggered sounds (Players + Dashboard)

All audio is managed by a singleton `AudioManager` class (`client/src/services/audio.ts`), with reactive UI state exposed via a Zustand store (`client/src/store/audioStore.ts`).

---

## Sound Auto-Discovery

Sounds are auto-discovered at build time using Vite's `import.meta.glob`. On initialization, `AudioManager` scans `/public/sounds/**/*.mp3` and preloads every file found:

```typescript
// In AudioManager.initialize()
const soundModules = import.meta.glob("/public/sounds/**/*.mp3", {
  eager: true,
  query: "?url",
});
const soundPaths = Object.values(soundModules).map((item) => item?.default);
await this.preload(soundPaths);
```

**To add a new sound**: drop an `.mp3` file anywhere under `client/public/sounds/` and it will be auto-discovered and preloaded. No imports or registration needed.

---

## Mode-Specific Sounds with General Fallback

Sounds are organized into directories per game mode, with `general/` as the fallback:

```
client/public/sounds/
├── classic/
│   ├── effects/
│   │   ├── death.mp3           # Classic-specific death sound
│   │   ├── speed-down.mp3      # Speed shift: fast → slow
│   │   └── speed-up.mp3        # Speed shift: slow → fast
│   └── music/
│       ├── tension-high.mp3
│       └── tension-medium.mp3
└── general/
    ├── effects/
    │   ├── countdown.mp3
    │   ├── damage.mp3
    │   ├── death.mp3           # Fallback death sound
    │   ├── low-health-heartbeat.mp3
    │   ├── no-charges.mp3
    │   ├── power-activation.mp3
    │   └── ready.mp3
    ├── music/
    │   ├── lobby-music.mp3
    │   ├── tension-high.mp3
    │   ├── tension-medium.mp3
    │   └── victory.mp3
    └── voice/
        └── role-reveal.mp3
```

When a sound is requested, `AudioManager.getSoundPath()` resolves it:

1. Check for a mode-specific file: `/public/sounds/{currentMode}/effects/{name}.mp3`
2. If not found, fall back to: `/public/sounds/general/effects/{name}.mp3`

```typescript
private getSoundPath(trackPath: string) {
  const mode = useGameStore.getState().mode;        // e.g. "classic"
  const musicDir = mode ?? "general";
  const mainPath = `${PATHS.AUDIO}/${musicDir}/${trackPath}.mp3`;
  const fallbackPath = `${PATHS.AUDIO}/general/${trackPath}.mp3`;
  return this.sounds.has(mainPath) ? mainPath : fallbackPath;
}
```

**To add a mode-specific override**: place a file with the same name in `sounds/{mode}/effects/` or `sounds/{mode}/music/`. For example, adding `sounds/role-based/effects/death.mp3` will override the general death sound when playing in role-based mode.

---

## State Management (Zustand)

Audio state is exposed to React via a Zustand store (`useAudioStore`):

```typescript
// client/src/store/audioStore.ts
interface AudioState {
  isPreloaded: boolean;      // All sounds loaded
  isMuted: boolean;          // Master mute
  isSpeaking: boolean;       // TTS currently playing
  isPlayingMusic: boolean;   // Background music active
  isAudioUnlocked: boolean;  // Audio context unlocked (mobile)
}
```

The `AudioManager` singleton writes to this store internally. Components read from it:

```typescript
// Example: EventFeed dims while TTS is speaking
const isSpeaking = useAudioStore((state) => state.isSpeaking);
```

Components never call `useAudioStore` setters directly — they call `audioManager` methods which update the store as a side effect.

---

## Background Music

### Transitions

| Game State              | Music Track          | Trigger                             |
| ----------------------- | -------------------- | ----------------------------------- |
| Lobby/Waiting           | `lobby-music`        | Players joining, before game starts |
| Countdown               | `tension-medium`     | Countdown starts                    |
| Round Active (4+ alive) | `tension-medium`     | Round starts                        |
| Round Active (<=3 alive)| `tension-medium`     | 4th player dies (volume increase)   |
| Round End               | `tension-medium`     | Round ends                          |
| Game End                | `victory`            | Final round ends                    |

Music is managed in `DashboardView.tsx`:

```typescript
if (isWaiting) {
  audioManager.playMusic("lobby-music", { loop: true, volume: 0.4 });
} else if (isCountdown) {
  audioManager.playMusic("tension-medium", { loop: true, volume: 0.4 });
} else if (isActive) {
  audioManager.playMusic("tension-medium", { loop: true, volume: aliveCount <= 3 ? 0.5 : 0.4 });
} else if (isFinished) {
  audioManager.playMusic("victory", { loop: false, volume: 0.6 });
}
```

Music has a 50ms debounce to prevent rapid switching during state transitions. Same-track requests are deduplicated.

### Music Rate

Speed shift events change the music playback rate:

- `speed-shift:start` → `audioManager.setMusicRate(2.0)` (double speed)
- `speed-shift:end` → `audioManager.setMusicRate(1.0)` (normal)

Rate resets to 1.0 on every track change.

---

## Text-to-Speech (Dashboard Only)

TTS uses the Web Speech API (`window.speechSynthesis`). When speaking:

1. Music ducks to 20% volume (300ms fade)
2. TTS plays at rate 1.1
3. On end, music restores to original volume (500ms fade)

State is synced to `useAudioStore.isSpeaking` via `onstart`/`onend` callbacks.

---

## Sound Effects

### Player Effects (via Earbud)

| Sound                    | Trigger                          | Volume |
| ------------------------ | -------------------------------- | ------ |
| `ready`                  | Player shakes/clicks to ready up | 0.5    |
| `damage`                 | Taking damage (debounced 1s)     | 0.3    |
| `death`                  | Player eliminated                | 0.5    |
| `power-activation`       | Ability used successfully        | 0.6    |
| `no-charges`             | Ability tap with no charges      | 0.4    |
| `low-health-heartbeat`   | Vampire bloodlust (looping)      | 0.6    |
| `countdown`              | Countdown                        | 0.5    |

### Dashboard Effects

| Sound        | Trigger                      | Volume |
| ------------ | ---------------------------- | ------ |
| `ready`      | Any player readies up        | 0.5    |
| `speed-up`   | Speed shift: slow → fast     | 0.5    |
| `speed-down` | Speed shift: fast → slow     | 0.5    |

### Mode Events

Mode-specific audio effects are configured in `MODE_EVENT_EFFECTS` (`client/src/utils/constants.ts`):

```typescript
export const MODE_EVENT_EFFECTS = {
  "speed-shift:start": {
    background: "linear-gradient(135deg, #7f1d1d ...)",
    sfx: "speed-up",
    musicRate: 2.0,
  },
  "speed-shift:end": {
    background: "linear-gradient(135deg, #1e3a5f ...)",
    sfx: "speed-down",
    musicRate: 1.0,
  },
};
```

The `useModeEvents` hook listens for `mode:event` socket events and applies the configured effects (SFX, music rate, dashboard background).

---

## Audio Ducking

Ducking lowers music volume when TTS speaks, then restores it:

- **Duck**: fade current music to `AUDIO_VOLUMES.MUSIC_DUCKED` (0.2) over 300ms
- **Unduck**: fade back to `originalMusicVolume` over 500ms

Ducking is triggered automatically by `audioManager.speak()` and reversed on speech end.

---

## Mobile Audio

### iOS Restrictions

1. **Autoplay blocked**: Audio context must be unlocked by a user gesture. The `AudioManager` registers `touchstart`/`click` listeners that play a silent sound to unlock the context.
2. **Silent mode**: Hardware switch may mute all audio — no workaround.
3. **Background audio**: Safari pauses audio when backgrounded — use Wake Lock + fullscreen.

### Audio Context Unlock Flow

```
User taps screen
  → unlockAudio() fires (once)
  → Plays silent WAV via Howler
  → useAudioStore.isAudioUnlocked = true
  → DashboardView calls audioManager.initialize()
  → All sounds preloaded
  → useAudioStore.isPreloaded = true
```

---

## AudioManager API

```typescript
// Singleton import
import { audioManager } from "@/services/audio";

// Initialization (called once in App.tsx)
audioManager.initialize(): Promise<void>

// Music
audioManager.playMusic(track: string, options?: { loop?: boolean; volume?: number }): void
audioManager.stopMusic(): void
audioManager.fadeMusic(targetVolume: number, duration: number): void
audioManager.setMusicRate(rate: number): void

// Sound effects
audioManager.playSfx(name: string, options?: { volume?: number; noRepeatFor?: number }): void
audioManager.loop(name: string, options?: { volume?: number }): void
audioManager.stop(name: string): void
audioManager.isPlaying(name: string): boolean

// Text-to-speech
audioManager.speak(text: string): void
audioManager.stopSpeaking(): void

// Master controls
audioManager.setMasterVolume(volume: number): void
audioManager.mute(): void
audioManager.unmute(): void
audioManager.toggleMute(): void

// Lifecycle
audioManager.unlockAudio(): void
```

### Volume Constants (`AUDIO_VOLUMES`)

| Key           | Value | Usage                        |
| ------------- | ----- | ---------------------------- |
| MUSIC         | 0.4   | Default background music     |
| MUSIC_DUCKED  | 0.2   | Music during TTS             |
| SFX           | 0.5   | Default sound effects        |
| DAMAGE        | 0.3   | Damage feedback              |
| HEARTBEAT     | 0.4   | Low-health heartbeat loop    |
| ROLE_REVEAL   | 0.7   | Role reveal intro sound      |
| TTS           | 1.0   | Text-to-speech               |

---

## Adding New Sounds

1. Drop `.mp3` file in `client/public/sounds/general/effects/` (or `music/` or `voice/`)
2. Call `audioManager.playSfx("filename-without-extension")` — auto-discovered, no registration needed
3. For mode-specific overrides, place file in `client/public/sounds/{mode}/effects/`

## Adding Mode Event Effects

1. Add the event entry to `MODE_EVENT_EFFECTS` in `client/src/utils/constants.ts`
2. The `useModeEvents` hook will automatically apply SFX, music rate, and background changes

---

## File Requirements

- Format: MP3 (best mobile compatibility)
- Bit rate: 128 kbps
- Music files: ~2-3 minutes, loopable
- SFX files: < 2 seconds
- Music files use `html5: true` for streaming; SFX use Web Audio for low latency
