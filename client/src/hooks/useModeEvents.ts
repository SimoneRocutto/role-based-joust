import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { useGameState } from "@/hooks/useGameState";
import { useAudio } from "@/hooks/useAudio";
import { socketService } from "@/services/socket";
import {
  DASHBOARD_MODE_BACKGROUNDS,
  MODE_EVENT_EFFECTS,
} from "@/utils/constants";

/**
 * Handles mode:event socket events and resolves the dashboard background.
 * Applies SFX, music rate changes, and store updates from MODE_EVENT_EFFECTS config.
 * Returns the resolved background CSS value.
 */
export function useModeEvents() {
  const { isActive } = useGameState();
  const { playSfx, setMusicRate } = useAudio();
  const setActiveModeEvent = useGameStore((s) => s.setActiveModeEvent);
  const activeModeEvent = useGameStore((s) => s.activeModeEvent);
  const mode = useGameStore((s) => s.mode);

  // Listen for mode:event and apply effects
  useEffect(() => {
    socketService.onModeEvent(({ eventType }) => {
      const effects = MODE_EVENT_EFFECTS[eventType];
      if (!effects) return;

      setActiveModeEvent(eventType);

      if (effects.sfx) {
        playSfx(effects.sfx);
      }
      if (effects.musicRate !== undefined) {
        setMusicRate(effects.musicRate);
      }
    });

    return () => {
      socketService.off("mode:event");
    };
  }, [setActiveModeEvent, playSfx, setMusicRate]);

  // Clear active event when game is no longer active
  useEffect(() => {
    if (!isActive) {
      setActiveModeEvent(null);
    }
  }, [isActive, setActiveModeEvent]);

  // Resolve background: event override > mode default > fallback
  const eventBg = activeModeEvent
    ? MODE_EVENT_EFFECTS[activeModeEvent]?.background
    : null;
  const modeBg =
    mode && isActive ? DASHBOARD_MODE_BACKGROUNDS[mode]?.background : null;
  const background = eventBg ?? modeBg ?? "#111827";

  return { background };
}
