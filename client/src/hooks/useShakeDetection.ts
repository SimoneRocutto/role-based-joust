import { useEffect, useRef, useState, useCallback } from "react";
import { accelerometerService } from "@/services/accelerometer";
import type { MovementData } from "@/types/player.types";

interface UseShakeDetectionOptions {
  threshold?: number; // Intensity threshold to count as "shaking"
  requiredDuration?: number; // Duration in ms to consider shake complete
  cooldown?: number; // Cooldown in ms after shake detected
  onShake?: () => void; // Callback when shake is detected
  enabled?: boolean; // Whether shake detection is enabled
}

interface UseShakeDetectionReturn {
  isShaking: boolean; // Currently above threshold
  shakeProgress: number; // 0-1 progress toward completion
  isOnCooldown: boolean; // Whether on cooldown after a shake
}

const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_REQUIRED_DURATION = 500; // 500ms = 5 samples at 10Hz
const DEFAULT_COOLDOWN = 1000;

export function useShakeDetection(
  options: UseShakeDetectionOptions = {}
): UseShakeDetectionReturn {
  const {
    threshold = DEFAULT_THRESHOLD,
    requiredDuration = DEFAULT_REQUIRED_DURATION,
    cooldown = DEFAULT_COOLDOWN,
    onShake,
    enabled = true,
  } = options;

  const [isShaking, setIsShaking] = useState(false);
  const [shakeProgress, setShakeProgress] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  // Refs for tracking shake duration
  const shakeStartTime = useRef<number | null>(null);
  const cooldownTimeout = useRef<NodeJS.Timeout | null>(null);
  const onShakeRef = useRef(onShake);

  // Keep onShake ref updated
  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  const handleMovementData = useCallback(
    (data: MovementData) => {
      if (!enabled || isOnCooldown) {
        setIsShaking(false);
        setShakeProgress(0);
        return;
      }

      const intensity = data.intensity ?? 0;
      const now = Date.now();

      if (intensity >= threshold) {
        // Currently shaking
        setIsShaking(true);

        if (shakeStartTime.current === null) {
          // Start tracking shake duration
          shakeStartTime.current = now;
        }

        // Calculate progress
        const shakeDuration = now - shakeStartTime.current;
        const progress = Math.min(shakeDuration / requiredDuration, 1);
        setShakeProgress(progress);

        // Check if shake is complete
        if (shakeDuration >= requiredDuration) {
          // Shake detected!
          onShakeRef.current?.();

          // Enter cooldown
          setIsOnCooldown(true);
          setIsShaking(false);
          setShakeProgress(0);
          shakeStartTime.current = null;

          // Clear cooldown after delay
          if (cooldownTimeout.current) {
            clearTimeout(cooldownTimeout.current);
          }
          cooldownTimeout.current = setTimeout(() => {
            setIsOnCooldown(false);
          }, cooldown);
        }
      } else {
        // Not shaking - reset
        setIsShaking(false);
        setShakeProgress(0);
        shakeStartTime.current = null;
      }
    },
    [enabled, isOnCooldown, threshold, requiredDuration, cooldown]
  );

  useEffect(() => {
    if (!enabled) {
      setIsShaking(false);
      setShakeProgress(0);
      return;
    }

    // Subscribe to accelerometer data
    const unsubscribe = accelerometerService.subscribe(handleMovementData);

    return () => {
      unsubscribe();
      if (cooldownTimeout.current) {
        clearTimeout(cooldownTimeout.current);
      }
    };
  }, [enabled, handleMovementData]);

  return {
    isShaking,
    shakeProgress,
    isOnCooldown,
  };
}
