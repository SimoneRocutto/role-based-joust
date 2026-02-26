import ConnectionStatus from "@/components/player/ConnectionStatus";
import ShakeToReady from "@/components/player/ShakeToReady";
import ModeRecap from "@/components/shared/ModeRecap";
import type { TeamColorScheme } from "@/utils/teamColors";

interface PreGameScreenProps {
  playerNumber: number;
  playerName: string;
  modeRecap: {
    modeName: string;
    roundCount: number | null;
    sensitivity: string;
    targetScore?: number | null;
  } | null;
  isReady: boolean;
  isShaking: boolean;
  shakeProgress: number;
  onReadyClick: () => void;
  isDevMode: boolean;
  teamColor?: TeamColorScheme | null;
  onTeamSwitch?: () => void;
}

export default function PreGameScreen({
  playerNumber,
  playerName,
  modeRecap,
  isReady,
  isShaking,
  shakeProgress,
  onReadyClick,
  isDevMode,
  teamColor,
  onTeamSwitch,
}: PreGameScreenProps) {
  return (
    <div
      className="fullscreen flex flex-col items-center justify-center gap-8 p-8"
      style={{ backgroundColor: teamColor ? teamColor.dark : "#1f2937" }}
      onClick={onTeamSwitch}
    >
      <ConnectionStatus />

      {modeRecap && (
        <ModeRecap
          modeName={modeRecap.modeName}
          roundCount={modeRecap.roundCount}
          sensitivityKey={modeRecap.sensitivity}
          targetScore={modeRecap.targetScore}
        />
      )}

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

        <ShakeToReady
          isReady={isReady}
          isShaking={isShaking}
          shakeProgress={shakeProgress}
          onReadyClick={onReadyClick}
          shakeLabel="SHAKE TO READY"
          buttonLabel="CLICK TO READY"
          waitingMessage="Waiting for other players..."
          isDevMode={isDevMode}
        />

        {teamColor && (
          <div className="mt-4 text-sm text-gray-400">Tap to switch team</div>
        )}
      </div>
    </div>
  );
}
