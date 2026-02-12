import { useEffect, useState } from "react";
import { useAccelerometer } from "@/hooks/useAccelerometer";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useFullscreen } from "@/hooks/useFullscreen";
import { socketService } from "@/services/socket";
import { requestMotionPermission } from "@/utils/permissions";

// In development mode, allow button click instead of shake
// Use ?mode=production URL param to test production behavior in dev
const getEffectiveDevMode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const modeOverride = urlParams.get("mode");
  if (modeOverride === "production") return false;
  return import.meta.env.DEV;
};

export const isDevMode = getEffectiveDevMode();

export function usePlayerDevice(myPlayerId: string | null) {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [showPortraitLock, setShowPortraitLock] = useState(false);

  const { start: startAccelerometer, lastData } = useAccelerometer();
  const { enable: enableWakeLock } = useWakeLock(true);
  const { enter: enterFullscreen } = useFullscreen();

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const motionGranted = await requestMotionPermission();
        if (!motionGranted && !isDevMode) {
          alert(
            "Motion permission denied. Game cannot function without accelerometer access."
          );
          return;
        }
      } catch (error) {
        console.log(
          "Motion permission request skipped (likely already granted)"
        );
      }

      await enableWakeLock();
      await enterFullscreen();

      setPermissionsGranted(true);
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

  return {
    permissionsGranted,
    showPortraitLock,
  };
}
