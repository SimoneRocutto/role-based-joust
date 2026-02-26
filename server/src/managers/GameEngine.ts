import { BasePlayer } from "@/models/BasePlayer";
import type { PlayerData, MovementData } from "@/types/player.types";
import type { GameMode } from "@/gameModes/GameMode";
import type { GameState, WinCondition, ScoreEntry } from "@/types/game.types";
import { RoleFactory } from "@/factories/RoleFactory";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";
import {
  gameConfig,
  restoreMovementConfig,
  saveMovementConfig,
  userPreferences,
} from "@/config/gameConfig";
import { ReadyStateManager } from "@/managers/ReadyStateManager";
import { RoundSetupManager } from "@/managers/RoundSetupManager";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { buildTickPlayerState } from "@/utils/tickPayload";

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
 *
 * Delegates to:
 * - ReadyStateManager: player ready state between rounds
 * - RoundSetupManager: pre-round setup and countdown sequence
 */
export class GameEngine {
  // ========== PLAYERS ==========
  players: BasePlayer[] = [];
  private playerDataCache: PlayerData[] = []; // Cache original player data for role re-assignment

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

  // ========== FINAL SCORES (persisted after game ends for reconnecting clients) ==========
  private _lastFinalScores: ScoreEntry[] = [];

  getLastFinalScores(): ScoreEntry[] {
    return this._lastFinalScores;
  }

  // ========== TEST MODE ==========
  testMode: boolean = false;

  // ========== LAST GAME MODE ==========
  lastModeKey: string = "role-based";

  // ========== MANAGERS ==========
  private readyStateManager = new ReadyStateManager();
  private roundSetupManager = new RoundSetupManager();
  readonly isDevMode: boolean = process.env.NODE_ENV === "development";

  constructor() {
    this.tickRate = gameConfig.tick.rate;

    // Wire up auto-start: when all players are ready, proceed
    this.readyStateManager.onAllReady = () => {
      if (this.gameState === "round-ended") {
        logger.info("ENGINE", "All players ready - auto-starting next round");
        this.startNextRound();
      } else if (this.gameState === "pre-game") {
        logger.info("ENGINE", "All players ready - proceeding from pre-game");
        this.proceedFromPreGame();
      }
    };

    logger.info("ENGINE", "Game engine initialized", {
      tickRate: this.tickRate,
    });
  }

  // ========================================================================
  // MODE MANAGEMENT
  // ========================================================================

  /**
   * Set the countdown duration (in seconds)
   * Use 0 or negative to skip countdown entirely
   */
  setCountdownDuration(seconds: number): void {
    this.roundSetupManager.setCountdownDuration(seconds);
  }

  getCountdownDuration(): number {
    return this.roundSetupManager.getCountdownDuration();
  }

