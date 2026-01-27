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
    setCountdown,
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

    // Game tick - includes player states with damage/health info
    socketService.onGameTick(({ gameTime, players: tickPlayers }) => {
      setGameTime(gameTime);

      // Merge tick player data with existing state to preserve fields like number, role, etc.
      if (tickPlayers && tickPlayers.length > 0) {
        const existingPlayers = useGameStore.getState().players;
        const mergedPlayers = tickPlayers.map((tp) => {
          const existing = existingPlayers.find((ep) => ep.id === tp.id);
          return {
            ...existing,
            id: tp.id,
            name: tp.name,
            isAlive: tp.isAlive,
            accumulatedDamage: tp.accumulatedDamage,
            points: tp.points,
            totalPoints: tp.totalPoints,
            toughness: tp.toughness,
            // Connection status
            isDisconnected: tp.isDisconnected,
            graceTimeRemaining: tp.graceTimeRemaining,
            // Preserve existing fields if not in tick
            number: existing?.number ?? 0,
            role: existing?.role ?? "",
            statusEffects: existing?.statusEffects ?? [],
          };
        });
        updatePlayers(mergedPlayers);
      }
    });

    // Player death
    socketService.onPlayerDeath(({ victimId, victimNumber, victimName }) => {
      setLatestEvent(`Player #${victimNumber} ${victimName} eliminated!`);

      // If it's me
      if (victimId === myPlayerId) {
        audioManager.play("effects/death", { volume: 0.5 });
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

      // Update player points from scores (since game:tick stops during round-ended)
      const existingPlayers = useGameStore.getState().players;
      const updatedPlayers = existingPlayers.map((player) => {
        const scoreEntry = scores.find((s) => s.playerId === player.id);
        if (scoreEntry) {
          return {
            ...player,
            points: scoreEntry.score,
            totalPoints: scoreEntry.score,
          };
        }
        return player;
      });
      updatePlayers(updatedPlayers);
    });

    // Game end
    socketService.onGameEnd(({ scores, winner }) => {
      // Update player points FIRST from final scores (before state change triggers re-render)
      const existingPlayers = useGameStore.getState().players;
      const updatedPlayers = existingPlayers.map((player) => {
        const scoreEntry = scores.find((s) => s.playerId === player.id);
        if (scoreEntry) {
          return {
            ...player,
            points: scoreEntry.score,
            totalPoints: scoreEntry.score,
          };
        }
        return player;
      });
      updatePlayers(updatedPlayers);

      // Now set scores and game state
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
      // Store role in state
      useGameStore.getState().setMyRole({
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        difficulty: roleData.difficulty,
        targetNumber: roleData.targetNumber,
        targetName: roleData.targetName,
      });

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
      // Only process lobby updates in waiting state - ignore during active gameplay
      // Otherwise, disconnect events would reset points/totalPoints to 0
      const currentState = useGameStore.getState().gameState;
      if (currentState !== "waiting") {
        return;
      }

      // Convert lobby players to PlayerState format, preserving isReady from backend
      const playerStates = players.map((p) => ({
        id: p.id,
        name: p.name,
        number: p.number,
        role: "",
        isAlive: p.isAlive,
        isReady: p.isReady ?? false,
        points: 0,
        totalPoints: 0,
        toughness: 1.0,
        accumulatedDamage: 0,
        statusEffects: [],
      }));
      updatePlayers(playerStates);
    });

    // Countdown events
    socketService.onCountdown(({ secondsRemaining, phase }) => {
      setCountdown(secondsRemaining, phase);
      setGameState("countdown");

      // Reset ready state for all players when countdown starts
      // This clears the checkmarks from the previous round
      if (phase === "countdown") {
        const existingPlayers = useGameStore.getState().players;
        const resetPlayers = existingPlayers.map((p) => ({
          ...p,
          isReady: false,
        }));
        updatePlayers(resetPlayers);
      }

      // Play countdown sounds
      if (
        phase === "countdown" &&
        secondsRemaining <= 3 &&
        secondsRemaining > 0
      ) {
        audioManager.play("effects/countdown-beep", { volume: 0.5 });
      } else if (phase === "go") {
        audioManager.play("effects/countdown-go", { volume: 0.7 });
      }
    });

    // Game stopped (emergency stop)
    socketService.onGameStopped(() => {
      setGameState("waiting");
      setLatestEvent("Game stopped");
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
      socketService.off("game:countdown");
      socketService.off("game:stopped");
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
