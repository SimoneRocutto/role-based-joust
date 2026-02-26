import { useState } from "react";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import GameSettingsPanel from "./GameSettingsPanel";
import LobbyActionBar from "./LobbyActionBar";
import SettingsModal from "./SettingsModal";

function AdminControls() {
  const settings = useAdminSettings();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Admin Controls</h2>
        {settings.isDevMode && (
          <span className="px-3 py-1 bg-yellow-600 text-yellow-100 text-sm font-semibold rounded">
            [DEV MODE]
          </span>
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="ml-auto p-1 text-2xl text-gray-400 hover:text-white transition-colors"
          aria-label="Open advanced settings"
        >
          ⚙
        </button>
      </div>

      <GameSettingsPanel
        selectedMode={settings.selectedMode}
        selectedTheme={settings.selectedTheme}
        selectedSensitivity={settings.selectedSensitivity}
        sensitivityPresets={settings.sensitivityPresets}
        roundCount={settings.roundCount}
        roundDuration={settings.roundDuration}
        combinedModeKey={settings.combinedModeKey}
        teamsEnabled={settings.teamsEnabled}
        teamCount={settings.teamCount}
        loading={settings.loading}
        handleCombinedModeChange={settings.handleCombinedModeChange}
        handleThemeChange={settings.handleThemeChange}
        handleSensitivityChange={settings.handleSensitivityChange}
        handleRoundCountChange={settings.handleRoundCountChange}
        handleRoundDurationChange={settings.handleRoundDurationChange}
        handleTeamCountChange={settings.handleTeamCountChange}
        dominationPointTarget={settings.dominationPointTarget}
        dominationBaseCount={settings.dominationBaseCount}
        targetScore={settings.targetScore}
        withEarbud={settings.withEarbud}
        handleDominationSettingChange={settings.handleDominationSettingChange}
        handleWithEarbudChange={settings.handleWithEarbudChange}
        handleTargetScoreChange={settings.handleTargetScoreChange}
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

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        dangerThreshold={settings.dangerThreshold}
        dominationControlInterval={settings.dominationControlInterval}
        dominationRespawnTime={settings.dominationRespawnTime}
        deathCountRespawnTime={settings.deathCountRespawnTime}
        loading={settings.loading}
        handleThresholdChange={settings.handleThresholdChange}
        handleDominationSettingChange={settings.handleDominationSettingChange}
        handleDeathCountRespawnChange={settings.handleDeathCountRespawnChange}
      />
    </div>
  );
}

export default AdminControls;
