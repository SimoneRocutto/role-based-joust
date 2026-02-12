import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { PlayerState } from "@/types/player.types";
import type { TeamColorScheme } from "@/utils/teamColors";

// Mock ConnectionStatus since it depends on socket
vi.mock("@/components/player/ConnectionStatus", () => ({
  default: () => <div data-testid="connection-status">Connected</div>,
}));

// Mock sub-components used by ActiveGameScreen
vi.mock("@/components/player/HealthBackground", () => ({
  default: () => <div data-testid="health-background" />,
}));
vi.mock("@/components/player/PlayerNumber", () => ({
  default: ({ number }: { number: number }) => (
    <div data-testid="player-number">#{number}</div>
  ),
}));
vi.mock("@/components/player/StatusEffects", () => ({
  default: () => <div data-testid="status-effects" />,
}));
vi.mock("@/components/player/TargetDisplay", () => ({
  default: ({ target }: { target: { name: string } }) => (
    <div data-testid="target-display">{target.name}</div>
  ),
}));
vi.mock("@/components/player/DamageFlash", () => ({
  default: () => <div data-testid="damage-flash" />,
}));

// Mock ShakeToReady to verify it receives correct props
vi.mock("@/components/player/ShakeToReady", () => ({
  default: (props: any) => (
    <div data-testid="shake-to-ready">
      <span data-testid="shake-label">{props.shakeLabel}</span>
      <span data-testid="button-label">{props.buttonLabel}</span>
      <span data-testid="waiting-message">{props.waitingMessage}</span>
      {props.isReady && <span data-testid="is-ready">ready</span>}
    </div>
  ),
}));

import TeamSelectionScreen from "@/components/player/screens/TeamSelectionScreen";
import LobbyScreen from "@/components/player/screens/LobbyScreen";
import CountdownScreen from "@/components/player/screens/CountdownScreen";
import RoundEndedScreen from "@/components/player/screens/RoundEndedScreen";
import ActiveGameScreen from "@/components/player/screens/ActiveGameScreen";
import DeadScreen from "@/components/player/screens/DeadScreen";
import GameFinishedScreen from "@/components/player/screens/GameFinishedScreen";

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

function createMockPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: "player-1",
    name: "Test Player",
    number: 1,
    role: "Civilian",
    isAlive: true,
    points: 0,
    totalPoints: 0,
    toughness: 100,
    accumulatedDamage: 0,
    statusEffects: [],
    ...overrides,
  };
}

describe("TeamSelectionScreen", () => {
  it("renders player number and name", () => {
    render(
      <TeamSelectionScreen
        playerNumber={5}
        playerName="Alice"
        teamColor={mockTeamColor}
        onTeamSwitch={vi.fn()}
      />
    );

    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows team name when team color is provided", () => {
    render(
      <TeamSelectionScreen
        playerNumber={1}
        playerName="Alice"
        teamColor={mockTeamColor}
        onTeamSwitch={vi.fn()}
      />
    );

    expect(screen.getByText("Red Team")).toBeInTheDocument();
  });

  it("calls onTeamSwitch when tapped", () => {
    const onTeamSwitch = vi.fn();
    const { container } = render(
      <TeamSelectionScreen
        playerNumber={1}
        playerName="Alice"
        teamColor={mockTeamColor}
        onTeamSwitch={onTeamSwitch}
      />
    );

    fireEvent.click(container.firstChild as HTMLElement);
    expect(onTeamSwitch).toHaveBeenCalledTimes(1);
  });

  it("uses team dark color as background", () => {
    const { container } = render(
      <TeamSelectionScreen
        playerNumber={1}
        playerName="Alice"
        teamColor={mockTeamColor}
        onTeamSwitch={vi.fn()}
      />
    );

    expect(container.firstChild).toHaveStyle({
      backgroundColor: "#7f1d1d",
    });
  });

  it("uses default gray when no team color", () => {
    const { container } = render(
      <TeamSelectionScreen
        playerNumber={1}
        playerName="Alice"
        teamColor={null}
        onTeamSwitch={vi.fn()}
      />
    );

    expect(container.firstChild).toHaveStyle({
      backgroundColor: "#1f2937",
    });
  });
});

