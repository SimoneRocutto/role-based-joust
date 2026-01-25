import { useEffect, useState } from "react";
import { accelerometerService } from "@/services/accelerometer";
import type { MovementData } from "@/types/player.types";

interface UseAccelerometerOptions {
  onData?: (data: MovementData) => void;
  autoStart?: boolean;
}

export function useAccelerometer(options: UseAccelerometerOptions = {}) {
  const { onData, autoStart = false } = options;
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastData, setLastData] = useState<MovementData | null>(null);

  useEffect(() => {
    setIsSupported(accelerometerService.isSupported());
  }, []);

  const requestPermission = async () => {
    const granted = await accelerometerService.requestPermission();
    setPermissionGranted(granted);
    return granted;
  };

  const start = () => {
    if (!isSupported) {
      console.warn("Accelerometer not supported");
      return;
    }

    accelerometerService.start((data) => {
      setLastData(data);
      onData?.(data);
    });

    setIsActive(true);
  };

  const stop = () => {
    accelerometerService.stop();
    setIsActive(false);
  };

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && permissionGranted && !isActive) {
      start();
    }

    return () => {
      stop();
    };
  }, [autoStart, permissionGranted]);

  return {
    isActive,
    isSupported,
    permissionGranted,
    lastData,
    requestPermission,
    start,
    stop,
  };
}
