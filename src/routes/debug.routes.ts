import {
  Router as DebugRouter,
  type Request as DebugRequest,
  type Response as DebugResponse,
} from "express";
import { asyncHandler as debugAsyncHandler } from "@/middleware/errorHandler";

const debugRouter = DebugRouter();

/**
 * GET /api/debug/state
 * Get full game snapshot for debugging
 */
debugRouter.get(
  "/state",
  debugAsyncHandler(async (req: DebugRequest, res: DebugResponse) => {
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({ error: "Game engine not initialized" });
      return;
    }

    res.json({
      gameTime: gameEngine.gameTime,
      state: gameEngine.gameState,
      currentRound: gameEngine.currentRound,
      playerCount: gameEngine.players.length,
      message: "Debug state endpoint - partial implementation",
    });
  })
);

/**
 * POST /api/debug/bot/:botId/command
 * Send command to a bot player
 */
debugRouter.post(
  "/bot/:botId/command",
  debugAsyncHandler(async (req: DebugRequest, res: DebugResponse) => {
    res.json({
      success: true,
      message: "Bot command endpoint - to be implemented",
    });
  })
);

/**
 * POST /api/debug/fastforward
 * Fast-forward game time (test mode only)
 */
debugRouter.post(
  "/fastforward",
  debugAsyncHandler(async (req: DebugRequest, res: DebugResponse) => {
    res.json({
      success: true,
      message: "Fast-forward endpoint - to be implemented",
    });
  })
);

/**
 * GET /api/debug/logs
 * Query game logs
 */
debugRouter.get(
  "/logs",
  debugAsyncHandler(async (req: DebugRequest, res: DebugResponse) => {
    res.json({
      logs: [],
      message: "Logs endpoint - to be implemented",
    });
  })
);

/**
 * POST /api/debug/logs/export
 * Export logs to file
 */
debugRouter.post(
  "/logs/export",
  debugAsyncHandler(async (req: DebugRequest, res: DebugResponse) => {
    res.json({
      success: true,
      message: "Log export endpoint - to be implemented",
    });
  })
);

export default debugRouter;
