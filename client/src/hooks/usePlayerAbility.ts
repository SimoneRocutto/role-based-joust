import { useEffect, useState, useCallback, useRef } from "react";
import { socketService } from "@/services/socket";
import { audioManager } from "@/services/audio";
import type { ChargeInfo } from "@/types/socket.types";

export function usePlayerAbility(myPlayerId: string | null) {
  const [chargeInfo, setChargeInfo] = useState<ChargeInfo | null>(null);
  const lastTapTime = useRef<number>(0);

  // Handle tap for ability use during active game
  const handleTap = useCallback(() => {
    if (!myPlayerId) return;

    // Debounce taps (300ms minimum between taps)
    const now = Date.now();
    if (now - lastTapTime.current < 300) return;
    lastTapTime.current = now;

    socketService.sendTap(myPlayerId);
  }, [myPlayerId]);

  // Listen for tap results (ability use)
  useEffect(() => {
    const handleTapResult = (data: {
      success: boolean;
      reason?: string;
      charges: ChargeInfo | null;
    }) => {
      if (data.charges) {
        setChargeInfo(data.charges);
      }

      if (data.success) {
        audioManager.playSfx("power-activation", { volume: 0.6 });
      } else if (data.reason === "no_charges") {
        audioManager.playSfx("no-charges", { volume: 0.4 });
      }
    };

    socketService.onTapResult(handleTapResult);

    return () => {
      socketService.off("player:tap:result", handleTapResult);
    };
  }, []);

  return {
    chargeInfo,
    handleTap,
  };
}
