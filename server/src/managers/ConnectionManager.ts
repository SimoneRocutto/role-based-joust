import type { Socket } from "socket.io";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * ConnectionManager - Manages socket connections and player sessions
 *
 * Features:
 * - Session token management
 * - Player reconnection logic
 * - Socket ID mapping
 * - Heartbeat/timeout handling
 * - Disconnection cleanup
 */
export class ConnectionManager {
  private static instance: ConnectionManager;

  // Map: playerId -> socketId
  private playerSockets: Map<string, string> = new Map();

  // Map: socketId -> playerId
  private socketPlayers: Map<string, string> = new Map();

  // Map: playerId -> session token
  private sessionTokens: Map<string, string> = new Map();

  // Map: socketId -> last activity timestamp
  private lastActivity: Map<string, number> = new Map();

  // Map: playerId -> playerNumber (1-20)
  private playerNumbers: Map<string, number> = new Map();

  // Map: playerId -> player name (for lobby display)
  private playerNames: Map<string, string> = new Map();

  // Configuration
  private readonly SESSION_TIMEOUT = 300000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.startHeartbeatMonitor();
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  // ========================================================================
  // CONNECTION MANAGEMENT
  // ========================================================================

  /**
   * Register a new player connection
   * Returns object with token and playerNumber
   */
  registerConnection(
    playerId: string,
    socketId: string,
    playerName: string,
    generateToken: boolean = true
  ): { token: string | null; playerNumber: number } {
    logger.info("CONNECTION", `Registering player connection`, {
      playerId,
      socketId,
      playerName,
    });

    // Update mappings
    this.playerSockets.set(playerId, socketId);
    this.socketPlayers.set(socketId, playerId);
    this.lastActivity.set(socketId, Date.now());
    this.playerNames.set(playerId, playerName);

    // Assign player number if not already assigned
    let playerNumber = this.playerNumbers.get(playerId);
    if (playerNumber === undefined) {
      playerNumber = this.getNextPlayerNumber();
      this.playerNumbers.set(playerId, playerNumber);
    }

    // Generate session token if requested
    if (generateToken) {
      const token = this.generateSessionToken();
      this.sessionTokens.set(playerId, token);
      logger.debug("CONNECTION", `Generated session token for ${playerId}`, {
        playerNumber,
        playerName,
      });
      return { token, playerNumber };
    }

    return { token: null, playerNumber };
  }

  /**
   * Get the next available player number (1-20)
   */
  private getNextPlayerNumber(): number {
    const usedNumbers = new Set(this.playerNumbers.values());
    for (let i = 1; i <= 20; i++) {
      if (!usedNumbers.has(i)) {
        return i;
      }
    }
    // If all numbers are used, return the next number beyond 20
    return this.playerNumbers.size + 1;
  }

  /**
   * Get player number for a player ID
   */
  getPlayerNumber(playerId: string): number | undefined {
    return this.playerNumbers.get(playerId);
  }

  /**
   * Get player name for a player ID
   */
  getPlayerName(playerId: string): string | undefined {
    return this.playerNames.get(playerId);
  }

  /**
   * Get all lobby players (connected players waiting for game)
   */
  getLobbyPlayers(): Array<{
    id: string;
    name: string;
    number: number;
    isAlive: boolean;
  }> {
    const lobbyPlayers: Array<{
      id: string;
      name: string;
      number: number;
      isAlive: boolean;
    }> = [];

    for (const [playerId, socketId] of this.playerSockets.entries()) {
      const name = this.playerNames.get(playerId);
      const number = this.playerNumbers.get(playerId);

      if (name && number !== undefined) {
        lobbyPlayers.push({
          id: playerId,
          name,
          number,
          isAlive: true, // All lobby players are "alive" (waiting)
        });
      }
    }

    return lobbyPlayers.sort((a, b) => a.number - b.number);
  }

