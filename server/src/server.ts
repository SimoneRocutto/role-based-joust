import "dotenv/config";
import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { GameEngine } from "@/managers/GameEngine";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { InputAdapter } from "@/utils/InputAdapter";
import { Logger } from "@/utils/Logger";
import { initSettings, userPreferences } from "@/config/gameConfig";

const logger = Logger.getInstance();

// Load persisted settings before anything reads gameConfig
initSettings();

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// SSL certificate paths - check both naming conventions
const CERT_PATH = join(__dirname, "../../certs/server.crt");
const KEY_PATH = join(__dirname, "../../certs/server.key");
const CERT_PATH_ALT = join(__dirname, "../../certs/cert.pem");
const KEY_PATH_ALT = join(__dirname, "../../certs/key.pem");

// Determine which certs to use (if any)
let sslOptions: { key: Buffer; cert: Buffer } | null = null;
if (existsSync(CERT_PATH) && existsSync(KEY_PATH)) {
  sslOptions = {
    key: readFileSync(KEY_PATH),
    cert: readFileSync(CERT_PATH),
  };
} else if (existsSync(CERT_PATH_ALT) && existsSync(KEY_PATH_ALT)) {
  sslOptions = {
    key: readFileSync(KEY_PATH_ALT),
    cert: readFileSync(CERT_PATH_ALT),
  };
}

// Always use HTTPS if certificates exist (required for iOS accelerometer)
let httpServer;
if (sslOptions) {
  httpServer = createHttpsServer(sslOptions, app);
  logger.info("SERVER", "HTTPS enabled with self-signed certificate");
} else {
  httpServer = createHttpServer(app);
  logger.warn(
    "SERVER",
    "No SSL certificates found - running HTTP only (iOS accelerometer will NOT work)"
  );
  logger.warn(
    "SERVER",
    "To enable HTTPS, add certificates to /certs/ (server.crt/server.key or cert.pem/key.pem)"
  );
}

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:5173",
      "https://localhost:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Allow connections through proxy
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize managers
const gameEngine = new GameEngine();
const connectionManager = ConnectionManager.getInstance();
const inputAdapter = InputAdapter.getInstance();

// Make instances globally accessible
declare global {
  // eslint-disable-next-line no-var
  var gameEngine: GameEngine;
  // eslint-disable-next-line no-var
  var io: SocketIOServer;
}

global.gameEngine = gameEngine;
global.io = io;

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

