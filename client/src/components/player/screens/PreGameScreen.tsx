import ConnectionStatus from "@/components/player/ConnectionStatus";
import ShakeToReady from "@/components/player/ShakeToReady";
import ModeRecap from "@/components/shared/ModeRecap";

interface PreGameScreenProps {
  playerNumber: number;
  playerName: string;
  modeRecap: { modeName: string; roundCount: number; sensitivity: string } | null;
  isReady: boolean;
  isShaking: boolean;
  shakeProgress: number;
  onReadyClick: () => void;
  isDevMode: boolean;
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
}: PreGameScreenProps) {
  return (
    <div
      className="fullscreen flex flex-col items-center justify-center gap-8 p-8"
      style={{ backgroundColor: "#1f2937" }}
    >
      <ConnectionStatus />

      {modeRecap && (
        <ModeRecap
          modeName={modeRecap.modeName}
          roundCount={modeRecap.roundCount}
          sensitivityKey={modeRecap.sensitivity}
        />
      )}

      <div className="text-center">
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
      </div>
    </div>
  );
}
