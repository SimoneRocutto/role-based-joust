import { useGameStore } from "@/store/gameStore";
import { TEAM_COLORS } from "@/utils/teamColors";
import { apiService } from "@/services/api";

function BaseStatusPanel() {
  const bases = useGameStore((state) => state.bases);
  const teamScores = useGameStore((state) => state.dominationTeamScores);
  const gameState = useGameStore((state) => state.gameState);
  const showKick = gameState === "waiting" || gameState === "pre-game";

  if (bases.length === 0) return null;

  return (
    <div className="mb-6 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
      {/* Team Scores */}
      {Object.keys(teamScores).length > 0 && (
        <div className="flex justify-center gap-8 mb-4">
          {Object.entries(teamScores)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([teamId, score]) => {
              const color = TEAM_COLORS[Number(teamId)];
              return (
                <div key={teamId} className="text-center">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: color?.primary ?? "#fff" }}
                  >
                    {score}
                  </div>
                  <div className="text-xs text-gray-400">
                    {color?.name ?? `Team ${Number(teamId) + 1}`}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Base Indicators */}
      <div className="flex justify-center gap-4">
        {bases.map((base) => {
          const teamColor =
            base.ownerTeamId != null
              ? TEAM_COLORS[base.ownerTeamId]
              : null;
          const borderColor = teamColor?.primary ?? "#6b7280";
          const bgColor = teamColor
            ? `${teamColor.primary}22`
            : "transparent";

          return (
            <div
              key={base.baseId}
              className="flex flex-col items-center gap-1"
            >
              {/* Base circle with progress ring */}
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 56 56" className="w-full h-full">
                  {/* Background circle */}
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill={bgColor}
                    stroke={borderColor}
                    strokeWidth="2"
                  />
                  {/* Progress arc */}
                  {base.controlProgress > 0 && (
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke={teamColor?.primary ?? "#9ca3af"}
                      strokeWidth="3"
                      strokeDasharray={`${base.controlProgress * 150.8} 150.8`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)"
                    />
                  )}
                </svg>
                {/* Base number */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-lg font-bold"
                    style={{ color: teamColor?.primary ?? "#9ca3af" }}
                  >
                    {base.baseNumber}
                  </span>
                </div>
              </div>
              {/* Status label */}
              <span className="text-xs text-gray-400">
                {!base.isConnected
                  ? "Offline"
                  : teamColor
                    ? teamColor.name.replace(" Team", "")
                    : "Neutral"}
              </span>
              {showKick && (
                <button
                  onClick={() => apiService.kickBase(base.baseId)}
                  className="text-red-400 hover:text-red-300 text-xs font-bold"
                  title={`Kick base ${base.baseNumber}`}
                >
                  X
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BaseStatusPanel;