  /**
   * Handle player reconnection with session token
   */
  reconnect(
    token: string,
    newSocketId: string
  ): { success: boolean; playerId?: string; message?: string } {
    // Find player by token
    let playerId: string | undefined;

    for (const [pid, storedToken] of this.sessionTokens.entries()) {
      if (storedToken === token) {
        playerId = pid;
        break;
      }
    }

    if (!playerId) {
      logger.warn("CONNECTION", "Reconnect failed: invalid token");
      return {
        success: false,
        message: "Invalid session token",
      };
    }

    logger.info("CONNECTION", `Player ${playerId} reconnecting`, {
      newSocketId,
    });

    // Remove old socket mapping
    const oldSocketId = this.playerSockets.get(playerId);
    if (oldSocketId) {
      this.socketPlayers.delete(oldSocketId);
      this.lastActivity.delete(oldSocketId);
    }

    // Register new connection
    this.registerConnection(playerId, newSocketId, false);

    return {
      success: true,
      playerId,
    };
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(socketId: string): void {
    const playerId = this.socketPlayers.get(socketId);

    if (!playerId) {
      logger.debug("CONNECTION", `Unknown socket disconnected: ${socketId}`);
      return;
    }

    logger.info("CONNECTION", `Player ${playerId} disconnected`, {
      socketId,
    });

    // Keep session token for potential reconnection
    // Remove socket mappings
    this.playerSockets.delete(playerId);
    this.socketPlayers.delete(socketId);
    this.lastActivity.delete(socketId);
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(socketId: string): void {
    this.lastActivity.set(socketId, Date.now());
  }

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  /**
   * Generate a random session token
   */
  private generateSessionToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Clear expired sessions
   */
  private clearExpiredSessions(): void {
    const now = Date.now();
    const expired: string[] = [];

    // Check for expired sessions
    for (const [socketId, lastActive] of this.lastActivity.entries()) {
      if (now - lastActive > this.SESSION_TIMEOUT) {
        expired.push(socketId);
      }
    }

    // Clean up expired sessions
    expired.forEach((socketId) => {
      const playerId = this.socketPlayers.get(socketId);
      if (playerId) {
        logger.info("CONNECTION", `Session expired for player ${playerId}`);
        this.sessionTokens.delete(playerId);
      }
      this.handleDisconnect(socketId);
    });

    if (expired.length > 0) {
      logger.debug("CONNECTION", `Cleared ${expired.length} expired sessions`);
    }
  }

  /**
   * Start heartbeat monitor
   */
  private startHeartbeatMonitor(): void {
    setInterval(() => {
      this.clearExpiredSessions();
    }, this.HEARTBEAT_INTERVAL);

    logger.debug("CONNECTION", "Heartbeat monitor started");
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Get socket ID for player
   */
  getSocketId(playerId: string): string | undefined {
    return this.playerSockets.get(playerId);
  }

  /**
   * Get player ID for socket
   */
  getPlayerId(socketId: string): string | undefined {
    return this.socketPlayers.get(socketId);
  }

  /**
   * Check if player is connected
   */
  isConnected(playerId: string): boolean {
    return this.playerSockets.has(playerId);
  }

  /**
   * Get all connected player IDs
   */
  getConnectedPlayers(): string[] {
    return Array.from(this.playerSockets.keys());
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.playerSockets.size;
  }

  /**
   * Get connection stats
   */
  getStats(): {
    activeConnections: number;
    activeSessions: number;
    oldestConnection: number | null;
  } {
    let oldestConnection: number | null = null;

    for (const timestamp of this.lastActivity.values()) {
      if (oldestConnection === null || timestamp < oldestConnection) {
        oldestConnection = timestamp;
      }
    }

    return {
      activeConnections: this.playerSockets.size,
      activeSessions: this.sessionTokens.size,
      oldestConnection,
    };
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  /**
   * Clear all connections (for testing/reset)
   */
  clearAll(): void {
    this.playerSockets.clear();
    this.socketPlayers.clear();
    this.sessionTokens.clear();
    this.lastActivity.clear();
    this.playerNumbers.clear();
    this.playerNames.clear();

    logger.info("CONNECTION", "All connections cleared");
  }
}
