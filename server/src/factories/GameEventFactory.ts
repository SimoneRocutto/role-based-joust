// ============================================================================
// src/factories/GameEventFactory.ts - Game Event Auto-Discovery
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import { GameEvent } from "@/gameEvents/GameEvent";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

type GameEventConstructor = new (...args: any[]) => GameEvent;

/**
 * GameEventFactory - Singleton factory for game event creation
 *
 * Features:
 * - Auto-discovers event classes from gameEvents directory
 * - Registers events by static eventKey
 * - Creates event instances on demand
 * - Lists available events for UI/modes
 */
export class GameEventFactory {
  private static instance: GameEventFactory;

  private eventRegistry: Map<string, GameEventConstructor> = new Map();
  private eventsDir: string;

  private constructor() {
    this.eventsDir = path.join(__dirname, "../gameEvents");
    this.loadEvents();
  }

  static getInstance(): GameEventFactory {
    if (!GameEventFactory.instance) {
      GameEventFactory.instance = new GameEventFactory();
    }
    return GameEventFactory.instance;
  }

  // ========================================================================
  // AUTO-DISCOVERY
  // ========================================================================

  /**
   * Scan gameEvents directory and load all event classes
   */
  private loadEvents(): void {
    if (!fs.existsSync(this.eventsDir)) {
      logger.warn("FACTORY", `Events directory not found: ${this.eventsDir}`);
      return;
    }

    const files = fs
      .readdirSync(this.eventsDir)
      .filter(
        (f) =>
          (f.endsWith(".ts") || f.endsWith(".js")) &&
          f !== "GameEvent.ts" &&
          f !== "GameEvent.js"
      );

    logger.info("FACTORY", `Loading game events from ${this.eventsDir}...`);

    files.forEach((file) => {
      try {
        const filePath = path.join(this.eventsDir, file);
        const module = require(filePath);

        // Get the exported class (default or named export)
        const EventClass = module.default || Object.values(module)[0];

        if (!EventClass || typeof EventClass !== "function") {
          logger.warn("FACTORY", `File ${file} doesn't export a valid class`);
          return;
        }

        // Validate it extends GameEvent
        if (!(EventClass.prototype instanceof GameEvent)) {
          logger.warn(
            "FACTORY",
            `Class in ${file} doesn't extend GameEvent, skipping`
          );
          return;
        }

        // Get the static eventKey
        const eventKey = (EventClass as typeof GameEvent).eventKey;
        if (!eventKey) {
          logger.warn(
            "FACTORY",
            `Class in ${file} has no static eventKey, skipping`
          );
          return;
        }

        // Register event
        this.eventRegistry.set(eventKey, EventClass as GameEventConstructor);

        logger.info(
          "FACTORY",
          `Loaded event: ${(EventClass as typeof GameEvent).displayName} (${eventKey})`
        );
      } catch (error) {
        logger.error("FACTORY", `Failed to load event ${file}`, {
          error: (error as Error).message,
        });
      }
    });

    logger.info(
      "FACTORY",
      `Loaded ${this.eventRegistry.size} game events total`
    );
  }

  // ========================================================================
  // EVENT CREATION
  // ========================================================================

  /**
   * Create an event instance by key
   */
  createEvent(eventKey: string, ...args: any[]): GameEvent {
    const EventClass = this.eventRegistry.get(eventKey);

    if (!EventClass) {
      const available = Array.from(this.eventRegistry.keys());
      throw new Error(
        `Game event '${eventKey}' not found. Available: ${available.join(", ")}`
      );
    }

    logger.info("FACTORY", `Creating event: ${eventKey}`);
    return new EventClass(...args);
  }

  /**
   * Get all available event keys
   */
  getAvailableEvents(): string[] {
    return Array.from(this.eventRegistry.keys());
  }

  /**
   * Check if an event exists
   */
  eventExists(eventKey: string): boolean {
    return this.eventRegistry.has(eventKey);
  }
}