io.on("connection", (socket) => {
  logger.info("SOCKET", "Client connected", {
    socketId: socket.id,
    remoteAddress: socket.handshake.address,
  });

  /**
   * Player join event
   */
  socket.on("player:join", (data: { playerId: string; name: string }) => {
    logger.info("SOCKET", "Player joining", {
      socketId: socket.id,
      playerId: data.playerId,
      playerName: data.name,
    });

    // Register connection and get session token + player number
    const { token, playerNumber } = connectionManager.registerConnection(
      data.playerId,
      socket.id,
      data.name,
      true
    );

    // Acknowledge join with session token and player number
    socket.emit("player:joined", {
      success: true,
      playerId: data.playerId,
      socketId: socket.id,
      sessionToken: token,
      playerNumber,
      name: data.name,
    });

    // Broadcast updated lobby list to all clients
    io.emit("lobby:update", {
      players: connectionManager.getLobbyPlayers(),
    });
  });

  /**
   * Player reconnect event
   */
  socket.on("player:reconnect", (data: { token: string }) => {
    logger.info("SOCKET", "Player reconnecting", {
      socketId: socket.id,
    });

    const result = connectionManager.reconnect(data.token, socket.id);

    if (result.success) {
      // Notify game engine of reconnection if game is active
      if (gameEngine.isActive()) {
        gameEngine.handlePlayerReconnect(result.playerId!, socket.id);
      }

      const player = gameEngine.getPlayerById(result.playerId!);
      const playerNumber = connectionManager.getPlayerNumber(result.playerId!);

      socket.emit("player:reconnected", {
        success: true,
        playerId: result.playerId,
        playerNumber,
        player: player
          ? {
              id: player.id,
              name: player.name,
              role: player.constructor.name,
              isAlive: player.isAlive,
              points: player.points,
            }
          : null,
      });
    } else {
      socket.emit("player:reconnected", {
        success: false,
        error: result.message,
      });
    }
  });

  /**
   * Movement data event
   */
  socket.on(
    "player:move",
    (data: {
      playerId: string;
      x: number;
      y: number;
      z: number;
      timestamp?: number;
      deviceType?: "phone" | "joycon" | "custom";
    }) => {
      // Update connection activity
      connectionManager.updateActivity(socket.id);

      // Validate input
      const validation = inputAdapter.validate(data);
      if (!validation.valid) {
        socket.emit("error", {
          message: validation.error,
          code: "INVALID_MOVEMENT_DATA",
        });
        return;
      }

      // Normalize movement data
      const movementData = inputAdapter.normalizeInput(data, data.deviceType);

      // Route to game engine
      if (gameEngine.isActive()) {
        gameEngine.handlePlayerMovement(data.playerId, movementData);

        logger.debug("SOCKET", "Movement processed", {
          playerId: data.playerId,
          intensity: movementData.intensity,
        });
      }
    }
  );

  /**
   * Player ready event
   */
  socket.on("player:ready", (data: { playerId: string }) => {
    logger.info("SOCKET", "Player ready", {
      socketId: socket.id,
      playerId: data.playerId,
    });

    connectionManager.updateActivity(socket.id);

    const playerName = connectionManager.getPlayerName(data.playerId);
    const playerNumber = connectionManager.getPlayerNumber(data.playerId);

    if (!playerName || playerNumber === undefined) {
      logger.warn("SOCKET", "Ready event from unknown player", {
        playerId: data.playerId,
      });
      return;
    }

    // Determine which state to update based on game state
    if (gameEngine.gameState === "waiting") {
      // Lobby phase - use ConnectionManager
      connectionManager.setPlayerReady(data.playerId, true);
      const readyCount = connectionManager.getReadyCount();

      // Emit ready events
      gameEvents.emitPlayerReady({
        playerId: data.playerId,
        playerName,
        playerNumber,
        isReady: true,
      });
      gameEvents.emitReadyCountUpdate(readyCount);

      // Broadcast updated lobby list
      io.emit("lobby:update", {
        players: connectionManager.getLobbyPlayers(),
      });
    } else if (gameEngine.gameState === "round-ended") {
      // Between rounds - use GameEngine
      const accepted = gameEngine.setPlayerReady(data.playerId, true);

      // If ready was rejected (during delay period), don't emit events
      if (!accepted) {
        logger.debug("SOCKET", "Ready rejected during delay period", {
          playerId: data.playerId,
        });
        return;
      }

      const readyCount = gameEngine.getReadyCount();

      // Emit ready events
      gameEvents.emitPlayerReady({
        playerId: data.playerId,
        playerName,
        playerNumber,
        isReady: true,
      });
      gameEvents.emitReadyCountUpdate(readyCount);
    } else if (gameEngine.gameState === "finished") {
      // Game ended - track ready in ConnectionManager for auto-relaunch
      connectionManager.setPlayerReady(data.playerId, true);
      const readyCount = connectionManager.getReadyCount();

      // Emit ready events so dashboard/players see ready state
      gameEvents.emitPlayerReady({
        playerId: data.playerId,
        playerName,
        playerNumber,
        isReady: true,
      });
      gameEvents.emitReadyCountUpdate(readyCount);

      // Check if all connected players are ready for auto-relaunch
      if (readyCount.ready >= readyCount.total && readyCount.total >= 2) {
        logger.info(
          "SOCKET",
          "All players ready at game end - auto-launching new game"
        );
        const roundCount = userPreferences.roundCount;
        const modeKey = gameEngine.lastModeKey;

        // Stop old game and reset ready state
        gameEngine.stopGame();
        connectionManager.resetAllReadyState();

        // Launch new game with same mode
        const factory = GameModeFactory.getInstance();
        const gameMode = factory.createMode(modeKey, { roundCount });
        gameEngine.setGameMode(gameMode);
        gameEngine.lastModeKey = modeKey;

        const lobbyPlayers = connectionManager.getLobbyPlayers();
        if (lobbyPlayers.length >= 2) {
          const playerData = lobbyPlayers.map((p) => ({
            id: p.id,
            name: p.name,
            socketId: connectionManager.getSocketId(p.id) || "",
          }));
          gameEngine.startGame(playerData);

          logger.info("SOCKET", "New game auto-launched", {
            mode: modeKey,
            playerCount: playerData.length,
          });
        }
      }
    }
  });

  /**
   * Heartbeat/ping event
   */
  socket.on("ping", () => {
    connectionManager.updateActivity(socket.id);
    socket.emit("pong");
  });

  /**
   * Disconnect event
   */
  socket.on("disconnect", (reason) => {
    logger.info("SOCKET", "Client disconnected", {
      socketId: socket.id,
      reason,
    });

    // Get player ID before removing connection mapping
    const playerId = connectionManager.getPlayerId(socket.id);

    if (playerId && gameEngine.gameState === "waiting") {
      // No active game — fully remove player so their number is freed
      connectionManager.removePlayer(playerId);
    } else {
      // Game in progress — keep player data for reconnection
      connectionManager.handleDisconnect(socket.id);

      if (playerId && gameEngine.isActive()) {
        gameEngine.handlePlayerDisconnect(playerId);
      }
    }

    // Broadcast updated lobby list to all clients
    io.emit("lobby:update", {
      players: connectionManager.getLobbyPlayers(),
    });
  });

  /**
   * Error event
   */
  socket.on("error", (error) => {
    logger.error("SOCKET", "Socket error", {
      socketId: socket.id,
      error: error.message,
    });
  });
});

