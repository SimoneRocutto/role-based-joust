import { Router, type Request, type Response } from "express";
import { asyncHandler } from "@/middleware/errorHandler";
import { validate } from "@/middleware/validation";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { Logger } from "@/utils/Logger";

const router = Router();
const logger = Logger.getInstance();
const connectionManager = ConnectionManager.getInstance();

/**
 * GET /api/game/config
 * Get game configuration (including dev mode status)
 */
router.get(
  "/config",
  asyncHandler(async (req: Request, res: Response) => {
    const isDevMode = process.env.NODE_ENV === "development";

    logger.debug("GAME", "Fetched game config", { devMode: isDevMode });

    res.json({
      success: true,
      devMode: isDevMode,
    });
  })
);

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
 * GET /api/game/lobby
 * Get list of players in lobby (connected and waiting)
 */
router.get(
  "/lobby",
  asyncHandler(async (req: Request, res: Response) => {
    const lobbyPlayers = connectionManager.getLobbyPlayers();

    logger.debug("GAME", "Fetched lobby players", {
      count: lobbyPlayers.length,
    });

    res.json({
      success: true,
      players: lobbyPlayers,
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
 * POST /api/game/launch
 * Combined create + start: Creates game mode and immediately starts with lobby players
 *
 * Body params:
 * - mode: Game mode ('classic', 'role-based')
 * - theme: Optional theme name
 * - countdownDuration: Optional countdown duration in seconds (default 10, use 0 to skip)
 */
router.post(
  "/launch",
  asyncHandler(async (req: Request, res: Response) => {
    const { mode, theme, countdownDuration } = req.body;
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

    // Get lobby players
    const lobbyPlayers = connectionManager.getLobbyPlayers();

    if (lobbyPlayers.length < 2) {
      res.status(400).json({
        success: false,
        error: "Need at least 2 players to start",
      });
      return;
    }

    // Create mode instance
    const factory = GameModeFactory.getInstance();
    const gameMode = factory.createMode(mode || "role-based", theme);

    // Set mode on engine
    gameEngine.setGameMode(gameMode);

    // Set countdown duration if provided
    if (typeof countdownDuration === "number") {
      gameEngine.setCountdownDuration(countdownDuration);
    }

    // Convert lobby players to PlayerData format
    const playerData = lobbyPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      socketId: connectionManager.getSocketId(p.id) || "",
    }));

    // Start game (will enter countdown then active)
    gameEngine.startGame(playerData);

    logger.info("GAME", "Game launched", {
      mode: gameMode.name,
      theme,
      countdownDuration: countdownDuration ?? 10,
      playerCount: playerData.length,
    });

    res.json({
      success: true,
      gameId: "game-1",
      mode: gameMode.getInfo(),
      playerCount: playerData.length,
      state: gameEngine.gameState,
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

/**
 * POST /api/game/next-round
 * Start the next round (admin action)
 * Re-assigns roles and starts countdown
 */
router.post(
  "/next-round",
  asyncHandler(async (req: Request, res: Response) => {
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

    const result = gameEngine.startNextRound();

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message,
      });
      return;
    }

    logger.info("GAME", "Next round started by request", {
      round: gameEngine.currentRound,
    });

    res.json({
      success: true,
      round: gameEngine.currentRound,
      totalRounds: gameEngine.currentMode?.roundCount || 1,
    });
  })
);

export default router;
