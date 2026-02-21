import { Router, type Request, type Response } from "express";
import { Server as SocketIOServer } from "socket.io";
import { asyncHandler } from "@/middleware/errorHandler";
import { validate } from "@/middleware/validation";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { GameEngine } from "@/managers/GameEngine";
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
  setTeamsEnabledPreference,
  setTeamCountPreference,
  setDominationPointTargetPreference,
  setDominationControlIntervalPreference,
  setDominationRespawnTimePreference,
  setDominationBaseCountPreference,
  userPreferences,
} from "@/config/gameConfig";
import { getAvailableThemes, themeExists } from "@/config/roleThemes";
import { TeamManager } from "@/managers/TeamManager";
import { BaseManager } from "@/managers/BaseManager";
import {
  getLobbyPlayersWithTeams,
  broadcastLobbyUpdate,
  broadcastTeamUpdate,
} from "@/sockets/helpers";

const router = Router();
const logger = Logger.getInstance();
const connectionManager = ConnectionManager.getInstance();
const baseManager = BaseManager.getInstance();

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
    const players = getLobbyPlayersWithTeams();

    logger.debug("GAME", "Fetched lobby players", {
      count: players.length,
    });

    res.json({
      success: true,
      players,
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
    const gameEngine: GameEngine = req.app.locals.gameEngine;

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
    const gameEngine: GameEngine = req.app.locals.gameEngine;

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
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    const snapshot = gameEngine.getGameSnapshot();

    res.json({
      success: true,
      state: snapshot,
      teamSelectionActive: TeamManager.getInstance().isSelectionActive(),
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
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    // Get lobby players
    const lobbyPlayers = connectionManager.getLobbyPlayers();

    if (lobbyPlayers.length < 2) {
      res.status(400).json({
        success: false,
        error: "Need at least 2 players to start",
      });
      return;
    }

    // Determine effective mode early (needed for team forcing)
    const effectiveMode = mode || userPreferences.gameMode;

    // Configure teams based on current settings
    // Domination mode always requires teams
    const teamManager = TeamManager.getInstance();
    const forceTeams = effectiveMode === "domination";
    teamManager.configure(
      forceTeams || userPreferences.teamsEnabled,
      userPreferences.teamCount
    );
    // End team selection phase if it was active
    teamManager.endSelection();

    // If teams enabled, ensure sequential assignment exists for current lobby
    if (teamManager.isEnabled()) {
      const playerIds = lobbyPlayers.map((p) => p.id);
      // Only assign if not already assigned (players may have manually switched)
      const hasAssignments = playerIds.some(
        (id) => teamManager.getPlayerTeam(id) !== null
      );
      if (!hasAssignments) {
        teamManager.assignSequential(playerIds);
      }

      // Validate all teams have at least one player
      const validation = teamManager.validateTeams();
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.message,
        });
        return;
      }
    }

    // Use persisted preferences as defaults
    const effectiveTheme = theme || userPreferences.theme;
    const effectiveRoundCount = userPreferences.roundCount;

    // Create mode instance with options
    const factory = GameModeFactory.getInstance();
    const modeOptions: Record<string, any> = {
      roundCount: effectiveRoundCount,
    };
    if (effectiveMode === "role-based") {
      modeOptions.theme = effectiveTheme;
    }
    // Pass roundDuration in ms for timed modes
    modeOptions.roundDuration = userPreferences.roundDuration * 1000;
    // Pass domination-specific options
    if (effectiveMode === "domination") {
      modeOptions.pointTarget = userPreferences.dominationPointTarget;
      modeOptions.controlIntervalMs = userPreferences.dominationControlInterval * 1000;
      modeOptions.respawnDelayMs = userPreferences.dominationRespawnTime * 1000;
    }
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

    // Broadcast team info before starting so clients get initial assignments
    if (teamManager.isEnabled()) {
      const io: SocketIOServer = req.app.locals.io;
      broadcastLobbyUpdate(io);
      broadcastTeamUpdate(io);
    }

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
 * POST /api/game/proceed
 * Force-start from pre-game phase (admin action)
 * Proceeds from pre-game ready phase directly to countdown
 */
router.post(
  "/proceed",
  asyncHandler(async (req: Request, res: Response) => {
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    const result = gameEngine.proceedFromPreGame();

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message,
      });
      return;
    }

    logger.info("GAME", "Proceeded from pre-game by admin request");

    res.json({
      success: true,
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
    const ioInstance: SocketIOServer = req.app.locals.io;
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    gameEngine.stopGame();
    connectionManager.resetAllReadyState();
    TeamManager.getInstance().reset();
    // Ready players are not ready anymore -> avoid pregame not refreshing it.
    // This logic could be moved to the frontend
    broadcastLobbyUpdate(ioInstance);

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
    const gameEngine: GameEngine = req.app.locals.gameEngine;

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
      teamsEnabled: userPreferences.teamsEnabled,
      teamCount: userPreferences.teamCount,
      // Domination settings
      dominationPointTarget: userPreferences.dominationPointTarget,
      dominationControlInterval: userPreferences.dominationControlInterval,
      dominationRespawnTime: userPreferences.dominationRespawnTime,
      dominationBaseCount: userPreferences.dominationBaseCount,
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
    const {
      sensitivity,
      gameMode,
      theme,
      roundCount,
      roundDuration,
      teamsEnabled,
      teamCount,
      dangerThreshold,
      damageMultiplier,
      dominationPointTarget,
      dominationControlInterval,
      dominationRespawnTime,
      dominationBaseCount,
    } = req.body;
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
          error: `Unknown game mode: ${gameMode}. Available: ${availableModes.join(
            ", "
          )}`,
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
          error: `Unknown theme: ${theme}. Available: ${availableThemes.join(
            ", "
          )}`,
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
      if (
        typeof roundDuration !== "number" ||
        roundDuration < 30 ||
        roundDuration > 300
      ) {
        res.status(400).json({
          success: false,
          error: "roundDuration must be a number between 30 and 300",
        });
        return;
      }
      setRoundDurationPreference(roundDuration);
      updates.push(`roundDuration=${roundDuration}`);
    }

    // Update teamsEnabled preference
    if (teamsEnabled !== undefined) {
      if (typeof teamsEnabled !== "boolean") {
        res.status(400).json({
          success: false,
          error: "teamsEnabled must be a boolean",
        });
        return;
      }
      setTeamsEnabledPreference(teamsEnabled);
      updates.push(`teamsEnabled=${teamsEnabled}`);
    }

    // Update teamCount preference
    if (teamCount !== undefined) {
      if (typeof teamCount !== "number" || teamCount < 2 || teamCount > 4) {
        res.status(400).json({
          success: false,
          error: "teamCount must be a number between 2 and 4",
        });
        return;
      }
      setTeamCountPreference(teamCount);
      updates.push(`teamCount=${teamCount}`);
    }

    // If team settings changed, reconfigure TeamManager and update lobby
    if (teamsEnabled !== undefined || teamCount !== undefined) {
      const tm = TeamManager.getInstance();
      tm.configure(userPreferences.teamsEnabled, userPreferences.teamCount);

      // If teams enabled and in lobby, do sequential assignment
      const ge: GameEngine = req.app.locals.gameEngine;
      const ioInstance: SocketIOServer = req.app.locals.io;
      if (ge.gameState === "waiting" && userPreferences.teamsEnabled) {
        const lobbyPlayers = connectionManager.getLobbyPlayers();
        if (lobbyPlayers.length > 0) {
          tm.assignSequential(lobbyPlayers.map((p) => p.id));
        }
        // Broadcast updated lobby with team info
        broadcastLobbyUpdate(ioInstance);
        broadcastTeamUpdate(ioInstance);
      } else if (!userPreferences.teamsEnabled) {
        // Teams disabled — reset assignments and broadcast clean lobby
        tm.reset();
        broadcastLobbyUpdate(ioInstance);
        ioInstance.emit("team:update", { teams: {} });
      }
    }

    // Update domination settings
    if (dominationPointTarget !== undefined) {
      if (typeof dominationPointTarget !== "number" || dominationPointTarget < 5 || dominationPointTarget > 100) {
        res.status(400).json({ success: false, error: "dominationPointTarget must be a number between 5 and 100" });
        return;
      }
      setDominationPointTargetPreference(dominationPointTarget);
      updates.push(`dominationPointTarget=${dominationPointTarget}`);
    }

    if (dominationControlInterval !== undefined) {
      if (typeof dominationControlInterval !== "number" || dominationControlInterval < 3 || dominationControlInterval > 15) {
        res.status(400).json({ success: false, error: "dominationControlInterval must be a number between 3 and 15" });
        return;
      }
      setDominationControlIntervalPreference(dominationControlInterval);
      updates.push(`dominationControlInterval=${dominationControlInterval}`);
    }

    if (dominationRespawnTime !== undefined) {
      if (typeof dominationRespawnTime !== "number" || dominationRespawnTime < 5 || dominationRespawnTime > 30) {
        res.status(400).json({ success: false, error: "dominationRespawnTime must be a number between 5 and 30" });
        return;
      }
      setDominationRespawnTimePreference(dominationRespawnTime);
      updates.push(`dominationRespawnTime=${dominationRespawnTime}`);
    }

    if (dominationBaseCount !== undefined) {
      if (typeof dominationBaseCount !== "number" || dominationBaseCount < 1 || dominationBaseCount > 3) {
        res.status(400).json({ success: false, error: "dominationBaseCount must be a number between 1 and 3" });
        return;
      }
      setDominationBaseCountPreference(dominationBaseCount);
      updates.push(`dominationBaseCount=${dominationBaseCount}`);
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
          "Provide at least one setting to update: sensitivity, gameMode, theme, roundCount, roundDuration, teamsEnabled, teamCount, or custom values (dangerThreshold/damageMultiplier)",
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
      teamsEnabled: userPreferences.teamsEnabled,
      teamCount: userPreferences.teamCount,
      dominationPointTarget: userPreferences.dominationPointTarget,
      dominationControlInterval: userPreferences.dominationControlInterval,
      dominationRespawnTime: userPreferences.dominationRespawnTime,
      dominationBaseCount: userPreferences.dominationBaseCount,
      movement: {
        dangerThreshold: gameConfig.movement.dangerThreshold,
        damageMultiplier: gameConfig.movement.damageMultiplier,
        oneshotMode: gameConfig.movement.oneshotMode,
      },
    });
  })
);

