import { COMBINED_MODES } from "@/utils/modeMapping";

interface GameSettingsPanelProps {
  selectedMode: string;
  selectedTheme: string;
  selectedSensitivity: string;
  sensitivityPresets: Array<{ key: string; label: string; description: string }>;
  roundCount: number;
  roundDuration: number;
  combinedModeKey: string;
  teamsEnabled: boolean;
  teamCount: number;
  loading: boolean;
  dominationPointTarget: number;
  dominationBaseCount: number;
  handleCombinedModeChange: (combinedKey: string) => void;
  handleThemeChange: (theme: string) => void;
  handleSensitivityChange: (sensitivity: string) => void;
  handleRoundCountChange: (count: number) => void;
  handleRoundDurationChange: (duration: number) => void;
  handleTeamCountChange: (count: number) => void;
  handleDominationSettingChange: (key: string, value: number) => void;
}

function GameSettingsPanel({
  selectedMode,
  selectedTheme,
  selectedSensitivity,
  sensitivityPresets,
  roundCount,
  roundDuration,
  combinedModeKey,
  teamsEnabled,
  teamCount,
  loading,
  handleCombinedModeChange,
  handleThemeChange,
  handleSensitivityChange,
  handleRoundCountChange,
  handleRoundDurationChange,
  handleTeamCountChange,
  dominationPointTarget,
  dominationBaseCount,
  handleDominationSettingChange,
}: GameSettingsPanelProps) {
  const isDomination = selectedMode === "domination";
  return (
    <>
      {/* Mode Selection (combined with teams) */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Game Mode</label>
          <select
            value={combinedModeKey}
            onChange={(e) => handleCombinedModeChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
            disabled={loading}
          >
            {COMBINED_MODES.map((mode) => (
              <option key={mode.key} value={mode.key}>
                {mode.label}
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

      {/* Team count selector (only when a team mode is selected) */}
      {teamsEnabled && (
        <div className="mb-4">
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
        </div>
      )}

      {/* Domination-specific settings */}
      {isDomination && (
        <>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Point Target</label>
            <div className="flex gap-2">
              {[10, 15, 20, 30].map((target) => (
                <button
                  key={target}
                  onClick={() => handleDominationSettingChange("dominationPointTarget", target)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dominationPointTarget === target
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {target}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              First team to {dominationPointTarget} points wins
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Base Count</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((count) => (
                <button
                  key={count}
                  onClick={() => handleDominationSettingChange("dominationBaseCount", count)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dominationBaseCount === count
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Expected number of base phones
            </p>
          </div>
        </>
      )}

      {/* Round Count Selection (hidden for domination) */}
      {!isDomination && (
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
      )}

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

    </>
  );
}

export default GameSettingsPanel;
