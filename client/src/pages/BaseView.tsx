import { useEffect, useState, useCallback } from "react";
import { socketService } from "@/services/socket";
import { useGameStore } from "@/store/gameStore";
import { TEAM_COLORS } from "@/utils/teamColors";
import type { BaseRegisteredPayload, BaseCapturedPayload } from "@/types/socket.types";

/**
 * BaseView — Full-screen UI for a base phone in Domination mode.
 *
 * On mount, registers with the server via `base:register`.
 * Shows team color when captured, "TAP TO CAPTURE" when neutral.
 * Taps emit `base:tap` events.
 */
export default function BaseView() {
  const [baseId, setBaseId] = useState<string | null>(null);
  const [baseNumber, setBaseNumber] = useState<number>(0);
  const [ownerTeamId, setOwnerTeamId] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const gameState = useGameStore((s) => s.gameState);
  const isConnected = useGameStore((s) => s.isConnected);
  // Register as a base on mount, reusing a stored baseId if available so
  // the server can reconnect to the same slot (preserves number + ownership).
  useEffect(() => {
    const handleRegistered = (data: BaseRegisteredPayload) => {
      setBaseId(data.baseId);
      setBaseNumber(data.baseNumber);
      localStorage.setItem("baseId", data.baseId);
      // Restore ownership and game state on reconnect
      if (data.ownerTeamId !== undefined) {
        setOwnerTeamId(data.ownerTeamId);
      }
      if (data.gameState) {
        useGameStore.getState().setGameState(data.gameState as any);
      }
    };

    socketService.onBaseRegistered(handleRegistered);
    const storedBaseId = localStorage.getItem("baseId") ?? undefined;
    socketService.registerAsBase(storedBaseId);

    return () => {
      socketService.off("base:registered");
    };
  }, []);

  // Listen for capture events on this base
  useEffect(() => {
    if (!baseId) return;

    const handleCaptured = (data: BaseCapturedPayload) => {
      if (data.baseId !== baseId) return;
      setOwnerTeamId(data.teamId);

      // Flash animation on capture
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 300);
    };

    socketService.onBaseCaptured(handleCaptured);

    return () => {
      socketService.off("base:captured");
    };
  }, [baseId]);

  // Reset to neutral when game stops or returns to waiting
  useEffect(() => {
    if (gameState === "waiting" || gameState === "countdown") {
      setOwnerTeamId(null);
    }
  }, [gameState]);

  const handleTap = useCallback(() => {
    if (!baseId) return;
    if (gameState !== "active") return;
    socketService.tapBase(baseId);
  }, [baseId, gameState]);

  const isNeutral = ownerTeamId === null;
  const teamColor = !isNeutral && ownerTeamId != null ? TEAM_COLORS[ownerTeamId] : null;
  const isActive = gameState === "active";

  // Background color
  const bgColor = isNeutral ? "#111827" : teamColor?.primary ?? "#111827";

  // Border pulse for controlled state
  const borderStyle = !isNeutral && teamColor
    ? { borderColor: teamColor.border, borderWidth: "4px" }
    : {};

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center select-none touch-none"
      style={{
        backgroundColor: bgColor,
        transition: "background-color 0.3s ease",
        ...borderStyle,
      }}
      onClick={handleTap}
    >
      {/* Flash overlay on capture */}
      {flashActive && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ opacity: 0.4, transition: "opacity 0.3s" }}
        />
      )}

      {/* Connection indicator */}
      {!isConnected && (
        <div className="absolute top-4 left-4 text-red-400 text-sm font-bold">
          DISCONNECTED
        </div>
      )}

      {/* Base number with gold styling */}
      <div className="flex flex-col items-center gap-2">
        <span
          className="text-lg font-bold tracking-widest uppercase"
          style={{ color: "#F59E0B" }}
        >
          BASE
        </span>
        <div
          className="relative flex items-center justify-center"
          style={{ width: 120, height: 120 }}
        >
          {/* Hexagonal outline */}
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0"
            style={{ width: 120, height: 120 }}
          >
            <polygon
              points="60,5 110,30 110,90 60,115 10,90 10,30"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="3"
            />
          </svg>
          <span
            className="text-6xl font-black"
            style={{ color: "#F59E0B", zIndex: 1 }}
          >
            {baseNumber}
          </span>
        </div>
      </div>

      {/* Status text */}
      <div className="mt-8 text-center">
        {isNeutral ? (
          <p className="text-gray-400 text-xl font-medium">
            {isActive ? "TAP TO CAPTURE" : "WAITING FOR GAME"}
          </p>
        ) : (
          <p className="text-white text-xl font-bold">
            {teamColor?.name ?? `Team ${ownerTeamId}`}
          </p>
        )}
      </div>

      {/* Pulsing border animation for controlled bases */}
      {!isNeutral && (
        <style>{`
          @keyframes pulse-border {
            0%, 100% { box-shadow: inset 0 0 20px ${teamColor?.border ?? "transparent"}; }
            50% { box-shadow: inset 0 0 40px ${teamColor?.border ?? "transparent"}; }
          }
        `}</style>
      )}
      {!isNeutral && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ animation: "pulse-border 2s ease-in-out infinite" }}
        />
      )}
    </div>
  );
}