// ============================================================================
// GAME EVENT BROADCASTING
// ============================================================================

// Import GameEvents to listen to game events
import { GameEvents } from "@/utils/GameEvents";
const gameEvents = GameEvents.getInstance();

// Broadcast game tick to all clients
gameEvents.onGameTick((payload) => {
  io.emit("game:tick", payload);
});

// Broadcast player deaths
gameEvents.onPlayerDeath((payload) => {
  io.emit("player:death", {
    victimId: payload.victim.id,
    victimName: payload.victim.name,
    victimNumber: connectionManager.getPlayerNumber(payload.victim.id) ?? 0,
    gameTime: payload.gameTime,
  });
});

// Broadcast round start
gameEvents.onRoundStart((payload) => {
  io.emit("round:start", payload);
});

// Broadcast round end
gameEvents.onRoundEnd((payload) => {
  // Emit reset ready count so between-rounds screen starts at 0/N
  const playerCount = gameEngine.players.length;
  gameEvents.emitReadyCountUpdate({ ready: 0, total: playerCount });

  io.emit("round:end", {
    roundNumber: payload.roundNumber,
    scores: payload.scores.map((s) => ({
      playerId: s.player.id,
      playerName: s.player.name,
      playerNumber: connectionManager.getPlayerNumber(s.player.id) ?? 0,
      score: s.score,
      rank: s.rank,
      status: s.status,
    })),
    gameTime: payload.gameTime,
    winnerId: payload.winnerId || null,
  });
});

