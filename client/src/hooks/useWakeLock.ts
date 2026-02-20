import { useEffect, useState, useRef } from "react";
import { requestWakeLock } from "@/utils/permissions";

export function useWakeLock(autoEnable = true) {
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    setIsSupported("wakeLock" in navigator);
  }, []);

  const enable = async () => {
    if (!isSupported) {
      console.warn("Wake Lock API not supported");
      return false;
    }

    const wakeLock = await requestWakeLock();
    if (wakeLock) {
      wakeLockRef.current = wakeLock;
      setIsActive(true);

      // Re-acquire wake lock if visibility changes
      wakeLock.addEventListener("release", () => {
        console.log("Wake Lock released");
        wakeLockRef.current = null;
        setIsActive(false);
      });

      return true;
    }

    return false;
  };

  const disable = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsActive(false);
    }
  };

  // Auto-enable if requested
  useEffect(() => {
    if (autoEnable && isSupported && !isActive) {
      enable();
    }

    // Re-acquire wake lock when page becomes visible
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        autoEnable &&
        !wakeLockRef.current
      ) {
        enable();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      disable();
    };
  }, [autoEnable, isSupported]);

  return {
    isActive,
    isSupported,
    enable,
    disable,
  };
}
