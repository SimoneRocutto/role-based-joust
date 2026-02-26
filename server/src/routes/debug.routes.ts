import { Router, type Request, type Response } from "express";
import { asyncHandler } from "@/middleware/errorHandler";
import { GameEngine } from "@/managers/GameEngine";
import { Logger } from "@/utils/Logger";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { resetMovementConfig } from "@/config/gameConfig";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { TeamManager } from "@/managers/TeamManager";
import { BaseManager } from "@/managers/BaseManager";
import type { BotAction } from "@/types/bot.types";

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
 * Fast-forward game time (test mode only)
 */
router.post(
  "/fastforward",
  asyncHandler(async (req: Request, res: Response) => {
    const { milliseconds } = req.body;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    if (!gameEngine.testMode) {
      res.status(400).json({
        success: false,
        error: "Fast-forward only available in test mode",
      });
      return;
    }

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
    const { roles, mode, teams, teamCount, bases } = req.body;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    if (!roles || !Array.isArray(roles)) {
      res.status(400).json({
        success: false,
        error: "Roles array required",
      });
      return;
    }

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

    gameEngine.createTestGame(roles);

    // Assign bots to teams after game creation (bot IDs are bot-0, bot-1, ...)
    if (teams) {
      const botIds = roles.map((_: string, i: number) => `bot-${i}`);
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
      roles,
      botCount: roles.length,
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

    // Stop any running or finished game (clears players and resets state)
    if (gameEngine.isActive() || gameEngine.isFinished()) {
      gameEngine.stopGame();
      logger.info("DEBUG", "Stopped game for reset");
    }

    // Reset countdown duration to default (10 seconds)
    gameEngine.setCountdownDuration(10);

    // Reset movement settings to defaults (and flush persisted overrides)
    resetMovementConfig();

    // Clear all connections
    connectionManager.clearAll();
    logger.info("DEBUG", "Cleared all connections for reset");

    // Clear all bases (domination mode)
    BaseManager.getInstance().reset();
    logger.info("DEBUG", "Cleared all bases for reset");

    res.json({
      success: true,
      message: "Server state reset",
    });
  })
);

export default router;
