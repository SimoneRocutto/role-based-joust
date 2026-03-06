import { Router, type Request, type Response } from "express";
import { asyncHandler } from "@/middleware/errorHandler";
import { GameEngine } from "@/managers/GameEngine";
import { Logger } from "@/utils/Logger";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { resetMovementConfig, gameConfig } from "@/config/gameConfig";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { TeamManager } from "@/managers/TeamManager";
import { BaseManager } from "@/managers/BaseManager";
import type { BotAction } from "@/types/bot.types";
import { broadcastLobbyUpdate } from "@/sockets/helpers";
import type { Server as SocketIOServer } from "socket.io";

const router = Router();
const logger = Logger.getInstance();

/**
 * GET /api/debug/state
 * Get full game snapshot for debugging
 */
router.get(
  "/state",
  asyncHandler(async (req: Request, res: Response) => {
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    const snapshot = gameEngine.getGameSnapshot();

    res.json({
      success: true,
      snapshot,
      debug: {
        testMode: gameEngine.testMode,
        tickRate: gameEngine.tickRate,
        isActive: gameEngine.isActive(),
        isFinished: gameEngine.isFinished(),
      },
    });
  })
);

/**
 * POST /api/debug/bot/:botId/command
 * Send command to a bot player
 */
router.post(
  "/bot/:botId/command",
  asyncHandler(async (req: Request, res: Response) => {
    const { botId } = req.params;
    const { action, args } = req.body;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    const bot = gameEngine.getPlayerById(botId);

    if (!bot || bot.isBot === false) {
      res.status(404).json({
        success: false,
        error: "Bot not found",
      });
      return;
    }

    // Execute bot action
    bot.triggerAction(
      action as BotAction,
      gameEngine.gameTime,
      ...(args || [])
    );

    logger.info("DEBUG", `Bot ${botId} executed ${action}`);

    res.json({
      success: true,
      botId,
      action,
      state: bot.getBotState(),
    });
  })
);

/**
 * POST /api/debug/fastforward
 * Fast-forward game time.
 * Works in both test mode and normal debug mode (UI-launched games).
 * Already gated behind /api/debug/ which requires NODE_ENV=development.
 */
router.post(
  "/fastforward",
  asyncHandler(async (req: Request, res: Response) => {
    const { milliseconds } = req.body;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    if (!milliseconds || typeof milliseconds !== "number") {
      res.status(400).json({
        success: false,
        error: "Milliseconds parameter required",
      });
      return;
    }

    gameEngine.fastForward(milliseconds);

    logger.info("DEBUG", `Fast-forwarded ${milliseconds}ms`);

    res.json({
      success: true,
      fastForwarded: milliseconds,
      newGameTime: gameEngine.gameTime,
    });
  })
);

/**
 * GET /api/debug/logs
 * Query game logs with filters
 */
router.get(
  "/logs",
  asyncHandler(async (req: Request, res: Response) => {
    const { level, category, playerId, since, limit } = req.query;
    const logger = Logger.getInstance();

    const filter: any = {};

    if (level) filter.level = level;
    if (category) filter.category = category;
    if (playerId) filter.playerId = playerId;
    if (since) filter.since = parseInt(since as string, 10);

    const allLogs = logger.getLogs(filter);
    const limitNum = limit ? parseInt(limit as string, 10) : 100;
    const logs = allLogs.slice(-limitNum);

    res.json({
      success: true,
      logs,
      total: allLogs.length,
      showing: logs.length,
      filter,
    });
  })
);

/**
 * POST /api/debug/logs/export
 * Export logs to file
 */
router.post(
  "/logs/export",
  asyncHandler(async (req: Request, res: Response) => {
    const { filename } = req.body;
    const logger = Logger.getInstance();

    const exportFilename = filename || `game-logs-${Date.now()}.json`;
    logger.exportLogs(exportFilename);

    res.json({
      success: true,
      filename: exportFilename,
      message: "Logs exported successfully",
    });
  })
);

/**
 * POST /api/debug/logs/clear
 * Clear all logs
 */
router.post(
  "/logs/clear",
  asyncHandler(async (req: Request, res: Response) => {
    const logger = Logger.getInstance();
    logger.clear();

    res.json({
      success: true,
      message: "Logs cleared",
    });
  })
);

