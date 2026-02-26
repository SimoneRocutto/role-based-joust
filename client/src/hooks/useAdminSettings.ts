import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { useGameState } from "@/hooks/useGameState";
import { useGameStore } from "@/store/gameStore";
import { apiService } from "@/services/api";
import { getCombinedModeKey, parseCombinedMode } from "@/utils/modeMapping";
import type { GameMode } from "@/types/game.types";

export function useAdminSettings() {
  const { players } = useGameState();
  const { isDevMode, readyCount } = useGameStore();
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
  const [dominationPointTarget, setDominationPointTarget] = useState(20);
  const [dominationControlInterval, setDominationControlInterval] = useState(5);
  const [dominationRespawnTime, setDominationRespawnTime] = useState(10);
  const [dominationBaseCount, setDominationBaseCount] = useState(1);
  const [deathCountRespawnTime, setDeathCountRespawnTime] = useState(5);
  const [withEarbud, setWithEarbud] = useState(false);
  const [targetScore, setTargetScoreState] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const connectedPlayers = players.filter((p) => p.isConnected !== false);
  const disconnectedPlayers = players.filter((p) => p.isConnected === false);

  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get("mode");
  const joinUrl =
    modeParam === "production"
      ? `${window.location.origin}/join?mode=production`
      : `${window.location.origin}/join`;

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
          if (data.dominationPointTarget !== undefined) {
            setDominationPointTarget(data.dominationPointTarget);
          }
          if (data.dominationControlInterval !== undefined) {
            setDominationControlInterval(data.dominationControlInterval);
          }
          if (data.dominationRespawnTime !== undefined) {
            setDominationRespawnTime(data.dominationRespawnTime);
          }
          if (data.dominationBaseCount !== undefined) {
            setDominationBaseCount(data.dominationBaseCount);
          }
          if (data.deathCountRespawnTime !== undefined) {
            setDeathCountRespawnTime(data.deathCountRespawnTime);
          }
          if (data.withEarbud !== undefined) {
            setWithEarbud(data.withEarbud);
          }
          if (data.targetScore !== undefined) {
            setTargetScoreState(data.targetScore);
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
    const targetSensitivity = mode === "classic" ? "oneshot" : "medium";
    const sensitivityChanged = targetSensitivity !== selectedSensitivity;
    if (sensitivityChanged) {
      setSelectedSensitivity(targetSensitivity);
    }
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
    try {
      await apiService.updateSettings({ theme });
    } catch (err) {
      console.error("Failed to update theme:", err);
    }
  };

  const handleSensitivityChange = async (sensitivity: string) => {
    setSelectedSensitivity(sensitivity);
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

  const combinedModeKey = getCombinedModeKey(selectedMode, teamsEnabled);

  const handleCombinedModeChange = async (combinedKey: string) => {
    const { serverMode, teams } = parseCombinedMode(combinedKey);
    setSelectedMode(serverMode);
    setTeamsEnabled(teams);
    useGameStore.getState().setTeamsEnabled(teams);

    // Auto-switch sensitivity: classic → oneshot, others → medium
    const targetSensitivity = serverMode === "classic" ? "oneshot" : "medium";
    const sensitivityChanged = targetSensitivity !== selectedSensitivity;
    if (sensitivityChanged) {
      setSelectedSensitivity(targetSensitivity);
    }

    try {
      await apiService.updateSettings({
        gameMode: serverMode,
        teamsEnabled: teams,
        ...(sensitivityChanged ? { sensitivity: targetSensitivity } : {}),
      });
    } catch (err) {
      console.error("Failed to update combined mode:", err);
    }
  };

  const handleDominationSettingChange = async (key: string, value: number) => {
    // Update local state
    if (key === "dominationPointTarget") setDominationPointTarget(value);
    if (key === "dominationControlInterval") setDominationControlInterval(value);
    if (key === "dominationRespawnTime") setDominationRespawnTime(value);
    if (key === "dominationBaseCount") setDominationBaseCount(value);

    try {
      await apiService.updateSettings({ [key]: value });
    } catch (err) {
      console.error(`Failed to update ${key}:`, err);
    }
  };

  const handleDeathCountRespawnChange = async (value: number) => {
    setDeathCountRespawnTime(value);
    try {
      await apiService.updateSettings({ deathCountRespawnTime: value });
    } catch (err) {
      console.error("Failed to update deathCountRespawnTime:", err);
    }
  };

  const handleWithEarbudChange = async (enabled: boolean) => {
    setWithEarbud(enabled);
    try {
      await apiService.updateSettings({ withEarbud: enabled });
    } catch (err) {
      console.error("Failed to update withEarbud:", err);
    }
  };

  const handleTargetScoreChange = async (score: number) => {
    setTargetScoreState(score);
    try {
      await apiService.updateSettings({ targetScore: score });
    } catch (err) {
      console.error("Failed to update target score:", err);
    }
  };

  const handleShuffleTeams = async () => {
    try {
      await apiService.shuffleTeams();
    } catch (err) {
      console.error("Failed to shuffle teams:", err);
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

  const handleStartClick = handleLaunchGame;

  return {
    // State
    players,
    isDevMode,
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
    dominationPointTarget,
    dominationControlInterval,
    dominationRespawnTime,
    dominationBaseCount,
    deathCountRespawnTime,
    withEarbud,
    targetScore,
    combinedModeKey,
    loading,
    error,
    qrDataUrl,
    connectedPlayers,
    disconnectedPlayers,
    joinUrl,
    allPlayersReady,
    readyCount,
    // Handlers
    handleModeChange,
    handleCombinedModeChange,
    handleThemeChange,
    handleSensitivityChange,
    handleThresholdChange,
    handleRoundCountChange,
    handleRoundDurationChange,
    handleTeamsEnabledChange,
    handleTeamCountChange,
    handleDominationSettingChange,
    handleDeathCountRespawnChange,
    handleWithEarbudChange,
    handleTargetScoreChange,
    handleShuffleTeams,
    handleLaunchGame,
    handleStartClick,
  };
}
