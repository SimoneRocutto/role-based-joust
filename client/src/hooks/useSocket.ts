import { useEffect } from "react";
import { socketService } from "@/services/socket";
import { useGameStore } from "@/store/gameStore";
import { audioManager } from "@/services/audio";

export function useSocket() {
  const {
    setConnected,
    updatePlayer,
    updatePlayers,
    setGameTime,
    setGameState,
    setRound,
    setLatestEvent,
    setScores,
    myPlayerId,
    myPlayerNumber,
  } = useGameStore();

  useEffect(() => {
    // Connection status
    socketService.on("connection:change", (connected: boolean) => {
      setConnected(connected);
    });

    // Player joined
    socketService.onPlayerJoined((data) => {
      if (data.success) {
        // Store session data
        localStorage.setItem("sessionToken", data.sessionToken);
        localStorage.setItem("playerId", data.playerId);
        localStorage.setItem("playerNumber", data.playerNumber.toString());
      }
    });

    // Player reconnected
    socketService.onPlayerReconnected((data) => {
      if (data.success) {
        updatePlayer(data.player);
      }
    });

    // Game tick
    socketService.onGameTick(({ gameTime }) => {
      setGameTime(gameTime);
    });

    // Player death
    socketService.onPlayerDeath(({ victimId, victimNumber, victimName }) => {
      setLatestEvent(`Player #${victimNumber} ${victimName} eliminated!`);

      // If it's me
      if (victimId === myPlayerId) {
        audioManager.play("death", { volume: 0.5 });
      }
    });

    // Round start
    socketService.onRoundStart(({ roundNumber, totalRounds }) => {
      setRound(roundNumber, totalRounds);
      setGameState("active");
    });

    // Round end
    socketService.onRoundEnd(({ scores }) => {
      setScores(scores);
      setGameState("round-ended");
    });

    // Game end
    socketService.onGameEnd(({ scores, winner }) => {
      setScores(scores);
      setGameState("finished");
      audioManager.playMusic("victory", { loop: false, volume: 0.6 });

      if (winner) {
        setLatestEvent(`${winner.name} is the champion!`);
      }
    });

    // Vampire bloodlust
    socketService.onVampireBloodlust(({ vampireId, active }) => {
      // If it's me
      if (vampireId === myPlayerId) {
        if (active) {
          audioManager.loop("low-health-heartbeat", { volume: 0.6 });
        } else {
          audioManager.stop("low-health-heartbeat");
        }
      }
    });

    // Role assigned
    socketService.onRoleAssigned((roleData) => {
      // Play intro sound
      audioManager.play("role-reveal", { volume: 0.7 });

      // Wait for intro to finish, then speak
      setTimeout(() => {
        let speech = `You are the ${roleData.displayName}. ${roleData.description}`;

        if (roleData.targetNumber) {
          speech += ` Your target is Player number ${roleData.targetNumber}.`;
        }

        audioManager.speak(speech);
      }, 500);
    });

    // Lobby update (players joining/leaving before game starts)
    socketService.onLobbyUpdate(({ players }) => {
      // Convert lobby players to PlayerState format
      const playerStates = players.map((p) => ({
        id: p.id,
        name: p.name,
        number: p.number,
        role: '',
        isAlive: p.isAlive,
        points: 0,
        totalPoints: 0,
        toughness: 1.0,
        accumulatedDamage: 0,
        statusEffects: [],
      }));
      updatePlayers(playerStates);
    });

    // Error handling
    socketService.onError(({ message, code }) => {
      console.error("Socket error:", code, message);
      setLatestEvent(`Error: ${message}`);
    });

    // Cleanup
    return () => {
      socketService.off("connection:change");
      socketService.off("player:joined");
      socketService.off("player:reconnected");
      socketService.off("game:tick");
      socketService.off("player:death");
      socketService.off("round:start");
      socketService.off("round:end");
      socketService.off("game:end");
      socketService.off("vampire:bloodlust");
      socketService.off("role:assigned");
      socketService.off("lobby:update");
      socketService.off("error");
    };
  }, [myPlayerId, myPlayerNumber]);

  return {
    isConnected: useGameStore((state) => state.isConnected),
    sendMovement: socketService.sendMovement.bind(socketService),
    joinGame: socketService.joinGame.bind(socketService),
    reconnect: socketService.reconnect.bind(socketService),
  };
}
