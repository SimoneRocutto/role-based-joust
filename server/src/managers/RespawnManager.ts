import type { GameEngine } from "@/managers/GameEngine";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * RespawnManager - Handles scheduling and executing player respawns.
 *
 * Used by game modes that support respawning (DeathCountMode, DominationMode).
 * Tracks pending respawns by gameTime and revives players when their timer expires.
 */
export class RespawnManager {
  private pendingRespawns: Map<string, number> = new Map(); // playerId → respawnAtTime
  private respawnDelayMs: number;

  constructor(respawnDelayMs: number) {
    this.respawnDelayMs = respawnDelayMs;
  }

  /**
   * Schedule a player to respawn after the configured delay.
   * If roundDuration is provided, skips scheduling if there isn't enough time left.
   * Returns true if respawn was scheduled, false if skipped.
   */
  scheduleRespawn(
    playerId: string,
    gameTime: number,
    roundDuration?: number | null
  ): boolean {
    if (
      roundDuration !== null &&
      roundDuration !== undefined &&
      gameTime + this.respawnDelayMs >= roundDuration
    ) {
      return false;
    }

    const respawnAt = gameTime + this.respawnDelayMs;
    this.pendingRespawns.set(playerId, respawnAt);
    return true;
  }

  /**
   * Check all pending respawns and revive players whose timer has expired.
   */
  checkRespawns(engine: GameEngine, gameTime: number): void {
    for (const [playerId, respawnAt] of this.pendingRespawns) {
      if (gameTime >= respawnAt) {
        this.respawnPlayer(playerId, engine, gameTime);
      }
    }
  }

  /**
   * Check if a player has a pending respawn.
   */
  hasPendingRespawn(playerId: string): boolean {
    return this.pendingRespawns.has(playerId);
  }

  /**
   * Get the respawn delay in milliseconds.
   */
  getDelay(): number {
    return this.respawnDelayMs;
  }

  /**
   * Clear all pending respawns.
   */
  clear(): void {
    this.pendingRespawns.clear();
  }

  /**
   * Emit the respawn-pending event for a player.
   */
  emitRespawnPending(
    player: import("@/models/BasePlayer").BasePlayer
  ): void {
    gameEvents.emitPlayerRespawnPending({
      player,
      respawnIn: this.respawnDelayMs,
    });
  }

  private respawnPlayer(
    playerId: string,
    engine: GameEngine,
    gameTime: number
  ): void {
    const player = engine.getPlayerById(playerId);
    if (!player) return;

    this.pendingRespawns.delete(playerId);

    player.isAlive = true;
    player.accumulatedDamage = 0;
    player.clearStatusEffects(gameTime);

    gameEvents.emitPlayerRespawn({ player, gameTime });

    logger.info("MODE", `${player.name} respawned at ${gameTime}ms`);
  }
}
