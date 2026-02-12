import ConnectionStatus from "@/components/player/ConnectionStatus";
import ShakeToReady from "@/components/player/ShakeToReady";

interface LobbyScreenProps {
  playerNumber: number;
  playerName: string;
  isReady: boolean;
  isShaking: boolean;
  shakeProgress: number;
  onReadyClick: () => void;
  isDevMode: boolean;
}

export default function LobbyScreen({
  playerNumber,
  playerName,
  isReady,
  isShaking,
  shakeProgress,
  onReadyClick,
  isDevMode,
}: LobbyScreenProps) {
  return (
    <div
      className="fullscreen flex flex-col items-center justify-center gap-8 p-8"
      style={{ backgroundColor: "#1f2937" }}
    >
      <ConnectionStatus />
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
