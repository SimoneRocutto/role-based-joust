// ============================================================================
// src/factories/GameModeFactory.ts - Game Mode Auto-Discovery
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import { GameMode } from "@/gameModes/GameMode";
import type { ModeConstructor } from "@/types/factory.types";
import type { ModeInfo } from "@/types/mode.types";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * GameModeFactory - Singleton factory for game mode creation
 *
 * Features:
 * - Auto-discovers mode classes from gameModes directory
 * - Registers modes in a map
 * - Creates mode instances with parameters
 * - Lists available modes for UI
 */
export class GameModeFactory {
  private static instance: GameModeFactory;

  private modeRegistry: Map<string, ModeConstructor> = new Map();
  private modesDir: string;

  private constructor() {
    this.modesDir = path.join(__dirname, "../gameModes");
    this.loadModes();
  }

  static getInstance(): GameModeFactory {
    if (!GameModeFactory.instance) {
      GameModeFactory.instance = new GameModeFactory();
    }
    return GameModeFactory.instance;
  }

  // ========================================================================
  // AUTO-DISCOVERY
  // ========================================================================

  /**
   * Scan gameModes directory and load all mode classes
   */
  private loadModes(): void {
    if (!fs.existsSync(this.modesDir)) {
      logger.warn("FACTORY", `Modes directory not found: ${this.modesDir}`);
      return;
    }

    const files = fs
      .readdirSync(this.modesDir)
      .filter(
        (f) =>
          (f.endsWith(".ts") || f.endsWith(".js")) &&
          f !== "GameMode.ts" &&
          f !== "GameMode.js"
      );

    logger.info("FACTORY", `Loading game modes from ${this.modesDir}...`);

    files.forEach((file) => {
      try {
        const filePath = path.join(this.modesDir, file);
        const module = require(filePath);

        // Get the exported class (default or named export)
        const ModeClass = module.default || Object.values(module)[0];

        if (!ModeClass || typeof ModeClass !== "function") {
          logger.warn("FACTORY", `File ${file} doesn't export a valid class`);
          return;
        }

        // Validate it extends GameMode
        if (!(ModeClass.prototype instanceof GameMode)) {
          logger.warn(
            "FACTORY",
            `Class in ${file} doesn't extend GameMode, skipping`
          );
          return;
        }

        // Create temporary instance to get mode info
        const instance = new ModeClass();
        const key = this.normalizeModeName(instance.name);

        // Register mode
        this.modeRegistry.set(key, ModeClass as ModeConstructor);

        logger.info("FACTORY", `✓ Loaded mode: ${instance.name} (${key})`);
      } catch (error) {
        logger.error("FACTORY", `Failed to load mode ${file}`, {
          error: (error as Error).message,
        });
      }
    });

    logger.info("FACTORY", `Loaded ${this.modeRegistry.size} game modes total`);
  }

  /**
   * Normalize mode name for lookup
   * "Role Based" -> "role-based"
   * "classic" -> "classic"
   */
  private normalizeModeName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, "-");
  }

  // ========================================================================
  // MODE CREATION
  // ========================================================================

  /**
   * Create a mode instance with optional arguments
   *
   * For role-based mode: createMode("role-based", { theme: "standard", roundCount: 3 })
   * For classic mode: createMode("classic", { roundCount: 1 })
   * Legacy support: createMode("role-based", "standard") still works
   */
  createMode(modeName: string, options?: any): GameMode {
    const key = this.normalizeModeName(modeName);
    const ModeClass = this.modeRegistry.get(key);

    if (!ModeClass) {
      const available = Array.from(this.modeRegistry.keys());
      throw new Error(
        `Game mode '${modeName}' not found. Available: ${available.join(", ")}`
      );
    }

    logger.info("FACTORY", `Creating mode: ${modeName}`, { options });
    return new ModeClass(options);
  }

  /**
   * Get all available modes with their info
   */
  getAvailableModes(): Array<ModeInfo & { key: string }> {
    const modes: Array<ModeInfo & { key: string }> = [];

    this.modeRegistry.forEach((ModeClass, key) => {
      try {
        const instance = new ModeClass();
        modes.push({
          key,
          ...instance.getInfo(),
        });
      } catch (error) {
        logger.error("FACTORY", `Failed to get info for mode ${key}`, {
          error: (error as Error).message,
        });
      }
    });

    return modes;
  }

  /**
   * Check if a mode exists
   */
  modeExists(modeName: string): boolean {
    return this.modeRegistry.has(this.normalizeModeName(modeName));
  }

  /**
   * Get mode class by name (for testing/debugging)
   */
  getModeClass(modeName: string): ModeConstructor | undefined {
    return this.modeRegistry.get(this.normalizeModeName(modeName));
  }

  /**
   * Get list of mode names
   */
  getModeNames(): string[] {
    return Array.from(this.modeRegistry.keys());
  }
}
