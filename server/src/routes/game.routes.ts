import { Router, type Request, type Response } from "express";
import { asyncHandler } from "@/middleware/errorHandler";
import { validate } from "@/middleware/validation";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { Logger } from "@/utils/Logger";
import {
  gameConfig,
  sensitivityPresets,
  updateMovementConfig,
  setSensitivityPreset,
  setGameModePreference,
  setThemePreference,
  setRoundCountPreference,
  setRoundDurationPreference,
  userPreferences,
} from "@/config/gameConfig";
import { getAvailableThemes, themeExists } from "@/config/roleThemes";

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
 * - mode: Game mode ('classic', 'role-based') — defaults to persisted preference
 * - theme: Theme name — defaults to persisted preference
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

    // Use persisted preferences as defaults
    const effectiveMode = mode || userPreferences.gameMode;
    const effectiveTheme = theme || userPreferences.theme;
    const effectiveRoundCount = userPreferences.roundCount;

    // Create mode instance with options
    const factory = GameModeFactory.getInstance();
    const modeOptions: Record<string, any> = { roundCount: effectiveRoundCount };
    if (effectiveMode === "role-based") {
      modeOptions.theme = effectiveTheme;
    }
    // Pass roundDuration in ms for timed modes
    modeOptions.roundDuration = userPreferences.roundDuration * 1000;
    const gameMode = factory.createMode(effectiveMode, modeOptions);

    // Set mode on engine
    gameEngine.setGameMode(gameMode);
    gameEngine.lastModeKey = effectiveMode;

    // Set countdown duration if provided
    if (typeof countdownDuration === "number") {
      gameEngine.setCountdownDuration(countdownDuration);
    }

    // Clear lobby ready states so they don't carry into finished state
    connectionManager.resetAllReadyState();

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
      theme: effectiveTheme,
      countdownDuration: countdownDuration ?? 10,
      playerCount: playerData.length,
    });

    res.json({
      success: true,
      gameId: "game-1",
      mode: gameMode.getInfo(),
      theme: effectiveTheme,
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
    connectionManager.resetAllReadyState();

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

/**
 * GET /api/game/settings
 * Get current settings including sensitivity, mode, theme, roundCount, and available presets
 */
router.get(
  "/settings",
  asyncHandler(async (req: Request, res: Response) => {
    const factory = GameModeFactory.getInstance();

    res.json({
      success: true,
      // Current preferences
      sensitivity: userPreferences.sensitivity,
      gameMode: userPreferences.gameMode,
      theme: userPreferences.theme,
      roundCount: userPreferences.roundCount,
      roundDuration: userPreferences.roundDuration,
      // Movement details
      movement: {
        dangerThreshold: gameConfig.movement.dangerThreshold,
        damageMultiplier: gameConfig.movement.damageMultiplier,
        oneshotMode: gameConfig.movement.oneshotMode,
      },
      // Available options
      presets: sensitivityPresets,
      modes: factory.getAvailableModes(),
      themes: getAvailableThemes(),
    });
  })
);

/**
 * POST /api/game/settings
 * Update game settings (sensitivity, mode, theme, roundCount)
 * Body:
 * - sensitivity: string (preset name like "low", "medium", "high", "extreme", "oneshot")
 * - gameMode: string (e.g., "classic", "role-based")
 * - theme: string (e.g., "standard", "halloween")
 * - roundCount: number (1-10)
 * - dangerThreshold, damageMultiplier: numbers (for custom sensitivity)
 *
 * All fields are optional. Only provided fields are updated.
 */
router.post(
  "/settings",
  validate("gameSettings"),
  asyncHandler(async (req: Request, res: Response) => {
    const { sensitivity, gameMode, theme, roundCount, roundDuration, dangerThreshold, damageMultiplier } =
      req.body;
    const updates: string[] = [];

    // Update sensitivity preset
    if (sensitivity) {
      if (!setSensitivityPreset(sensitivity)) {
        res.status(400).json({
          success: false,
          error: `Unknown sensitivity preset: ${sensitivity}. Available: ${sensitivityPresets
            .map((p) => p.key)
            .join(", ")}`,
        });
        return;
      }
      updates.push(`sensitivity=${sensitivity}`);
    }

    // Update game mode preference
    if (gameMode) {
      const factory = GameModeFactory.getInstance();
      const availableModes = factory.getAvailableModes().map((m) => m.key);
      if (!availableModes.includes(gameMode)) {
        res.status(400).json({
          success: false,
          error: `Unknown game mode: ${gameMode}. Available: ${availableModes.join(", ")}`,
        });
        return;
      }
      setGameModePreference(gameMode);
      updates.push(`gameMode=${gameMode}`);
    }

    // Update theme preference
    if (theme) {
      if (!themeExists(theme)) {
        const availableThemes = getAvailableThemes();
        res.status(400).json({
          success: false,
          error: `Unknown theme: ${theme}. Available: ${availableThemes.join(", ")}`,
        });
        return;
      }
      setThemePreference(theme);
      updates.push(`theme=${theme}`);
    }

    // Update round count preference
    if (roundCount !== undefined) {
      if (typeof roundCount !== "number" || roundCount < 1 || roundCount > 10) {
        res.status(400).json({
          success: false,
          error: "roundCount must be a number between 1 and 10",
        });
        return;
      }
      setRoundCountPreference(roundCount);
      updates.push(`roundCount=${roundCount}`);
    }

    // Update round duration preference
    if (roundDuration !== undefined) {
      if (typeof roundDuration !== "number" || roundDuration < 30 || roundDuration > 300) {
        res.status(400).json({
          success: false,
          error: "roundDuration must be a number between 30 and 300",
        });
        return;
      }
      setRoundDurationPreference(roundDuration);
      updates.push(`roundDuration=${roundDuration}`);
    }

    // Custom sensitivity values (overrides preset)
    if (dangerThreshold !== undefined || damageMultiplier !== undefined) {
      const update: Partial<{
        dangerThreshold: number;
        damageMultiplier: number;
      }> = {};
      if (dangerThreshold !== undefined)
        update.dangerThreshold = dangerThreshold;
      if (damageMultiplier !== undefined)
        update.damageMultiplier = damageMultiplier;
      updateMovementConfig(update);
      updates.push(`custom movement values`);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error:
          "Provide at least one setting to update: sensitivity, gameMode, theme, roundCount, roundDuration, or custom values (dangerThreshold/damageMultiplier)",
      });
      return;
    }

    logger.info("GAME", "Settings updated", { updates });

    res.json({
      success: true,
      sensitivity: userPreferences.sensitivity,
      gameMode: userPreferences.gameMode,
      theme: userPreferences.theme,
      roundCount: userPreferences.roundCount,
      roundDuration: userPreferences.roundDuration,
      movement: {
        dangerThreshold: gameConfig.movement.dangerThreshold,
        damageMultiplier: gameConfig.movement.damageMultiplier,
        oneshotMode: gameConfig.movement.oneshotMode,
      },
    });
  })
);

export default router;
