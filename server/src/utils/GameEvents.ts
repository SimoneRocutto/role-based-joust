import { EventEmitter } from "events";
import type {
  GameTickEvent,
  PlayerDeathEvent,
  PlayerEliminatedEvent,
  RoundStartEvent,
  RoundEndEvent,
  GameEndEvent,
  VampireBloodlustEvent,
  ModeEvent,
  CountdownEvent,
  PlayerReadyEvent,
  ReadyCountEvent,
} from "@/types/events.types";

/**
 * GameEvents - Singleton event emitter for game-wide events
 *
 * Events:
 * - game:tick - Emitted every game tick (100ms)
 * - player:death - When a player dies
 * - player:eliminated - After death processing complete
 * - round:start - When round starts
 * - round:end - When round ends
 * - game:end - When entire game ends
 * - vampire:bloodlust:start - When vampire enters bloodlust
 * - vampire:bloodlust:end - When vampire exits bloodlust
 * - mode:event - Custom mode events
 */
export class GameEvents extends EventEmitter {
  private static instance: GameEvents;

  private constructor() {
    super();
    this.setMaxListeners(100); // Increase listener limit for multiple roles
  }

  static getInstance(): GameEvents {
    if (!GameEvents.instance) {
      GameEvents.instance = new GameEvents();
    }
    return GameEvents.instance;
  }

  // ========== TYPED EVENT EMITTERS ==========

  emitGameTick(payload: GameTickEvent): void {
    this.emit("game:tick", payload);
  }

  emitPlayerDeath(payload: PlayerDeathEvent): void {
    this.emit("player:death", payload);
  }

  emitPlayerEliminated(payload: PlayerEliminatedEvent): void {
    this.emit("player:eliminated", payload);
  }

  emitRoundStart(payload: RoundStartEvent): void {
    this.emit("round:start", payload);
  }

  emitRoundEnd(payload: RoundEndEvent): void {
    this.emit("round:end", payload);
  }

  emitGameEnd(payload: GameEndEvent): void {
    this.emit("game:end", payload);
  }

  emitVampireBloodlustStart(payload: VampireBloodlustEvent): void {
    this.emit("vampire:bloodlust:start", payload);
  }

  emitVampireBloodlustEnd(payload: VampireBloodlustEvent): void {
    this.emit("vampire:bloodlust:end", payload);
  }

  emitModeEvent(payload: ModeEvent): void {
    this.emit("mode:event", payload);
  }

  emitCountdown(payload: CountdownEvent): void {
    this.emit("game:countdown", payload);
  }

  emitGameStopped(): void {
    this.emit("game:stopped", {});
  }

  emitPlayerReady(payload: PlayerReadyEvent): void {
    this.emit("player:ready", payload);
  }

  emitReadyCountUpdate(payload: ReadyCountEvent): void {
    this.emit("ready:update", payload);
  }

  // ========== TYPED EVENT LISTENERS ==========

  onGameTick(listener: (payload: GameTickEvent) => void): void {
    this.on("game:tick", listener);
  }

  onPlayerDeath(listener: (payload: PlayerDeathEvent) => void): void {
    this.on("player:death", listener);
  }

  onPlayerEliminated(listener: (payload: PlayerEliminatedEvent) => void): void {
    this.on("player:eliminated", listener);
  }

  onRoundStart(listener: (payload: RoundStartEvent) => void): void {
    this.on("round:start", listener);
  }

  onRoundEnd(listener: (payload: RoundEndEvent) => void): void {
    this.on("round:end", listener);
  }

  onGameEnd(listener: (payload: GameEndEvent) => void): void {
    this.on("game:end", listener);
  }

  onVampireBloodlustStart(
    listener: (payload: VampireBloodlustEvent) => void
  ): void {
    this.on("vampire:bloodlust:start", listener);
  }

  onVampireBloodlustEnd(
    listener: (payload: VampireBloodlustEvent) => void
  ): void {
    this.on("vampire:bloodlust:end", listener);
  }

  onModeEvent(listener: (payload: ModeEvent) => void): void {
    this.on("mode:event", listener);
  }

  onCountdown(listener: (payload: CountdownEvent) => void): void {
    this.on("game:countdown", listener);
  }

  onGameStopped(listener: () => void): void {
    this.on("game:stopped", listener);
  }

  onPlayerReady(listener: (payload: PlayerReadyEvent) => void): void {
    this.on("player:ready", listener);
  }

  onReadyCountUpdate(listener: (payload: ReadyCountEvent) => void): void {
    this.on("ready:update", listener);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Remove all listeners for a specific event
   */
  removeAllListenersForEvent(eventName: string): void {
    this.removeAllListeners(eventName);
  }

  /**
   * Get count of listeners for an event
   */
  getListenerCount(eventName: string): number {
    return this.listenerCount(eventName);
  }

  /**
   * Clear all event listeners
   */
  clearAll(): void {
    this.removeAllListeners();
  }
}
