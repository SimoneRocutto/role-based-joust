import { useEffect, useState } from "react";
import { getDeadBackgroundColor } from "@/utils/teamColors";

interface DeadScreenProps {
  teamId: number | null;
  respawnCountdown: number | null;
  deathCount: number;
  points: number;
  medal: string | null;
}

export default function DeadScreen({
  teamId,
  respawnCountdown,
  deathCount,
  points,
  medal,
}: DeadScreenProps) {
  const [displayRespawnSeconds, setDisplayRespawnSeconds] = useState<
    number | null
  >(null);

  // Client-side respawn countdown timer
  useEffect(() => {
    if (respawnCountdown === null) {
      setDisplayRespawnSeconds(null);
      return;
    }

    setDisplayRespawnSeconds(Math.ceil(respawnCountdown / 1000));

    const interval = setInterval(() => {
      setDisplayRespawnSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [respawnCountdown]);

  const bgColor = getDeadBackgroundColor(teamId);

  if (respawnCountdown !== null) {
    return (
      <div
        className="fullscreen flex flex-col items-center justify-center gap-4 px-4"
        style={{ backgroundColor: bgColor }}
      >
        <div className="text-5xl sm:text-7xl font-black text-red-500 text-center">
          RESPAWNING...
        </div>
        <div className="text-4xl sm:text-6xl font-bold text-gray-300 text-center">
          {displayRespawnSeconds ?? "..."}
        </div>
        {medal && (
          <div className="text-7xl leading-none mt-2">{medal}</div>
        )}
        <div
          className={`text-5xl font-black ${
            deathCount === 0 ? "text-gray-500" : "text-red-400"
          }`}
        >
          💀 {deathCount}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fullscreen flex flex-col items-center justify-center gap-8"
      style={{ backgroundColor: bgColor }}
    >
      <div className="text-9xl">&#128128;</div>
      <div className="text-5xl font-bold text-gray-500">ELIMINATED</div>
      <div className="text-xl text-gray-600">
        Final Score: {points} pts
      </div>
    </div>
  );
}
