import { useState, useEffect } from "react";
import type { PlayerState } from "@/types/player.types";
import { getHealthPercentage } from "@/utils/formatters";
import {
  getHealthBorderClass,
  getHealthGlowClass,
  getHealthTintClass,
  useGameState,
} from "@/hooks/useGameState";
import { STATUS_ICONS } from "@/utils/constants";
import { getTeamColor } from "@/utils/teamColors";
import { useGameStore } from "@/store/gameStore";

interface PlayerCardProps {
  player: PlayerState;
}

function PlayerCard({ player }: PlayerCardProps) {
  const { isRoundEnded } = useGameState();
  const teamsEnabled = useGameStore((state) => state.teamsEnabled);
  const [justBecameReady, setJustBecameReady] = useState(false);
  const teamColor = teamsEnabled ? getTeamColor(player.teamId ?? null) : null;

  // Track when player becomes ready for animation
  useEffect(() => {
    if (player.isReady) {
      setJustBecameReady(true);
      const timer = setTimeout(() => setJustBecameReady(false), 300);
      return () => clearTimeout(timer);
    }
  }, [player.isReady]);
  const healthPercent = getHealthPercentage(player.accumulatedDamage);
  const isDead = !player.isAlive;

  // Player is disconnected if either lobby flag or in-game flag is set
  const isPlayerDisconnected =
    player.isConnected === false || player.isDisconnected === true;

  // Check if this player is the round winner (alive when round ended)
  const isRoundWinner = isRoundEnded && player.isAlive;

  // Get status icon (priority: invulnerable > bloodlust > other)
  const getStatusIcon = () => {
    if (!player.isAlive) return null;

    // Guard against undefined statusEffects
    const effects = player.statusEffects ?? [];

    // Check for specific status effects
    const hasInvulnerability = effects.some(
      (e) => e.type === "Invulnerability"
    );
    if (hasInvulnerability) return STATUS_ICONS.INVULNERABLE;

    // Check for bloodlust (Vampire)
    const hasBloodlust = effects.some((e) => e.type === "Bloodlust");
    if (hasBloodlust) return STATUS_ICONS.BLOODLUST;

    // Check for other effects
    const hasStunned = effects.some((e) => e.type === "Stunned");
    if (hasStunned) return STATUS_ICONS.STUNNED;

    return null;
  };

  const statusIcon = getStatusIcon();

  const gameState = useGameStore((state) => state.gameState);
  const modeRecap = useGameStore((state) => state.modeRecap);
  const isDeathCountMode = modeRecap?.modeName?.includes("Death Count") ?? false;
  const showReadyBadge = player.isReady && (gameState === 'waiting' || gameState === 'pre-game' || gameState === 'round-ended');

  // Build border/tint styles: round winner > team color > health-based
  const getCardStyles = () => {
    if (isRoundWinner) {
      return {
        className:
          "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] bg-yellow-500/20",
        style: {} as React.CSSProperties,
      };
    }
    if (teamColor && player.isAlive) {
      return {
        className: "",
        style: {
          borderColor: teamColor.border,
          backgroundColor: teamColor.tint,
        } as React.CSSProperties,
      };
    }
    return {
      className: `${getHealthBorderClass(
        healthPercent,
        player.isAlive
      )} ${getHealthGlowClass(
        healthPercent,
        player.isAlive
      )} ${getHealthTintClass(healthPercent, player.isAlive)}`,
      style: {} as React.CSSProperties,
    };
  };

  const cardStyles = getCardStyles();

  return (
    <div
      className={`
        relative rounded-lg p-4 border-4 transition-all duration-300
        ${cardStyles.className}
        ${isPlayerDisconnected ? "opacity-40 !border-gray-600" : ""}
        ${isDead && !isRoundEnded && !isPlayerDisconnected ? "opacity-60" : ""}
        ${justBecameReady ? "animate-card-jump" : ""}
      `}
      style={isPlayerDisconnected ? {} : cardStyles.style}
    >
      {/* Disconnected overlay */}
      {isPlayerDisconnected && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-700/80 rounded text-xs text-gray-400 font-bold tracking-wider z-10">
          OFFLINE
        </div>
      )}
      {/* Ready Badge (top-right corner) */}
      {showReadyBadge && (
        <div
          className={`
            absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full
            flex items-center justify-center text-white text-2xl font-bold
            shadow-lg border-2 border-white
            ${justBecameReady ? "animate-bounce-once" : ""}
          `}
        >
          ✓
        </div>
      )}
      {/* Number + Name */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-5xl font-bold text-white">#{player.number}</span>
        <span className="text-3xl text-gray-200 truncate">{player.name}</span>
      </div>

      {/* Status Icon: Trophy for winner, Skull for dead, or status effect */}
      {/* In death count mode, skip trophy/skull since everyone respawns */}
      {isRoundWinner && !isDeathCountMode ? (
        <div className="text-6xl">🏆</div>
      ) : isDead && !isDeathCountMode ? (
        <div className="text-6xl">💀</div>
      ) : statusIcon ? (
        <div className="text-4xl">{statusIcon}</div>
      ) : (
        <div className="h-12" /> // Spacer for consistent card height
      )}

      {/* Death count badge (bottom left) */}
      {(player.deathCount ?? 0) > 0 && (
        <div className="absolute bottom-2 left-2 text-sm text-red-400">
          💀×{player.deathCount}
        </div>
      )}

      {/* Points (bottom right, small) - show totalPoints for cumulative score */}
      {(!isDead || isRoundEnded) && (
        <div className="absolute bottom-2 right-2 text-sm text-gray-400">
          {player.totalPoints ?? player.points ?? 0} pts
        </div>
      )}
    </div>
  );
}

export default PlayerCard;
