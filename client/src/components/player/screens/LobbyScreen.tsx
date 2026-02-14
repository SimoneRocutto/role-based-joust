import ConnectionStatus from "@/components/player/ConnectionStatus";

interface LobbyScreenProps {
  playerNumber: number;
  playerName: string;
}

export default function LobbyScreen({
  playerNumber,
  playerName,
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
        <div className="text-xl text-gray-400 mt-6">
          Waiting for game to start...
        </div>
      </div>
    </div>
  );
}
