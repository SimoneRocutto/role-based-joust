import { useAdminSettings } from "@/hooks/useAdminSettings";
import TeamSelectionPanel from "./TeamSelectionPanel";
import GameSettingsPanel from "./GameSettingsPanel";
import LobbyActionBar from "./LobbyActionBar";

function AdminControls() {
  const settings = useAdminSettings();

  if (settings.teamSelectionActive) {
    return (
      <TeamSelectionPanel
        teamCount={settings.teamCount}
        loading={settings.loading}
        error={settings.error}
        connectedPlayers={settings.connectedPlayers}
        handleShuffleTeams={settings.handleShuffleTeams}
        handleLaunchGame={settings.handleLaunchGame}
        handleCancelTeamSelection={settings.handleCancelTeamSelection}
      />
    );
  }

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
        modes={settings.modes}
        selectedMode={settings.selectedMode}
        selectedTheme={settings.selectedTheme}
        selectedSensitivity={settings.selectedSensitivity}
        sensitivityPresets={settings.sensitivityPresets}
        dangerThreshold={settings.dangerThreshold}
        roundCount={settings.roundCount}
        roundDuration={settings.roundDuration}
        teamsEnabled={settings.teamsEnabled}
        teamCount={settings.teamCount}
        loading={settings.loading}
        handleModeChange={settings.handleModeChange}
        handleThemeChange={settings.handleThemeChange}
        handleSensitivityChange={settings.handleSensitivityChange}
        handleThresholdChange={settings.handleThresholdChange}
        handleRoundCountChange={settings.handleRoundCountChange}
        handleRoundDurationChange={settings.handleRoundDurationChange}
        handleTeamsEnabledChange={settings.handleTeamsEnabledChange}
        handleTeamCountChange={settings.handleTeamCountChange}
      />

      <LobbyActionBar
        players={settings.players}
        connectedPlayers={settings.connectedPlayers}
        disconnectedPlayers={settings.disconnectedPlayers}
        teamsEnabled={settings.teamsEnabled}
        isDevMode={settings.isDevMode}
        allPlayersReady={settings.allPlayersReady}
        loading={settings.loading}
        error={settings.error}
        readyCount={settings.readyCount}
        qrDataUrl={settings.qrDataUrl}
        joinUrl={settings.joinUrl}
        handleStartClick={settings.handleStartClick}
      />
    </div>
  );
}

export default AdminControls;
