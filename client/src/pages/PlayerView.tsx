import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGameState } from "@/hooks/useGameState";
import { useGameStore } from "@/store/gameStore";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import { usePlayerDevice, isDevMode } from "@/hooks/usePlayerDevice";
import { usePlayerAbility } from "@/hooks/usePlayerAbility";
import { useHealthAudio } from "@/hooks/useHealthAudio";
import { socketService } from "@/services/socket";
import { audioManager } from "@/services/audio";
import { getTeamColor } from "@/utils/teamColors";
import PortraitLock from "@/components/player/PortraitLock";
import LobbyScreen from "@/components/player/screens/LobbyScreen";
import PreGameScreen from "@/components/player/screens/PreGameScreen";
import CountdownScreen from "@/components/player/screens/CountdownScreen";
import RoundEndedScreen from "@/components/player/screens/RoundEndedScreen";
import ActiveGameScreen from "@/components/player/screens/ActiveGameScreen";
import DeadScreen from "@/components/player/screens/DeadScreen";
import GameFinishedScreen from "@/components/player/screens/GameFinishedScreen";
import type { PlayerMovePayload } from "@/types/socket.types";

function PlayerView() {
  const navigate = useNavigate();

  const {
    myPlayerId,
    myPlayerNumber,
    myPlayer,
    isWaiting,
    isPreGame,
    isCountdown,
    isActive,
    isRoundEnded,
    isFinished,
    isMyPlayerDead,
    isRoundWinner,
    readyEnabled,
    respawnCountdown,
  } = useGameState();

  const { countdownSeconds, countdownPhase, myIsReady, setMyReady, modeRecap } =
    useGameStore();

  const { permissionsGranted, showPortraitLock } = usePlayerDevice(myPlayerId);
  const { chargeInfo, handleTap } = usePlayerAbility(myPlayerId);

  // HP-based heartbeat sounds (all modes)
  useHealthAudio(myPlayer?.accumulatedDamage, isActive && !isMyPlayerDead);

  const myTeamId = myPlayer?.teamId ?? null;
  const myTeamColor = getTeamColor(myTeamId);
  const playerName = myPlayer?.name || "Player";

  // Handle tap to switch team during pre-game
  const handleTeamSwitch = useCallback(() => {
    if (!isPreGame) return;
    socketService.sendTeamSwitch();
  }, [isPreGame]);

  const handleShakeDetected = useCallback(() => {
    if (!myPlayerId || myIsReady) return;
    setMyReady(true);
    socketService.sendReady(myPlayerId);
    audioManager.playSfx("ready", { volume: 0.5 });
  }, [myPlayerId, myIsReady, setMyReady]);

  const takeDamage = useCallback(() => {
    if (!myPlayerId) return;
    const movementPayload: PlayerMovePayload = {
      playerId: myPlayerId,
      x: 1000,
      y: 1000,
      z: 1000,
      timestamp: Date.now(),
      deviceType: "phone",
    };
    socketService.sendMovement(movementPayload);
  }, [myPlayerId]);

  // Shake detection for ready state (pre-game, between rounds, game end)
  // Pre-game and round-ended both use a ready delay — only allow shaking when enabled
  const shouldDetectShake =
    (((isPreGame || isRoundEnded) && readyEnabled) || isFinished) &&
    !myIsReady &&
    permissionsGranted;

  const { isShaking, shakeProgress } = useShakeDetection({
    threshold: 0.25,
    requiredDuration: 300,
    cooldown: 1000,
    onShake: handleShakeDetected,
    enabled: shouldDetectShake,
  });

  // Check if player has joined (also reacts to kick clearing identity)
  useEffect(() => {
    const playerId = localStorage.getItem("playerId");
    const playerNumber = localStorage.getItem("playerNumber");
    if (!playerId || !playerNumber) {
      navigate("/join");
    }
  }, [navigate, myPlayerId]);

  // Play damage sound when taking damage
  useEffect(() => {
    if (!myPlayer) return;
    if (myPlayer.accumulatedDamage > 0) {
      audioManager.playSfx("damage", { volume: 0.3, noRepeatFor: 1000 });
    }
  }, [myPlayer?.accumulatedDamage]);

  // Play score-up sound when points increase during active gameplay
  const prevPointsRef = useRef(0);
  useEffect(() => {
    const currentPoints = myPlayer?.points ?? 0;
    if (isActive && currentPoints > prevPointsRef.current) {
      audioManager.playSfx("score-up", { volume: 0.7 });
    }
    prevPointsRef.current = currentPoints;
  }, [myPlayer?.points, isActive]);

  // Loop war drums while Berserker's Toughened effect is active
  const isToughened =
    myPlayer?.statusEffects.some((e) => e.type === "Toughened") ?? false;
  useEffect(() => {
    if (isToughened) {
      // Could think of looping this if we ever want to extend it over 3 seconds
      audioManager.playSfx("berserk-war-drums", { volume: 0.7 });
    } else {
      audioManager.stop("berserk-war-drums");
    }
    return () => {
      audioManager.stop("berserk-war-drums");
    };
  }, [isToughened]);

  // Reset ready state when countdown starts (new round)
  useEffect(() => {
    if (isCountdown) {
      setMyReady(false);
    }
  }, [isCountdown, setMyReady]);

  if (!myPlayerNumber || !myPlayerId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const shakeProps = {
    isReady: myIsReady,
    isShaking,
    shakeProgress,
    onReadyClick: handleShakeDetected,
    isDevMode,
  };

  return (
    <div className="player-view relative w-screen h-screen overflow-hidden">
      {showPortraitLock && <PortraitLock />}

      {isWaiting && !isCountdown && (
        <LobbyScreen playerNumber={myPlayerNumber} playerName={playerName} />
      )}

      {isPreGame && !isCountdown && (
        <PreGameScreen
          playerNumber={myPlayerNumber}
          playerName={playerName}
          modeRecap={modeRecap}
          teamColor={myTeamColor}
          onTeamSwitch={handleTeamSwitch}
          {...shakeProps}
        />
      )}

      {isCountdown && (
        <CountdownScreen
          playerNumber={myPlayerNumber}
          playerName={playerName}
          countdownSeconds={countdownSeconds}
          countdownPhase={countdownPhase ?? "countdown"}
        />
      )}

      {isRoundEnded && !isCountdown && (
        <RoundEndedScreen
          playerNumber={myPlayerNumber}
          playerName={playerName}
          totalPoints={myPlayer?.totalPoints || myPlayer?.points || 0}
          isRoundWinner={isRoundWinner}
          readyEnabled={readyEnabled}
          {...shakeProps}
        />
      )}

      {!isPreGame &&
        !isWaiting &&
        !isRoundEnded &&
        !isMyPlayerDead &&
        myPlayer && (
          <ActiveGameScreen
            player={myPlayer}
            playerNumber={myPlayerNumber}
            teamId={myTeamId}
            chargeInfo={chargeInfo}
            onTap={handleTap}
            onTakeDamage={takeDamage}
            isDevMode={isDevMode}
          />
        )}

      {isMyPlayerDead &&
        !isCountdown &&
        !isRoundEnded &&
        !isWaiting &&
        !isFinished && (
          <DeadScreen
            teamId={myTeamId}
            respawnCountdown={respawnCountdown}
            deathCount={myPlayer?.deathCount ?? 0}
            points={myPlayer?.points || 0}
          />
        )}

      {isFinished && (
        <GameFinishedScreen
          playerNumber={myPlayerNumber}
          playerName={playerName}
          totalPoints={myPlayer?.totalPoints || myPlayer?.points || 0}
          {...shakeProps}
        />
      )}
    </div>
  );
}

export default PlayerView;