/**
 * GET /api/debug/logs/summary
 * Get log summary statistics
 */
router.get(
  "/logs/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const logger = Logger.getInstance();
    const summary = logger.generateSummary();

    res.json({
      success: true,
      summary,
    });
  })
);

/**
 * POST /api/debug/test/create
 * Create a test game with bots
 */
router.post(
  "/test/create",
  asyncHandler(async (req: Request, res: Response) => {
    const { roles, mode, teams, teamCount, bases, botCount, botBehavior, includeConnected } =
      req.body;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    // Determine bot count: either from explicit roles array or botCount
    const effectiveBotCount = Array.isArray(roles) ? roles.length : Math.max(1, botCount ?? 3);
    // Only use roles as override pool if explicitly provided with actual role names.
    // When botCount is used without roles, pass undefined so the mode's getRolePool() decides.
    const explicitRoles: string[] | undefined = Array.isArray(roles) ? roles : undefined;

    // Set game mode if not already set (or if explicitly provided)
    if (!gameEngine.currentMode || mode) {
      const factory = GameModeFactory.getInstance();
      const gameMode = factory.createMode(mode || "classic");
      gameEngine.setGameMode(gameMode);
      gameEngine.lastModeKey = mode || "classic";
    }

    // Configure teams if requested
    const teamManager = TeamManager.getInstance();
    if (teams) {
      teamManager.configure(true, teamCount ?? 2);
    } else {
      teamManager.configure(false, 2);
    }

    // Collect real connected player IDs if requested
    const realPlayerIds: string[] = includeConnected
      ? ConnectionManager.getInstance().getConnectedPlayers()
      : [];

    gameEngine.createTestGame(effectiveBotCount, {
      behavior: botBehavior ?? "random",
      realPlayerIds,
      rolePool: explicitRoles,
    });

    // Assign bots to teams after game creation (bot IDs are bot-0, bot-1, ...)
    if (teams) {
      const botIds = Array.from({ length: effectiveBotCount }, (_, i) => `bot-${i}`);
      teamManager.assignSequential(botIds);
    }

    // Register simulated bases for domination mode testing
    const baseCount = typeof bases === "number" ? bases : 0;
    if (baseCount > 0) {
      const baseManager = BaseManager.getInstance();
      const resolvedTeamCount = teamCount ?? 2;
      for (let i = 0; i < baseCount; i++) {
        const { baseId } = baseManager.registerBase(`debug-base-socket-${i}`);
        // Distribute bases across teams (base 0 → team 0, base 1 → team 1, ...)
        const teamId = teams ? i % resolvedTeamCount : 0;
        baseManager.setOwner(baseId, teamId, 0);
        logger.info("DEBUG", `Registered simulated base ${i + 1} owned by team ${teamId}`);
      }
    }

    logger.info("DEBUG", "Test game created", {
      botCount: effectiveBotCount,
      realPlayers: realPlayerIds.length,
      behavior: botBehavior ?? "random",
      bases: baseCount,
    });

    res.json({
      success: true,
      message: "Test game created",
      snapshot: gameEngine.getGameSnapshot(),
    });
  })
);

/**
 * POST /api/debug/player/:playerId/damage
 * Apply partial damage to a player (works on any player, not just bots).
 * Body: { amount: number } — damage amount (default 50, i.e. ~half HP).
 * Used by screenshot scripts to capture mid-HP states (background color gradient).
 */
router.post(
  "/player/:playerId/damage",
  asyncHandler(async (req: Request, res: Response) => {
    const { playerId } = req.params;
    const { amount = 50 } = req.body;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    if (!gameEngine.isActive()) {
      res.status(400).json({ success: false, error: "Game is not active" });
      return;
    }

    const player = gameEngine.getPlayerById(playerId);
    if (!player) {
      res.status(404).json({ success: false, error: "Player not found" });
      return;
    }
    if (!player.isAlive) {
      res.status(400).json({ success: false, error: "Player is already dead" });
      return;
    }

    const hpBefore = player.hp;
    player.takeDamage(amount, gameEngine.gameTime);

    logger.info("DEBUG", `Damaged player ${playerId} by ${amount} (${hpBefore} -> ${player.hp})`);

    res.json({
      success: true,
      playerId,
      playerName: player.name,
      hpBefore,
      hpAfter: player.hp,
      isAlive: player.isAlive,
    });
  })
);

