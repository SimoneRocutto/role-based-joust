import { useEffect, useRef } from "react";
import { audioManager } from "@/services/audio";

type HealthTier = "normal" | "low" | "critical";

function getHealthTier(hpPercent: number): HealthTier {
  if (hpPercent <= 0.2) return "critical";
  if (hpPercent <= 0.5) return "low";
  return "normal";
}

const TIER_SOUNDS: Record<Exclude<HealthTier, "normal">, string> = {
  low: "low-health-heartbeat",
  critical: "near-death-heartbeat",
};

/**
 * Plays looping heartbeat sounds based on the player's HP percentage.
 * - Below 50%: "low-health-heartbeat"
 * - Below 20%: "near-death-heartbeat" (replaces low-health)
 * - Above 50% or not active: silence
 */
export function useHealthAudio(
  accumulatedDamage: number | undefined,
  isActive: boolean
) {
  const currentTier = useRef<HealthTier>("normal");

  useEffect(() => {
    if (!isActive || accumulatedDamage === undefined) {
      // Stop any playing heartbeat when game isn't active
      if (currentTier.current !== "normal") {
        audioManager.stop(TIER_SOUNDS[currentTier.current]);
        currentTier.current = "normal";
      }
      return;
    }

    // Base death threshold is 100
    const hpPercent = 1 - accumulatedDamage / 100;
    const newTier = getHealthTier(hpPercent);

    if (newTier === currentTier.current) return;

    // Stop previous tier's sound
    if (currentTier.current !== "normal") {
      audioManager.stop(TIER_SOUNDS[currentTier.current]);
    }

    // Start new tier's sound
    if (newTier !== "normal") {
      audioManager.loop(TIER_SOUNDS[newTier], { volume: 0.6 });
    }

    currentTier.current = newTier;
  }, [accumulatedDamage, isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentTier.current !== "normal") {
        audioManager.stop(TIER_SOUNDS[currentTier.current]);
        currentTier.current = "normal";
      }
    };
  }, []);
}