// Broadcast game end
gameEvents.onGameEnd((payload) => {
  // Reset ready state so winner screen starts at 0/N
  connectionManager.resetAllReadyState();
  const lobbyPlayers = connectionManager.getLobbyPlayers();
  gameEvents.emitReadyCountUpdate({ ready: 0, total: lobbyPlayers.length });

  io.emit("game:end", {
    winner: payload.winner
      ? {
          id: payload.winner.id,
          name: payload.winner.name,
          number: connectionManager.getPlayerNumber(payload.winner.id) ?? 0,
        }
      : null,
    scores: payload.scores.map((s) => ({
      playerId: s.player.id,
      playerName: s.player.name,
      playerNumber: connectionManager.getPlayerNumber(s.player.id) ?? 0,
      score: s.score,
      rank: s.rank,
      status: s.status,
    })),
    totalRounds: payload.totalRounds,
  });
});

// Broadcast vampire bloodlust events
gameEvents.onVampireBloodlustStart((payload) => {
  io.emit("vampire:bloodlust", {
    vampireId: payload.vampire.id,
    vampireName: payload.vampire.name,
    active: true,
  });
});

gameEvents.onVampireBloodlustEnd((payload) => {
  io.emit("vampire:bloodlust", {
    vampireId: payload.vampire.id,
    vampireName: payload.vampire.name,
    active: false,
  });
});

// Broadcast countdown events
gameEvents.onCountdown((payload) => {
  io.emit("game:countdown", payload);
});

// Broadcast game stopped events
gameEvents.onGameStopped(() => {
  io.emit("game:stopped", {});
});

// Broadcast player ready events
gameEvents.onPlayerReady((payload) => {
  io.emit("player:ready", payload);
});

// Broadcast ready count updates
gameEvents.onReadyCountUpdate((payload) => {
  io.emit("ready:update", payload);
});

// Broadcast ready enabled/disabled events
gameEvents.onReadyEnabled((payload) => {
  io.emit("ready:enabled", payload);
});

// Broadcast mode events (game events like speed-shift)
gameEvents.onModeEvent((payload) => {
  io.emit("mode:event", payload);
});

// Send role assignment to individual players
gameEvents.on(
  "role:assigned",
  (payload: {
    playerId: string;
    socketId: string;
    name: string;
    displayName: string;
    description: string;
    difficulty: string;
  }) => {
    // Find the socket for this player and emit directly to them
    const socket = io.sockets.sockets.get(payload.socketId);
    if (socket) {
      socket.emit("role:assigned", {
        playerId: payload.playerId,
        name: payload.name,
        displayName: payload.displayName,
        description: payload.description,
        difficulty: payload.difficulty,
      });
      logger.debug("SOCKET", `Role assigned to ${payload.playerId}`, {
        role: payload.displayName,
      });
    } else {
      logger.warn(
        "SOCKET",
        `Could not find socket for player ${payload.playerId}`
      );
    }
  }
);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const shutdown = async () => {
  logger.info("SERVER", "Shutting down gracefully...");

  // Stop game engine
  if (gameEngine.isActive()) {
    gameEngine.stopGame();
  }

  // Close Socket.IO
  io.close(() => {
    logger.info("SERVER", "Socket.IO server closed");
  });

  // Close HTTP server
  httpServer.close(() => {
    logger.info("SERVER", "HTTP server closed");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error("SERVER", "Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on("uncaughtException", (error: Error) => {
  logger.error("SERVER", "Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  shutdown();
});

process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>) => {
    logger.error("SERVER", "Unhandled promise rejection", {
      reason,
      promise,
    });
  }
);

// ============================================================================
// START SERVER
// ============================================================================

httpServer.listen(
  {
    port: PORT,
    host: "0.0.0.0",
  },
  () => {
    logger.info("SERVER", `🚀 Server started successfully`, {
      port: PORT,
      environment: NODE_ENV,
      nodeVersion: process.version,
    });

    logger.info("SERVER", "📋 Configuration:", {
      logLevel: process.env.LOG_LEVEL || "info",
      logToFile: process.env.LOG_TO_FILE === "true",
      tickRate: gameEngine.tickRate,
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3001",
      ],
    });

    if (NODE_ENV === "development") {
      logger.info(
        "SERVER",
        "🔧 Development mode enabled - Debug routes available at /api/debug"
      );
    }
  }
);

export { io, gameEngine };