/**
 * POST /api/debug/player/:playerId/kill
 * Kill a player for E2E testing (works on any player, not just bots)
 */
router.post(
  "/player/:playerId/kill",
  asyncHandler(async (req: Request, res: Response) => {
    const { playerId } = req.params;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    if (!gameEngine.isActive()) {
      res.status(400).json({
        success: false,
        error: "Game is not active",
      });
      return;
    }

    const player = gameEngine.getPlayerById(playerId);

    if (!player) {
      res.status(404).json({
        success: false,
        error: "Player not found",
      });
      return;
    }

    if (!player.isAlive) {
      res.status(400).json({
        success: false,
        error: "Player is already dead",
      });
      return;
    }

    // Kill the player with massive damage
    player.takeDamage(10000, gameEngine.gameTime);

    logger.info("DEBUG", `Killed player ${playerId} for E2E testing`);

    res.json({
      success: true,
      playerId,
      playerName: player.name,
      isAlive: player.isAlive,
    });
  })
);

/**
 * POST /api/debug/reset
 * Reset server state for E2E testing
 * Clears all connections and stops any running game
 */
router.post(
  "/reset",
  asyncHandler(async (req: Request, res: Response) => {
    const gameEngine: GameEngine = req.app.locals.gameEngine;
    const connectionManager = ConnectionManager.getInstance();

    // Stop any in-progress game (everything except "waiting" means there's a game to stop)
    if (gameEngine.gameState !== "waiting") {
      gameEngine.stopGame();
      logger.info("DEBUG", "Stopped game for reset");
    }

    // Reset countdown duration to default
    gameEngine.setCountdownDuration(gameConfig.countdown.defaultDurationSeconds);

    // Reset movement settings to defaults (and flush persisted overrides)
    resetMovementConfig();

    // Clear all connections
    connectionManager.clearAll();
    logger.info("DEBUG", "Cleared all connections for reset");

    // Clear all bases (domination mode)
    BaseManager.getInstance().reset();
    logger.info("DEBUG", "Cleared all bases for reset");

    // Clear all team assignments and match points
    TeamManager.getInstance().reset();
    logger.info("DEBUG", "Reset team state for reset");

    res.json({
      success: true,
      message: "Server state reset",
    });
  })
);

/**
 * POST /api/debug/set-countdown
 * Set countdown duration in seconds (0 = skip countdown entirely).
 * Useful in click-through audit scripts where the game is not in test mode
 * and fastforward is unavailable.
 *
 * Body: { seconds: number }
 */
router.post(
  "/set-countdown",
  asyncHandler(async (req: Request, res: Response) => {
    const { seconds } = req.body;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    if (typeof seconds !== "number") {
      res.status(400).json({ success: false, error: "seconds (number) required" });
      return;
    }

    gameEngine.setCountdownDuration(seconds);
    logger.info("DEBUG", `Countdown duration set to ${seconds}s`);

    res.json({ success: true, seconds });
  })
);

/**
 * POST /api/debug/spawn-lobby-players
 * Register fake players in the lobby (no real browser/socket needed).
 * These players appear in the dashboard lobby list and are included when
 * test/create runs with includeConnected:true. Cleaned up by debug/reset.
 *
 * Body: { count?: number, names?: string[] }
 */
router.post(
  "/spawn-lobby-players",
  asyncHandler(async (req: Request, res: Response) => {
    const { count: rawCount = 1, names } = req.body;
    const count = Math.min(Math.max(1, rawCount), 20);
    const connectionManager = ConnectionManager.getInstance();
    const io: SocketIOServer = req.app.locals.io;

    const spawned: { id: string; name: string }[] = [];
    for (let i = 0; i < count; i++) {
      const id = `lobby-player-${Date.now()}-${i}`;
      const socketId = `fake-socket-${id}`;
      const name =
        names?.[i] ??
        `Player ${connectionManager.getConnectionCount() + 1}`;
      connectionManager.registerConnection(id, socketId, name, false);
      spawned.push({ id, name });
    }

    broadcastLobbyUpdate(io);

    logger.info("DEBUG", `Spawned ${spawned.length} lobby player(s)`, { spawned });

    res.json({ success: true, spawned });
  })
);

