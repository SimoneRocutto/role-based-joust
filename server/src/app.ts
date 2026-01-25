// ============================================================================
// src/app.ts - Express Application Setup
// ============================================================================

import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import { Logger } from "@/utils/Logger";

// Routes
import gameRoutes from "@/routes/game.routes";
import playerRoutes from "@/routes/player.routes";
import debugRoutes from "@/routes/debug.routes";

// Middleware
import { errorHandler } from "@/middleware/errorHandler";

const logger = Logger.getInstance();

// Create Express app
const app: Express = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log request
  logger.debug("HTTP", `${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? "warn" : "debug";

    logger[logLevel]("HTTP", `${req.method} ${req.path} - ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.use("/api/game", gameRoutes);
app.use("/api/player", playerRoutes);

// Debug routes (only in development)
if (process.env.NODE_ENV === "development") {
  app.use("/api/debug", debugRoutes);
  logger.info("APP", "Debug routes enabled at /api/debug");
}

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// ============================================================================
// EXPORT
// ============================================================================

export default app;
