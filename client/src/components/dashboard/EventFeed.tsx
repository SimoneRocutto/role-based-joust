import { useGameState } from "@/hooks/useGameState";
import { useAudioStore } from "@/store/audioStore";

function EventFeed() {
  const { latestEvent, aliveCount, players } = useGameState();
  const isSpeaking = useAudioStore((state) => state.isSpeaking);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Latest Event */}
        <div className="flex items-center gap-3">
          {isSpeaking && (
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
          <span className="text-xl text-gray-200">
            {latestEvent || "Waiting for action..."}
          </span>
        </div>

        {/* Alive Counter */}
        <div className="text-2xl font-bold text-white">
          ALIVE: <span className="text-green-400">{aliveCount}</span> /{" "}
          {players.length}
        </div>
      </div>
    </div>
  );
}

export default EventFeed;
