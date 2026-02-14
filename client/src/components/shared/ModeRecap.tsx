import { SENSITIVITY_LABELS } from "@/utils/modeMapping";

interface ModeRecapProps {
  modeName: string;
  roundCount: number;
  sensitivityKey: string;
}

export default function ModeRecap({
  modeName,
  roundCount,
  sensitivityKey,
}: ModeRecapProps) {
  const sensitivityLabel = SENSITIVITY_LABELS[sensitivityKey] ?? sensitivityKey;

  return (
    <div className="text-center text-gray-300 space-y-1">
      <div className="text-xl font-bold text-white">{modeName}</div>
      <div className="text-sm">
        {roundCount} {roundCount === 1 ? "round" : "rounds"} | {sensitivityLabel}
      </div>
    </div>
  );
}
