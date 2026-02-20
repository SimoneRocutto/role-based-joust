import { Server as SocketIOServer } from "socket.io";
import { GameEngine } from "@/managers/GameEngine";
import { ConnectionManager } from "@/managers/ConnectionManager";
import { InputAdapter } from "@/utils/InputAdapter";
import { TeamManager } from "@/managers/TeamManager";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";
import { userPreferences } from "@/config/gameConfig";
import { broadcastLobbyUpdate, broadcastTeamUpdate, getLobbyPlayersWithTeams } from "./helpers";

const logger = Logger.getInstance();
const connectionManager = ConnectionManager.getInstance();
const inputAdapter = InputAdapter.getInstance();
const teamManager = TeamManager.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * Register all socket.io connection and event handlers.
 */
export function registerSocketHandlers(
  io: SocketIOServer,
  gameEngine: GameEngine
): void {
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

      // Assign to a team if teams are enabled
      if (teamManager.isEnabled()) {
        teamManager.addPlayer(data.playerId);
      }

      // Acknowledge join with session token and player number
      socket.emit("player:joined", {
        success: true,
        playerId: data.playerId,
        socketId: socket.id,
        sessionToken: token,
        playerNumber,
        name: data.name,
        teamId: teamManager.isEnabled() ? teamManager.getPlayerTeam(data.playerId) : null,
      });

      // Broadcast updated lobby list to all clients
      broadcastLobbyUpdate(io);
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
        // Cancel lobby disconnect grace period if reconnecting in lobby
        if (gameEngine.gameState === "waiting") {
          connectionManager.cancelLobbyDisconnect(result.playerId!);
          // Broadcast updated lobby list so dashboard shows player as connected again
          broadcastLobbyUpdate(io);
        }

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
          gameState: gameEngine.gameState,
          currentRound: gameEngine.currentRound,
          totalRounds: gameEngine.currentMode?.roundCount ?? 0,
          mode: gameEngine.lastModeKey ?? null,
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
        // Lobby phase - no ready state tracking (players just wait)
        logger.debug("SOCKET", "Ignoring ready event in lobby phase", {
          playerId: data.playerId,
        });
        return;
      } else if (gameEngine.gameState === "pre-game") {
        // Pre-game phase - use GameEngine (same as between rounds)
        const accepted = gameEngine.setPlayerReady(data.playerId, true);

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
          const roundDuration = userPreferences.roundDuration * 1000;
          const gameMode = factory.createMode(modeKey, {
            roundCount,
            roundDuration,
          });
          gameEngine.setGameMode(gameMode);
          gameEngine.lastModeKey = modeKey;

          const lobbyPlayers = connectionManager.getLobbyPlayers();
          if (lobbyPlayers.length >= 2) {
            const playerData = lobbyPlayers.map((p) => ({
              id: p.id,
              name: p.name,
              socketId: connectionManager.getSocketId(p.id) || "",
            }));
            // Skip pre-game on auto-relaunch since all players already confirmed ready
            gameEngine.startGame(playerData, undefined, true);

            logger.info("SOCKET", "New game auto-launched", {
              mode: modeKey,
              playerCount: playerData.length,
            });
          }
        }
      }
    });

    /**
     * Player tap (ability use) event
     */
    socket.on("player:tap", (data: { playerId: string }) => {
      connectionManager.updateActivity(socket.id);

      // Validate game is active
      if (gameEngine.gameState !== "active") {
        socket.emit("player:tap:result", {
          success: false,
          reason: "game_not_active",
          charges: null,
        });
        return;
      }

      // Get player
      const player = gameEngine.getPlayerById(data.playerId);
      if (!player) {
        socket.emit("player:tap:result", {
          success: false,
          reason: "player_not_found",
          charges: null,
        });
        return;
      }

      // Check if player is alive
      if (!player.isAlive) {
        socket.emit("player:tap:result", {
          success: false,
          reason: "player_dead",
          charges: player.getChargeInfo(),
        });
        return;
      }

      // Attempt to use ability
      const result = player.useAbility(gameEngine.gameTime);

      socket.emit("player:tap:result", {
        success: result.success,
        reason: result.reason,
        charges: result.charges,
      });

      logger.debug("SOCKET", "Player tap processed", {
        playerId: data.playerId,
        success: result.success,
        reason: result.reason,
      });
    });

    /**
     * Team switch event — player taps to cycle to next team
     */
    socket.on("team:switch", () => {
      if (!teamManager.isEnabled()) return;
      if (gameEngine.gameState !== "waiting" && gameEngine.gameState !== "pre-game") return;

      const playerId = connectionManager.getPlayerId(socket.id);
      if (!playerId || !connectionManager.isConnected(playerId)) return;

      const newTeamId = teamManager.cyclePlayerTeam(playerId);

      logger.info("SOCKET", "Player switched team", {
        playerId,
        newTeamId,
      });

      // Broadcast updated lobby and team state
      broadcastLobbyUpdate(io);
      broadcastTeamUpdate(io);
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
        // No active game — start lobby disconnect grace period instead of immediate removal
        connectionManager.handleLobbyDisconnect(playerId, socket.id, (expiredPlayerId) => {
          // Grace period expired — remove from team and broadcast updated lobby
          teamManager.removePlayer(expiredPlayerId);
          broadcastLobbyUpdate(io);
        });
        // Don't remove from team — they keep their team spot during grace period
      } else {
        // Game in progress — keep player data for reconnection
        connectionManager.handleDisconnect(socket.id);

        if (playerId && gameEngine.isActive()) {
          gameEngine.handlePlayerDisconnect(playerId);
        }
      }

      // Broadcast updated lobby list to all clients
      broadcastLobbyUpdate(io);
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
}
