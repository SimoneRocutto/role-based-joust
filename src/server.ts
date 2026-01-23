import { config } from "dotenv";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { GameEngine } from "@/managers/GameEngine";
import { Logger } from "@/utils/Logger";

// Load environment variables
config();

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

// Initialize Game Engine
const gameEngine = new GameEngine();

// Make game engine globally accessible for routes and managers
declare global {
  // eslint-disable-next-line no-var
  var gameEngine: GameEngine;
  // eslint-disable-next-line no-var
  var io: SocketIOServer;
}

global.gameEngine = gameEngine;
global.io = io;

// Socket.IO connection handling
io.on("connection", (socket) => {
  logger.info("SOCKET", "Client connected", {
    socketId: socket.id,
    remoteAddress: socket.handshake.address,
  });

  // Handle player joining
  socket.on("player:join", (data: { name: string }) => {
    logger.info("SOCKET", "Player joining", {
      socketId: socket.id,
      playerName: data.name,
    });

    // Acknowledge join
    socket.emit("player:joined", {
      socketId: socket.id,
      success: true,
    });
  });

  // Handle movement data
  socket.on(
    "player:move",
    (data: { x: number; y: number; z: number; timestamp: number }) => {
      // This will be handled by the game engine
      // For now, just log debug info
      logger.debug("SOCKET", "Movement data received", {
        socketId: socket.id,
        intensity: Math.sqrt(
          data.x * data.x + data.y * data.y + data.z * data.z
        ),
      });
    }
  );

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    logger.info("SOCKET", "Client disconnected", {
      socketId: socket.id,
      reason,
    });
  });

  // Handle errors
  socket.on("error", (error) => {
    logger.error("SOCKET", "Socket error", {
      socketId: socket.id,
      error: error.message,
    });
  });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info("SERVER", "Shutting down gracefully...");

  // Stop accepting new connections
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

// Error handling
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

// Start server
httpServer.listen(PORT, () => {
  logger.info("SERVER", `🚀 Server started successfully`, {
    port: PORT,
    environment: NODE_ENV,
    nodeVersion: process.version,
  });

  logger.info("SERVER", "📋 Configuration:", {
    logLevel: process.env.LOG_LEVEL || "info",
    logToFile: process.env.LOG_TO_FILE === "true",
    tickRate: process.env.TICK_RATE || 100,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3001",
    ],
  });

  if (NODE_ENV === "development") {
    logger.info(
      "SERVER",
      "🔧 Development mode enabled - Debug routes available"
    );
  }
});

export { io, gameEngine };
