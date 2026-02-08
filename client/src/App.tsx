import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useReconnect } from "@/hooks/useReconnect";
import JoinView from "@/pages/JoinView";
import PlayerView from "@/pages/PlayerView";
import DashboardView from "@/pages/DashboardView";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { audioManager } from "./services/audio";

function App() {
  // Initialize socket connection
  useSocket();

  // Initialize reconnection logic
  useReconnect();

  useEffect(() => {
    audioManager.initialize();
  });

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="/join" element={<JoinView />} />
        <Route path="/player" element={<PlayerView />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="*" element={<Navigate to="/join" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
