import { SENSITIVITY_LABELS } from "@/utils/modeMapping";

interface ModeRecapProps {
  modeName: string;
  roundCount: number | null;
  sensitivityKey: string;
  targetScore?: number | null;
}

export default function ModeRecap({
  modeName,
  roundCount,
  sensitivityKey,
  targetScore,
}: ModeRecapProps) {
  const sensitivityLabel = SENSITIVITY_LABELS[sensitivityKey] ?? sensitivityKey;

  const roundInfo = targetScore
    ? `First to ${targetScore} pts`
    : roundCount !== null
      ? `${roundCount} ${roundCount === 1 ? "round" : "rounds"}`
      : null;

  return (
    <div className="text-center text-gray-300 space-y-1">
      <div className="text-xl font-bold text-white">{modeName}</div>
      <div className="text-sm">
        {roundInfo ? `${roundInfo} | ` : ""}{sensitivityLabel}
      </div>
    </div>
  );
}
