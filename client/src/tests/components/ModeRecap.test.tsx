import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ModeRecap from "@/components/shared/ModeRecap";

describe("ModeRecap", () => {
  it("renders mode name", () => {
    render(<ModeRecap modeName="Classic" roundCount={3} sensitivityKey="medium" />);
    expect(screen.getByText("Classic")).toBeInTheDocument();
  });

  it("renders round count with plural", () => {
    render(<ModeRecap modeName="Roles" roundCount={3} sensitivityKey="medium" />);
    expect(screen.getByText("3 rounds | Medium")).toBeInTheDocument();
  });

  it("renders round count with singular", () => {
    render(<ModeRecap modeName="Roles" roundCount={1} sensitivityKey="medium" />);
    expect(screen.getByText("1 round | Medium")).toBeInTheDocument();
  });

  it("maps sensitivity keys to labels", () => {
    render(<ModeRecap modeName="Classic" roundCount={1} sensitivityKey="oneshot" />);
    expect(screen.getByText("1 round | One Shot")).toBeInTheDocument();
  });

  it("shows raw key for unknown sensitivity", () => {
    render(<ModeRecap modeName="Classic" roundCount={1} sensitivityKey="custom" />);
    expect(screen.getByText("1 round | custom")).toBeInTheDocument();
  });
});
