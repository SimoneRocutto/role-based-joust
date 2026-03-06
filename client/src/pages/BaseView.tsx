import { useEffect, useState, useCallback } from "react";
import { socketService } from "@/services/socket";
import { useGameStore } from "@/store/gameStore";
import { TEAM_COLORS } from "@/utils/teamColors";
import type { BaseRegisteredPayload, BaseCapturedPayload, BaseStatusPayload } from "@/types/socket.types";

/**
 * BaseView — Full-screen UI for a base phone in Domination mode.
 *
 * Shows N colored sections (one per team). Tapping a section directly
 * claims that base for the corresponding team.
 */
export default function BaseView() {
  const [baseId, setBaseId] = useState<string | null>(null);
  const [baseNumber, setBaseNumber] = useState<number>(0);
  const [ownerTeamId, setOwnerTeamId] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState<number>(2);
  const [flashTeamId, setFlashTeamId] = useState<number | null>(null);
  const [kicked, setKicked] = useState(false);
  const gameState = useGameStore((s) => s.gameState);
  const isConnected = useGameStore((s) => s.isConnected);

  // Register as a base on mount, reusing a stored baseId if available so
  // the server can reconnect to the same slot (preserves number + ownership).
  useEffect(() => {
    const handleRegistered = (data: BaseRegisteredPayload) => {
      setBaseId(data.baseId);
      setBaseNumber(data.baseNumber);
      localStorage.setItem("baseId", data.baseId);
      if (data.ownerTeamId !== undefined) {
        setOwnerTeamId(data.ownerTeamId ?? null);
      }
      if (data.teamCount !== undefined && data.teamCount > 0) {
        setTeamCount(data.teamCount);
      }
      if (data.gameState) {
        useGameStore.getState().setGameState(data.gameState as any);
      }
    };

    socketService.onBaseRegistered(handleRegistered);

    socketService.onBaseKicked(() => {
      localStorage.removeItem("baseId");
      setKicked(true);
    });

    const storedBaseId = localStorage.getItem("baseId") ?? undefined;
    socketService.registerAsBase(storedBaseId);

    return () => {
      socketService.off("base:registered");
      socketService.off("base:kicked");
    };
  }, []);

  // Listen for capture and status events
  useEffect(() => {
    if (!baseId) return;

    const handleCaptured = (data: BaseCapturedPayload) => {
      if (data.baseId !== baseId) return;
      setOwnerTeamId(data.teamId);
      setFlashTeamId(data.teamId);
      setTimeout(() => setFlashTeamId(null), 300);
    };

    const handleStatus = (data: BaseStatusPayload) => {
      if (data.teamCount !== undefined && data.teamCount > 0) {
        setTeamCount(data.teamCount);
      }
      const thisBase = data.bases.find((b) => b.baseId === baseId);
      if (thisBase) {
        setOwnerTeamId(thisBase.ownerTeamId);
      }
    };

    socketService.onBaseCaptured(handleCaptured);
    socketService.onBaseStatus(handleStatus);

    return () => {
      socketService.off("base:captured");
      socketService.off("base:status");
    };
  }, [baseId]);

  // Reset to neutral when game stops or returns to waiting
  useEffect(() => {
    if (gameState === "waiting" || gameState === "countdown") {
      setOwnerTeamId(null);
    }
  }, [gameState]);

  const handleSectionTap = useCallback((teamId: number) => {
    if (!baseId) return;
    if (gameState !== "active") return;
    socketService.tapBase(baseId, teamId);
  }, [baseId, gameState]);

  if (kicked) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 select-none">
        <p className="text-red-400 text-2xl font-bold">DISCONNECTED BY ADMIN</p>
        <p className="text-gray-500 text-sm mt-2">Refresh to reconnect as a new base</p>
      </div>
    );
  }

  const isActive = gameState === "active";
  const teamIds = Array.from({ length: teamCount }, (_, i) => i);

  return (
    <div className="fixed inset-0 flex flex-col select-none touch-none bg-gray-950">
      {/* Connection indicator */}
      {!isConnected && (
        <div className="absolute top-4 left-4 z-10 text-red-400 text-sm font-bold">
          DISCONNECTED
        </div>
      )}

      {/* Base number header */}
      <div className="flex justify-center items-center py-3 z-10 bg-gray-950/80">
        <span className="text-sm font-bold tracking-widest uppercase mr-2" style={{ color: "#F59E0B" }}>
          BASE
        </span>
        <span className="text-3xl font-black" style={{ color: "#F59E0B" }}>
          {baseNumber}
        </span>
        {!isActive && (
          <span className="ml-4 text-gray-500 text-sm font-semibold uppercase tracking-wide">
            WAITING FOR GAME
          </span>
        )}
      </div>

      {/* Team sections — one per team, filling the remaining screen */}
      <div className="flex flex-1">
        {teamIds.map((teamId) => {
          const teamColor = TEAM_COLORS[teamId];
          const isOwner = ownerTeamId === teamId;
          const isFlashing = flashTeamId === teamId;
          const primary = teamColor?.primary ?? "#888888";

          return (
            <div
              key={teamId}
              className="flex-1 flex flex-col items-center justify-center relative"
              style={{
                backgroundColor: isOwner ? primary : primary + "33",
                transition: "background-color 0.25s ease",
                borderRight: teamId < teamCount - 1 ? "2px solid rgba(255,255,255,0.1)" : undefined,
              }}
              onClick={() => isActive && handleSectionTap(teamId)}
            >
              {/* Flash overlay on capture */}
              {isFlashing && (
                <div className="absolute inset-0 bg-white opacity-40 pointer-events-none" />
              )}

              {/* Team name */}
              <span
                className="text-3xl font-black drop-shadow"
                style={{ color: isOwner ? "#ffffff" : primary }}
              >
                {teamColor?.name ?? `Team ${teamId}`}
              </span>

              {/* Status */}
              <span
                className="text-sm font-semibold mt-2 uppercase tracking-wide"
                style={{ color: isOwner ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)" }}
              >
                {isOwner ? "CAPTURED ✓" : (isActive ? "TAP TO CLAIM" : "–")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
