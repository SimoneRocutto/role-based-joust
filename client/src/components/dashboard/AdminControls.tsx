import { useAdminSettings } from "@/hooks/useAdminSettings";
import GameSettingsPanel from "./GameSettingsPanel";
import LobbyActionBar from "./LobbyActionBar";

function AdminControls() {
  const settings = useAdminSettings();

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Admin Controls</h2>
        {settings.isDevMode && (
          <span className="px-3 py-1 bg-yellow-600 text-yellow-100 text-sm font-semibold rounded">
            [DEV MODE]
          </span>
        )}
      </div>

      <GameSettingsPanel
        selectedMode={settings.selectedMode}
        selectedTheme={settings.selectedTheme}
        selectedSensitivity={settings.selectedSensitivity}
        sensitivityPresets={settings.sensitivityPresets}
        dangerThreshold={settings.dangerThreshold}
        roundCount={settings.roundCount}
        roundDuration={settings.roundDuration}
        combinedModeKey={settings.combinedModeKey}
        teamsEnabled={settings.teamsEnabled}
        teamCount={settings.teamCount}
        loading={settings.loading}
        handleCombinedModeChange={settings.handleCombinedModeChange}
        handleThemeChange={settings.handleThemeChange}
        handleSensitivityChange={settings.handleSensitivityChange}
        handleThresholdChange={settings.handleThresholdChange}
        handleRoundCountChange={settings.handleRoundCountChange}
        handleRoundDurationChange={settings.handleRoundDurationChange}
        handleTeamCountChange={settings.handleTeamCountChange}
      />

      <LobbyActionBar
        players={settings.players}
        connectedPlayers={settings.connectedPlayers}
        disconnectedPlayers={settings.disconnectedPlayers}
        teamsEnabled={settings.teamsEnabled}
        isDevMode={settings.isDevMode}
        loading={settings.loading}
        error={settings.error}
        qrDataUrl={settings.qrDataUrl}
        joinUrl={settings.joinUrl}
        handleStartClick={settings.handleStartClick}
      />
    </div>
  );
}

export default AdminControls;
