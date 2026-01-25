import { Router, type Request, type Response } from "express";
import { asyncHandler } from "@/middleware/errorHandler";
import { Logger } from "@/utils/Logger";
import { ConnectionManager } from "@/managers/ConnectionManager";
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
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

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
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

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
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

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
    const { roles } = req.body;
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

    if (!roles || !Array.isArray(roles)) {
      res.status(400).json({
        success: false,
        error: "Roles array required",
      });
      return;
    }

    gameEngine.createTestGame(roles);

    logger.info("DEBUG", "Test game created", {
      roles,
      botCount: roles.length,
    });

    res.json({
      success: true,
      message: "Test game created",
      snapshot: gameEngine.getGameSnapshot(),
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
    const { gameEngine } = global;
    const connectionManager = ConnectionManager.getInstance();

    // Stop any running game
    if (gameEngine && gameEngine.isActive()) {
      gameEngine.stopGame();
      logger.info("DEBUG", "Stopped active game for reset");
    }

    // Clear all connections
    connectionManager.clearAll();
    logger.info("DEBUG", "Cleared all connections for reset");

    res.json({
      success: true,
      message: "Server state reset",
    });
  })
);

export default router;
