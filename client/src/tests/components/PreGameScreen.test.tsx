import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PreGameScreen from "@/components/player/screens/PreGameScreen";

// Mock ConnectionStatus since it depends on socket connection
vi.mock("@/components/player/ConnectionStatus", () => ({
  default: () => <div data-testid="connection-status">Connected</div>,
}));

describe("PreGameScreen", () => {
  const defaultProps = {
    playerNumber: 5,
    playerName: "Alice",
    modeRecap: { modeName: "Roles", roundCount: 3, sensitivity: "medium" },
    isReady: false,
    isShaking: false,
    shakeProgress: 0,
    onReadyClick: vi.fn(),
    isDevMode: false,
  };

  it("renders player number and name", () => {
    render(<PreGameScreen {...defaultProps} />);
    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders mode recap when provided", () => {
    render(<PreGameScreen {...defaultProps} />);
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("3 rounds | Medium")).toBeInTheDocument();
  });

  it("handles null modeRecap", () => {
    render(<PreGameScreen {...defaultProps} modeRecap={null} />);
    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.queryByText("Roles")).not.toBeInTheDocument();
  });

  it("renders shake instructions when not ready", () => {
    render(<PreGameScreen {...defaultProps} />);
    expect(screen.getByText("SHAKE TO READY")).toBeInTheDocument();
  });

  it("shows ready state when isReady is true", () => {
    render(<PreGameScreen {...defaultProps} isReady={true} />);
    expect(screen.getByText("READY!")).toBeInTheDocument();
  });

  it("shows dev mode button when in dev mode", () => {
    render(<PreGameScreen {...defaultProps} isDevMode={true} />);
    expect(screen.getByText("CLICK TO READY")).toBeInTheDocument();
    expect(screen.getByText("[DEV MODE]")).toBeInTheDocument();
  });
});
