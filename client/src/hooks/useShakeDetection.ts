import { useEffect, useRef, useState, useCallback } from "react";
import { accelerometerService } from "@/services/accelerometer";
import type { MovementData } from "@/types/player.types";
import { SHAKE_DETECTION_CONFIG } from "@/utils/constants";

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
  lastIntensity: number; // Last received intensity value (for debugging)
}

const DEFAULT_THRESHOLD = SHAKE_DETECTION_CONFIG.DEFAULT_THRESHOLD;
const DEFAULT_REQUIRED_DURATION = SHAKE_DETECTION_CONFIG.DEFAULT_REQUIRED_DURATION;
const DEFAULT_COOLDOWN = SHAKE_DETECTION_CONFIG.DEFAULT_COOLDOWN;

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
  const [lastIntensity, setLastIntensity] = useState(0);

  // Refs for tracking shake duration and avoiding stale closures
  const shakeStartTime = useRef<number | null>(null);
  const cooldownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onShakeRef = useRef(onShake);
  const enabledRef = useRef(enabled);
  const isOnCooldownRef = useRef(isOnCooldown);

  // Keep refs updated to avoid stale closures
  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isOnCooldownRef.current = isOnCooldown;
  }, [isOnCooldown]);

  const handleMovementData = useCallback(
    (data: MovementData) => {
      // Use refs to get current values (avoids stale closure)
      if (!enabledRef.current || isOnCooldownRef.current) {
        setIsShaking(false);
        setShakeProgress(0);
        return;
      }

      const intensity = data.intensity ?? 0;
      setLastIntensity(intensity);
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
          isOnCooldownRef.current = true;
          setIsShaking(false);
          setShakeProgress(0);
          shakeStartTime.current = null;

          // Clear cooldown after delay
          if (cooldownTimeout.current) {
            clearTimeout(cooldownTimeout.current);
          }
          cooldownTimeout.current = setTimeout(() => {
            setIsOnCooldown(false);
            isOnCooldownRef.current = false;
          }, cooldown);
        }
      } else {
        // Not shaking - reset
        setIsShaking(false);
        setShakeProgress(0);
        shakeStartTime.current = null;
      }
    },
    [threshold, requiredDuration, cooldown]
  );

  useEffect(() => {
    // Always subscribe - the callback checks enabledRef internally
    const unsubscribe = accelerometerService.subscribe(handleMovementData);

    return () => {
      unsubscribe();
      if (cooldownTimeout.current) {
        clearTimeout(cooldownTimeout.current);
      }
    };
  }, [handleMovementData]);

  return {
    isShaking,
    shakeProgress,
    isOnCooldown,
    lastIntensity,
  };
}
