import ConnectionStatus from "@/components/player/ConnectionStatus";
import HealthBackground from "@/components/player/HealthBackground";
import PlayerNumber from "@/components/player/PlayerNumber";
import StatusEffects from "@/components/player/StatusEffects";
import DamageFlash from "@/components/player/DamageFlash";
import HealEffect from "@/components/player/HealEffect";
import type { PlayerState } from "@/types/player.types";
import type { ChargeInfo } from "@/types/socket.types";

interface ActiveGameScreenProps {
  player: PlayerState;
  playerNumber: number;
  teamId: number | null;
  chargeInfo: ChargeInfo | null;
  onTap: () => void;
  onTakeDamage: () => void;
  isDevMode: boolean;
  isDeathCountMode: boolean;
  medal: string | null;
}

export default function ActiveGameScreen({
  player,
  playerNumber,
  teamId,
  chargeInfo,
  onTap,
  onTakeDamage,
  isDevMode,
  isDeathCountMode,
  medal,
}: ActiveGameScreenProps) {
  return (
    <div className="fullscreen flex flex-col" onClick={onTap}>
      {/* Status Bar (5%) */}
      <div className="h-[5%] flex items-center justify-between px-4 bg-black/50">
        <ConnectionStatus />
        <div className="text-sm text-gray-400 flex items-center gap-2">
          {chargeInfo && chargeInfo.max > 0 && (
            <span className="text-yellow-400">
              {chargeInfo.current}/{chargeInfo.max}
            </span>
          )}
          {(player.deathCount ?? 0) > 0 && (
            <span className="text-red-400">&#128128;{player.deathCount}</span>
          )}
          {Math.round((1 - player.accumulatedDamage / 100) * 100)}%
        </div>
      </div>

      {/* Main Number Area (70%) */}
      <div className="h-[70%] relative">
        <HealthBackground player={player} teamId={teamId} />
        <PlayerNumber number={playerNumber} />

        {/* Death count mode: skull+deaths on left, medal on right */}
        {isDeathCountMode && (
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-8 pointer-events-none">
            <div
              className={`text-5xl font-black drop-shadow-lg ${
                (player.deathCount ?? 0) === 0
                  ? "text-white/60"
                  : "text-red-300"
              }`}
            >
              💀 {player.deathCount ?? 0}
            </div>
            <div className="text-5xl leading-none drop-shadow-lg">
              {medal ?? <span className="text-white/20">—</span>}
            </div>
          </div>
        )}
      </div>

      {/* Take damage button (dev mode) */}
      {isDevMode && (
        <button
          onClick={onTakeDamage}
          className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-2xl font-bold rounded-lg transition-colors"
        >
          CLICK TO TAKE DAMAGE
        </button>
      )}

      {/* Info Bar (25%) */}
      <div className="h-[25%] bg-gray-900 p-4 flex flex-col justify-between">
        <StatusEffects effects={player.statusEffects} />
      </div>

      {/* Damage flash overlay */}
      <DamageFlash accumulatedDamage={player.accumulatedDamage} />

      {/* Heal effect overlay */}
      <HealEffect
        accumulatedDamage={player.accumulatedDamage}
        isAlive={player.isAlive}
      />
    </div>
  );
}
