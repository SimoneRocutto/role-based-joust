// ============================================================================
// src/managers/GameEventManager.ts - Game Event Lifecycle Manager
// ============================================================================

import type { GameEngine } from "@/managers/GameEngine";
import type { GameEvent, GameEventInfo } from "@/gameEvents/GameEvent";
import type { BasePlayer } from "@/models/BasePlayer";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * GameEventManager - Manages the lifecycle of game events during a round
 *
 * Owned by each GameMode instance. The mode registers events and delegates
 * tick/lifecycle calls to this manager.
 *
 * Responsibilities:
 * - Register events for the current round
 * - Check activation/deactivation conditions each tick
 * - Tick active events
 * - Forward player death notifications
 * - Clean up all events on round end
 */
export class GameEventManager {
  private events: GameEvent[] = [];
  private activeEvents: GameEvent[] = [];

  /**
   * Register an event for this round.
   * Called by the mode in onRoundStart.
   */
  registerEvent(event: GameEvent): void {
    this.events.push(event);
    logger.info("EVENT_MGR", `Registered event: ${event.id}`);
  }

  /**
   * Called every game tick by the mode's onTick.
   * Checks activation for inactive events, ticks active events,
   * checks deactivation conditions.
   */
  tick(engine: GameEngine, gameTime: number, deltaTime: number): void {
    // 1. Check inactive events for activation (sorted by priority)
    for (const event of this.getInactiveEvents()) {
      if (event.shouldActivate(engine, gameTime)) {
        this.activateEvent(event, engine, gameTime);
      }
    }

    // 2. Tick active events (sorted by priority)
    for (const event of this.getSortedActiveEvents()) {
      event.onTick(engine, gameTime, deltaTime);

      // 3. Check if event should deactivate
      if (event.shouldDeactivate(engine, gameTime)) {
        this.deactivateEvent(event, engine, gameTime);
      }
    }
  }

  /**
   * Activate an event.
   */
  private activateEvent(
    event: GameEvent,
    engine: GameEngine,
    gameTime: number
  ): void {
    event.isActive = true;
    event.startTime = gameTime;
    event.onStart(engine, gameTime);
    this.activeEvents.push(event);
    logger.info("EVENT_MGR", `Activated event: ${event.id}`);
  }

  /**
   * Deactivate an event.
   */
  private deactivateEvent(
    event: GameEvent,
    engine: GameEngine,
    gameTime: number
  ): void {
    event.onEnd(engine, gameTime);
    event.isActive = false;
    event.startTime = null;
    this.activeEvents = this.activeEvents.filter((e) => e.id !== event.id);
    logger.info("EVENT_MGR", `Deactivated event: ${event.id}`);
  }

  /**
   * Deactivate all events and clear. Called on round end.
   */
  cleanup(engine: GameEngine, gameTime: number): void {
    // Deactivate all active events
    for (const event of [...this.activeEvents]) {
      this.deactivateEvent(event, engine, gameTime);
    }

    this.events = [];
    this.activeEvents = [];
    logger.info("EVENT_MGR", "All events cleaned up");
  }

  /**
   * Notify active events of player death.
   */
  onPlayerDeath(
    victim: BasePlayer,
    engine: GameEngine,
    gameTime: number
  ): void {
    for (const event of this.getSortedActiveEvents()) {
      event.onPlayerDeath(victim, engine, gameTime);
    }
  }

  /**
   * Notify all events of round start (for internal reset).
   */
  onRoundStart(engine: GameEngine, gameTime: number): void {
    for (const event of this.events) {
      event.onRoundStart(engine, gameTime);
    }
  }

  /**
   * Get currently active events.
   */
  getActiveEvents(): GameEvent[] {
    return [...this.activeEvents];
  }

  /**
   * Get info for all registered events.
   */
  getEventInfo(gameTime: number): GameEventInfo[] {
    return this.events.map((e) => e.getInfo(gameTime));
  }

  private getSortedActiveEvents(): GameEvent[] {
    return [...this.activeEvents].sort((a, b) => b.priority - a.priority);
  }

  private getInactiveEvents(): GameEvent[] {
    return this.events
      .filter((e) => !e.isActive)
      .sort((a, b) => b.priority - a.priority);
  }
}
