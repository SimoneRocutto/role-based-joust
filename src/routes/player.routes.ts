import {
  Router as PlayerRouter,
  type Request as PlayerRequest,
  type Response as PlayerResponse,
} from "express";
import { asyncHandler as playerAsyncHandler } from "@/middleware/errorHandler";

const playerRouter = PlayerRouter();

/**
 * POST /api/player/move
 * Submit movement data
 */
playerRouter.post(
  "/move",
  playerAsyncHandler(async (req: PlayerRequest, res: PlayerResponse) => {
    res.json({
      success: true,
      message: "Player movement endpoint - to be implemented",
    });
  })
);

/**
 * GET /api/player/role
 * Get assigned role information
 */
playerRouter.get(
  "/role",
  playerAsyncHandler(async (req: PlayerRequest, res: PlayerResponse) => {
    res.json({
      role: null,
      message: "Player role endpoint - to be implemented",
    });
  })
);

/**
 * POST /api/player/reconnect
 * Reconnect to game with session token
 */
playerRouter.post(
  "/reconnect",
  playerAsyncHandler(async (req: PlayerRequest, res: PlayerResponse) => {
    res.json({
      success: true,
      message: "Player reconnect endpoint - to be implemented",
    });
  })
);

export default playerRouter;
