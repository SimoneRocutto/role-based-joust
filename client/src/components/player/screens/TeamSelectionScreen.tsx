import ConnectionStatus from "@/components/player/ConnectionStatus";
import type { TeamColorScheme } from "@/utils/teamColors";

interface TeamSelectionScreenProps {
  playerNumber: number;
  playerName: string;
  teamColor: TeamColorScheme | null;
  onTeamSwitch: () => void;
}

export default function TeamSelectionScreen({
  playerNumber,
  playerName,
  teamColor,
  onTeamSwitch,
}: TeamSelectionScreenProps) {
  return (
    <div
      className="fullscreen flex flex-col items-center justify-center gap-8 p-8"
      style={{
        backgroundColor: teamColor ? teamColor.dark : "#1f2937",
      }}
      onClick={onTeamSwitch}
    >
      <ConnectionStatus />
      <div className="text-center">
        {teamColor && (
          <div
            className="text-lg font-bold mb-2 px-4 py-1 rounded-full inline-block"
            style={{
              backgroundColor: teamColor.tint,
              color: teamColor.primary,
              border: `2px solid ${teamColor.primary}`,
            }}
          >
            {teamColor.name}
          </div>
        )}
        <div className="text-8xl font-bold text-white mb-4">
          #{playerNumber}
        </div>
        <div className="text-3xl text-gray-300 mb-2">{playerName}</div>

        <div className="mt-8 text-xl text-gray-400">Tap to switch team</div>
        <div className="text-sm text-gray-500 mt-2">
          Waiting for admin to start game...
        </div>
      </div>
    </div>
  );
}
