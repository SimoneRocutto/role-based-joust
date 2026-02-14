import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PreGameControls from "@/components/dashboard/PreGameControls";
import { useGameStore } from "@/store/gameStore";

// Mock the api service
vi.mock("@/services/api", () => ({
  apiService: {
    proceedFromPreGame: vi.fn().mockResolvedValue({ success: true }),
    stopGame: vi.fn().mockResolvedValue({ success: true, message: "stopped" }),
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
    render(<PreGameControls />);
    expect(screen.getByTestId("pre-game-ready-count")).toHaveTextContent("2/4 players ready");
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
});
