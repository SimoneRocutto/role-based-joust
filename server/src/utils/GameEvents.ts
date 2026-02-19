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
  ReadyEnabledEvent,
  GameStartEvent,
  PlayerRespawnEvent,
  PlayerRespawnPendingEvent,
  BaseCapturedEvent,
  BasePointEvent,
  BaseStatusEvent,
  DominationWinEvent,
  RoleUpdatedEvent,
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
 * - game:start - When entire game starts
 * - game:end - When entire game ends
 * - vampire:bloodlust:start - When vampire enters bloodlust
 * - vampire:bloodlust:end - When vampire exits bloodlust
 * - mode:event - Custom mode events
 */
export class GameEvents extends EventEmitter {
  private static instance: GameEvents;
  private roundEmitter = new EventEmitter();

  private constructor() {
    super();
    this.setMaxListeners(100); // Increase listener limit for multiple roles
    this.roundEmitter.setMaxListeners(100);
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
    this.emit("player:death", payload);              // permanent (broadcaster)
    this.roundEmitter.emit("player:death", payload); // round-scoped (roles/modes)
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

  emitGameStart(payload: GameStartEvent): void {
    this.emit("game:start", payload);
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

  emitReadyEnabled(payload: ReadyEnabledEvent): void {
    this.emit("ready:enabled", payload);
  }

  emitPlayerRespawn(payload: PlayerRespawnEvent): void {
    this.emit("player:respawn", payload);
  }

  emitPlayerRespawnPending(payload: PlayerRespawnPendingEvent): void {
    this.emit("player:respawn-pending", payload);
  }

  emitBaseCaptured(payload: BaseCapturedEvent): void {
    this.emit("base:captured", payload);
  }

  emitBasePoint(payload: BasePointEvent): void {
    this.emit("base:point", payload);
  }

  emitBaseStatus(payload: BaseStatusEvent): void {
    this.emit("base:status", payload);
  }

  emitDominationWin(payload: DominationWinEvent): void {
    this.emit("domination:win", payload);
  }

  emitRoleUpdated(payload: RoleUpdatedEvent): void {
    this.emit("role:updated", payload);
  }

  // ========== TYPED EVENT LISTENERS ==========

  onGameTick(listener: (payload: GameTickEvent) => void): void {
    this.on("game:tick", listener);
  }

  // Round-scoped — auto-cleaned at round/game end
  onPlayerDeath(listener: (payload: PlayerDeathEvent) => void): void {
    this.roundEmitter.on("player:death", listener);
  }

  // Permanent — survives across rounds (broadcaster only)
  onPlayerDeathPermanent(listener: (payload: PlayerDeathEvent) => void): void {
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

  onGameStart(listener: (payload: GameStartEvent) => void): void {
    this.on("game:start", listener);
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

  onReadyEnabled(listener: (payload: ReadyEnabledEvent) => void): void {
    this.on("ready:enabled", listener);
  }

  onPlayerRespawn(listener: (payload: PlayerRespawnEvent) => void): void {
    this.on("player:respawn", listener);
  }

  onPlayerRespawnPending(
    listener: (payload: PlayerRespawnPendingEvent) => void
  ): void {
    this.on("player:respawn-pending", listener);
  }

  onBaseCaptured(listener: (payload: BaseCapturedEvent) => void): void {
    this.on("base:captured", listener);
  }

  onBasePoint(listener: (payload: BasePointEvent) => void): void {
    this.on("base:point", listener);
  }

  onBaseStatus(listener: (payload: BaseStatusEvent) => void): void {
    this.on("base:status", listener);
  }

  onDominationWin(listener: (payload: DominationWinEvent) => void): void {
    this.on("domination:win", listener);
  }

  onRoleUpdated(listener: (payload: RoleUpdatedEvent) => void): void {
    this.on("role:updated", listener);
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
   * Clear round-scoped listeners (called at round/game end)
   */
  clearRoundListeners(): void {
    this.roundEmitter.removeAllListeners();
  }

  /**
   * Clear all event listeners
   */
  clearAll(): void {
    this.removeAllListeners();
    this.roundEmitter.removeAllListeners();
  }
}
