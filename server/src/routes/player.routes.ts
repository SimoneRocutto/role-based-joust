import { Router, type Request, type Response } from "express";
import { asyncHandler } from "@/middleware/errorHandler";
import { validate, validateGameActive } from "@/middleware/validation";
import { InputAdapter } from "@/utils/InputAdapter";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { Logger } from "@/utils/Logger";

const router = Router();
const logger = Logger.getInstance();

/**
 * POST /api/player/move
 * Submit movement data
 */
router.post(
  "/move",
  validate("movementData"),
  validateGameActive,
  asyncHandler(async (req: Request, res: Response) => {
    const { playerId, ...rawMovementData } = req.body;
    const { gameEngine } = global;

    if (!playerId) {
      res.status(400).json({
        success: false,
        error: "Player ID required",
      });
      return;
    }

    // Normalize input data
    const inputAdapter = InputAdapter.getInstance();
    const movementData = inputAdapter.normalizeInput(rawMovementData);

    // Route to game engine
    gameEngine!.handlePlayerMovement(playerId, movementData);

    res.json({
      success: true,
    });
  })
);

/**
 * GET /api/player/:playerId/role
 * Get assigned role information
 */
router.get(
  "/:playerId/role",
  asyncHandler(async (req: Request, res: Response) => {
    const { playerId } = req.params;
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

    const player = gameEngine.getPlayerById(playerId);

    if (!player) {
      res.status(404).json({
        success: false,
        error: "Player not found",
      });
      return;
    }

    res.json({
      success: true,
      role: {
        name: player.constructor.name,
        displayName:
          (player.constructor as any).displayName || player.constructor.name,
        description:
          (player.constructor as any).description || "No description",
        difficulty: (player.constructor as any).difficulty || "normal",
      },
      player: {
        id: player.id,
        name: player.name,
        isAlive: player.isAlive,
        points: player.points,
        totalPoints: player.totalPoints,
      },
    });
  })
);

/**
 * POST /api/player/reconnect
 * Reconnect to game with session token
 */
router.post(
  "/reconnect",
  validate("reconnect"),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, socketId } = req.body;
    const connectionManager = ConnectionManager.getInstance();

    const result = connectionManager.reconnect(token, socketId);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: result.message,
      });
      return;
    }

    const { gameEngine } = global;
    const player = gameEngine?.getPlayerById(result.playerId!);

    res.json({
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
  })
);

/**
 * GET /api/player/:playerId/state
 * Get player state
 */
router.get(
  "/:playerId/state",
  asyncHandler(async (req: Request, res: Response) => {
    const { playerId } = req.params;
    const { gameEngine } = global;

    if (!gameEngine) {
      res.status(503).json({
        success: false,
        error: "Game engine not initialized",
      });
      return;
    }

    const player = gameEngine.getPlayerById(playerId);

    if (!player) {
      res.status(404).json({
        success: false,
        error: "Player not found",
      });
      return;
    }

    res.json({
      success: true,
      player: {
        id: player.id,
        name: player.name,
        role: player.constructor.name,
        isAlive: player.isAlive,
        points: player.points,
        totalPoints: player.totalPoints,
        toughness: player.toughness,
        statusEffects: Array.from(player.statusEffects.values()).map(
          (effect) => ({
            type: effect.constructor.name,
            priority: effect.priority,
            timeLeft: effect.getRemainingTime(gameEngine.gameTime),
          })
        ),
      },
    });
  })
);

export default router;
