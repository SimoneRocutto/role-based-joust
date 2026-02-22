import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  existsSync,
} from "fs";
import { dirname, join } from "path";
import type { MovementConfig } from "./gameConfig";

/**
 * Persisted settings structure.
 * Contains all user preferences that survive server restarts.
 */
export interface PersistedSettings {
  /** Movement detection settings */
  movement: MovementConfig;
  /** Sensitivity preset key (e.g., "low", "medium", "high", "extreme", "oneshot") */
  sensitivity: string;
  /** Default game mode key (e.g., "classic", "role-based") */
  gameMode: string;
  /** Default role theme (e.g., "standard", "easy") */
  theme: string;
  /** Number of rounds per game (1-10) */
  roundCount: number;
  /** Round duration in seconds (30-300), used by timed modes */
  roundDuration: number;
  /** Whether team mode is enabled */
  teamsEnabled: boolean;
  /** Number of teams (2-4) */
  teamCount: number;
  /** Domination: points needed to win (5-100) */
  dominationPointTarget: number;
  /** Domination: seconds of control per point (3-15) */
  dominationControlInterval: number;
  /** Domination: seconds before respawn (5-30) */
  dominationRespawnTime: number;
  /** Domination: expected number of bases (1-3) */
  dominationBaseCount: number;
  /** Death Count: seconds before respawn (3-30) */
  deathCountRespawnTime: number;
  /** Whether players use earbuds (enables kill sound on other phones) */
  withEarbud: boolean;
}

class SettingsStore {
  private filePath: string;
  private enabled: boolean = true;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** Load saved settings from disk. Returns partial config or null if missing/corrupt. */
  load(): Partial<PersistedSettings> | null {
    if (!this.enabled) return null;

    try {
      if (!existsSync(this.filePath)) return null;
      const raw = readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return null;
      }
      // Handle legacy format (flat MovementConfig) for backwards compatibility
      if ("damageMultiplier" in parsed && !("movement" in parsed)) {
        return {
          movement: parsed as MovementConfig,
          sensitivity: "custom",
        };
      }
      return parsed as Partial<PersistedSettings>;
    } catch {
      return null;
    }
  }

  /** Save current settings to disk. Auto-creates parent directory. */
  save(settings: PersistedSettings): void {
    if (!this.enabled) return;

    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(settings, null, 2), "utf-8");
    } catch {
      // Silently fail — settings persistence is best-effort
    }
  }

  /** Delete the settings file. */
  flush(): void {
    if (!this.enabled) return;

    try {
      if (existsSync(this.filePath)) {
        unlinkSync(this.filePath);
      }
    } catch {
      // Silently fail
    }
  }

  /** Disable persistence (for test mode). */
  disable(): void {
    this.enabled = false;
  }

  /** Enable persistence. */
  enable(): void {
    this.enabled = true;
  }

  /** Check if persistence is enabled. */
  isEnabled(): boolean {
    return this.enabled;
  }
}

const defaultPath = join(__dirname, "../../data/settings.json");
export const settingsStore = new SettingsStore(defaultPath);
export { SettingsStore };
