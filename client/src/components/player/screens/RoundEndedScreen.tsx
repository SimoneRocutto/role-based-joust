import ConnectionStatus from "@/components/player/ConnectionStatus";
import ShakeToReady from "@/components/player/ShakeToReady";

interface RoundEndedScreenProps {
  playerNumber: number;
  playerName: string;
  totalPoints: number;
  isRoundWinner: boolean;
  readyEnabled: boolean;
  isReady: boolean;
  isShaking: boolean;
  shakeProgress: number;
  onReadyClick: () => void;
  isDevMode: boolean;
  isDeathCountMode: boolean;
  deathCount: number;
  medal: string | null;
}

export default function RoundEndedScreen({
  playerNumber,
  playerName,
  totalPoints,
  isRoundWinner,
  readyEnabled,
  isReady,
  isShaking,
  shakeProgress,
  onReadyClick,
  isDevMode,
  isDeathCountMode,
  deathCount,
  medal,
}: RoundEndedScreenProps) {
  return (
    <div className="fullscreen flex flex-col items-center justify-center gap-6 p-8 bg-gray-800">
      <ConnectionStatus />
      <div className="text-center">
        {isDeathCountMode ? (
          <>
            <div className="flex items-center justify-between w-72 mx-auto mb-2">
              <div
                className={`text-6xl font-black ${
                  deathCount === 0 ? "text-gray-400" : "text-red-400"
                }`}
              >
                💀 {deathCount}
              </div>
              <div className="text-6xl leading-none">
                {medal ?? <span className="text-gray-700">—</span>}
              </div>
            </div>
          </>
        ) : isRoundWinner ? (
          <>
            <div className="text-8xl mb-2">&#127942;</div>
            <div className="text-5xl text-yellow-400 font-black mb-2 animate-pulse">
              WINNER!
            </div>
            <div className="text-3xl text-yellow-300 font-bold mb-4">
              +5 pts
            </div>
          </>
        ) : (
          <>
            <div className="text-8xl mb-2">&#128128;</div>
            <div className="text-4xl text-gray-500 font-bold mb-4">
              ELIMINATED
            </div>
          </>
        )}

        <div className="text-8xl font-bold text-white mb-4">
          #{playerNumber}
        </div>
        <div className="text-3xl text-gray-300 mb-2">{playerName}</div>
        <div className="text-xl text-gray-400 mb-4">
          Total: {totalPoints} pts
        </div>

        {!readyEnabled ? (
          <div className="mt-8 space-y-2">
            <div className="text-2xl text-gray-500">Get ready...</div>
          </div>
        ) : (
          <ShakeToReady
            isReady={isReady}
            isShaking={isShaking}
            shakeProgress={shakeProgress}
            onReadyClick={onReadyClick}
            shakeLabel="SHAKE FOR NEXT ROUND"
            buttonLabel="CLICK FOR NEXT ROUND"
            waitingMessage="Waiting for other players..."
            isDevMode={isDevMode}
          />
        )}
      </div>
    </div>
  );
}
