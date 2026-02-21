import { Server as SocketIOServer } from "socket.io";
import { GameEngine } from "@/managers/GameEngine";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { TeamManager } from "@/managers/TeamManager";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";
import { userPreferences } from "@/config/gameConfig";
import { formatScoresForClient, buildTeamScores } from "./helpers";
import { BaseManager } from "@/managers/BaseManager";
import type {
  GameTickPlayerState,
  PlayerDeathPayload,
  RoundStartPayload,
  RoundEndPayload,
  GameStartPayload,
  GameEndPayload,
  VampireBloodlustPayload,
  CountdownPayload,
  PlayerReadyPayload,
  ReadyCountPayload,
  ReadyEnabledPayload,
  ModeEventPayload,
  PlayerRespawnPayload,
  PlayerRespawnPendingPayload,
  RoleAssignedPayload,
  RoleUpdatedPayload,
  BaseCapturedPayload,
  BasePointPayload,
  BaseStatusPayload,
  DominationWinPayload,
  PlayerDamagePayload,
} from "@shared/types";

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
        players: payload.players.map((p: GameTickPlayerState) => ({
          ...p,
          teamId: teamManager.getPlayerTeam(p.id),
        })),
      };
      io.emit("game:tick", enrichedPayload);
    } else {
      io.emit("game:tick", payload);
    }
  });

  // Broadcast player deaths (permanent — survives across rounds)
  gameEvents.onPlayerDeathPermanent((payload) => {
    const clientPayload: PlayerDeathPayload = {
      victimId: payload.victim.id,
      victimName: payload.victim.name,
      victimNumber: connectionManager.getPlayerNumber(payload.victim.id) ?? 0,
      gameTime: payload.gameTime,
    };
    io.emit("player:death", clientPayload);
  });

  // Broadcast round start
  gameEvents.onRoundStart((payload) => {
    const clientPayload: RoundStartPayload = payload;
    io.emit("round:start", clientPayload);
  });

  // Broadcast round end
  gameEvents.onRoundEnd((payload) => {
    // Emit reset ready count so between-rounds screen starts at 0/N
    const playerCount = gameEngine.players.length;
    gameEvents.emitReadyCountUpdate({ ready: 0, total: playerCount });

    const scores = formatScoresForClient(payload.scores);

    const clientPayload: RoundEndPayload = {
      roundNumber: payload.roundNumber,
      scores,
      gameTime: payload.gameTime,
      winnerId: payload.winnerId || null,
      teamScores: teamManager.isEnabled() ? buildTeamScores(scores) : null,
    };
    io.emit("round:end", clientPayload);
  });

  // Broadcast game start
  gameEvents.onGameStart((payload) => {
    // Emit reset ready count so pre-game screen starts at 0/N
    const playerCount = gameEngine.players.length;
    gameEvents.emitReadyCountUpdate({ ready: 0, total: playerCount });

    const clientPayload: GameStartPayload = {
      mode: gameEngine.lastModeKey,
      totalRounds: payload.totalRounds,
      sensitivity: userPreferences.sensitivity,
      withEarbud: userPreferences.withEarbud,
    };
    io.emit("game:start", clientPayload);
  });

  // Broadcast game end
  gameEvents.onGameEnd((payload) => {
    // Reset ready state so winner screen starts at 0/N
    connectionManager.resetAllReadyState();
    const lobbyPlayers = connectionManager.getLobbyPlayers();
    gameEvents.emitReadyCountUpdate({ ready: 0, total: lobbyPlayers.length });

    const scores = formatScoresForClient(payload.scores);

    const clientPayload: GameEndPayload = {
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
    };
    io.emit("game:end", clientPayload);
  });

  // Broadcast vampire bloodlust events
  gameEvents.onVampireBloodlustStart((payload) => {
    const clientPayload: VampireBloodlustPayload = {
      vampireId: payload.vampire.id,
      vampireName: payload.vampire.name,
      vampireNumber: connectionManager.getPlayerNumber(payload.vampire.id) ?? 0,
      active: true,
    };
    io.emit("vampire:bloodlust", clientPayload);
  });

  gameEvents.onVampireBloodlustEnd((payload) => {
    const clientPayload: VampireBloodlustPayload = {
      vampireId: payload.vampire.id,
      vampireName: payload.vampire.name,
      vampireNumber: connectionManager.getPlayerNumber(payload.vampire.id) ?? 0,
      active: false,
    };
    io.emit("vampire:bloodlust", clientPayload);
  });

  // Broadcast countdown events
  gameEvents.onCountdown((payload) => {
    const clientPayload: CountdownPayload = payload;
    io.emit("game:countdown", clientPayload);
  });

  // Broadcast game stopped events
  gameEvents.onGameStopped(() => {
    io.emit("game:stopped", {});
  });

  // Broadcast player ready events
  gameEvents.onPlayerReady((payload) => {
    const clientPayload: PlayerReadyPayload = payload;
    io.emit("player:ready", clientPayload);
  });

  // Broadcast ready count updates
  gameEvents.onReadyCountUpdate((payload) => {
    const clientPayload: ReadyCountPayload = payload;
    io.emit("ready:update", clientPayload);
  });

  // Broadcast ready enabled/disabled events
  gameEvents.onReadyEnabled((payload) => {
    const clientPayload: ReadyEnabledPayload = payload;
    io.emit("ready:enabled", clientPayload);
  });

  // Broadcast mode events (game events like speed-shift)
  gameEvents.onModeEvent((payload) => {
    const clientPayload: ModeEventPayload = payload;
    io.emit("mode:event", clientPayload);
  });

  // Broadcast player respawns
  gameEvents.onPlayerRespawn((payload) => {
    const clientPayload: PlayerRespawnPayload = {
      playerId: payload.player.id,
      playerName: payload.player.name,
      playerNumber: connectionManager.getPlayerNumber(payload.player.id) ?? 0,
      gameTime: payload.gameTime,
    };
    io.emit("player:respawn", clientPayload);
  });

  // Send respawn-pending to the dying player only
  gameEvents.onPlayerRespawnPending((payload) => {
    const socketId = payload.player.socketId;
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      const clientPayload: PlayerRespawnPendingPayload = {
        respawnIn: payload.respawnIn,
      };
      socket.emit("player:respawn-pending", clientPayload);
    }
  });

  // Broadcast base captured events (Domination mode)
  gameEvents.onBaseCaptured((payload) => {
    const clientPayload: BaseCapturedPayload = payload;
    io.emit("base:captured", clientPayload);
  });

  // Broadcast base point events (Domination mode)
  gameEvents.onBasePoint((payload) => {
    const clientPayload: BasePointPayload = payload;
    io.emit("base:point", clientPayload);

    // Also emit to the specific base socket for SFX
    const baseManager = BaseManager.getInstance();
    const base = baseManager.getBase(payload.baseId);
    if (base?.isConnected) {
      const socket = io.sockets.sockets.get(base.socketId);
      if (socket) {
        socket.emit("base:point", clientPayload);
      }
    }
  });

  // Broadcast base status updates (Domination mode)
  gameEvents.onBaseStatus((payload) => {
    const clientPayload: BaseStatusPayload = payload;
    io.emit("base:status", clientPayload);
  });

  // Broadcast domination win events
  gameEvents.onDominationWin((payload) => {
    const clientPayload: DominationWinPayload = payload;
    io.emit("domination:win", clientPayload);
  });

  // Send damage event to the damaged player only (for client-side damage sound)
  gameEvents.onPlayerDamageEvent((payload) => {
    const socketId = payload.player.socketId;
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      const clientPayload: PlayerDamagePayload = {
        totalDamage: payload.totalDamage,
      };
      socket.emit("player:damage", clientPayload);
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
      targetName?: string;
      targetNumber?: number;
    }) => {
      // Find the socket for this player and emit directly to them
      const socket = io.sockets.sockets.get(payload.socketId);
      if (socket) {
        const clientPayload: RoleAssignedPayload = {
          name: payload.name,
          displayName: payload.displayName,
          description: payload.description,
          difficulty: payload.difficulty,
          targetName: payload.targetName,
          targetNumber: payload.targetNumber,
        };
        socket.emit("role:assigned", clientPayload);
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

  // Send role updates to individual players (mid-game changes, e.g. Executioner new target)
  gameEvents.onRoleUpdated((payload) => {
    const socket = io.sockets.sockets.get(payload.socketId);
    if (socket) {
      const clientPayload: RoleUpdatedPayload = {
        name: payload.name,
        displayName: payload.displayName,
        description: payload.description,
        difficulty: payload.difficulty,
        targetName: payload.targetName,
        targetNumber: payload.targetNumber,
      };
      socket.emit("role:updated", clientPayload);
      logger.debug("SOCKET", `Role updated for ${payload.playerId}`, {
        role: payload.displayName,
      });
    } else {
      logger.warn(
        "SOCKET",
        `Could not find socket for player ${payload.playerId}`
      );
    }
  });
}