/**
 * POST /api/debug/spawn-bots
 * Register bot players in the lobby without starting a game.
 * Bots appear in the dashboard lobby and are included when the game is
 * launched via the normal "Start Game" button (POST /api/game/launch).
 * After game start, they are marked as bots with auto-play enabled.
 *
 * Body: { count?: number, behavior?: string }
 * - count: number of bots to spawn (default 3, max 20)
 * - behavior: "still" | "random" | "shake" (default "still")
 */
router.post(
  "/spawn-bots",
  asyncHandler(async (req: Request, res: Response) => {
    const { count: rawCount = 3, behavior = "still" } = req.body;
    const count = Math.min(Math.max(1, rawCount), 20);
    const connectionManager = ConnectionManager.getInstance();
    const io: SocketIOServer = req.app.locals.io;

    const spawned: { id: string; name: string }[] = [];
    for (let i = 0; i < count; i++) {
      const id = `bot-${i}`;
      const socketId = `socket-bot-${i}`;
      const name = `Bot ${i + 1}`;
      connectionManager.registerConnection(id, socketId, name, false);
      connectionManager.registerBot(id, behavior);
      spawned.push({ id, name });
    }

    broadcastLobbyUpdate(io);

    logger.info("DEBUG", `Spawned ${spawned.length} bot(s) in lobby`, {
      spawned,
      behavior,
    });

    res.json({ success: true, spawned, behavior });
  })
);

/**
 * POST /api/debug/spawn-bases
 * Register simulated bases for domination mode testing.
 * Each base is assigned to a team in round-robin order.
 *
 * Body: { count?: number, teamCount?: number }
 */
router.post(
  "/spawn-bases",
  asyncHandler(async (req: Request, res: Response) => {
    const { count: rawCount = 2, teamCount = 2 } = req.body;
    const count = Math.min(Math.max(1, rawCount), 10);
    const baseManager = BaseManager.getInstance();

    const io: SocketIOServer = req.app.locals.io;
    const spawned: { baseId: string; baseNumber: number; teamId: number }[] = [];
    for (let i = 0; i < count; i++) {
      const { baseId, baseNumber } = baseManager.registerBase(`debug-base-socket-${Date.now()}-${i}`);
      const teamId = i % teamCount;
      baseManager.setOwner(baseId, teamId, 0);
      spawned.push({ baseId, baseNumber, teamId });
    }

    // Broadcast base:status so the dashboard picks up the new bases
    const bases = baseManager.getAllBases().map((base) => ({
      baseId: base.baseId,
      baseNumber: base.baseNumber,
      ownerTeamId: base.ownerTeamId,
      controlProgress: 0,
      isConnected: base.isConnected,
    }));
    const resolvedTeamCount = TeamManager.getInstance().getTeamCount();
    io.emit("base:status", { bases, teamCount: resolvedTeamCount });

    logger.info("DEBUG", `Spawned ${count} simulated base(s)`, { spawned });

    res.json({ success: true, spawned });
  })
);

/**
 * POST /api/debug/base/:baseId/capture
 * Capture a base for a team during active gameplay (domination mode).
 * Body: { teamId: number }
 */
router.post(
  "/base/:baseId/capture",
  asyncHandler(async (req: Request, res: Response) => {
    const { baseId } = req.params;
    const { teamId } = req.body;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    if (!gameEngine.isActive()) {
      res.status(400).json({ success: false, error: "Game is not active" });
      return;
    }

    if (typeof teamId !== "number") {
      res.status(400).json({ success: false, error: "teamId (number) required" });
      return;
    }

    if (!gameEngine.currentMode) {
      res.status(400).json({ success: false, error: "No game mode active" });
      return;
    }

    gameEngine.currentMode.onBaseTap(baseId, gameEngine, teamId);

    logger.info("DEBUG", `Captured base ${baseId} for team ${teamId}`);

    res.json({ success: true, baseId, teamId });
  })
);

export default router;
