import ConnectionStatus from "@/components/player/ConnectionStatus";

interface CountdownScreenProps {
  playerNumber: number;
  playerName: string;
  countdownSeconds: number;
  countdownPhase: string;
}

export default function CountdownScreen({
  playerNumber,
  playerName,
  countdownSeconds,
  countdownPhase,
}: CountdownScreenProps) {
  return (
    <div className="fullscreen bg-gray-900 flex flex-col items-center justify-center gap-6 p-8">
      <ConnectionStatus />

      <div className="text-center">
        <div className="text-8xl font-bold text-white mb-4">
          #{playerNumber}
        </div>
        <div className="text-3xl text-gray-300 mb-2">{playerName}</div>
        <div className="text-xl text-gray-500 mb-8">Get ready...</div>
      </div>

      <div className="text-center">
        {countdownPhase === "countdown" && countdownSeconds > 3 && (
          <div className="text-6xl font-bold text-white">
            {countdownSeconds}
          </div>
        )}
        {countdownPhase === "countdown" &&
          countdownSeconds <= 3 &&
          countdownSeconds > 0 && (
            <div className="text-9xl font-black text-yellow-400 animate-bounce">
              {countdownSeconds}
            </div>
          )}
        {countdownPhase === "go" && (
          <div className="text-9xl font-black text-green-400 animate-pulse">
            GO!
          </div>
        )}
      </div>
    </div>
  );
}
