import * as fs from "fs";
import * as path from "path";
import { GameEvent } from "@/gameEvents/GameEvent";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

type GameEventConstructor = new () => GameEvent;

/**
 * GameEventFactory - Singleton factory for game event creation
 *
 * Features:
 * - Auto-discovers game event classes from gameEvents directory
 * - Registers events by their getName() return value
 * - Creates event instances by name
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

  private loadEvents(): void {
    if (!fs.existsSync(this.eventsDir)) {
      logger.warn("FACTORY", `Game events directory not found: ${this.eventsDir}`);
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

        const EventClass = module.default || Object.values(module)[0];

        if (!EventClass || typeof EventClass !== "function") {
          logger.warn("FACTORY", `File ${file} doesn't export a valid class`);
          return;
        }

        if (!(EventClass.prototype instanceof GameEvent)) {
          logger.warn(
            "FACTORY",
            `Class in ${file} doesn't extend GameEvent, skipping`
          );
          return;
        }

        // Create temporary instance to get the event name
        const instance = new EventClass() as GameEvent;
        const eventName = instance.getName();

        this.eventRegistry.set(eventName, EventClass as GameEventConstructor);

        logger.info("FACTORY", `Loaded game event: ${eventName}`);
      } catch (error) {
        logger.error("FACTORY", `Failed to load game event ${file}`, {
          error: (error as Error).message,
        });
      }
    });

    logger.info("FACTORY", `Loaded ${this.eventRegistry.size} game events total`);
  }

  createEvent(eventName: string): GameEvent | null {
    const EventClass = this.eventRegistry.get(eventName);

    if (!EventClass) {
      logger.warn("FACTORY", `Game event '${eventName}' not found`, {
        available: Array.from(this.eventRegistry.keys()),
      });
      return null;
    }

    return new EventClass();
  }

  getAvailableEvents(): string[] {
    return Array.from(this.eventRegistry.keys());
  }

  eventExists(eventName: string): boolean {
    return this.eventRegistry.has(eventName);
  }
}
