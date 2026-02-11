import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { useGameState } from "@/hooks/useGameState";
import { useGameStore } from "@/store/gameStore";
import { apiService } from "@/services/api";
import type { GameMode } from "@/types/game.types";

function AdminControls() {
  const { players } = useGameState();
  const { isDevMode, readyCount, teamSelectionActive } = useGameStore();
  const [modes, setModes] = useState<GameMode[]>([]);
  const [selectedMode, setSelectedMode] = useState("role-based");
  const [selectedTheme, setSelectedTheme] = useState("standard");
  const [selectedSensitivity, setSelectedSensitivity] = useState("medium");
  const [sensitivityPresets, setSensitivityPresets] = useState<
    Array<{ key: string; label: string; description: string }>
  >([]);
  const [dangerThreshold, setDangerThreshold] = useState(0.1);
  const [roundCount, setRoundCount] = useState(3);
  const [roundDuration, setRoundDuration] = useState(90);
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [teamCount, setTeamCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Separate connected and disconnected players for accurate counts
  const connectedPlayers = players.filter((p) => p.isConnected !== false);
  const disconnectedPlayers = players.filter((p) => p.isConnected === false);

  // Preserve ?mode=production in QR code URL if dashboard was loaded with it
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get("mode");
  const joinUrl =
    modeParam === "production"
      ? `${window.location.origin}/join?mode=production`
      : `${window.location.origin}/join`;

  // Check if all players are ready (for production mode)
  const allPlayersReady =
    readyCount.total > 0 && readyCount.ready === readyCount.total;

  // Fetch available game modes and settings
  useEffect(() => {
    apiService
      .getGameModes()
      .then((data) => {
        if (data.success) {
          setModes(data.modes);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch game modes:", err);
        setError("Failed to load game modes");
      });

    apiService
      .getSettings()
      .then((data) => {
        if (data.success) {
          setSensitivityPresets(data.presets);
          setSelectedSensitivity(data.sensitivity);
          setDangerThreshold(data.movement.dangerThreshold);
          // Load persisted mode and theme preferences
          if (data.gameMode) {
            setSelectedMode(data.gameMode);
          }
          if (data.theme) {
            setSelectedTheme(data.theme);
          }
          if (data.roundCount) {
            setRoundCount(data.roundCount);
          }
          if (data.roundDuration) {
            setRoundDuration(data.roundDuration);
          }
          if (data.teamsEnabled !== undefined) {
            setTeamsEnabled(data.teamsEnabled);
            useGameStore.getState().setTeamsEnabled(data.teamsEnabled);
          }
          if (data.teamCount) {
            setTeamCount(data.teamCount);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch settings:", err);
      });
  }, []);

  // Generate QR code for join URL
  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 120,
      margin: 1,
      color: { dark: "#ffffffff", light: "#00000000" },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("Failed to generate QR code:", err));
  }, [joinUrl]);

  const handleModeChange = async (mode: string) => {
    setSelectedMode(mode);
    // Auto-switch sensitivity based on mode
    const targetSensitivity = mode === "classic" ? "oneshot" : "medium";
    const sensitivityChanged = targetSensitivity !== selectedSensitivity;
    if (sensitivityChanged) {
      setSelectedSensitivity(targetSensitivity);
    }
    // Persist mode (and sensitivity if it changed) to backend
    try {
      await apiService.updateSettings({
        gameMode: mode,
        ...(sensitivityChanged ? { sensitivity: targetSensitivity } : {}),
      });
    } catch (err) {
      console.error("Failed to update mode:", err);
    }
  };

  const handleThemeChange = async (theme: string) => {
    setSelectedTheme(theme);
    // Persist theme to backend
    try {
      await apiService.updateSettings({ theme });
    } catch (err) {
      console.error("Failed to update theme:", err);
    }
  };

  const handleSensitivityChange = async (sensitivity: string) => {
    setSelectedSensitivity(sensitivity);
    // Persist sensitivity to backend
    try {
      await apiService.updateSettings({ sensitivity });
    } catch (err) {
      console.error("Failed to update sensitivity:", err);
    }
  };

  const handleThresholdChange = async (value: number) => {
    setDangerThreshold(value);
    try {
      const result = await apiService.updateSettings({
        dangerThreshold: value,
      });
      if (result.success) {
        setSelectedSensitivity(result.sensitivity);
      }
    } catch (err) {
      console.error("Failed to update threshold:", err);
      setError("Failed to update threshold");
    }
  };

  const handleRoundCountChange = async (count: number) => {
    setRoundCount(count);
    try {
      await apiService.updateSettings({ roundCount: count });
    } catch (err) {
      console.error("Failed to update round count:", err);
    }
  };

  const handleRoundDurationChange = async (duration: number) => {
    setRoundDuration(duration);
    try {
      await apiService.updateSettings({ roundDuration: duration });
    } catch (err) {
      console.error("Failed to update round duration:", err);
    }
  };

  const handleTeamsEnabledChange = async (enabled: boolean) => {
    setTeamsEnabled(enabled);
    useGameStore.getState().setTeamsEnabled(enabled);
    try {
      await apiService.updateSettings({ teamsEnabled: enabled });
    } catch (err) {
      console.error("Failed to update teams setting:", err);
    }
  };

  const handleTeamCountChange = async (count: number) => {
    setTeamCount(count);
    try {
      await apiService.updateSettings({ teamCount: count });
    } catch (err) {
      console.error("Failed to update team count:", err);
    }
  };

  const handleShuffleTeams = async () => {
    try {
      await apiService.shuffleTeams();
    } catch (err) {
      console.error("Failed to shuffle teams:", err);
    }
  };

  const handleStartTeamSelection = async () => {
    if (connectedPlayers.length < 2) {
      setError("Need at least 2 players to start");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.startTeamSelection();
      if (!result.success) {
        throw new Error("Failed to start team selection");
      }
    } catch (err) {
      console.error("Failed to start team selection:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTeamSelection = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiService.stopGame();
    } catch (err) {
      console.error("Failed to cancel team selection:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchGame = async () => {
    if (connectedPlayers.length < 2) {
      setError("Need at least 2 players to start");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Launch game (create + start with countdown)
      const result = await apiService.launchGame({
        mode: selectedMode,
        theme: selectedMode === "role-based" ? selectedTheme : undefined,
      });

      if (!result.success) {
        throw new Error("Failed to launch game");
      }
    } catch (err) {
      console.error("Failed to launch game:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Determine which action "Start Game" should trigger
  const handleStartClick =
    teamsEnabled && !teamSelectionActive
      ? handleStartTeamSelection
      : handleLaunchGame;

  // Team selection active — show simplified controls
  if (teamSelectionActive) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-blue-600">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold">Team Selection</h2>
          <span className="px-3 py-1 bg-blue-600 text-blue-100 text-sm font-semibold rounded">
            {teamCount} teams
          </span>
        </div>

        <p className="text-gray-400 mb-4">
          Players can tap their screen to switch teams. Press Start Game when
          ready.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 items-center">
          <button
            onClick={handleShuffleTeams}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-bold text-lg transition-colors"
          >
            Shuffle Teams
          </button>

          <button
            onClick={handleLaunchGame}
            disabled={loading || connectedPlayers.length < 2}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-bold text-xl transition-colors"
          >
            {loading ? "Starting..." : "Start Game"}
          </button>

          <button
            onClick={handleCancelTeamSelection}
            disabled={loading}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded-lg font-medium text-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Admin Controls</h2>
        {isDevMode && (
          <span className="px-3 py-1 bg-yellow-600 text-yellow-100 text-sm font-semibold rounded">
            [DEV MODE]
          </span>
        )}
      </div>

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

      {/* Connected Players (only when teams disabled — team lobby grid handles team display) */}
      {!teamsEnabled && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">
            Connected Players: {connectedPlayers.length}
            {disconnectedPlayers.length > 0 && (
              <span className="text-gray-500 text-sm font-normal ml-2">
                ({disconnectedPlayers.length} offline)
              </span>
            )}
          </h3>
          {players.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`px-3 py-2 bg-gray-700 rounded text-sm ${
                    p.isConnected === false ? 'opacity-40' : ''
                  }`}
                >
                  #{p.number} {p.name}
                  {p.isConnected === false && (
                    <span className="text-gray-500 text-xs ml-1">OFFLINE</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No players connected yet...</p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Action Button + QR Code */}
      <div className="flex gap-4 items-center">
        {/* In dev mode: always show start button */}
        {isDevMode && (
          <button
            onClick={handleStartClick}
            disabled={loading || connectedPlayers.length < 2}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-bold text-xl transition-colors"
          >
            {loading ? "Starting..." : `Start Game (${connectedPlayers.length} players)`}
          </button>
        )}

        {/* In production mode: show status or start button when all ready */}
        {!isDevMode && (
          <>
            {allPlayersReady ? (
              <button
                onClick={handleStartClick}
                disabled={loading || connectedPlayers.length < 2}
                className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-bold text-xl transition-colors animate-pulse"
              >
                {loading ? "Starting..." : `All Ready! Start Game`}
              </button>
            ) : (
              <div className="px-8 py-4 bg-gray-700 rounded-lg text-gray-400 text-xl">
                Waiting for all players to shake ready... ({readyCount.ready}/
                {readyCount.total})
              </div>
            )}
          </>
        )}

        {/* QR Code for joining */}
        {qrDataUrl && (
          <div className="flex flex-col items-center gap-1 ml-auto">
            <img src={qrDataUrl} alt="Scan to join" width={120} height={120} />
            <span className="text-xs text-gray-400 select-all">{joinUrl}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminControls;
