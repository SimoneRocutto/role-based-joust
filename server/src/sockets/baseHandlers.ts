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
    socket.on("base:register", (data: { baseId?: string } = {}) => {
      let resultBaseId: string;
      let resultBaseNumber: number;

      // If the client provides a stored baseId, try to reconnect to the
      // existing entry (preserves number and mid-game ownership).
      if (data.baseId && baseManager.reconnectBase(data.baseId, socket.id)) {
        const base = baseManager.getBase(data.baseId)!;
        resultBaseId = base.baseId;
        resultBaseNumber = base.baseNumber;
        logger.info("SOCKET", "Base reconnected", {
          socketId: socket.id,
          baseId: resultBaseId,
          baseNumber: resultBaseNumber,
        });
      } else {
        // Fresh registration — purge ghosts first if outside active game.
        if (gameEngine.gameState !== "active") {
          baseManager.purgeDisconnected();
        }
        const registered = baseManager.registerBase(socket.id);
        resultBaseId = registered.baseId;
        resultBaseNumber = registered.baseNumber;
        logger.info("SOCKET", "Base registered", {
          socketId: socket.id,
          baseId: resultBaseId,
          baseNumber: resultBaseNumber,
        });
      }

      const ownerTeamId = baseManager.getBase(resultBaseId)?.ownerTeamId ?? null;
      socket.emit("base:registered", {
        baseId: resultBaseId,
        baseNumber: resultBaseNumber,
        ownerTeamId,
        gameState: gameEngine.gameState,
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
     * On disconnect: if the game is active, preserve ownership (scoring pauses);
     * otherwise forget the base entirely so its number can be reused.
     */
    socket.on("disconnect", () => {
      const baseId = baseManager.getBaseIdBySocket(socket.id);
      if (baseId) {
        if (gameEngine.gameState === "active") {
          baseManager.handleDisconnect(socket.id);
        } else {
          baseManager.removeBase(socket.id);
        }
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
    ownerTeamId: base.ownerTeamId,
    controlProgress: 0,
    isConnected: base.isConnected,
  }));

  io.emit("base:status", { bases });
}