/**
 * POST /api/game/team-selection
 * Enter team selection phase (admin action, lobby only)
 * Requires teams to be enabled and at least 2 players in lobby.
 */
router.post(
  "/team-selection",
  asyncHandler(async (req: Request, res: Response) => {
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    if (gameEngine.gameState !== "waiting") {
      res.status(400).json({
        success: false,
        error: "Can only start team selection from the lobby",
      });
      return;
    }

    const teamManager = TeamManager.getInstance();
    teamManager.configure(
      userPreferences.teamsEnabled,
      userPreferences.teamCount
    );

    if (!teamManager.isEnabled()) {
      res.status(400).json({
        success: false,
        error: "Teams are not enabled",
      });
      return;
    }

    const lobbyPlayers = connectionManager.getLobbyPlayers();
    if (lobbyPlayers.length < 2) {
      res.status(400).json({
        success: false,
        error: "Need at least 2 players to start team selection",
      });
      return;
    }

    const playerIds = lobbyPlayers.map((p) => p.id);
    teamManager.startSelection(playerIds);

    // Reset ready states so players can't start game during selection
    connectionManager.resetAllReadyState();

    // Broadcast team selection active + updated lobby with team info
    const io: SocketIOServer = req.app.locals.io;
    io.emit("team:selection", { active: true });
    broadcastLobbyUpdate(io);
    broadcastTeamUpdate(io);

    logger.info("GAME", "Team selection started", {
      playerCount: lobbyPlayers.length,
    });

    res.json({
      success: true,
      teams: teamManager.getTeamAssignments(),
    });
  })
);

