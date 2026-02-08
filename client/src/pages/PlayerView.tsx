import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGameState } from "@/hooks/useGameState";
import { useGameStore } from "@/store/gameStore";
import { useAccelerometer } from "@/hooks/useAccelerometer";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import { socketService } from "@/services/socket";
import { requestMotionPermission } from "@/utils/permissions";
import PlayerNumber from "@/components/player/PlayerNumber";
import HealthBackground from "@/components/player/HealthBackground";
import StatusEffects from "@/components/player/StatusEffects";
import TargetDisplay from "@/components/player/TargetDisplay";
import ConnectionStatus from "@/components/player/ConnectionStatus";
import PortraitLock from "@/components/player/PortraitLock";
import DamageFlash from "@/components/player/DamageFlash";
import type { ChargeInfo, PlayerMovePayload } from "@/types/socket.types";
import { audioManager } from "@/services/audio";

// In development mode, allow button click instead of shake
// Use ?mode=production URL param to test production behavior in dev
const getEffectiveDevMode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const modeOverride = urlParams.get("mode");
  if (modeOverride === "production") return false;
  return import.meta.env.DEV;
};

const isDevMode = getEffectiveDevMode();

function PlayerView() {
  const navigate = useNavigate();
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [showPortraitLock, setShowPortraitLock] = useState(false);
  const [chargeInfo, setChargeInfo] = useState<ChargeInfo | null>(null);
  const lastTapTime = useRef<number>(0);

  const {
    myPlayerId,
    myPlayerNumber,
    myPlayer,
    myTarget,
    isWaiting,
    isCountdown,
    isRoundEnded,
    isFinished,
    isMyPlayerDead,
    isRoundWinner,
    readyEnabled,
    respawnCountdown,
  } = useGameState();

  const { countdownSeconds, countdownPhase, myIsReady, setMyReady } =
    useGameStore();

  const { start: startAccelerometer, lastData } = useAccelerometer();
  const { enable: enableWakeLock } = useWakeLock(true);
  const { enter: enterFullscreen } = useFullscreen();

  // Shake detection for ready state
  // Only allow shaking when ready is enabled (after delay period in round-ended state)
  const shouldDetectShake =
    (isWaiting || (isRoundEnded && readyEnabled) || isFinished) &&
    !myIsReady &&
    permissionsGranted;

  const handleShakeDetected = useCallback(() => {
    if (!myPlayerId || myIsReady) return;

    // Mark as ready locally
    setMyReady(true);

    // Send ready event to server
    socketService.sendReady(myPlayerId);

    // Play a feedback sound (optional)
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
    // Send ready event to server
    socketService.sendMovement(movementPayload);
  }, [myPlayerId]);

  // Handle tap for ability use during active game
  const handleTap = useCallback(() => {
    if (!myPlayerId) return;

    // Debounce taps (300ms minimum between taps)
    const now = Date.now();
    if (now - lastTapTime.current < 300) return;
    lastTapTime.current = now;

    // Send tap event to server
    socketService.sendTap(myPlayerId);
  }, [myPlayerId]);

  const { isShaking, shakeProgress } = useShakeDetection({
    threshold: 0.25, // Lowered from 0.5 - more sensitive
    requiredDuration: 300, // Lowered from 500ms - faster detection
    cooldown: 1000,
    onShake: handleShakeDetected,
    enabled: shouldDetectShake,
  });

  // Check if player has joined
  useEffect(() => {
    const playerId = localStorage.getItem("playerId");
    const playerNumber = localStorage.getItem("playerNumber");

    if (!playerId || !playerNumber) {
      // Not joined, redirect to join page
      navigate("/join");
    }
  }, [navigate]);

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      // On iOS, requesting permission outside a user gesture throws an error.
      // Since we validated motion access in JoinView (with user gesture),
      // we trust that permission is already granted and just start the accelerometer.
      // In dev mode, we skip motion validation entirely.

      try {
        // Try to request permission (will succeed on Android, may fail on iOS outside user gesture)
        const motionGranted = await requestMotionPermission();
        if (!motionGranted && !isDevMode) {
          // Only show alert in production mode if permission explicitly denied
          alert(
            "Motion permission denied. Game cannot function without accelerometer access."
          );
          return;
        }
      } catch (error) {
        // iOS throws when requestPermission is called outside user gesture
        // This is expected - permission was already granted in JoinView
        console.log(
          "Motion permission request skipped (likely already granted)"
        );
      }

      // Enable wake lock
      await enableWakeLock();

      // Try to enter fullscreen
      await enterFullscreen();

      setPermissionsGranted(true);

      // Start accelerometer
      startAccelerometer();
    };

    requestPermissions();
  }, []);

  // Send accelerometer data
  useEffect(() => {
    if (!lastData || !myPlayerId || !permissionsGranted) return;

    socketService.sendMovement({
      playerId: myPlayerId,
      x: lastData.x,
      y: lastData.y,
      z: lastData.z,
      timestamp: lastData.timestamp,
      deviceType: "phone",
    });
  }, [lastData, myPlayerId, permissionsGranted]);

  // Detect orientation for portrait lock
  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setShowPortraitLock(isLandscape && window.innerWidth < 1024);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // Play damage sound when taking damage
  useEffect(() => {
    if (!myPlayer) return;

    // Check if player took damage (simplified - in real app track previous damage)
    if (myPlayer.accumulatedDamage > 0) {
      audioManager.playSfx("damage", { volume: 0.3, noRepeatFor: 1000 });
    }
  }, [myPlayer?.accumulatedDamage]);

  // Client-side respawn countdown timer
  const [displayRespawnSeconds, setDisplayRespawnSeconds] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (respawnCountdown === null) {
      setDisplayRespawnSeconds(null);
      return;
    }

    // Set initial seconds
    setDisplayRespawnSeconds(Math.ceil(respawnCountdown / 1000));

    // Start client-side countdown
    const interval = setInterval(() => {
      setDisplayRespawnSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [respawnCountdown]);

  // Reset ready state when countdown starts (new round)
  useEffect(() => {
    if (isCountdown) {
      setMyReady(false);
    }
  }, [isCountdown, setMyReady]);

  // Listen for tap results (ability use)
  useEffect(() => {
    const handleTapResult = (data: {
      success: boolean;
      reason?: string;
      charges: ChargeInfo | null;
    }) => {
      // Update charge info
      if (data.charges) {
        setChargeInfo(data.charges);
      }

      // Play appropriate sound
      if (data.success) {
        audioManager.playSfx("power-activation", { volume: 0.6 });
      } else if (data.reason === "no_charges") {
        audioManager.playSfx("no-charges", { volume: 0.4 });
      }
    };

    socketService.onTapResult(handleTapResult);

    return () => {
      socketService.off("player:tap:result", handleTapResult);
    };
  }, []);

  if (!myPlayerNumber || !myPlayerId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="player-view relative w-screen h-screen overflow-hidden">
      {/* Portrait Lock Overlay */}
      {showPortraitLock && <PortraitLock />}

      {/* Waiting State */}
      {isWaiting && !isCountdown && (
        <div className="fullscreen bg-gray-800 flex flex-col items-center justify-center gap-8 p-8">
          <ConnectionStatus />
          <div className="text-center">
            <div className="text-8xl font-bold text-white mb-4">
              #{myPlayerNumber}
            </div>
            <div className="text-3xl text-gray-300 mb-2">
              {myPlayer?.name || "Player"}
            </div>

            {/* Shake to Ready UI */}
            {!myIsReady ? (
              <div className="mt-8 space-y-4">
                {isDevMode ? (
                  <>
                    <button
                      onClick={handleShakeDetected}
                      className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-2xl font-bold rounded-lg transition-colors"
                    >
                      CLICK TO READY
                    </button>
                    <div className="text-sm text-yellow-600 font-mono">
                      [DEV MODE]
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`text-2xl font-bold ${
                        isShaking ? "text-yellow-400" : "text-gray-400"
                      }`}
                    >
                      {isShaking ? "SHAKING..." : "SHAKE TO READY"}
                    </div>

                    {/* Progress bar */}
                    <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden mx-auto">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-100"
                        style={{ width: `${shakeProgress * 100}%` }}
                      />
                    </div>

                    <div className="text-sm text-gray-500">
                      Shake your device to ready up
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-8 space-y-2">
                <div className="text-6xl">✓</div>
                <div className="text-2xl text-green-400 font-bold">READY!</div>
                <div className="text-gray-500">
                  Waiting for other players...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Countdown State - No role info shown (roles are hidden, spoken via TTS only) */}
      {isCountdown && (
        <div className="fullscreen bg-gray-900 flex flex-col items-center justify-center gap-6 p-8">
          <ConnectionStatus />

          {/* Player info without role details */}
          <div className="text-center">
            <div className="text-8xl font-bold text-white mb-4">
              #{myPlayerNumber}
            </div>
            <div className="text-3xl text-gray-300 mb-2">
              {myPlayer?.name || "Player"}
            </div>
            <div className="text-xl text-gray-500 mb-8">Get ready...</div>
          </div>

          {/* Countdown display */}
          <div className="text-center">
            {countdownPhase === "countdown" && countdownSeconds > 3 && (
              <div className="text-6xl font-bold text-white">
                {countdownSeconds}
              </div>
            )}
            {countdownPhase === "countdown" &&
              countdownSeconds <= 3 &&
              countdownSeconds > 0 && (
                <div className="text-9xl font-black text-yellow-400 animate-bounce">
                  {countdownSeconds}
                </div>
              )}
            {countdownPhase === "go" && (
              <div className="text-9xl font-black text-green-400 animate-pulse">
                GO!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Round Ended State - Show winner/dead screen then shake to ready */}
      {isRoundEnded && !isCountdown && (
        <div className="fullscreen flex flex-col items-center justify-center gap-6 p-8 bg-gray-800">
          <ConnectionStatus />
          <div className="text-center">
            {/* Winner/Dead Header */}
            {isRoundWinner ? (
              <>
                <div className="text-8xl mb-2">🏆</div>
                <div className="text-5xl text-yellow-400 font-black mb-2 animate-pulse">
                  WINNER!
                </div>
                <div className="text-3xl text-yellow-300 font-bold mb-4">
                  +5 pts
                </div>
              </>
            ) : (
              <>
                <div className="text-8xl mb-2">💀</div>
                <div className="text-4xl text-gray-500 font-bold mb-4">
                  ELIMINATED
                </div>
              </>
            )}

            {/* Player info */}
            <div className="text-8xl font-bold text-white mb-4">
              #{myPlayerNumber}
            </div>
            <div className="text-3xl text-gray-300 mb-2">
              {myPlayer?.name || "Player"}
            </div>
            <div className="text-xl text-gray-400 mb-4">
              Total: {myPlayer?.totalPoints || myPlayer?.points || 0} pts
            </div>

            {/* Ready UI - shown based on readyEnabled */}
            {!readyEnabled ? (
              <div className="mt-8 space-y-2">
                <div className="text-2xl text-gray-500">Get ready...</div>
              </div>
            ) : !myIsReady ? (
              <div className="mt-8 space-y-4">
                {isDevMode ? (
                  <>
                    <button
                      onClick={handleShakeDetected}
                      className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-2xl font-bold rounded-lg transition-colors"
                    >
                      CLICK FOR NEXT ROUND
                    </button>
                    <div className="text-sm text-yellow-600 font-mono">
                      [DEV MODE]
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`text-2xl font-bold ${
                        isShaking ? "text-yellow-400" : "text-gray-400"
                      }`}
                    >
                      {isShaking ? "SHAKING..." : "SHAKE FOR NEXT ROUND"}
                    </div>

                    {/* Progress bar */}
                    <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden mx-auto">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-100"
                        style={{ width: `${shakeProgress * 100}%` }}
                      />
                    </div>

                    <div className="text-sm text-gray-500">
                      Shake your device to ready up
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-8 space-y-2">
                <div className="text-6xl">✓</div>
                <div className="text-2xl text-green-400 font-bold">READY!</div>
                <div className="text-gray-500">
                  Waiting for other players...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Game State */}
      {!isWaiting && !isRoundEnded && !isMyPlayerDead && myPlayer && (
        <div className="fullscreen flex flex-col" onClick={handleTap}>
          {/* Status Bar (5%) */}
          <div className="h-[5%] flex items-center justify-between px-4 bg-black/50">
            <ConnectionStatus />
            <div className="text-sm text-gray-400 flex items-center gap-2">
              {/* Charge indicator */}
              {chargeInfo && chargeInfo.max > 0 && (
                <span className="text-yellow-400">
                  {chargeInfo.current}/{chargeInfo.max}
                </span>
              )}
              {(myPlayer.deathCount ?? 0) > 0 && (
                <span className="text-red-400">💀{myPlayer.deathCount}</span>
              )}
              {Math.round((1 - myPlayer.accumulatedDamage / 100) * 100)}%
            </div>
          </div>

          {/* Main Number Area (70%) */}
          <div className="h-[70%] relative">
            <HealthBackground player={myPlayer} />
            <PlayerNumber number={myPlayerNumber} />
          </div>

          {/* Take damage button (dev mode) */}
          {isDevMode && (
            <>
              <button
                onClick={takeDamage}
                className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-2xl font-bold rounded-lg transition-colors"
              >
                CLICK TO TAKE DAMAGE
              </button>
            </>
          )}

          {/* Info Bar (25%) */}
          <div className="h-[25%] bg-gray-900 p-4 flex flex-col justify-between">
            <StatusEffects effects={myPlayer.statusEffects} />
            {myTarget && <TargetDisplay target={myTarget} />}
          </div>

          {/* Damage flash overlay */}
          <DamageFlash accumulatedDamage={myPlayer.accumulatedDamage} />
        </div>
      )}

      {/* Dead State - only show during active round */}
      {isMyPlayerDead &&
        !isCountdown &&
        !isRoundEnded &&
        !isWaiting &&
        !isFinished &&
        respawnCountdown !== null && (
          <div className="fullscreen bg-gray-900 flex flex-col items-center justify-center gap-6 dead-screen">
            <div className="text-7xl font-black text-red-500">WALK AWAY!</div>
            <div className="text-4xl text-gray-300">
              Respawning in {displayRespawnSeconds ?? "..."}...
            </div>
            {(myPlayer?.deathCount ?? 0) > 0 && (
              <div className="text-xl text-gray-500">
                Deaths: {myPlayer?.deathCount}
              </div>
            )}
          </div>
        )}
      {isMyPlayerDead &&
        !isCountdown &&
        !isRoundEnded &&
        !isWaiting &&
        !isFinished &&
        respawnCountdown === null && (
          <div className="fullscreen bg-health-dead flex flex-col items-center justify-center gap-8 dead-screen">
            <div className="text-9xl">💀</div>
            <div className="text-5xl font-bold text-gray-500">ELIMINATED</div>
            <div className="text-xl text-gray-600">
              Final Score: {myPlayer?.points || 0} pts
            </div>
          </div>
        )}

      {/* Game Finished State */}
      {isFinished && (
        <div className="fullscreen bg-gray-900 flex flex-col items-center justify-center gap-8 p-8">
          <ConnectionStatus />
          <div className="text-center">
            <div className="text-4xl text-yellow-400 mb-4">GAME OVER</div>
            <div className="text-8xl font-bold text-white mb-4">
              #{myPlayerNumber}
            </div>
            <div className="text-3xl text-gray-300 mb-2">
              {myPlayer?.name || "Player"}
            </div>
            <div className="text-2xl text-gray-400 mb-4">
              Final Score: {myPlayer?.totalPoints || myPlayer?.points || 0} pts
            </div>

            {/* Ready indicator for new game */}
            {myIsReady ? (
              <div className="mt-8 space-y-2">
                <div className="text-6xl">✓</div>
                <div className="text-2xl text-green-400 font-bold">READY!</div>
                <div className="text-gray-500">Waiting for new game...</div>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {isDevMode ? (
                  <>
                    <button
                      onClick={handleShakeDetected}
                      className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-2xl font-bold rounded-lg transition-colors"
                    >
                      CLICK WHEN READY
                    </button>
                    <div className="text-sm text-yellow-600 font-mono">
                      [DEV MODE]
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`text-2xl font-bold ${
                        isShaking ? "text-yellow-400" : "text-gray-400"
                      }`}
                    >
                      {isShaking ? "SHAKING..." : "SHAKE WHEN READY"}
                    </div>
                    <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden mx-auto">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-100"
                        style={{ width: `${shakeProgress * 100}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-500">
                      Shake to ready for new game
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerView;
