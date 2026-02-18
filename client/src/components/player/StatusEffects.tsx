import type { StatusEffectInfo } from "@/types/player.types";
import { STATUS_ICONS } from "@/utils/constants";

interface StatusEffectsProps {
  effects: StatusEffectInfo[];
}

function StatusEffects({ effects }: StatusEffectsProps) {
  // Only show top 3 effects by priority
  const topEffects = [...effects]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  if (topEffects.length === 0) {
    return null;
  }

  const getIcon = (type: string): string => {
    if (type === "Invulnerability") return STATUS_ICONS.INVULNERABLE;
    if (type === "Bloodlust" || type === "VampireBloodlust")
      return STATUS_ICONS.BLOODLUST;
    if (type === "Stunned") return STATUS_ICONS.STUNNED;
    return "✨";
  };

  const formatTimeLeft = (ms: number | null): string => {
    if (ms === null) return "∞";
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="flex gap-3">
      {topEffects.map((effect, index) => (
        <div
          key={index}
          className="flex items-center gap-2 text-2xl text-white"
        >
          <span>{getIcon(effect.type)}</span>
          <span className="text-lg">{formatTimeLeft(effect.timeLeft)}</span>
        </div>
      ))}
    </div>
  );
}

export default StatusEffects;
