import { useEffect, useRef, useCallback } from "react";
import { useGameState } from "@/hooks/useGameState";
import { useGameStore } from "@/store/gameStore";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import { usePlayerDevice, isDevMode } from "@/hooks/usePlayerDevice";
import { usePlayerAbility } from "@/hooks/usePlayerAbility";
import { useHealthAudio } from "@/hooks/useHealthAudio";
import { useReconnect } from "@/hooks/useReconnect";
import { socketService } from "@/services/socket";
import { audioManager } from "@/services/audio";
import { getTeamColor } from "@/utils/teamColors";
import JoinForm from "@/components/player/JoinForm";
import DisconnectedOverlay from "@/components/player/DisconnectedOverlay";
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

  const {
    countdownSeconds,
    countdownPhase,
    myIsReady,
    setMyReady,
    modeRecap,
    setMyPlayer,
    clearIdentity,
  } = useGameStore();

  const { isReconnecting, isGivenUp, retryOnce, resetReconnect } =
    useReconnect();

  const { permissionsGranted, showPortraitLock } = usePlayerDevice(myPlayerId);
  const { chargeInfo, handleTap } = usePlayerAbility(myPlayerId);

  // HP-based heartbeat sounds (all modes)
  useHealthAudio(myPlayer?.accumulatedDamage, isActive && !isMyPlayerDead);

  const myTeamId = myPlayer?.teamId ?? null;
  const myTeamColor = getTeamColor(myTeamId);
  const playerName = myPlayer?.name || "Player";

  // On mount: hydrate identity from localStorage so game UI shows on refresh
  // instead of the join form (reconnect runs in background via useReconnect)
  useEffect(() => {
    const playerId = localStorage.getItem("playerId");
    const playerNumber = localStorage.getItem("playerNumber");
    if (playerId && playerNumber) {
      setMyPlayer(playerId, parseInt(playerNumber));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRejoin = useCallback(() => {
    resetReconnect(); // clear isGivenUp so the overlay doesn't reappear after joining
    localStorage.removeItem("sessionToken");
    clearIdentity();
  }, [clearIdentity, resetReconnect]);

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

  // Damage sound: leading-edge (plays on the very first hit of a burst).
  // inDamageBurst is reset when the server signals burst end via player:damage,
  // so the next distinct burst can trigger the sound again.
  const inDamageBurstRef = useRef(false);
  const prevDamageForSoundRef = useRef(0);
  useEffect(() => {
    const current = myPlayer?.accumulatedDamage ?? 0;
    const prev = prevDamageForSoundRef.current;
    prevDamageForSoundRef.current = current;
    if (current > prev && !inDamageBurstRef.current) {
      inDamageBurstRef.current = true;
      audioManager.playSfx("damage", { volume: 0.3 });
    }
  }, [myPlayer?.accumulatedDamage]);

  useEffect(() => {
    if (!myPlayerId) return;
    const handler = () => {
      inDamageBurstRef.current = false;
    };
    socketService.onPlayerDamage(handler);
    return () => socketService.off("player:damage", handler);
  }, [myPlayerId]);

  // Play heal sound when accumulatedDamage decreases
  const prevAccumDamageRef = useRef(0);
  useEffect(() => {
    const current = myPlayer?.accumulatedDamage ?? 0;
    const prev = prevAccumDamageRef.current;
    prevAccumDamageRef.current = current;
    if (isActive && !isMyPlayerDead && current < prev && prev > 0) {
      audioManager.playSfx("heal", { volume: 0.7 });
    }
  }, [myPlayer?.accumulatedDamage, isActive, isMyPlayerDead]);

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

  // No session yet — show join form inline (no navigation needed)
  if (!myPlayerId) {
    return <JoinForm />;
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

      {/* Disconnected overlay — shown after giving up on reconnection */}
      {isGivenUp && (
        <DisconnectedOverlay
          isReconnecting={isReconnecting}
          onRetry={retryOnce}
          onRejoin={handleRejoin}
        />
      )}

      {isWaiting && !isCountdown && (
        <LobbyScreen playerNumber={myPlayerNumber!} playerName={playerName} />
      )}

      {isPreGame && !isCountdown && (
        <PreGameScreen
          playerNumber={myPlayerNumber!}
          playerName={playerName}
          modeRecap={modeRecap}
          teamColor={myTeamColor}
          onTeamSwitch={handleTeamSwitch}
          {...shakeProps}
        />
      )}

      {isCountdown && (
        <CountdownScreen
          playerNumber={myPlayerNumber!}
          playerName={playerName}
          countdownSeconds={countdownSeconds}
          countdownPhase={countdownPhase ?? "countdown"}
        />
      )}

      {isRoundEnded && !isCountdown && (
        <RoundEndedScreen
          playerNumber={myPlayerNumber!}
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
            playerNumber={myPlayerNumber!}
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
          playerNumber={myPlayerNumber!}
          playerName={playerName}
          totalPoints={myPlayer?.totalPoints || myPlayer?.points || 0}
          {...shakeProps}
        />
      )}
    </div>
  );
}

export default PlayerView;
