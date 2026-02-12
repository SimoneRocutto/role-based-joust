import type { BasePlayer } from "@/models/BasePlayer";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";
import { gameConfig } from "@/config/gameConfig";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * ReadyStateManager - Manages player ready state between rounds
 *
 * Tracks which players are ready, handles the delay period after round end
 * (where ready is temporarily disabled), and triggers auto-start when all
 * players are ready.
 */
export class ReadyStateManager {
  private playerReadyState: Map<string, boolean> = new Map();
  private readyDelayTimer: NodeJS.Timeout | null = null;
  private readyEnabled: boolean = true;

  /** Callback invoked when all players are ready */
  onAllReady: (() => void) | null = null;

  /**
   * Check if ready state is enabled (not in delay period after round end)
   */
  isReadyEnabled(): boolean {
    return this.readyEnabled;
  }

  /**
   * Set a player's ready state.
   * Returns true if accepted, false if rejected (e.g., during delay period).
   * Caller is responsible for validating the player exists.
   */
  setPlayerReady(
    playerId: string,
    playerName: string,
    isReady: boolean,
    players: BasePlayer[]
  ): boolean {
    // Reject ready during delay period (only when trying to set ready, not unready)
    if (isReady && !this.readyEnabled) {
      logger.debug(
        "ENGINE",
        `Rejecting ready for ${playerName} - ready not yet enabled`
      );
      return false;
    }

    this.playerReadyState.set(playerId, isReady);
    logger.debug("ENGINE", `Player ${playerName} ready state: ${isReady}`);

    // Check if all players ready for auto-start
    this.checkAutoStart(players);
    return true;
  }

  /**
   * Get ready count for the given players
   */
  getReadyCount(players: BasePlayer[]): { ready: number; total: number } {
    const total = players.length;
    let ready = 0;
    for (const player of players) {
      if (this.playerReadyState.get(player.id)) {
        ready++;
      }
    }
    return { ready, total };
  }

  /**
   * Check if all given players are ready
   */
  areAllPlayersReady(players: BasePlayer[]): boolean {
    if (players.length === 0) return false;
    for (const player of players) {
      if (!this.playerReadyState.get(player.id)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Reset ready state for all players
   */
  resetReadyState(): void {
    this.playerReadyState.clear();
    logger.debug("ENGINE", "Ready state reset for all players");
  }

  /**
   * Get a single player's ready state
   */
  getPlayerReady(playerId: string): boolean {
    return this.playerReadyState.get(playerId) ?? false;
  }

  /**
   * Start the ready delay period after a round ends.
   * During the delay, ready state is disabled so players can't accidentally
   * ready up immediately.
   * @param testMode - If true, skip the delay entirely
   */
  startReadyDelay(testMode: boolean): void {
    if (testMode) return;

    this.readyEnabled = false;
    gameEvents.emitReadyEnabled({ enabled: false });

    // Clear any existing timer
    if (this.readyDelayTimer) {
      clearTimeout(this.readyDelayTimer);
    }

    // Start delay timer
    this.readyDelayTimer = setTimeout(() => {
      this.readyEnabled = true;
      this.readyDelayTimer = null;
      gameEvents.emitReadyEnabled({ enabled: true });
      logger.info("ENGINE", "Ready state enabled after delay");
    }, gameConfig.timing.readyDelayMs);

    logger.info(
      "ENGINE",
      `Ready state disabled for ${gameConfig.timing.readyDelayMs}ms`
    );
  }

  /**
   * Check if game should auto-start (all players ready between rounds).
   * Calls onAllReady callback if set.
   */
  private checkAutoStart(players: BasePlayer[]): void {
    if (this.areAllPlayersReady(players) && this.onAllReady) {
      logger.info("ENGINE", "All players ready - triggering auto-start");
      this.onAllReady();
    }
  }

  /**
   * Clean up timers. Call from stopGame().
   */
  cleanup(): void {
    if (this.readyDelayTimer) {
      clearTimeout(this.readyDelayTimer);
      this.readyDelayTimer = null;
    }
    this.readyEnabled = true;
    this.playerReadyState.clear();
  }
}
