import "dotenv/config";
import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { GameEngine } from "@/managers/GameEngine";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { TeamManager } from "@/managers/TeamManager";
import { InputAdapter } from "@/utils/InputAdapter";
import { Logger } from "@/utils/Logger";
import { initSettings } from "@/config/gameConfig";
import { registerSocketHandlers } from "@/sockets/handlers";
import { registerBaseHandlers } from "@/sockets/baseHandlers";
import { registerGameEventBroadcasters } from "@/sockets/broadcasters";

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
ConnectionManager.getInstance();
InputAdapter.getInstance();
TeamManager.getInstance();

// Make instances accessible to routes via app.locals (replaces global scope)
app.locals.gameEngine = gameEngine;
app.locals.io = io;

// Expose gameEngine to the Logger (reads global.gameEngine.gameTime for log entries)
(global as any).gameEngine = gameEngine;

// ============================================================================
// WIRE UP SOCKET HANDLERS + GAME EVENT BROADCASTERS
// ============================================================================

registerSocketHandlers(io, gameEngine);
registerBaseHandlers(io, gameEngine);
registerGameEventBroadcasters(io, gameEngine);

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
