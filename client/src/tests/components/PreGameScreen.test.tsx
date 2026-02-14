import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PreGameScreen from "@/components/player/screens/PreGameScreen";
import type { TeamColorScheme } from "@/utils/teamColors";

// Mock ConnectionStatus since it depends on socket connection
vi.mock("@/components/player/ConnectionStatus", () => ({
  default: () => <div data-testid="connection-status">Connected</div>,
}));

const mockTeamColor: TeamColorScheme = {
  name: "Red Team",
  primary: "#ef4444",
  dark: "#7f1d1d",
  tint: "rgba(239, 68, 68, 0.15)",
  border: "rgba(239, 68, 68, 0.8)",
  bgTintClass: "bg-red-500/15",
  borderClass: "border-red-500/80",
  textClass: "text-red-400",
};

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

  it("uses team dark color as background when teamColor is provided", () => {
    const { container } = render(
      <PreGameScreen {...defaultProps} teamColor={mockTeamColor} />
    );
    expect(container.firstChild).toHaveStyle({
      backgroundColor: "#7f1d1d",
    });
  });

  it("uses default gray background when no teamColor", () => {
    const { container } = render(<PreGameScreen {...defaultProps} />);
    expect(container.firstChild).toHaveStyle({
      backgroundColor: "#1f2937",
    });
  });

  it("shows team name badge when teamColor is provided", () => {
    render(<PreGameScreen {...defaultProps} teamColor={mockTeamColor} />);
    expect(screen.getByText("Red Team")).toBeInTheDocument();
  });

  it("shows tap to switch hint when teamColor is provided", () => {
    render(<PreGameScreen {...defaultProps} teamColor={mockTeamColor} />);
    expect(screen.getByText("Tap to switch team")).toBeInTheDocument();
  });

  it("calls onTeamSwitch when container is clicked", () => {
    const onTeamSwitch = vi.fn();
    const { container } = render(
      <PreGameScreen
        {...defaultProps}
        teamColor={mockTeamColor}
        onTeamSwitch={onTeamSwitch}
      />
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onTeamSwitch).toHaveBeenCalledTimes(1);
  });

  it("does not show team elements when teamColor is null", () => {
    render(<PreGameScreen {...defaultProps} teamColor={null} />);
    expect(screen.queryByText("Red Team")).not.toBeInTheDocument();
    expect(screen.queryByText("Tap to switch team")).not.toBeInTheDocument();
  });
});
