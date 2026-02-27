import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/hooks/useGameState";
import { useModeEvents } from "@/hooks/useModeEvents";
import { useGameStore } from "@/store/gameStore";
import { apiService } from "@/services/api";
import { socketService } from "@/services/socket";
import PlayerGrid from "@/components/dashboard/PlayerGrid";
import GameState from "@/components/dashboard/GameState";
import EventFeed from "@/components/dashboard/EventFeed";
import AdminControls from "@/components/dashboard/AdminControls";
import PreGameControls from "@/components/dashboard/PreGameControls";
import Scoreboard from "@/components/dashboard/Scoreboard";
import CountdownDisplay from "@/components/dashboard/CountdownDisplay";
import BaseStatusPanel from "@/components/dashboard/BaseStatusPanel";
import { useAudioStore } from "@/store/audioStore";
import { audioManager } from "@/services/audio";
import { DebugProvider } from "@/contexts/DebugContext";

function DashboardView() {
  const {
    isWaiting,
    isPreGame,
    isCountdown,
    isActive,
    isRoundEnded,
    isFinished,
    aliveCount,
  } = useGameState();

  const {
    updatePlayers,
    setGameState,
    setScores,
    setDevMode,
    setPlayerReady,
    setReadyCount,
    setRound,
    setMode,
  } = useGameStore();
  const isAudioUnlocked = useAudioStore((state) => state.isAudioUnlocked);
  const { background } = useModeEvents();
  const lastReadyPlayerRef = useRef<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const handleStopGame = async () => {
    if (isStopping) return;

    setIsStopping(true);
    try {
      await apiService.stopGame();

      setGameState("waiting");
      setScores([]);

      const lobbyResult = await apiService.getLobbyPlayers();
      if (lobbyResult.success && lobbyResult.players.length > 0) {
        const playerStates = lobbyResult.players.map((p: any) => ({
          id: p.id,
          name: p.name,
          number: p.number,
          role: "",
          isAlive: p.isAlive,
          points: 0,
          totalPoints: 0,
          toughness: 1.0,
          accumulatedDamage: 0,
          statusEffects: [],
        }));
        updatePlayers(playerStates);
      }
    } catch (error) {
      console.error("Failed to stop game:", error);
      window.location.reload();
    } finally {
      setIsStopping(false);
    }
  };

  // Fetch current state on mount (for page refresh)
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        // Fetch dev mode config
        const configResult = await apiService.getGameConfig();
        if (configResult.success) {
          // Check for ?mode=production URL override
          const urlParams = new URLSearchParams(window.location.search);
          const modeOverride = urlParams.get("mode");
          const effectiveDevMode =
            modeOverride === "production" ? false : configResult.devMode;
          setDevMode(effectiveDevMode);
        }

        // Fetch lobby players
        const lobbyResult = await apiService.getLobbyPlayers();
        if (lobbyResult.success && lobbyResult.players.length > 0) {
          const playerStates = lobbyResult.players.map((p: any) => ({
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

          // Calculate initial ready count
          const readyCount = playerStates.filter((p: any) => p.isReady).length;
          setReadyCount({ ready: readyCount, total: playerStates.length });
        }

        // Fetch game state if game is running
        const gameResult = await apiService.getGameState();
        if (gameResult.success && gameResult.state) {
          const state = gameResult.state;
          if (state.state !== "waiting") {
            setGameState(state.state);
            // Restore round counter
            if (state.currentRound) {
              setRound(state.currentRound, state.roundCount || state.currentRound);
            }
            // Restore mode name
            if (state.mode) {
              setMode(state.mode);
            }
            // Restore final scores for game-end screen
            if (state.state === "finished" && state.finalScores) {
              setScores(state.finalScores);
            }
            // Update players from game state
            if (state.players && state.players.length > 0) {
              updatePlayers(state.players);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial state:", err);
      }
    };

    fetchInitialState();
  }, []);

  // Listen for ready events
  useEffect(() => {
    socketService.onPlayerReady((data) => {
      setPlayerReady(data.playerId, data.isReady);

      if (data.isReady) {
        lastReadyPlayerRef.current = data.playerId;
      }
    });

    socketService.onReadyCountUpdate((data) => {
      setReadyCount(data);
    });

    return () => {
      socketService.off("player:ready");
      socketService.off("ready:update");
    };
  }, [setPlayerReady, setReadyCount]);

  // Play countdown sound on dashboard
  useEffect(() => {
    socketService.onCountdown(({ secondsRemaining, phase }) => {
      if (phase === "countdown" && secondsRemaining == 3) {
        audioManager.playSfx("countdown", { volume: 0.5 });
      }
    });

    return () => {
      socketService.off("game:countdown");
    };
  }, []);

  // Background music management
  useEffect(() => {
    // Only play music after user interaction (browser autoplay policy)
    if (!isAudioUnlocked) return;

    if (isWaiting || isPreGame) {
      audioManager.playMusic("lobby-music", { loop: true, volume: 0.4 });
    } else if (isCountdown) {
      // Play tension buildup music during countdown
      audioManager.playMusic("tension-medium", { loop: true, volume: 0.4 });
    } else if (isActive) {
      // Todo use a different music when only 3 players remain
      if (aliveCount <= 3) {
        audioManager.playMusic("tension-medium", { loop: true, volume: 0.5 });
      } else {
        audioManager.playMusic("tension-medium", { loop: true, volume: 0.4 });
      }
    } else if (isRoundEnded) {
      // Loop victory music between rounds so it doesn't stop
      // Todo add round victory music
      audioManager.playMusic("tension-medium", { loop: true, volume: 0.5 });
    } else if (isFinished) {
      // Don't loop at game end - it's a final fanfare
      audioManager.playMusic("victory", { loop: false, volume: 0.6 });
    }
  }, [
    isWaiting,
    isPreGame,
    isCountdown,
    isActive,
    isRoundEnded,
    isFinished,
    aliveCount,
    isAudioUnlocked,
  ]);

  // Round timer TTS cues (30s, 5-4-3-2-1, time up)
  const firedThresholds = useRef<Set<number>>(new Set());
  const roundTimeRemaining = useGameStore((state) => state.roundTimeRemaining);
  const mode = useGameStore((state) => state.mode);

  useEffect(() => {
    // Reset thresholds when round changes or game stops
    if (!isActive || roundTimeRemaining === null) {
      firedThresholds.current.clear();
      return;
    }

    const thresholds = [
      { ms: 30000, speech: "30 seconds left" },
      { ms: 5000, speech: "5" },
      { ms: 4000, speech: "4" },
      { ms: 3000, speech: "3" },
      { ms: 2000, speech: "2" },
      { ms: 1000, speech: "1" },
      { ms: 0, speech: "Time up!" },
    ];

    for (const { ms, speech } of thresholds) {
      if (roundTimeRemaining <= ms && !firedThresholds.current.has(ms)) {
        firedThresholds.current.add(ms);
        audioManager.speak(speech);
      }
    }
  }, [roundTimeRemaining, isActive]);

  return (
    <DebugProvider>
    <div
      className="min-h-screen max-h-screen flex flex-col text-white overflow-hidden"
      style={{ background, transition: "background 0.5s ease-in-out" }}
    >
      {/* Header */}
      <GameState />

      {/* Countdown Overlay */}
      {isCountdown && <CountdownDisplay />}

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-scroll">
        {/* Admin Controls (only show in waiting/lobby) */}
        {isWaiting && (
          <div className="mb-6">
            <AdminControls />
          </div>
        )}

        {/* Pre-game ready phase */}
        {isPreGame && (
          <>
            <div className="mb-6">
              <PreGameControls />
            </div>
            <PlayerGrid />
            <div className="mt-6">
              {mode === "domination" && <BaseStatusPanel />}
            </div>
          </>
        )}

        {/* Active gameplay phases — player grid only shown while game is running */}
        {(isCountdown || isActive) && (
          <>
            {mode === "domination" && <BaseStatusPanel />}
            <PlayerGrid />

            {/* Stop Game button during active gameplay */}
            <div className="mt-6 text-center">
              <button
                onClick={handleStopGame}
                disabled={isStopping}
                className={`px-8 py-3 rounded-lg text-lg font-bold transition-colors ${
                  isStopping
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isStopping ? "STOPPING..." : "STOP GAME"}
              </button>
            </div>
          </>
        )}

        {/* Scoreboard (round end or game end) — full stage, no player grid */}
        {(isRoundEnded || isFinished) && <Scoreboard />}
      </div>

      {/* Event Feed */}
      <EventFeed />
    </div>
    </DebugProvider>
  );
}

export default DashboardView;