describe("LobbyScreen", () => {
  it("renders player number and name", () => {
    render(
      <LobbyScreen
        playerNumber={3}
        playerName="Bob"
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("passes correct labels to ShakeToReady", () => {
    render(
      <LobbyScreen
        playerNumber={1}
        playerName="Bob"
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByTestId("shake-label")).toHaveTextContent(
      "SHAKE TO READY"
    );
    expect(screen.getByTestId("button-label")).toHaveTextContent(
      "CLICK TO READY"
    );
  });

  it("shows ready state via ShakeToReady", () => {
    render(
      <LobbyScreen
        playerNumber={1}
        playerName="Bob"
        isReady={true}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByTestId("is-ready")).toBeInTheDocument();
  });
});

describe("CountdownScreen", () => {
  it("renders player number and name", () => {
    render(
      <CountdownScreen
        playerNumber={2}
        playerName="Charlie"
        countdownSeconds={5}
        countdownPhase="countdown"
      />
    );

    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows countdown number for seconds > 3", () => {
    render(
      <CountdownScreen
        playerNumber={1}
        playerName="Player"
        countdownSeconds={5}
        countdownPhase="countdown"
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows large countdown for seconds <= 3", () => {
    render(
      <CountdownScreen
        playerNumber={1}
        playerName="Player"
        countdownSeconds={3}
        countdownPhase="countdown"
      />
    );

    const countdownEl = screen.getByText("3");
    expect(countdownEl).toHaveClass("text-9xl");
  });

  it("shows GO! in go phase", () => {
    render(
      <CountdownScreen
        playerNumber={1}
        playerName="Player"
        countdownSeconds={0}
        countdownPhase="go"
      />
    );

    expect(screen.getByText("GO!")).toBeInTheDocument();
  });
});

describe("RoundEndedScreen", () => {
  it("shows winner state for round winner", () => {
    render(
      <RoundEndedScreen
        playerNumber={1}
        playerName="Alice"
        totalPoints={5}
        isRoundWinner={true}
        readyEnabled={false}
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByText("WINNER!")).toBeInTheDocument();
    expect(screen.getByText("+5 pts")).toBeInTheDocument();
  });

  it("shows eliminated state for non-winner", () => {
    render(
      <RoundEndedScreen
        playerNumber={1}
        playerName="Alice"
        totalPoints={0}
        isRoundWinner={false}
        readyEnabled={false}
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByText("ELIMINATED")).toBeInTheDocument();
  });

  it("shows total points", () => {
    render(
      <RoundEndedScreen
        playerNumber={1}
        playerName="Alice"
        totalPoints={10}
        isRoundWinner={false}
        readyEnabled={false}
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByText("Total: 10 pts")).toBeInTheDocument();
  });

  it("shows 'Get ready...' when ready is not enabled", () => {
    render(
      <RoundEndedScreen
        playerNumber={1}
        playerName="Alice"
        totalPoints={0}
        isRoundWinner={false}
        readyEnabled={false}
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByText("Get ready...")).toBeInTheDocument();
  });

  it("shows ShakeToReady when ready is enabled", () => {
    render(
      <RoundEndedScreen
        playerNumber={1}
        playerName="Alice"
        totalPoints={0}
        isRoundWinner={false}
        readyEnabled={true}
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByTestId("shake-to-ready")).toBeInTheDocument();
    expect(screen.getByTestId("shake-label")).toHaveTextContent(
      "SHAKE FOR NEXT ROUND"
    );
  });
});

describe("ActiveGameScreen", () => {
  const baseProps = {
    player: createMockPlayer(),
    playerNumber: 1,
    teamId: null as number | null,
    target: null as { number: number; name: string } | null,
    chargeInfo: null,
    onTap: vi.fn(),
    onTakeDamage: vi.fn(),
    isDevMode: false,
  };

  it("renders health background and player number", () => {
    render(<ActiveGameScreen {...baseProps} />);

    expect(screen.getByTestId("health-background")).toBeInTheDocument();
    expect(screen.getByTestId("player-number")).toBeInTheDocument();
  });

  it("shows health percentage", () => {
    render(
      <ActiveGameScreen
        {...baseProps}
        player={createMockPlayer({ accumulatedDamage: 30 })}
      />
    );

    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("shows charge info when available", () => {
    render(
      <ActiveGameScreen
        {...baseProps}
        chargeInfo={{ current: 2, max: 3, cooldownRemaining: 0 }}
      />
    );

    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("shows target when available", () => {
    render(
      <ActiveGameScreen
        {...baseProps}
        target={{ number: 5, name: "Enemy" }}
      />
    );

    expect(screen.getByTestId("target-display")).toBeInTheDocument();
  });

  it("calls onTap when clicked", () => {
    const onTap = vi.fn();
    const { container } = render(
      <ActiveGameScreen {...baseProps} onTap={onTap} />
    );

    fireEvent.click(container.firstChild as HTMLElement);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("shows take damage button in dev mode", () => {
    render(<ActiveGameScreen {...baseProps} isDevMode={true} />);

    expect(screen.getByText("CLICK TO TAKE DAMAGE")).toBeInTheDocument();
  });

  it("hides take damage button in production mode", () => {
    render(<ActiveGameScreen {...baseProps} isDevMode={false} />);

    expect(
      screen.queryByText("CLICK TO TAKE DAMAGE")
    ).not.toBeInTheDocument();
  });

  it("shows death count when > 0", () => {
    render(
      <ActiveGameScreen
        {...baseProps}
        player={createMockPlayer({ deathCount: 3 })}
      />
    );

    // The skull emoji + death count
    const deathCountEl = screen.getByText(/3/);
    expect(deathCountEl).toBeInTheDocument();
  });
});

describe("DeadScreen", () => {
  it("shows ELIMINATED when no respawn", () => {
    render(
      <DeadScreen
        teamId={null}
        respawnCountdown={null}
        deathCount={0}
        points={5}
      />
    );

    expect(screen.getByText("ELIMINATED")).toBeInTheDocument();
    expect(screen.getByText("Final Score: 5 pts")).toBeInTheDocument();
  });

  it("shows RESPAWNING... with countdown", () => {
    render(
      <DeadScreen
        teamId={null}
        respawnCountdown={3000}
        deathCount={1}
        points={0}
      />
    );

    expect(screen.getByText("RESPAWNING...")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Deaths: 1")).toBeInTheDocument();
  });

  it("hides death count when 0", () => {
    render(
      <DeadScreen
        teamId={null}
        respawnCountdown={3000}
        deathCount={0}
        points={0}
      />
    );

    expect(screen.queryByText(/Deaths:/)).not.toBeInTheDocument();
  });
});

describe("GameFinishedScreen", () => {
  it("renders GAME OVER header", () => {
    render(
      <GameFinishedScreen
        playerNumber={1}
        playerName="Alice"
        totalPoints={15}
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByText("GAME OVER")).toBeInTheDocument();
  });

  it("shows final score", () => {
    render(
      <GameFinishedScreen
        playerNumber={1}
        playerName="Alice"
        totalPoints={15}
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByText("Final Score: 15 pts")).toBeInTheDocument();
  });

  it("passes correct labels to ShakeToReady", () => {
    render(
      <GameFinishedScreen
        playerNumber={1}
        playerName="Alice"
        totalPoints={0}
        isReady={false}
        isShaking={false}
        shakeProgress={0}
        onReadyClick={vi.fn()}
        isDevMode={false}
      />
    );

    expect(screen.getByTestId("shake-label")).toHaveTextContent(
      "SHAKE WHEN READY"
    );
    expect(screen.getByTestId("waiting-message")).toHaveTextContent(
      "Waiting for new game..."
    );
  });
});
