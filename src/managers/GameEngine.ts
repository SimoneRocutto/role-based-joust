import { BasePlayer } from "@/models/BasePlayer";
import type { PlayerData, MovementData } from "@/types/player.types";
import type { GameMode } from "@/gameModes/GameMode";
import type { GameState, WinCondition } from "@/types/game.types";
import { RoleFactory } from "@/factories/RoleFactory";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";
import { gameConfig } from "@/config/gameConfig";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * GameEngine - Central game loop and state orchestrator
 *
 * Responsibilities:
 * - Tick-based game loop (100ms default)
 * - Player management (creation, sorting by priority)
 * - Game state machine (waiting -> active -> round-ended -> finished)
 * - Delegates game logic to current mode
 * - Routes movement data to players
 * - Manages rounds and match flow
 * - Test mode support (bots, fast-forward)
 */
export class GameEngine {
  // ========== PLAYERS ==========
  players: BasePlayer[] = [];

  // ========== GAME MODE ==========
  currentMode: GameMode | null = null;

  // ========== GAME STATE ==========
  gameState: GameState = "waiting";
  currentRound: number = 0;
  gameTime: number = 0; // Milliseconds since round start

  // ========== TIMING ==========
  readonly tickRate: number;
  private gameLoop: NodeJS.Timeout | null = null;
  private lastTickTime: number = 0;

  // ========== TEST MODE ==========
  testMode: boolean = false;

  constructor() {
    this.tickRate = gameConfig.tick.rate;
    logger.info("ENGINE", "Game engine initialized", {
      tickRate: this.tickRate,
    });
  }

  // ========================================================================
  // MODE MANAGEMENT
  // ========================================================================

  /**
   * Set the game mode
   * Must be called before starting the game
   */
  setGameMode(mode: GameMode): void {
    this.currentMode = mode;
    this.currentMode.onModeSelected(this);

    logger.info("ENGINE", `Game mode set: ${mode.name}`, {
      description: mode.description,
      useRoles: mode.useRoles,
      rounds: mode.roundCount,
    });
  }

  // ========================================================================
  // GAME LIFECYCLE
  // ========================================================================

  /**
   * Start the game with player data
   * Creates players, assigns roles, starts first round
   */
  startGame(playerData: PlayerData[]): void {
    if (!this.currentMode) {
      throw new Error("Game mode must be set before starting");
    }

    // Validate player count (skip in test mode)
    const validation = this.currentMode.validate(
      playerData.length,
      this.testMode
    );
    if (!validation.valid) {
      throw new Error(validation.message || "Invalid player count");
    }

    logger.info("ENGINE", "Starting game", {
      mode: this.currentMode.name,
      playerCount: playerData.length,
    });

    // Get role pool from mode
    const rolePool = this.currentMode.getRolePool(playerData.length);

    // Create players with roles (or BasePlayer if no roles)
    if (rolePool.length > 0) {
      this.players = RoleFactory.getInstance().assignRoles(playerData, {
        pool: rolePool,
      });
    } else {
      // No roles - use BasePlayer
      this.players = playerData.map((data) => new BasePlayer(data));
    }

    // Start first round
    this.currentRound = 1;
    this.startRound();
  }

  /**
   * Start a round
   */
  private startRound(): void {
    logger.info("ENGINE", `Starting round ${this.currentRound}`);

    // Reset game time
    this.gameTime = 0;
    this.lastTickTime = Date.now();

    // Reset all players
    this.players.forEach((player) => {
      player.isAlive = true;
      player.points = 0;
      player.clearStatusEffects(0);
      player.onInit(0);
    });

    // Enable auto-play for bots
    this.players.forEach((player) => {
      if (player.isBot === true) {
        player.enableAutoPlay();
      }
    });

    // Notify mode
    if (this.currentMode) {
      this.currentMode.onRoundStart(this, this.currentRound);
    }

    // Emit round start event
    gameEvents.emitRoundStart({
      roundNumber: this.currentRound,
      totalRounds: this.currentMode?.roundCount || 1,
      gameTime: this.gameTime,
    });

    // Set state and start loop
    this.gameState = "active";
    this.startGameLoop();
  }