/**
 * POST /api/game/teams/shuffle
 * Shuffle team assignments randomly (admin action, lobby only)
 */
router.post(
  "/teams/shuffle",
  asyncHandler(async (req: Request, res: Response) => {
    const gameEngine: GameEngine = req.app.locals.gameEngine;

    if (
      gameEngine.gameState !== "waiting" &&
      gameEngine.gameState !== "pre-game"
    ) {
      res.status(400).json({
        success: false,
        error: "Can only shuffle teams in the lobby or pre-game",
      });
      return;
    }

    const teamManager = TeamManager.getInstance();
    if (!teamManager.isEnabled()) {
      res.status(400).json({
        success: false,
        error: "Teams are not enabled",
      });
      return;
    }

    const lobbyPlayers = connectionManager.getLobbyPlayers();
    const playerIds = lobbyPlayers.map((p) => p.id);
    teamManager.shuffle(playerIds);

    // Broadcast updated lobby with new team assignments
    const io: SocketIOServer = req.app.locals.io;
    broadcastLobbyUpdate(io);
    broadcastTeamUpdate(io);

    logger.info("GAME", "Teams shuffled");

    res.json({
      success: true,
      teams: teamManager.getTeamAssignments(),
    });
  })
);

/**
 * POST /api/game/kick/:playerId
 * Kick a player from the lobby (admin action, lobby only)
 */
