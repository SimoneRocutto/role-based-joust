import * as fs from "fs";
import * as path from "path";
import { BasePlayer } from "@/models/BasePlayer";
import type { PlayerData } from "@/types/player.types";
import type { RoleConstructor } from "@/types/factory.types";
import type { RoleAssignmentConfig } from "@/types/mode.types";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * RoleFactory - Singleton factory for role creation
 *
 * Features:
 * - Auto-discovers role classes from models/roles directory
 * - Registers roles in a map
 * - Creates role instances with proper typing
 * - Assigns roles randomly to players
 * - Shuffles role pool for fair distribution
 */
export class RoleFactory {
  private static instance: RoleFactory;

  private roleRegistry: Map<string, RoleConstructor> = new Map();
  private rolesDir: string;

  private constructor() {
    this.rolesDir = path.join(__dirname, "../models/roles");
    this.loadRoles();
  }

  static getInstance(): RoleFactory {
    if (!RoleFactory.instance) {
      RoleFactory.instance = new RoleFactory();
    }
    return RoleFactory.instance;
  }

  // ========================================================================
  // AUTO-DISCOVERY
  // ========================================================================

  /**
   * Scan roles directory and load all role classes
   */
  private loadRoles(): void {
    if (!fs.existsSync(this.rolesDir)) {
      logger.warn("FACTORY", `Roles directory not found: ${this.rolesDir}`);
      return;
    }

    const files = fs
      .readdirSync(this.rolesDir)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"));

    logger.info("FACTORY", `Loading roles from ${this.rolesDir}...`);

    files.forEach((file) => {
      try {
        const filePath = path.join(this.rolesDir, file);
        const module = require(filePath);

        // Get the exported class (default export or named export)
        const RoleClass = module.default || Object.values(module)[0];

        if (!RoleClass || typeof RoleClass !== "function") {
          logger.warn("FACTORY", `File ${file} doesn't export a valid class`);
          return;
        }

        // Validate it extends BasePlayer
        if (!(RoleClass.prototype instanceof BasePlayer)) {
          logger.warn(
            "FACTORY",
            `Class in ${file} doesn't extend BasePlayer, skipping`
          );
          return;
        }

        // Register role with normalized name
        const roleName = this.normalizeRoleName(RoleClass.name);
        this.roleRegistry.set(roleName, RoleClass as RoleConstructor);

        logger.info(
          "FACTORY",
          `✓ Loaded role: ${RoleClass.name} (${roleName})`
        );
      } catch (error) {
        logger.error("FACTORY", `Failed to load role ${file}`, {
          error: (error as Error).message,
        });
      }
    });

    logger.info("FACTORY", `Loaded ${this.roleRegistry.size} roles total`);
  }

  /**
   * Normalize role name for lookup
   * "BeastHunter" -> "beasthunter"
   * "beast_hunter" -> "beasthunter"
   */
  private normalizeRoleName(name: string): string {
    return name.toLowerCase().replace(/[_-]/g, "");
  }

  // ========================================================================
  // ROLE CREATION
  // ========================================================================

  /**
   * Create a single role instance
   */
  createRole(roleType: string, playerData: PlayerData): BasePlayer {
    const normalizedName = this.normalizeRoleName(roleType);
    const RoleClass = this.roleRegistry.get(normalizedName);

    if (!RoleClass) {
      logger.warn("FACTORY", `Role '${roleType}' not found, using BasePlayer`, {
        available: Array.from(this.roleRegistry.keys()),
      });
      return new BasePlayer(playerData);
    }

    return new RoleClass(playerData);
  }

  /**
   * Assign roles to multiple players
   */
  assignRoles(
    playersData: PlayerData[],
    config: RoleAssignmentConfig
  ): BasePlayer[] {
    const { pool, theme } = config;

    // If no pool provided and no theme, return BasePlayer instances
    if (!pool && !theme) {
      logger.info("FACTORY", "No roles specified, using BasePlayer for all");
      return playersData.map((data) => new BasePlayer(data));
    }

    // Get role pool (either from config or theme)
    let rolePool: string[] = [];

    if (pool && pool.length > 0) {
      rolePool = pool;
    } else if (theme) {
      // Theme-based assignment would happen at GameMode level
      logger.warn(
        "FACTORY",
        "Theme-based assignment should use mode's getRolePool()"
      );
      rolePool = [];
    }

    // If pool is empty, use BasePlayer
    if (rolePool.length === 0) {
      logger.info("FACTORY", "Empty role pool, using BasePlayer for all");
      return playersData.map((data) => new BasePlayer(data));
    }

    // Shuffle the role pool for randomness
    const shuffledPool = this.shuffle([...rolePool]);

    logger.info("FACTORY", `Assigning roles from pool`, {
      playerCount: playersData.length,
      poolSize: shuffledPool.length,
      roles: shuffledPool,
    });

    // Assign roles from shuffled pool
    return playersData.map((playerData, index) => {
      const roleType = shuffledPool[index % shuffledPool.length];
      const player = this.createRole(roleType, playerData);

      logger.info("FACTORY", `Assigned ${roleType} to ${playerData.name}`);
      return player;
    });
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get all available role names
   */
  getAvailableRoles(): string[] {
    return Array.from(this.roleRegistry.keys());
  }

  /**
   * Check if a role exists
   */
  roleExists(roleType: string): boolean {
    return this.roleRegistry.has(this.normalizeRoleName(roleType));
  }

  /**
   * Get role class by name (for testing/debugging)
   */
  getRoleClass(roleType: string): RoleConstructor | undefined {
    return this.roleRegistry.get(this.normalizeRoleName(roleType));
  }
}
