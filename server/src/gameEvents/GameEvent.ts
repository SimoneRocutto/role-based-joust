import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";

/**
 * GameEvent - Abstract base class for game events
 *
 * Game events are self-contained gameplay modifiers that can be activated
 * by any game mode. They follow the auto-discovery pattern (like roles,
 * status effects, and game modes).
 *
 * Lifecycle:
 * - onRoundStart: called when a round begins
 * - onTick: called every game tick (100ms)
 * - onRoundEnd: called when a round ends
 * - onPlayerDeath: called when a player dies
 */
export abstract class GameEvent {
  abstract getName(): string;
  abstract getDescription(): string;

  onRoundStart(engine: GameEngine): void {
    // Override as needed
  }

  onTick(engine: GameEngine, gameTime: number): void {
    // Override as needed
  }

  onRoundEnd(engine: GameEngine): void {
    // Override as needed
  }

  onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    // Override as needed
  }
}
