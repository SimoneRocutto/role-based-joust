import { Router, type Request, type Response } from "express";
import { asyncHandler } from "@/middleware/errorHandler";

const router = Router();

/**
 * GET /api/game/modes
 * List all available game modes
 */
router.get(
  "/modes",
  asyncHandler(async (req: Request, res: Response) => {
    // Will be implemented when GameModeFactory is ready
    res.json({
      modes: [],
      message: "Game modes endpoint - to be implemented",
    });
  })
);

/**
 * POST /api/game/create
 * Create a new game lobby
 */
router.post(
  "/create",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      gameId: "temp-game-id",
      message: "Game creation endpoint - to be implemented",
    });
  })
);

/**
 * POST /api/game/start
 * Start the game with selected mode
 */
router.post(
  "/start",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Game start endpoint - to be implemented",
    });
  })
);

/**
 * GET /api/game/state
 * Get current game state
 */
router.get(
  "/state",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      state: "waiting",
      message: "Game state endpoint - to be implemented",
    });
  })
);

export default router;