  /**
   * Start the game loop (tick every 100ms)
   */
  private startGameLoop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }

    this.gameLoop = setInterval(() => {
      this.tick();
    }, this.tickRate);

    logger.debug("ENGINE", "Game loop started", { tickRate: this.tickRate });
  }

  /**
   * Main game tick
   * Called every tickRate milliseconds
   */
  private tick(): void {
    const now = Date.now();
    const deltaTime = now - this.lastTickTime;
    this.lastTickTime = now;

    // Update game time
    this.gameTime += this.tickRate;

    // Notify mode
    if (this.currentMode) {
      this.currentMode.onTick(this, this.gameTime);
    }

    // Update all players (sorted by priority)
    const sortedPlayers = this.getSortedPlayers();
    for (const player of sortedPlayers) {
      if (player.isAlive) {
        player.onTick(this.gameTime, deltaTime);
      }
    }

    // Emit tick event
    gameEvents.emitGameTick({ gameTime: this.gameTime });

    // Check win condition
    if (this.currentMode) {
      const condition = this.currentMode.checkWinCondition(this);
      if (condition.roundEnded) {
        this.endRound(condition);
      }
    }
  }

  /**
   * End the current round
   */
  private endRound(condition: WinCondition): void {
    logger.info("ENGINE", `Round ${this.currentRound} ended`);

    // Stop game loop
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }

    this.gameState = "round-ended";

    // Notify mode
    if (this.currentMode) {
      this.currentMode.onRoundEnd(this);
    }

    // Emit round end event
    const scores = this.currentMode?.calculateFinalScores(this) || [];
    gameEvents.emitRoundEnd({
      roundNumber: this.currentRound,
      scores,
      gameTime: this.gameTime,
    });

    // Check if game is over
    if (condition.gameEnded) {
      this.endGame();
    } else {
      // Start next round after delay
      this.currentRound++;
      setTimeout(() => {
        if (this.gameState === "round-ended") {
          this.startRound();
        }
      }, 3000); // 3 second break between rounds
    }
  }

  /**
   * End the entire game
   */
  private endGame(): void {
    logger.info("ENGINE", "Game ended");

    this.gameState = "finished";

    // Calculate final scores
    const finalScores = this.currentMode?.calculateFinalScores(this) || [];

    // Notify mode
    if (this.currentMode) {
      this.currentMode.onGameEnd(this);
    }

    // Emit game end event
    gameEvents.emitGameEnd({
      scores: finalScores,
      winner: finalScores[0]?.player || null,
      totalRounds: this.currentRound,
    });

    logger.info("ENGINE", "Final results", {
      winner: finalScores[0]?.player.name,
      scores: finalScores.map((s) => ({
        name: s.player.name,
        score: s.score,
      })),
    });
  }

  /**
   * Stop the game (emergency stop)
   */
  stopGame(): void {
    logger.info("ENGINE", "Game stopped");

    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }

    this.gameState = "finished";
  }

  // ========================================================================
  // PLAYER MANAGEMENT
  // ========================================================================

  /**
   * Get players sorted by priority (highest first)
   */
  getSortedPlayers(): BasePlayer[] {
    return [...this.players].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Find player by ID
   */
  getPlayerById(playerId: string | undefined): BasePlayer | undefined {
    if (playerId === undefined) return undefined;
    return this.players.find((p) => p.id === playerId);
  }

  /**
   * Find player by socket ID
   */
  getPlayerBySocketId(socketId: string): BasePlayer | undefined {
    return this.players.find((p) => p.socketId === socketId);
  }

  /**
   * Route movement data to player
   */
  handlePlayerMovement(playerId: string, movementData: MovementData): void {
    const player = this.getPlayerById(playerId);

    if (!player) {
      logger.warn("ENGINE", `Movement for unknown player: ${playerId}`);
      return;
    }

    if (!player.isAlive) {
      logger.debug(
        "ENGINE",
        `Movement ignored for dead player: ${player.name}`
      );
      return;
    }

    // Update player movement
    player.updateMovement(movementData, this.gameTime);

    // Notify mode
    if (this.currentMode) {
      this.currentMode.onPlayerMove(player, movementData.intensity || 0, this);
    }
  }

  // ========================================================================
  // TEST MODE
  // ========================================================================

  /**
   * Create a test game with bots
   */
  createTestGame(roleNames: string[]): void {
    this.testMode = true;

    const botData: PlayerData[] = roleNames.map((role, i) => ({
      id: `bot-${i}`,
      name: `Bot ${i + 1}`,
      socketId: `socket-bot-${i}`,
      isBot: true,
      behavior: "random",
    }));

    logger.info("ENGINE", "Creating test game with bots", {
      botCount: botData.length,
      roles: roleNames,
    });

    this.startGame(botData);
  }

  /**
   * Fast-forward time (test mode only)
   */
  fastForward(milliseconds: number): void {
    if (!this.testMode) {
      logger.warn("ENGINE", "Fast-forward only available in test mode");
      return;
    }

    logger.info("ENGINE", `Fast-forwarding ${milliseconds}ms`);

    const ticks = Math.floor(milliseconds / this.tickRate);
    for (let i = 0; i < ticks; i++) {
      this.tick();
    }
  }

  // ========================================================================
  // STATE QUERIES
  // ========================================================================

  /**
   * Get current game state snapshot
   */
  getGameSnapshot(): any {
    return {
      gameTime: this.gameTime,
      state: this.gameState,
      currentRound: this.currentRound,
      mode: this.currentMode?.name || null,
      playerCount: this.players.length,
      alivePlayers: this.players.filter((p) => p.isAlive).length,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.constructor.name,
        isAlive: p.isAlive,
        accumulatedDamage: p.accumulatedDamage,
        points: p.points,
        totalPoints: p.totalPoints,
      })),
    };
  }

  /**
   * Check if game is active
   */
  isActive(): boolean {
    return this.gameState === "active";
  }

  /**
   * Check if game is finished
   */
  isFinished(): boolean {
    return this.gameState === "finished";
  }
}