router.post(
  "/kick/:playerId",
  asyncHandler(async (req: Request, res: Response) => {
    const gameEngine: GameEngine = req.app.locals.gameEngine;
    const io: SocketIOServer = req.app.locals.io;
    const { playerId } = req.params;

    if (gameEngine.gameState !== "waiting") {
      res.status(400).json({
        success: false,
        error: "Can only kick players from the lobby",
      });
      return;
    }

    // Validate player exists
    const playerName = connectionManager.getPlayerName(playerId);
    if (!playerName) {
      res.status(404).json({
        success: false,
        error: "Player not found",
      });
      return;
    }

    // Get player's socket and emit kick event before disconnecting
    const socketId = connectionManager.getSocketId(playerId);
    if (socketId) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("player:kicked", {
          reason: "You were removed from the game",
        });
        socket.disconnect(true);
      }
    }

    // Remove player from connection manager (clears all data including lobby disconnect timeout)
    connectionManager.removePlayer(playerId);

    // Remove from team assignments
    const teamManager = TeamManager.getInstance();
    teamManager.removePlayer(playerId);

    // Broadcast updated lobby list
    broadcastLobbyUpdate(io);
    broadcastTeamUpdate(io);

    logger.info("GAME", "Player kicked from lobby", { playerId, playerName });

    res.json({
      success: true,
    });
  })
);

/**
 * GET /api/game/teams
 * Get current team assignments
 */
router.get(
  "/teams",
  asyncHandler(async (req: Request, res: Response) => {
    const teamManager = TeamManager.getInstance();

    res.json({
      success: true,
      enabled: teamManager.isEnabled(),
      teamCount: teamManager.getTeamCount(),
      teams: teamManager.isEnabled() ? teamManager.getTeamAssignments() : {},
    });
  })
);

/**
 * POST /api/game/kick-base/:baseId
 * Disconnect a base phone (admin action, not allowed during active gameplay)
 */
router.post(
  "/kick-base/:baseId",
  asyncHandler(async (req: Request, res: Response) => {
    const gameEngine: GameEngine = req.app.locals.gameEngine;
    const io: SocketIOServer = req.app.locals.io;
    const { baseId } = req.params;

    if (gameEngine.gameState === "active") {
      res.status(400).json({
        success: false,
        error: "Cannot kick a base during active gameplay",
      });
      return;
    }

    const base = baseManager.getBase(baseId);
    if (!base) {
      res.status(404).json({ success: false, error: "Base not found" });
      return;
    }

    const socket = io.sockets.sockets.get(base.socketId);
    if (socket) {
      socket.emit("base:kicked", { reason: "Removed by admin" });
      socket.disconnect(true);
      // The disconnect handler in baseHandlers.ts will call removeBase + broadcastBaseStatus
    } else {
      // Socket already gone — remove manually and broadcast
      baseManager.removeBase(base.socketId);
      const bases = baseManager.getAllBases().map((b) => ({
        baseId: b.baseId,
        baseNumber: b.baseNumber,
        ownerTeamId: b.ownerTeamId,
        controlProgress: 0,
        isConnected: b.isConnected,
      }));
      io.emit("base:status", { bases });
    }

    logger.info("GAME", "Base kicked", { baseId, baseNumber: base.baseNumber });
    res.json({ success: true });
  })
);

export default router;
