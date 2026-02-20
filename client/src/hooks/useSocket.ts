import { useEffect, useRef } from "react";
import { socketService } from "@/services/socket";
import { useGameStore } from "@/store/gameStore";
import { audioManager } from "@/services/audio";
import { getModeDisplayName } from "@/utils/modeMapping";

export function useSocket() {
  const respawnTtsTimeouts = useRef<ReturnType<typeof setTimeout>[]>(
    []
  ).current;
  const {
    setConnected,
    updatePlayer,
    updatePlayers,
    setGameTime,
    setGameState,
    setMode,
    setRound,
    setLatestEvent,
    setScores,
    setCountdown,
    resetReadyState,
    myPlayerId,
    myPlayerNumber,
  } = useGameStore();

  useEffect(() => {
    // Connection status — stored as named ref so cleanup removes ONLY this listener,
    // leaving useReconnect.ts listeners intact (socketService.off without callback
    // would nuke all listeners for the event).
    const onConnectionChange = (connected: boolean) => {
      setConnected(connected);
    };
    socketService.on("connection:change", onConnectionChange);

    // Player joined
    socketService.onPlayerJoined((data) => {
      if (data.success) {
        // Store session data
        localStorage.setItem("sessionToken", data.sessionToken);
        localStorage.setItem("playerId", data.playerId);
        localStorage.setItem("playerNumber", data.playerNumber.toString());

        // Store team assignment if present
        if (data.teamId != null) {
          useGameStore.getState().setTeamsEnabled(true);
        }
      }
    });

    // Player reconnected — same named-ref pattern to avoid nuking useReconnect listeners.
    const onPlayerReconnected = (data: { success: boolean; playerId: string; playerNumber: number; player: any }) => {
      if (data.success) {
        useGameStore.getState().setMyPlayer(data.playerId, data.playerNumber);
        updatePlayer(data.player);
      }
    };
    socketService.onPlayerReconnected(onPlayerReconnected);

    // Game tick - includes player states with damage/health info
    socketService.onGameTick(
      ({ gameTime, roundTimeRemaining, players: tickPlayers }) => {
        setGameTime(gameTime);
        useGameStore
          .getState()
          .setRoundTimeRemaining(roundTimeRemaining ?? null);

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
              deathCount: tp.deathCount,
              // Connection status
              isDisconnected: tp.isDisconnected,
              graceTimeRemaining: tp.graceTimeRemaining,
              // Preserve fields not in tick
              number: existing?.number ?? 0,
              role: existing?.role ?? "",
              statusEffects: tp.statusEffects,
              // Preserve team assignment (set from tick if available, else from existing)
              teamId: (tp as any).teamId ?? existing?.teamId ?? null,
            };
          });
          updatePlayers(mergedPlayers);
        }
      }
    );

    // Player death
    socketService.onPlayerDeath(({ victimId, victimNumber, victimName }) => {
      setLatestEvent(`Player #${victimNumber} ${victimName} eliminated!`);

      // If it's me
      if (victimId === myPlayerId) {
        audioManager.playSfx("death", { volume: 0.5 });
      }
    });

    socketService.onGameStart(({ mode, totalRounds, sensitivity }) => {
      setMode(mode);
      // Determine if teams are enabled from store
      const teamsEnabled = useGameStore.getState().teamsEnabled;
      useGameStore.getState().setModeRecap({
        modeName: getModeDisplayName(mode, teamsEnabled),
        roundCount: totalRounds,
        sensitivity: sensitivity || "medium",
      });
      // Ensure ready is enabled — no delay for pre-game, players can ready immediately
      useGameStore.getState().setReadyEnabled(true);
      setGameState("pre-game");
    });

    // Round start
    socketService.onRoundStart(({ roundNumber, totalRounds, gameEvents }) => {
      setRound(roundNumber, totalRounds);
      useGameStore.getState().setActiveGameEvents(gameEvents ?? []);
      setGameState("active");
    });

    // Round end
    socketService.onRoundEnd(({ scores, winnerId, teamScores }) => {
      setScores(scores);
      setGameState("round-ended");

      // Store team scores if present
      useGameStore.getState().setTeamScores(teamScores ?? null);

      // Set round winner and disable ready (delay period starts)
      useGameStore.getState().setRoundWinnerId(winnerId);
      useGameStore.getState().setReadyEnabled(false);

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
    socketService.onGameEnd(({ scores, winner, teamScores }) => {
      // Store team scores if present
      useGameStore.getState().setTeamScores(teamScores ?? null);
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
      setMode(null);

      if (winner) {
        setLatestEvent(`${winner.name} is the champion!`);
      }
    });

    // Vampire bloodlust (visual/state effects only — heartbeat audio is handled by useHealthAudio)
    socketService.onVampireBloodlust(() => {});

    // Shared logic for role:assigned and role:updated
    function updateRoleState(roleData: {
      name: string;
      displayName: string;
      description: string;
      difficulty: string;
      targetNumber?: number;
      targetName?: string;
    }) {
      const store = useGameStore.getState();
      const previousTarget = store.myTarget;

      store.setMyRole({
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        difficulty: roleData.difficulty,
        targetNumber: roleData.targetNumber,
        targetName: roleData.targetName,
      });

      if (roleData.targetNumber && roleData.targetName) {
        store.setMyTarget({
          number: roleData.targetNumber,
          name: roleData.targetName,
        });
      } else {
        store.setMyTarget(null);
      }

      const targetChanged =
        roleData.targetNumber !== previousTarget?.number;

      return { targetChanged };
    }

    // Role assigned (initial assignment during countdown)
    socketService.onRoleAssigned((roleData) => {
      updateRoleState(roleData);

      // Wait for intro to finish, then speak
      setTimeout(() => {
        let speech = `You are the ${roleData.displayName}. ${roleData.description}.`;

        if (roleData.targetNumber) {
          speech += ` Your target is Player number ${roleData.targetNumber}.`;
        }

        audioManager.speak(speech);
      }, 500);
    });

    // Role updated (mid-game changes, e.g. Executioner gets a new target)
    socketService.onRoleUpdated((roleData) => {
      const { targetChanged } = updateRoleState(roleData);

      if (targetChanged && roleData.targetNumber) {
        audioManager.speak(`New target: number ${roleData.targetNumber}`);
      }
    });

    socketService.onTeamUpdate(({ teams }) => {
      useGameStore.getState().setTeams(teams);
    });

    // Team selection phase
    socketService.onTeamSelection(({ active }) => {
      useGameStore.getState().setTeamSelectionActive(active);
      if (active) {
        // Reset ready state when entering team selection
        resetReadyState();
      }
    });

    // Lobby update (players joining/leaving before game starts)
    socketService.onLobbyUpdate(({ players }) => {
      // Only process lobby updates in waiting/pre-game state - ignore during active gameplay
      // Otherwise, disconnect events would reset points/totalPoints to 0
      const currentState = useGameStore.getState().gameState;
      if (currentState !== "waiting" && currentState !== "pre-game") {
        return;
      }

      // Convert lobby players to PlayerState format, preserving isReady and isConnected from backend
      const playerStates = players.map((p) => ({
        id: p.id,
        name: p.name,
        number: p.number,
        role: "",
        isAlive: p.isAlive,
        isReady: p.isReady ?? false,
        isConnected: p.isConnected ?? true,
        points: 0,
        totalPoints: 0,
        toughness: 1.0,
        accumulatedDamage: 0,
        statusEffects: [],
        teamId: p.teamId ?? null,
      }));
      updatePlayers(playerStates);
    });

    // Countdown events
    socketService.onCountdown(
      ({ secondsRemaining, phase, roundNumber, totalRounds }) => {
        setCountdown(secondsRemaining, phase);
        setGameState("countdown");
        setRound(roundNumber, totalRounds);
        // Team selection ends when game starts
        useGameStore.getState().setTeamSelectionActive(false);

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
      }
    );

    // Ready enabled/disabled events (delay after round end)
    socketService.onReadyEnabled(({ enabled }) => {
      useGameStore.getState().setReadyEnabled(enabled);
    });

    // Game stopped (emergency stop or return to lobby)
    socketService.onGameStopped(() => {
      setGameState("waiting");
      setMode(null);
      setLatestEvent("Game stopped");
      useGameStore.getState().setTeamSelectionActive(false);
      // Reset ready state - server resets all ready states, so client must sync
      resetReadyState();
    });

    // Player respawn - update player as alive again
    socketService.onPlayerRespawn(({ playerId, playerName, playerNumber }) => {
      setLatestEvent(`Player #${playerNumber} ${playerName} respawned!`);

      // Update player state in store
      const existingPlayers = useGameStore.getState().players;
      const updatedPlayers = existingPlayers.map((p) =>
        p.id === playerId ? { ...p, isAlive: true, accumulatedDamage: 0 } : p
      );
      updatePlayers(updatedPlayers);

      // If it's me, clear respawn countdown and play respawn SFX
      if (playerId === myPlayerId) {
        useGameStore.getState().setRespawnCountdown(null);
        audioManager.playSfx("respawn", { volume: 0.5 });
      }
    });

    // Respawn pending - start countdown on dying player's phone
    socketService.onPlayerRespawnPending(({ respawnIn }) => {
      useGameStore.getState().setRespawnCountdown(respawnIn);

      // Clear any previous respawn TTS timeouts to prevent duplicates
      respawnTtsTimeouts.forEach(clearTimeout);
      respawnTtsTimeouts.length = 0;

      // Play TTS countdown at 3 seconds
      // TODO: replace with real voice
      respawnTtsTimeouts.push(
        setTimeout(() => {
          audioManager.playSfx("respawning-in", { volume: 1 });
        }, Math.max(0, respawnIn - 4000)),
        setTimeout(() => {
          audioManager.playSfx("countdown", { volume: 0.5 });
        }, Math.max(0, respawnIn - 3000))
      );
    });

    // Player kicked from lobby
    socketService.onPlayerKicked(({ reason }) => {
      // Clear session data so player is treated as new
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("playerId");
      localStorage.removeItem("playerNumber");
      setLatestEvent(reason || "You were removed from the game");
      setGameState("waiting");
      // Clear store identity so PlayerView redirects to /join
      useGameStore.getState().setMyPlayer("", 0);
    });

    // Base events (Domination mode)
    socketService.onBaseStatus(({ bases }) => {
      useGameStore.getState().setBases(bases);
    });

    socketService.onBasePoint(({ teamScores }) => {
      useGameStore.getState().setDominationTeamScores(teamScores);
    });

    socketService.onBaseCaptured(({ baseId, teamId }) => {
      // Update the specific base in the store
      const store = useGameStore.getState();
      const updatedBases = store.bases.map((b) =>
        b.baseId === baseId
          ? { ...b, ownerTeamId: teamId, controlProgress: 0 }
          : b
      );
      store.setBases(updatedBases);
    });

    socketService.onDominationWin(({ teamScores }) => {
      useGameStore.getState().setDominationTeamScores(teamScores);
    });

    // Error handling
    socketService.onError(({ message, code }) => {
      console.error("Socket error:", code, message);
      setLatestEvent(`Error: ${message}`);
    });

    // Cleanup
    return () => {
      // Clear respawn TTS timeouts to prevent duplicate audio
      respawnTtsTimeouts.forEach(clearTimeout);
      respawnTtsTimeouts.length = 0;

      // Use specific callbacks for events shared with useReconnect.ts — removing
      // without a callback would nuke all listeners (including useReconnect's).
      socketService.off("connection:change", onConnectionChange);
      socketService.off("player:reconnected", onPlayerReconnected);
      socketService.off("player:joined");
      socketService.off("game:tick");
      socketService.off("player:death");
      socketService.off("round:start");
      socketService.off("round:end");
      socketService.off("game:start");
      socketService.off("game:end");
      socketService.off("vampire:bloodlust");
      socketService.off("role:assigned");
      socketService.off("role:updated");
      socketService.off("lobby:update");
      socketService.off("team:update");
      socketService.off("team:selection");
      socketService.off("game:countdown");
      socketService.off("ready:enabled");
      socketService.off("game:stopped");
      socketService.off("player:respawn");
      socketService.off("player:respawn-pending");
      socketService.off("player:kicked");
      socketService.off("base:status");
      socketService.off("base:point");
      socketService.off("base:captured");
      socketService.off("domination:win");
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
