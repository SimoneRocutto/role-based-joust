import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { useGameState } from "@/hooks/useGameState";
import { socketService } from "@/services/socket";
import {
  GAME_EVENT_DEFAULTS,
  MODE_EVENT_EFFECTS,
} from "@/utils/constants";
import { audioManager } from "@/services/audio";

/**
 * Handles mode:event socket events and resolves the dashboard background.
 * Applies SFX, music rate changes, and store updates from MODE_EVENT_EFFECTS config.
 * Returns the resolved background CSS value.
 */
export function useModeEvents() {
  const { isActive } = useGameState();

  const setActiveModeEvent = useGameStore((s) => s.setActiveModeEvent);
  const activeModeEvent = useGameStore((s) => s.activeModeEvent);
  const activeGameEvents = useGameStore((s) => s.activeGameEvents);

  // Listen for mode:event and apply effects
  useEffect(() => {
    socketService.onModeEvent(({ eventType }) => {
      const effects = MODE_EVENT_EFFECTS[eventType];
      if (!effects) return;

      setActiveModeEvent(eventType);

      if (effects.sfx) {
        audioManager.playSfx(effects.sfx);
      }
      if (effects.musicRate !== undefined) {
        audioManager.setMusicRate(effects.musicRate);
      }
    });

    return () => {
      socketService.off("mode:event");
    };
  }, [setActiveModeEvent]);

  // Clear active event when game is no longer active
  useEffect(() => {
    if (!isActive) {
      setActiveModeEvent(null);
    }
  }, [isActive, setActiveModeEvent]);

  // Resolve background: active mode event override > game event default > fallback
  const eventBg = activeModeEvent
    ? MODE_EVENT_EFFECTS[activeModeEvent]?.background
    : null;
  const defaultBg = isActive
    ? activeGameEvents.map((key) => GAME_EVENT_DEFAULTS[key]?.background).find(Boolean) ?? null
    : null;
  const background = eventBg ?? defaultBg ?? "#111827";

  return { background };
}
