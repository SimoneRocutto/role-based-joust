import { useEffect, useState, useRef, useCallback } from "react";
import { socketService } from "@/services/socket";
import { useGameStore } from "@/store/gameStore";
import { RECONNECTION_CONFIG } from "@/utils/constants";

export function useReconnect() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isGivenUp, setIsGivenUp] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  // Stable ref so functions defined outside the effect can call stopReconnecting
  const stopRef = useRef<() => void>(() => {});
  // True while we're in the reconnecting cycle (avoids starting it twice)
  const isReconnectingRef = useRef(false);

  const { setReconnecting } = useGameStore();

  useEffect(() => {
    const stopReconnecting = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isReconnectingRef.current = false;
      setIsReconnecting(false);
      setAttempts(0);
      setReconnecting(false, 0);
    };

    // Keep a stable ref so retryOnce (defined outside effect) can call it
    stopRef.current = stopReconnecting;

    const startReconnecting = () => {
      const sessionToken = localStorage.getItem("sessionToken");
      if (!sessionToken) {
        // No session to restore — just reconnect the transport
        socketService.forceReconnect();
        return;
      }

      if (isReconnectingRef.current) return;

      isReconnectingRef.current = true;
      setIsReconnecting(true);
      setIsGivenUp(false);
      setAttempts(0);
      setReconnecting(true, 0);

      let count = 0;
      intervalRef.current = window.setInterval(() => {
        count++;

        if (count > RECONNECTION_CONFIG.MAX_ATTEMPTS) {
          stopReconnecting();
          setIsGivenUp(true);
          return;
        }

        setAttempts(count);
        setReconnecting(true, count);

        socketService.reconnect({
          token: sessionToken,
          socketId: socketService.getSocketId() || "",
        });
      }, RECONNECTION_CONFIG.RETRY_INTERVAL);
    };

    const onConnectionChange = (connected: boolean) => {
      if (!connected) {
        startReconnecting();
      } else {
        // Always try to restore session on connect — handles both mid-reconnection
        // and page refresh (where isReconnectingRef starts as false).
        const sessionToken = localStorage.getItem("sessionToken");
        if (sessionToken) {
          socketService.reconnect({
            token: sessionToken,
            socketId: socketService.getSocketId() || "",
          });
        }
      }
    };
    socketService.on("connection:change", onConnectionChange);

    // Proactive restore: if socket was already connected before this effect ran
    // (common on page refresh), fire immediately since connection:change won't fire.
    const existingToken = localStorage.getItem("sessionToken");
    if (existingToken && socketService.getConnectionStatus()) {
      socketService.reconnect({
        token: existingToken,
        socketId: socketService.getSocketId() || "",
      });
    }

    const onPlayerReconnected = (data: { success: boolean }) => {
      if (data.success) {
        stopReconnecting();
      } else {
        // Server rejected token (e.g. server restarted) — give up immediately
        stopReconnecting();
        setIsGivenUp(true);
      }
    };
    socketService.onPlayerReconnected(onPlayerReconnected);

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !socketService.getConnectionStatus()
      ) {
        const sessionToken = localStorage.getItem("sessionToken");
        if (sessionToken) {
          socketService.forceReconnect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Use specific callbacks so cleanup doesn't nuke useSocket.ts listeners
      socketService.off("connection:change", onConnectionChange);
      socketService.off("player:reconnected", onPlayerReconnected);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // empty deps — no re-running on state changes

  // Reset all reconnection state — call this when the user initiates a fresh join
  // so the DisconnectedOverlay doesn't linger after a successful rejoin.
  const resetReconnect = useCallback(() => {
    stopRef.current();
    setIsGivenUp(false);
  }, []);

  // Single-shot retry: send one player:reconnect attempt immediately,
  // then give up after 5s if no response.
  const retryOnce = useCallback(() => {
    const sessionToken = localStorage.getItem("sessionToken");
    if (!sessionToken) return;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    isReconnectingRef.current = true;
    setIsGivenUp(false);
    setIsReconnecting(true);
    setReconnecting(true, 0);

    if (socketService.getConnectionStatus()) {
      socketService.reconnect({
        token: sessionToken,
        socketId: socketService.getSocketId() || "",
      });
    } else {
      // Transport reconnect triggers connection:change(true) which
      // will send player:reconnect via the handler above
      socketService.forceReconnect();
    }

    // Give up if no response within 5s
    retryTimeoutRef.current = window.setTimeout(() => {
      if (isReconnectingRef.current) {
        stopRef.current();
        setIsGivenUp(true);
      }
    }, 5000);
  }, [setReconnecting]);

  return { isReconnecting, isGivenUp, attempts, retryOnce, resetReconnect };
}
