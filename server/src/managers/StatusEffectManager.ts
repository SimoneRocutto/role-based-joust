import * as fs from "fs";
import * as path from "path";
import { StatusEffect } from "@/models/StatusEffect";
import type { StatusEffectConstructor } from "@/types/status.types";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * StatusEffectManager - Auto-discovery and registry for status effects
 *
 * This is optional - status effects can be imported directly.
 * This manager provides:
 * - Auto-discovery of effect files
 * - Effect metadata management
 * - Registry for dynamic effect creation
 */
export class StatusEffectManager {
  private static instance: StatusEffectManager;

  private effectRegistry: Map<string, StatusEffectConstructor> = new Map();
  private effectsDir: string;

  private constructor() {
    this.effectsDir = path.join(__dirname, "../models/statusEffects");
    this.loadEffects();
  }

  static getInstance(): StatusEffectManager {
    if (!StatusEffectManager.instance) {
      StatusEffectManager.instance = new StatusEffectManager();
    }
    return StatusEffectManager.instance;
  }

  // ========================================================================
  // AUTO-DISCOVERY
  // ========================================================================

  /**
   * Scan statusEffects directory and load all effect classes
   */
  private loadEffects(): void {
    if (!fs.existsSync(this.effectsDir)) {
      logger.warn(
        "EFFECT_MANAGER",
        `Effects directory not found: ${this.effectsDir}`
      );
      return;
    }

    const files = fs
      .readdirSync(this.effectsDir)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"));

    logger.info(
      "EFFECT_MANAGER",
      `Loading status effects from ${this.effectsDir}...`
    );

    files.forEach((file) => {
      try {
        const filePath = path.join(this.effectsDir, file);
        const module = require(filePath);

        // Get the exported class
        const EffectClass = module.default || Object.values(module)[0];

        if (!EffectClass || typeof EffectClass !== "function") {
          logger.warn(
            "EFFECT_MANAGER",
            `File ${file} doesn't export a valid class`
          );
          return;
        }

        // Validate it extends StatusEffect
        if (!(EffectClass.prototype instanceof StatusEffect)) {
          logger.warn(
            "EFFECT_MANAGER",
            `Class in ${file} doesn't extend StatusEffect, skipping`
          );
          return;
        }

        // Register effect
        const effectName = EffectClass.name;
        this.effectRegistry.set(
          effectName,
          EffectClass as StatusEffectConstructor
        );

        logger.info("EFFECT_MANAGER", `✓ Loaded effect: ${effectName}`);
      } catch (error) {
        logger.error("EFFECT_MANAGER", `Failed to load effect ${file}`, {
          error: (error as Error).message,
        });
      }
    });

    logger.info(
      "EFFECT_MANAGER",
      `Loaded ${this.effectRegistry.size} status effects total`
    );
  }

  // ========================================================================
  // REGISTRY ACCESS
  // ========================================================================

  /**
   * Get effect class by name
   */
  getEffectClass(effectName: string): StatusEffectConstructor | undefined {
    return this.effectRegistry.get(effectName);
  }

  /**
   * Check if effect exists
   */
  effectExists(effectName: string): boolean {
    return this.effectRegistry.has(effectName);
  }

  /**
   * Get all effect names
   */
  getAvailableEffects(): string[] {
    return Array.from(this.effectRegistry.keys());
  }

  /**
   * Get effect metadata
   */
  getEffectInfo(effectName: string): {
    name: string;
    displayName: string;
    description: string;
    priority: number;
  } | null {
    const EffectClass = this.effectRegistry.get(effectName);

    if (!EffectClass) {
      return null;
    }

    return {
      name: EffectClass.name,
      displayName: (EffectClass as any).displayName || EffectClass.name,
      description: (EffectClass as any).description || "No description",
      priority: (EffectClass as any).priority || 0,
    };
  }

  /**
   * Get all effect metadata
   */
  getAllEffectInfo(): Array<{
    name: string;
    displayName: string;
    description: string;
    priority: number;
  }> {
    return Array.from(this.effectRegistry.keys())
      .map((name) => this.getEffectInfo(name))
      .filter((info): info is NonNullable<typeof info> => info !== null);
  }
}
