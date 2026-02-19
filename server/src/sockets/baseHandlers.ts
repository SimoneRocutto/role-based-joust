import { Server as SocketIOServer, Socket } from "socket.io";
import { GameEngine } from "@/managers/GameEngine";
import { BaseManager } from "@/managers/BaseManager";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();
const baseManager = BaseManager.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * Register socket handlers for base phones (Domination mode).
 * Base phones connect via a special `/base` route, not as players.
 */
export function registerBaseHandlers(
  io: SocketIOServer,
  gameEngine: GameEngine
): void {
  io.on("connection", (socket: Socket) => {
    /**
     * Base registration event — sent by base phones when they connect.
     */
    socket.on("base:register", () => {
      const { baseId, baseNumber } = baseManager.registerBase(socket.id);

      socket.emit("base:registered", { baseId, baseNumber });

      logger.info("SOCKET", "Base registered", {
        socketId: socket.id,
        baseId,
        baseNumber,
      });

      // Broadcast updated base status to all clients
      broadcastBaseStatus(io, gameEngine);
    });

    /**
     * Base tap event — sent when someone taps the base phone.
     */
    socket.on("base:tap", (data: { baseId: string }) => {
      if (gameEngine.gameState !== "active") return;

      const base = baseManager.getBase(data.baseId);
      if (!base || !base.isConnected) return;

      // Delegate to the current game mode
      gameEngine.currentMode?.onBaseTap(data.baseId, gameEngine);
    });

    /**
     * On disconnect, mark base as disconnected (preserve ownership).
     */
    socket.on("disconnect", () => {
      const baseId = baseManager.getBaseIdBySocket(socket.id);
      if (baseId) {
        baseManager.handleDisconnect(socket.id);
        broadcastBaseStatus(io, gameEngine);
        logger.info("SOCKET", "Base disconnected", {
          socketId: socket.id,
          baseId,
        });
      }
    });
  });
}

/**
 * Broadcast current base status to all clients.
 */
function broadcastBaseStatus(io: SocketIOServer, gameEngine: GameEngine): void {
  const bases = baseManager.getAllBases().map((base) => ({
    baseId: base.baseId,
    baseNumber: base.baseNumber,
    teamId: base.ownerTeamId,
    controlProgress: 0,
    isConnected: base.isConnected,
  }));

  io.emit("base:status", { bases });
}
