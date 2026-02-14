import { useGameStore } from "@/store/gameStore";
import { HEALTH_THRESHOLDS } from "@/utils/constants";
import { getHealthPercentage } from "@/utils/formatters";

/**
 * Hook that wraps Zustand store with computed values and helpers
 */
export function useGameState() {
  const store = useGameStore();

  // Computed values for player health status
  const myHealthPercentage = store.myPlayer
    ? getHealthPercentage(store.myPlayer.accumulatedDamage)
    : 1;

  const myHealthStatus = getHealthStatus(myHealthPercentage);

  const isMyPlayerAlive = store.myPlayer?.isAlive ?? false;
  const isMyPlayerDead = !isMyPlayerAlive;

  // Computed values for game state
  const isWaiting = store.gameState === "waiting";
  const isPreGame = store.gameState === "pre-game";
  const isCountdown = store.gameState === "countdown";
  const isActive = store.gameState === "active";
  const isRoundEnded = store.gameState === "round-ended";
  const isFinished = store.gameState === "finished";

  // Ready delay computed values
  const isRoundWinner = store.myPlayerId === store.roundWinnerId;
  const readyEnabled = store.readyEnabled;

  // Dashboard-specific computed values
  const alivePlayers = store.players.filter((p) => p.isAlive);
  const aliveCount = alivePlayers.length;
  const deadPlayers = store.players.filter((p) => !p.isAlive);

  // Sorted players for dashboard (alive by number, then dead by number)
  const sortedPlayers = [
    ...alivePlayers.sort((a, b) => a.number - b.number),
    ...deadPlayers.sort((a, b) => a.number - b.number),
  ];

  return {
    // Direct store access
    ...store,

    // Computed player values
    myHealthPercentage,
    myHealthStatus,
    isMyPlayerAlive,
    isMyPlayerDead,

    // Computed game state
    isWaiting,
    isPreGame,
    isCountdown,
    isActive,
    isRoundEnded,
    isFinished,

    // Ready delay computed values
    isRoundWinner,
    readyEnabled,

    // Timer state
    roundTimeRemaining: store.roundTimeRemaining,
    respawnCountdown: store.respawnCountdown,

    // Dashboard values
    alivePlayers,
    aliveCount,
    deadPlayers,
    sortedPlayers,
  };
}

/**
 * Get health status based on percentage
 */
function getHealthStatus(
  healthPercentage: number
): "healthy" | "damaged" | "critical" | "dead" {
  if (healthPercentage <= 0) return "dead";
  if (healthPercentage < HEALTH_THRESHOLDS.CRITICAL) return "critical";
  if (healthPercentage < HEALTH_THRESHOLDS.DAMAGED) return "damaged";
  if (healthPercentage < HEALTH_THRESHOLDS.HEALTHY) return "damaged";
  return "healthy";
}

/**
 * Get background gradient class based on health status
 */
export function getHealthBackgroundClass(
  status: "healthy" | "damaged" | "critical" | "dead"
): string {
  switch (status) {
    case "healthy":
      return "gradient-healthy";
    case "damaged":
      return "gradient-damaged";
    case "critical":
      return "gradient-critical";
    case "dead":
      return "bg-health-dead";
    default:
      return "gradient-healthy";
  }
}

/**
 * Get border color class for dashboard cards
 */
export function getHealthBorderClass(
  healthPercentage: number,
  isAlive: boolean
): string {
  if (!isAlive) return "border-gray-500/30";
  if (healthPercentage >= 0.8) return "border-green-500/80";
  if (healthPercentage >= 0.4) return "border-amber-500/80";
  return "border-red-500/90";
}

/**
 * Get glow shadow class for dashboard cards
 */
export function getHealthGlowClass(
  healthPercentage: number,
  isAlive: boolean
): string {
  if (!isAlive) return "";
  if (healthPercentage >= 0.8) return "shadow-glow-green";
  if (healthPercentage >= 0.4) return "shadow-glow-amber";
  return "shadow-glow-red animate-pulse";
}

/**
 * Get background tint for dashboard cards
 */
export function getHealthTintClass(
  healthPercentage: number,
  isAlive: boolean
): string {
  if (!isAlive) return "bg-gray-800/50";
  if (healthPercentage >= 0.8) return "bg-green-500/10";
  if (healthPercentage >= 0.4) return "bg-amber-500/10";
  return "bg-red-500/15";
}
