import { Router, type Request, type Response } from "express";
import { asyncHandler } from "@/middleware/errorHandler";
import { validate } from "@/middleware/validation";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { Logger } from "@/utils/Logger";

const router = Router();
const logger = Logger.getInstance();

/**
 * GET /api/game/modes
 * List all available game modes
 */
router.get(
  "/modes",
  asyncHandler(async (req: Request, res: Response) => {
    const factory = GameModeFactory.getInstance();
    const modes = factory.getAvailableModes();

    logger.debug("GAME", "Fetched available modes", {
      count: modes.length,
    });

    res.json({
      success: true,
      modes,
    });
  })
);

/**
 * POST /api/game/create
 * Create a new game lobby
 */
router.post(
  "/create",
  validate("gameCreate"),
  asyncHandler(async (req: Request, res: Response) => {
    const { mode, theme } = req.body;
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

    // Create mode instance
    const factory = GameModeFactory.getInstance();
    const gameMode = factory.createMode(mode, theme);

    // Set mode on engine
    gameEngine.setGameMode(gameMode);

    logger.info("GAME", "Game lobby created", {
      mode: gameMode.name,
      theme,
    });

    res.json({
      success: true,
      gameId: "game-1", // TODO: Support multiple concurrent games
      mode: gameMode.getInfo(),
    });
  })
);

/**
 * POST /api/game/start
 * Start the game with players
 */
router.post(
  "/start",
  asyncHandler(async (req: Request, res: Response) => {
    const { players } = req.body;
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

    if (!players || !Array.isArray(players) || players.length === 0) {
      res.status(400).json({
        success: false,
        error: "Players array required",
      });
      return;
    }

    // Start game with players
    gameEngine.startGame(players);

    logger.info("GAME", "Game started", {
      playerCount: players.length,
    });

    res.json({
      success: true,
      gameState: gameEngine.getGameSnapshot(),
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
      state: snapshot,
    });
  })
);

/**
 * POST /api/game/stop
 * Stop/end the current game
 */
router.post(
  "/stop",
  asyncHandler(async (req: Request, res: Response) => {
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

    gameEngine.stopGame();

    logger.info("GAME", "Game stopped by request");

    res.json({
      success: true,
      message: "Game stopped",
    });
  })
);

export default router;
