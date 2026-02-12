import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShakeToReady from "@/components/player/ShakeToReady";

const defaultProps = {
  isReady: false,
  isShaking: false,
  shakeProgress: 0,
  onReadyClick: vi.fn(),
  shakeLabel: "SHAKE TO READY",
  buttonLabel: "CLICK TO READY",
  waitingMessage: "Waiting for other players...",
  isDevMode: false,
};

describe("ShakeToReady", () => {
  describe("ready state", () => {
    it("shows checkmark and waiting message when ready", () => {
      render(<ShakeToReady {...defaultProps} isReady={true} />);

      expect(screen.getByText("READY!")).toBeInTheDocument();
      expect(
        screen.getByText("Waiting for other players...")
      ).toBeInTheDocument();
    });

    it("does not show button or shake label when ready", () => {
      render(<ShakeToReady {...defaultProps} isReady={true} />);

      expect(screen.queryByText("CLICK TO READY")).not.toBeInTheDocument();
      expect(screen.queryByText("SHAKE TO READY")).not.toBeInTheDocument();
    });
  });

  describe("dev mode (not ready)", () => {
    it("shows button with custom label in dev mode", () => {
      render(
        <ShakeToReady
          {...defaultProps}
          isDevMode={true}
          buttonLabel="CLICK FOR NEXT ROUND"
        />
      );

      expect(screen.getByText("CLICK FOR NEXT ROUND")).toBeInTheDocument();
      expect(screen.getByText("[DEV MODE]")).toBeInTheDocument();
    });

    it("calls onReadyClick when button is clicked", () => {
      const onReadyClick = vi.fn();
      render(
        <ShakeToReady
          {...defaultProps}
          isDevMode={true}
          onReadyClick={onReadyClick}
        />
      );

      fireEvent.click(screen.getByText("CLICK TO READY"));
      expect(onReadyClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("shake mode (not ready, not dev)", () => {
    it("shows shake label when not shaking", () => {
      render(<ShakeToReady {...defaultProps} />);

      expect(screen.getByText("SHAKE TO READY")).toBeInTheDocument();
    });

    it("shows SHAKING... when shaking", () => {
      render(<ShakeToReady {...defaultProps} isShaking={true} />);

      expect(screen.getByText("SHAKING...")).toBeInTheDocument();
      expect(screen.queryByText("SHAKE TO READY")).not.toBeInTheDocument();
    });

    it("shows progress bar with correct width", () => {
      const { container } = render(
        <ShakeToReady {...defaultProps} shakeProgress={0.6} />
      );

      const progressBar = container.querySelector(".bg-yellow-400");
      expect(progressBar).toHaveStyle({ width: "60%" });
    });

    it("shows progress bar at 0% by default", () => {
      const { container } = render(
        <ShakeToReady {...defaultProps} shakeProgress={0} />
      );

      const progressBar = container.querySelector(".bg-yellow-400");
      expect(progressBar).toHaveStyle({ width: "0%" });
    });

    it("uses custom shake label", () => {
      render(
        <ShakeToReady {...defaultProps} shakeLabel="SHAKE FOR NEXT ROUND" />
      );

      expect(screen.getByText("SHAKE FOR NEXT ROUND")).toBeInTheDocument();
    });
  });

  describe("custom waiting messages", () => {
    it("uses custom waiting message when ready", () => {
      render(
        <ShakeToReady
          {...defaultProps}
          isReady={true}
          waitingMessage="Waiting for new game..."
        />
      );

      expect(screen.getByText("Waiting for new game...")).toBeInTheDocument();
    });
  });
});
