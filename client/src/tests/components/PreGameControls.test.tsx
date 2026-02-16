import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PreGameControls from "@/components/dashboard/PreGameControls";
import ReadyCounter from "@/components/dashboard/ReadyCounter";
import { useGameStore } from "@/store/gameStore";

// Mock the api service
vi.mock("@/services/api", () => ({
  apiService: {
    proceedFromPreGame: vi.fn().mockResolvedValue({ success: true }),
    stopGame: vi.fn().mockResolvedValue({ success: true, message: "stopped" }),
    shuffleTeams: vi.fn().mockResolvedValue({ success: true, teams: {} }),
  },
}));

import { apiService } from "@/services/api";

describe("PreGameControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().reset();
  });

  it("renders START GAME and STOP GAME buttons", () => {
    render(<PreGameControls />);
    expect(screen.getByText("START GAME")).toBeInTheDocument();
    expect(screen.getByText("STOP GAME")).toBeInTheDocument();
  });

  it("shows ready count", () => {
    useGameStore.getState().setReadyCount({ ready: 2, total: 4 });
    render(<ReadyCounter />);
    expect(screen.getByText("2/4 Ready")).toBeInTheDocument();
  });

  it("renders mode recap when set in store", () => {
    useGameStore.getState().setModeRecap({
      modeName: "Classic Team",
      roundCount: 5,
      sensitivity: "high",
    });
    render(<PreGameControls />);
    expect(screen.getByText("Classic Team")).toBeInTheDocument();
    expect(screen.getByText("5 rounds | High")).toBeInTheDocument();
  });

  it("calls proceedFromPreGame when START GAME is clicked", async () => {
    render(<PreGameControls />);
    fireEvent.click(screen.getByText("START GAME"));
    await waitFor(() => {
      expect(apiService.proceedFromPreGame).toHaveBeenCalledTimes(1);
    });
  });

  it("calls stopGame when STOP GAME is clicked", async () => {
    render(<PreGameControls />);
    fireEvent.click(screen.getByText("STOP GAME"));
    await waitFor(() => {
      expect(apiService.stopGame).toHaveBeenCalledTimes(1);
    });
  });

  it("does not show shuffle button when teams are disabled", () => {
    render(<PreGameControls />);
    expect(screen.queryByTestId("shuffle-teams-button")).not.toBeInTheDocument();
  });

  it("shows shuffle button when teams are enabled", () => {
    useGameStore.getState().setTeamsEnabled(true);
    render(<PreGameControls />);
    expect(screen.getByTestId("shuffle-teams-button")).toBeInTheDocument();
    expect(screen.getByText("SHUFFLE TEAMS")).toBeInTheDocument();
  });

  it("calls shuffleTeams when SHUFFLE TEAMS is clicked", async () => {
    useGameStore.getState().setTeamsEnabled(true);
    render(<PreGameControls />);
    fireEvent.click(screen.getByText("SHUFFLE TEAMS"));
    await waitFor(() => {
      expect(apiService.shuffleTeams).toHaveBeenCalledTimes(1);
    });
  });
});
