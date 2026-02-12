import ConnectionStatus from "@/components/player/ConnectionStatus";
import ShakeToReady from "@/components/player/ShakeToReady";

interface GameFinishedScreenProps {
  playerNumber: number;
  playerName: string;
  totalPoints: number;
  isReady: boolean;
  isShaking: boolean;
  shakeProgress: number;
  onReadyClick: () => void;
  isDevMode: boolean;
}

export default function GameFinishedScreen({
  playerNumber,
  playerName,
  totalPoints,
  isReady,
  isShaking,
  shakeProgress,
  onReadyClick,
  isDevMode,
}: GameFinishedScreenProps) {
  return (
    <div className="fullscreen bg-gray-900 flex flex-col items-center justify-center gap-8 p-8">
      <ConnectionStatus />
      <div className="text-center">
        <div className="text-4xl text-yellow-400 mb-4">GAME OVER</div>
        <div className="text-8xl font-bold text-white mb-4">
          #{playerNumber}
        </div>
        <div className="text-3xl text-gray-300 mb-2">{playerName}</div>
        <div className="text-2xl text-gray-400 mb-4">
          Final Score: {totalPoints} pts
        </div>

        <ShakeToReady
          isReady={isReady}
          isShaking={isShaking}
          shakeProgress={shakeProgress}
          onReadyClick={onReadyClick}
          shakeLabel="SHAKE WHEN READY"
          buttonLabel="CLICK WHEN READY"
          waitingMessage="Waiting for new game..."
          isDevMode={isDevMode}
        />
      </div>
    </div>
  );
}
