import type { GameMode } from "@/types/game.types";

interface GameSettingsPanelProps {
  modes: GameMode[];
  selectedMode: string;
  selectedTheme: string;
  selectedSensitivity: string;
  sensitivityPresets: Array<{ key: string; label: string; description: string }>;
  dangerThreshold: number;
  roundCount: number;
  roundDuration: number;
  teamsEnabled: boolean;
  teamCount: number;
  loading: boolean;
  handleModeChange: (mode: string) => void;
  handleThemeChange: (theme: string) => void;
  handleSensitivityChange: (sensitivity: string) => void;
  handleThresholdChange: (value: number) => void;
  handleRoundCountChange: (count: number) => void;
  handleRoundDurationChange: (duration: number) => void;
  handleTeamsEnabledChange: (enabled: boolean) => void;
  handleTeamCountChange: (count: number) => void;
}

function GameSettingsPanel({
  modes,
  selectedMode,
  selectedTheme,
  selectedSensitivity,
  sensitivityPresets,
  dangerThreshold,
  roundCount,
  roundDuration,
  teamsEnabled,
  teamCount,
  loading,
  handleModeChange,
  handleThemeChange,
  handleSensitivityChange,
  handleThresholdChange,
  handleRoundCountChange,
  handleRoundDurationChange,
  handleTeamsEnabledChange,
  handleTeamCountChange,
}: GameSettingsPanelProps) {
  return (
    <>
      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Game Mode</label>
          <select
            value={selectedMode}
            onChange={(e) => handleModeChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
            disabled={loading}
          >
            {modes.map((mode) => (
              <option key={mode.key} value={mode.key}>
                {mode.name}
              </option>
            ))}
          </select>
        </div>

        {selectedMode === "role-based" && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Theme</label>
            <select
              value={selectedTheme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
              disabled={loading}
            >
              <option value="standard">Standard</option>
              <option value="halloween">Halloween</option>
              <option value="mafia">Mafia</option>
              <option value="fantasy">Fantasy</option>
              <option value="scifi">Sci-Fi</option>
            </select>
          </div>
        )}
      </div>

      {/* Round Count Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Number of Rounds
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((count) => (
            <button
              key={count}
              onClick={() => handleRoundCountChange(count)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                roundCount === count
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {roundCount === 1
            ? "Single round — winner takes all"
            : `${roundCount} rounds — points accumulate`}
        </p>
      </div>

      {/* Round Duration (only for timed modes like death-count) */}
      {selectedMode === "death-count" && (
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Round Duration (seconds)
          </label>
          <div className="flex gap-2">
            {[60, 90, 120, 180].map((duration) => (
              <button
                key={duration}
                onClick={() => handleRoundDurationChange(duration)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  roundDuration === duration
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {duration}s
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Each round lasts {roundDuration} seconds
          </p>
        </div>
      )}

      {/* Team Mode */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <label className="block text-sm text-gray-400">Team Mode</label>
          <button
            onClick={() => handleTeamsEnabledChange(!teamsEnabled)}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              teamsEnabled ? "bg-blue-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                teamsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {teamsEnabled && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Teams:</span>
            <div className="flex gap-2">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => handleTeamCountChange(count)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    teamCount === count
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sensitivity Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Movement Sensitivity
        </label>
        <div className="flex gap-2">
          {sensitivityPresets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handleSensitivityChange(preset.key)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSensitivity === preset.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {
            sensitivityPresets.find((p) => p.key === selectedSensitivity)
              ?.description
          }
        </p>
      </div>

      {/* Movement Threshold */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Movement Threshold: {(dangerThreshold * 100).toFixed(0)}%
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Sensitive</span>
          <input
            type="range"
            min="1"
            max="50"
            value={Math.round(dangerThreshold * 100)}
            onChange={(e) =>
              handleThresholdChange(parseInt(e.target.value) / 100)
            }
            disabled={loading}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-xs text-gray-500">Forgiving</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          How much movement is needed before taking damage
        </p>
      </div>
    </>
  );
}

export default GameSettingsPanel;
