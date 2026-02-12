import { Server as SocketIOServer } from "socket.io";
import { GameEngine } from "@/managers/GameEngine";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { TeamManager } from "@/managers/TeamManager";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";
import { formatScoresForClient, buildTeamScores } from "./helpers";

const logger = Logger.getInstance();
const connectionManager = ConnectionManager.getInstance();
const teamManager = TeamManager.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * Register all game event → socket.io broadcast bridges.
 *
 * Game events emitted by the engine are mapped to socket emissions
 * so that clients receive real-time updates.
 */
export function registerGameEventBroadcasters(
  io: SocketIOServer,
  gameEngine: GameEngine
): void {
  // Broadcast game tick to all clients, adding teamId if teams are enabled
  gameEvents.onGameTick((payload) => {
    if (teamManager.isEnabled()) {
      const enrichedPayload = {
        ...payload,
        players: payload.players.map((p: any) => ({
          ...p,
          teamId: teamManager.getPlayerTeam(p.id),
        })),
      };
      io.emit("game:tick", enrichedPayload);
    } else {
      io.emit("game:tick", payload);
    }
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

    const scores = formatScoresForClient(payload.scores);

    io.emit("round:end", {
      roundNumber: payload.roundNumber,
      scores,
      gameTime: payload.gameTime,
      winnerId: payload.winnerId || null,
      teamScores: teamManager.isEnabled() ? buildTeamScores(scores) : null,
    });
  });

  // Broadcast game start
  gameEvents.onGameStart((payload) => {
    io.emit("game:start", {
      mode: gameEngine.lastModeKey,
      totalRounds: payload.totalRounds,
    });
  });

  // Broadcast game end
  gameEvents.onGameEnd((payload) => {
    // Reset ready state so winner screen starts at 0/N
    connectionManager.resetAllReadyState();
    const lobbyPlayers = connectionManager.getLobbyPlayers();
    gameEvents.emitReadyCountUpdate({ ready: 0, total: lobbyPlayers.length });

    const scores = formatScoresForClient(payload.scores);

    io.emit("game:end", {
      winner: payload.winner
        ? {
            id: payload.winner.id,
            name: payload.winner.name,
            number: connectionManager.getPlayerNumber(payload.winner.id) ?? 0,
          }
        : null,
      scores,
      totalRounds: payload.totalRounds,
      teamScores: teamManager.isEnabled() ? buildTeamScores(scores) : null,
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

  // Broadcast player respawns
  gameEvents.onPlayerRespawn((payload) => {
    io.emit("player:respawn", {
      playerId: payload.player.id,
      playerName: payload.player.name,
      playerNumber: connectionManager.getPlayerNumber(payload.player.id) ?? 0,
      gameTime: payload.gameTime,
    });
  });

  // Send respawn-pending to the dying player only
  gameEvents.onPlayerRespawnPending((payload) => {
    const socketId = payload.player.socketId;
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit("player:respawn-pending", {
        respawnIn: payload.respawnIn,
      });
    }
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
}
