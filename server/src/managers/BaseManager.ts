import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

export interface BaseInfo {
  baseId: string;
  baseNumber: number;
  socketId: string;
  ownerTeamId: number | null;
  isConnected: boolean;
  /** gameTime when ownership last changed (for control timer) */
  lastCaptureTime: number;
  /** gameTime when last point was scored (for interval tracking) */
  lastPointTime: number;
}

export interface BasePointEvent {
  baseId: string;
  baseNumber: number;
  teamId: number;
}

/**
 * BaseManager — Singleton tracking base phone connections and ownership for Domination mode.
 */
export class BaseManager {
  private static instance: BaseManager;
  private bases: Map<string, BaseInfo> = new Map(); // baseId → BaseInfo
  private socketToBase: Map<string, string> = new Map(); // socketId → baseId

  private constructor() {}

  static getInstance(): BaseManager {
    if (!BaseManager.instance) {
      BaseManager.instance = new BaseManager();
    }
    return BaseManager.instance;
  }

  /**
   * Returns the lowest base number not currently in use.
   */
  private getNextAvailableNumber(): number {
    const used = new Set(Array.from(this.bases.values()).map((b) => b.baseNumber));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  }

  /**
   * Register a new base phone connection.
   * Returns the assigned baseId and baseNumber.
   */
  registerBase(socketId: string): { baseId: string; baseNumber: number } {
    // Check if this socket already registered a base
    const existingBaseId = this.socketToBase.get(socketId);
    if (existingBaseId) {
      const existing = this.bases.get(existingBaseId);
      if (existing) {
        existing.isConnected = true;
        existing.socketId = socketId;
        logger.info("BASE", `Base ${existing.baseNumber} reconnected`, { baseId: existingBaseId });
        return { baseId: existingBaseId, baseNumber: existing.baseNumber };
      }
    }

    const baseNumber = this.getNextAvailableNumber();
    const baseId = `base-${baseNumber}`;

    const base: BaseInfo = {
      baseId,
      baseNumber,
      socketId,
      ownerTeamId: null,
      isConnected: true,
      lastCaptureTime: 0,
      lastPointTime: 0,
    };

    this.bases.set(baseId, base);
    this.socketToBase.set(socketId, baseId);

    logger.info("BASE", `Base ${baseNumber} registered`, { baseId, socketId });
    return { baseId, baseNumber };
  }

  /**
   * Handle a base phone disconnecting during active gameplay.
   * Keeps ownership state but marks as disconnected (pauses scoring).
   */
  handleDisconnect(socketId: string): void {
    const baseId = this.socketToBase.get(socketId);
    if (!baseId) return;

    const base = this.bases.get(baseId);
    if (!base) return;

    base.isConnected = false;
    logger.info("BASE", `Base ${base.baseNumber} disconnected (ownership preserved)`, { baseId });
  }

  /**
   * Remove all disconnected bases, freeing their numbers for reuse.
   * Called before registering a new base outside of active gameplay so that
   * ghost entries left by bases that dropped mid-game don't pollute the list.
   */
  purgeDisconnected(): void {
    for (const [baseId, base] of Array.from(this.bases.entries())) {
      if (!base.isConnected) {
        this.socketToBase.delete(base.socketId);
        this.bases.delete(baseId);
        logger.info("BASE", `Base ${base.baseNumber} purged (was disconnected)`, { baseId });
      }
    }
  }

  /**
   * Fully remove a base — used when it disconnects outside active gameplay.
   * Its number is freed and can be reused by the next base that connects.
   */
  removeBase(socketId: string): void {
    const baseId = this.socketToBase.get(socketId);
    if (!baseId) return;

    const base = this.bases.get(baseId);
    if (!base) return;

    this.socketToBase.delete(socketId);
    this.bases.delete(baseId);
    logger.info("BASE", `Base ${base.baseNumber} removed (disconnected outside active game)`, { baseId });
  }

  /**
   * Handle a base phone reconnecting with a new socket.
   */
  reconnectBase(baseId: string, newSocketId: string): boolean {
    const base = this.bases.get(baseId);
    if (!base) return false;

    // Clean up old socket mapping
    this.socketToBase.delete(base.socketId);

    base.socketId = newSocketId;
    base.isConnected = true;
    this.socketToBase.set(newSocketId, baseId);

    logger.info("BASE", `Base ${base.baseNumber} reconnected`, { baseId, newSocketId });
    return true;
  }

  /**
   * Set the owner of a base directly.
   */
  setOwner(baseId: string, teamId: number | null, gameTime: number): void {
    const base = this.bases.get(baseId);
    if (!base) return;

    base.ownerTeamId = teamId;
    base.lastCaptureTime = gameTime;
    base.lastPointTime = gameTime;
  }

  /**
   * Cycle base ownership: Neutral → Team0 → Team1 → ... → Team0
   * Returns the new owner teamId.
   */
  cycleOwner(baseId: string, teamCount: number, gameTime: number): number {
    const base = this.bases.get(baseId);
    if (!base) return 0;

    let newTeamId: number;
    if (base.ownerTeamId === null) {
      // Neutral → first team
      newTeamId = 0;
    } else {
      // Next team in sequence
      newTeamId = (base.ownerTeamId + 1) % teamCount;
    }

    base.ownerTeamId = newTeamId;
    base.lastCaptureTime = gameTime;
    base.lastPointTime = gameTime;

    logger.info("BASE", `Base ${base.baseNumber} captured by team ${newTeamId}`, {
      baseId,
      gameTime,
    });

    return newTeamId;
  }

  /**
   * Check all bases for point scoring.
   * Returns events for each base that has been held long enough to score.
   * Disconnected bases are skipped (scoring paused).
   */
  checkPointScoring(gameTime: number, controlIntervalMs: number): BasePointEvent[] {
    const events: BasePointEvent[] = [];

    for (const [, base] of this.bases) {
      // Skip neutral, disconnected, or bases with no owner
      if (base.ownerTeamId === null || !base.isConnected) continue;

      const elapsed = gameTime - base.lastPointTime;
      if (elapsed >= controlIntervalMs) {
        events.push({
          baseId: base.baseId,
          baseNumber: base.baseNumber,
          teamId: base.ownerTeamId,
        });
        // Reset timer for next interval
        base.lastPointTime = gameTime;
      }
    }

    return events;
  }

  /**
   * Get a base by its ID.
   */
  getBase(baseId: string): BaseInfo | undefined {
    return this.bases.get(baseId);
  }

  /**
   * Get the baseId for a socket.
   */
  getBaseIdBySocket(socketId: string): string | undefined {
    return this.socketToBase.get(socketId);
  }

  /**
   * Get all registered bases.
   */
  getAllBases(): BaseInfo[] {
    return Array.from(this.bases.values());
  }

  /**
   * Get the number of connected bases.
   */
  getConnectedCount(): number {
    return Array.from(this.bases.values()).filter((b) => b.isConnected).length;
  }

  /**
   * Reset all bases to neutral and clear timers (called at round/game start).
   */
  resetOwnership(gameTime: number): void {
    for (const [, base] of this.bases) {
      base.ownerTeamId = null;
      base.lastCaptureTime = gameTime;
      base.lastPointTime = gameTime;
    }
  }

  /**
   * Full reset — clear all bases (called when game stops or returns to lobby).
   */
  reset(): void {
    this.bases.clear();
    this.socketToBase.clear();
    logger.info("BASE", "All bases cleared");
  }
}
