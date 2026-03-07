import { useGameStore } from "@/store/gameStore";
import { TEAM_COLORS } from "@/utils/teamColors";
import { apiService } from "@/services/api";

function BaseStatusPanel() {
  const bases = useGameStore((state) => state.bases);
  const teamScores = useGameStore((state) => state.dominationTeamScores);
  const targetScore = useGameStore((state) => state.targetScore);
  const gameState = useGameStore((state) => state.gameState);
  const teams = useGameStore((state) => state.teams);
  const showKick = gameState === "waiting" || gameState === "pre-game";
  const isActive = gameState === "active" || gameState === "countdown";

  if (bases.length === 0) return null;
  const maxScore = targetScore ?? 10;

  // Build team scores list: use dominationTeamScores if available,
  // fall back to teams record so bars show even before first point
  const teamIds = Object.keys(teamScores).length > 0
    ? Object.keys(teamScores)
    : Object.keys(teams);
  const sortedTeams = teamIds
    .map((id) => [id, teamScores[Number(id)] ?? 0] as [string, number])
    .sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="mb-4">
      {/* Team Score Bars — only during active gameplay */}
      {isActive && sortedTeams.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {sortedTeams.map(([teamId, score]) => {
            const color = TEAM_COLORS[Number(teamId)];
            const pct = Math.min((score / maxScore) * 100, 100);

            return (
              <div
                key={teamId}
                className="relative h-9 rounded-lg overflow-hidden"
                style={{
                  background: `${color?.primary ?? "#6b7280"}15`,
                  border: `1px solid ${color?.primary ?? "#6b7280"}40`,
                }}
              >
                {/* Fill bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-lg transition-[width] duration-500 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color?.primary ?? "#6b7280"}66, ${color?.primary ?? "#6b7280"})`,
                  }}
                />

                {/* Team name — left side, always visible */}
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-white z-10"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                >
                  {color?.name ?? `Team ${Number(teamId) + 1}`}
                </span>

                {/* Score — right side, always visible */}
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-black z-10"
                  style={{
                    color: color?.primary ?? "#9ca3af",
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                  }}
                >
                  {score}
                </span>
              </div>
            );
          })}
          <div className="text-center text-xs text-gray-500 font-semibold">
            First to {maxScore} pts
          </div>
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
