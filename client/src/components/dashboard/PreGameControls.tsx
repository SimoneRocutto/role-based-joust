import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { apiService } from "@/services/api";
import ModeRecap from "@/components/shared/ModeRecap";

function PreGameControls() {
  const { modeRecap, teamsEnabled } = useGameStore();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const handleForceStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await apiService.proceedFromPreGame();
    } catch (err) {
      console.error("Failed to force-start:", err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopGame = async () => {
    if (isStopping) return;
    setIsStopping(true);
    try {
      await apiService.stopGame();
    } catch (err) {
      console.error("Failed to stop game:", err);
    } finally {
      setIsStopping(false);
    }
  };

  const handleShuffleTeams = async () => {
    if (isShuffling) return;
    setIsShuffling(true);
    try {
      await apiService.shuffleTeams();
    } catch (err) {
      console.error("Failed to shuffle teams:", err);
    } finally {
      setIsShuffling(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {modeRecap && (
        <div className="mb-4">
          <ModeRecap
            modeName={modeRecap.modeName}
            roundCount={modeRecap.roundCount}
            sensitivityKey={modeRecap.sensitivity}
          />
        </div>
      )}

      <div className="flex justify-center gap-4">
        <button
          onClick={handleForceStart}
          disabled={isStarting}
          className={`px-8 py-3 rounded-lg text-lg font-bold transition-colors ${
            isStarting
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isStarting ? "STARTING..." : "START GAME"}
        </button>
        {teamsEnabled && (
          <button
            onClick={handleShuffleTeams}
            disabled={isShuffling}
            data-testid="shuffle-teams-button"
            className={`px-8 py-3 rounded-lg text-lg font-bold transition-colors ${
              isShuffling
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            {isShuffling ? "SHUFFLING..." : "SHUFFLE TEAMS"}
          </button>
        )}
        <button
          onClick={handleStopGame}
          disabled={isStopping}
          className={`px-8 py-3 rounded-lg text-lg font-bold transition-colors ${
            isStopping
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isStopping ? "STOPPING..." : "STOP GAME"}
        </button>
      </div>
    </div>
  );
}

export default PreGameControls;
