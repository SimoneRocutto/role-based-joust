import { useEffect, useState, useRef } from "react";
import { socketService } from "@/services/socket";
import { useGameStore } from "@/store/gameStore";
import { RECONNECTION_CONFIG } from "@/utils/constants";

export function useReconnect() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const { setReconnecting, isConnected } = useGameStore();

  useEffect(() => {
    const handleDisconnect = () => {
      const sessionToken = localStorage.getItem("sessionToken");
      if (!sessionToken) {
        // No session to restore, but still reconnect the transport
        // (e.g. after being kicked, the server force-disconnects the socket)
        console.log("No session token, reconnecting transport only");
        socketService.forceReconnect();
        return;
      }

      setIsReconnecting(true);
      setAttempts(0);
      setReconnecting(true, 0);

      console.log("Starting reconnection attempts...");

      // Try to reconnect every 2 seconds
      intervalRef.current = window.setInterval(() => {
        setAttempts((prev) => {
          const newAttempts = prev + 1;

          if (newAttempts >= RECONNECTION_CONFIG.MAX_ATTEMPTS) {
            console.log("Max reconnection attempts reached");
            stopReconnecting();
            return prev;
          }

          console.log(`Reconnection attempt ${newAttempts}...`);
          setReconnecting(true, newAttempts);

          socketService.reconnect({
            token: sessionToken,
            socketId: socketService.getSocketId() || "",
          });

          return newAttempts;
        });
      }, RECONNECTION_CONFIG.RETRY_INTERVAL);

      // Stop trying after timeout
      setTimeout(() => {
        if (intervalRef.current) {
          console.log("Reconnection timeout");
          stopReconnecting();
        }
      }, RECONNECTION_CONFIG.TIMEOUT);
    };

    const handleConnect = () => {
      if (isReconnecting) {
        console.log("Reconnected successfully");
        stopReconnecting();
      }
    };

    const stopReconnecting = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsReconnecting(false);
      setAttempts(0);
      setReconnecting(false, 0);
    };

    // Listen to socket events
    socketService.on("connection:change", (connected: boolean) => {
      if (!connected) {
        handleDisconnect();
      } else {
        handleConnect();
      }
    });

    socketService.onPlayerReconnected((data) => {
      if (data.success) {
        console.log("Player reconnected successfully");
        stopReconnecting();
      }
    });

    // When the tab becomes visible again, force a reconnection if disconnected
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const sessionToken = localStorage.getItem("sessionToken");
        if (sessionToken && !socketService.getConnectionStatus()) {
          console.log("Tab became visible, forcing reconnection...");
          socketService.forceReconnect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      socketService.off("connection:change");
      socketService.off("player:reconnected");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isReconnecting, isConnected]);

  return {
    isReconnecting,
    attempts,
  };
}