  /**
   * Set the game mode
   * Must be called before starting the game
   */
  setGameMode(mode: GameMode): void {
    // Save current movement config before mode can modify it
    saveMovementConfig();

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
   * Creates players, assigns roles, enters pre-game ready phase
   * @param playerData - Array of player data
   * @param overrideRolePool - Optional role pool to override mode's default (used by createTestGame)
   * @param skipPreGame - If true, skip pre-game phase and go directly to countdown (used by auto-relaunch)
   */
  startGame(playerData: PlayerData[], overrideRolePool?: string[], skipPreGame = false): void {
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

    // Cache player data for role re-assignment in subsequent rounds
    this.playerDataCache = [...playerData];

    // Create players with roles for first round
    this.assignRolesForRound(overrideRolePool);

    // Set first round
    this.currentRound = 1;

    // Emit game start event
    gameEvents.emitGameStart({
      mode: this.lastModeKey,
      totalRounds: this.currentMode?.targetScore ? null : (this.currentMode?.roundCount || 1),
      targetScore: this.currentMode?.targetScore ?? null,
      sensitivity: userPreferences.sensitivity,
    });

    // In test mode, skip everything and start immediately
    if (this.testMode) {
      this.startRound();
    } else if (skipPreGame) {
      // Skip pre-game (auto-relaunch), go directly to countdown
      this.startCountdown();
    } else {
      // Normal flow: enter pre-game ready phase
      this.enterPreGame();
    }
  }

  /**
   * Enter the pre-game ready phase
   * Players must shake/click to ready up before the game starts
   */
  private enterPreGame(): void {
    this.gameState = "pre-game";
    this.resetReadyState();
    // No ready delay for pre-game — players can ready immediately

    logger.info("ENGINE", "Entered pre-game ready phase");
  }

  /**
   * Proceed from pre-game to countdown
   * Called when admin force-starts or when all players are ready
   */
  proceedFromPreGame(): { success: boolean; message?: string } {
    if (this.gameState !== "pre-game") {
      return {
        success: false,
        message: `Cannot proceed from state: ${this.gameState}`,
      };
    }

    logger.info("ENGINE", "Proceeding from pre-game to countdown");
    this.startCountdown();
    return { success: true };
  }

  /**
   * Assign roles to players for the current round
   * Uses cached player data and creates new player instances with roles
   */
  private assignRolesForRound(overrideRolePool?: string[]): void {
    if (!this.currentMode) return;

    // Preserve totalPoints from previous rounds
    const previousTotalPoints = new Map<string, number>();
    for (const player of this.players) {
      previousTotalPoints.set(player.id, player.totalPoints);
    }

    // Get role pool from override or mode
    const rolePool =
      overrideRolePool ??
      this.currentMode.getRolePool(this.playerDataCache.length);

    // Create players with roles (or BasePlayer if no roles)
    if (rolePool.length > 0) {
      this.players = RoleFactory.getInstance().assignRoles(
        this.playerDataCache,
        {
          pool: rolePool,
        }
      );
    } else {
      // No roles - use BasePlayer
      this.players = this.playerDataCache.map((data) => new BasePlayer(data));
    }

    // Restore totalPoints from previous rounds
    for (const player of this.players) {
      const previousTotal = previousTotalPoints.get(player.id);
      if (previousTotal !== undefined) {
        player.totalPoints = previousTotal;
      }
    }

    logger.info("ENGINE", "Roles assigned for round", {
      round: this.currentRound,
      players: this.players.map((p) => ({
        name: p.name,
        role: p.constructor.name,
      })),
    });
  }

  /**
   * Start the pre-game countdown
   * Delegates to RoundSetupManager with the current engine context
   */
  private startCountdown(): void {
    this.roundSetupManager.startCountdown(
      {
        players: this.players,
        currentMode: this.currentMode,
        currentRound: this.currentRound,
        resetReadyState: () => this.resetReadyState(),
        onCountdownComplete: () => this.startRound(),
      },
      (state) => {
        this.gameState = state;
      }
    );
  }

  /**
   * Start a round
   */
  private startRound(): void {
    logger.info("ENGINE", `Starting round ${this.currentRound}`);

    // Reset game time
    this.gameTime = 0;
    this.lastTickTime = Date.now();

    // Let target-based roles set up targets (idempotent — also called in
    // RoundSetupManager for role:assigned emission, but needed here for test mode
    // which skips countdown)
    this.players.forEach((player) => {
      player.onPreRoundSetup(this.players);
    });

    // Initialize players for the round (basic reset already done in startCountdown)
    this.players.forEach((player) => {
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
      totalRounds: this.currentMode?.targetScore ? null : (this.currentMode?.roundCount || 1),
      gameTime: this.gameTime,
      gameEvents: this.currentMode?.getGameEvents() || [],
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
    // Only process ticks when game is active
    if (this.gameState !== "active") {
      return;
    }

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

    // Emit tick event with player states (including connection status)
    gameEvents.emitGameTick({
      gameTime: this.gameTime,
      roundTimeRemaining: this.currentMode?.roundDuration
        ? Math.max(0, this.currentMode.roundDuration - this.gameTime)
        : null,
      players: this.players.map((p) =>
        buildTickPlayerState(p, this.gameTime, this.currentMode)
      ),
    });

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

    // Clean up round-scoped event listeners (roles, modes)
    gameEvents.clearRoundListeners();

    // Reset ready state so between-rounds screen starts at 0/N
    this.resetReadyState();

    // Start ready delay (disabled for a few seconds after round end)
    this.readyStateManager.startReadyDelay(this.testMode);

    // Notify mode; it may signal game end (e.g. team target score reached)
    let shouldEndGame = condition.gameEnded;
    if (this.currentMode) {
      const roundEndResult = this.currentMode.onRoundEnd(this);
      if (roundEndResult && roundEndResult.gameEnded) {
        shouldEndGame = true;
      }
    }

    // Emit round end event with winner ID
    const scores = this.currentMode?.calculateFinalScores(this) || [];
    // Winner is the first player in scores (sorted by totalPoints descending)
    const winnerId = scores.length > 0 ? scores[0].player.id : null;
    gameEvents.emitRoundEnd({
      roundNumber: this.currentRound,
      scores,
      gameTime: this.gameTime,
      winnerId,
    });

    // Check if game is over
    if (shouldEndGame) {
      this.endGame();
    } else if (this.testMode) {
      // In test mode, auto-advance to next round for automated testing
      this.currentRound++;
      this.assignRolesForRound();
      this.startRound();
    }
    // In normal mode, wait for manual startNextRound() call
  }

  /**
   * Start the next round (called by admin/API)
   * Re-assigns roles and starts countdown before round begins
   */
  startNextRound(): { success: boolean; message?: string } {
    if (this.gameState !== "round-ended") {
      return {
        success: false,
        message: `Cannot start next round from state: ${this.gameState}`,
      };
    }

    if (!this.currentMode) {
      return { success: false, message: "No game mode set" };
    }

    // Target score modes allow unlimited rounds; only enforce round limit for fixed-round modes
    if (!this.currentMode.targetScore) {
      const totalRounds = this.currentMode.roundCount;
      if (this.currentRound >= totalRounds) {
        return {
          success: false,
          message: "All rounds completed",
        };
      }
    }

    // Advance to next round
    this.currentRound++;

    logger.info("ENGINE", `Starting next round: ${this.currentRound}`);

    // Re-assign roles for the new round
    this.assignRolesForRound();

    // Start countdown (which will emit role assignments and then start the round)
    this.startCountdown();

    return { success: true };
  }

  /**
   * End the entire game
   */
  private endGame(): void {
    logger.info("ENGINE", "Game ended");

    this.gameState = "finished";

    // Clean up round-scoped event listeners (roles, modes)
    gameEvents.clearRoundListeners();

    // Reset ready state so winner screen starts at 0/N
    this.resetReadyState();

    // Calculate final scores
    const finalScores = this.currentMode?.calculateFinalScores(this) || [];
    this._lastFinalScores = finalScores;

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

    this.roundSetupManager.cancel();
    this.readyStateManager.cleanup();

    // Clean up round-scoped event listeners (roles, modes)
    gameEvents.clearRoundListeners();

    this.gameState = "waiting";
    this.players = [];
    this.playerDataCache = [];
    this._lastFinalScores = [];
    this.currentRound = 0;
    this.gameTime = 0;

    // Restore movement config to what user had before game started
    restoreMovementConfig();
    this.roundSetupManager.setCountdownDuration(gameConfig.countdown.defaultDurationSeconds);

    // Notify clients that game was stopped
    gameEvents.emitGameStopped();
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
  // CONNECTION HANDLING
  // ========================================================================

  /**
   * Handle player disconnection during active game
   */
  handlePlayerDisconnect(playerId: string): void {
    if (!this.isActive()) return;

    const player = this.getPlayerById(playerId);
    if (!player || !player.isAlive) return;

    player.setDisconnected(this.gameTime);

    logger.info("ENGINE", `Player ${player.name} disconnected during game`, {
      playerId,
      gameTime: this.gameTime,
      gracePeriod: BasePlayer.DISCONNECTION_GRACE_PERIOD,
    });
  }

  /**
   * Handle player reconnection during active game
   */
  handlePlayerReconnect(playerId: string, newSocketId: string): void {
    const player = this.getPlayerById(playerId);
    if (!player) return;

    // Update the socket ID in the player object
    player.setReconnected(newSocketId);

    logger.info("ENGINE", `Player ${player.name} reconnected to game`, {
      playerId,
      newSocketId,
    });
  }

  /**
   * Get players who are effectively "out" (dead or disconnected beyond grace period)
   */
  getEffectivelyOutPlayers(): BasePlayer[] {
    return this.players.filter(
      (p) => !p.isAlive || p.isDisconnectedBeyondGrace(this.gameTime)
    );
  }

  /**
   * Get players who are effectively "alive" (alive and connected or within grace period)
   */
  getEffectivelyAlivePlayers(): BasePlayer[] {
    return this.players.filter(
      (p) => p.isAlive && !p.isDisconnectedBeyondGrace(this.gameTime)
    );
  }

  // ========================================================================
  // READY STATE (delegates to ReadyStateManager)
  // ========================================================================

  isReadyEnabled(): boolean {
    return this.readyStateManager.isReadyEnabled();
  }

  setPlayerReady(playerId: string, isReady: boolean): boolean {
    const player = this.getPlayerById(playerId);
    if (!player) {
      logger.warn(
        "ENGINE",
        `Cannot set ready state for unknown player: ${playerId}`
      );
      return false;
    }
    return this.readyStateManager.setPlayerReady(
      playerId,
      player.name,
      isReady,
      this.players
    );
  }

  getReadyCount(): { ready: number; total: number } {
    return this.readyStateManager.getReadyCount(this.players);
  }

  areAllPlayersReady(): boolean {
    return this.readyStateManager.areAllPlayersReady(this.players);
  }

  resetReadyState(): void {
    this.readyStateManager.resetReadyState();
  }

  getPlayerReady(playerId: string): boolean {
    return this.readyStateManager.getPlayerReady(playerId);
  }

  // ========================================================================
  // TEST MODE
  // ========================================================================

  /**
   * Create a test game with bots
   * @param roleNames - Specific roles to assign to each bot
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

    // Register bots in ConnectionManager so they get sequential player numbers
    // (displayed as #1, #2, etc. in the leaderboard and player cards)
    const connectionManager = ConnectionManager.getInstance();
    botData.forEach((bot) => {
      connectionManager.registerConnection(bot.id, bot.socketId!, bot.name, false);
    });

    // Pass roleNames as the role pool override to ensure exact role assignment
    this.startGame(botData, roleNames);
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
      roundCount: this.currentMode?.roundCount || 1,
      targetScore: this.currentMode?.targetScore ?? null,
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
