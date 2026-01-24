import "dotenv/config";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { GameEngine } from "@/managers/GameEngine";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { InputAdapter } from "@/utils/InputAdapter";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3001",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
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

    // Register connection and get session token
    const token = connectionManager.registerConnection(
      data.playerId,
      socket.id,
      true
    );

    // Acknowledge join with session token
    socket.emit("player:joined", {
      success: true,
      playerId: data.playerId,
      socketId: socket.id,
      sessionToken: token,
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
      const player = gameEngine.getPlayerById(result.playerId!);

      socket.emit("player:reconnected", {
        success: true,
        playerId: result.playerId,
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

    connectionManager.handleDisconnect(socket.id);
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
    gameTime: payload.gameTime,
  });
});

// Broadcast round start
gameEvents.onRoundStart((payload) => {
  io.emit("round:start", payload);
});

// Broadcast round end
gameEvents.onRoundEnd((payload) => {
  io.emit("round:end", {
    roundNumber: payload.roundNumber,
    scores: payload.scores.map((s) => ({
      playerId: s.player.id,
      playerName: s.player.name,
      score: s.score,
      rank: s.rank,
      status: s.status,
    })),
    gameTime: payload.gameTime,
  });
});

// Broadcast game end
gameEvents.onGameEnd((payload) => {
  io.emit("game:end", {
    winner: payload.winner
      ? {
          id: payload.winner.id,
          name: payload.winner.name,
        }
      : null,
    scores: payload.scores.map((s) => ({
      playerId: s.player.id,
      playerName: s.player.name,
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

httpServer.listen(PORT, () => {
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
});

export { io, gameEngine };
