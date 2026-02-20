import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const loopCalls: Array<{ sound: string; options?: any }> = [];
const stopCalls: string[] = [];

vi.mock("@/services/audio", () => ({
  audioManager: {
    loop: (sound: string, options?: any) => {
      loopCalls.push({ sound, options });
    },
    stop: (sound: string) => {
      stopCalls.push(sound);
    },
  },
}));

import { useHealthAudio } from "@/hooks/useHealthAudio";

describe("useHealthAudio", () => {
  beforeEach(() => {
    loopCalls.length = 0;
    stopCalls.length = 0;
  });

  it("does nothing when not active", () => {
    renderHook(() => useHealthAudio(80, false));

    expect(loopCalls).toHaveLength(0);
    expect(stopCalls).toHaveLength(0);
  });

  it("does nothing when damage is undefined", () => {
    renderHook(() => useHealthAudio(undefined, true));

    expect(loopCalls).toHaveLength(0);
    expect(stopCalls).toHaveLength(0);
  });

  it("does nothing when HP is above 50%", () => {
    renderHook(() => useHealthAudio(40, true));

    expect(loopCalls).toHaveLength(0);
  });

  it("plays low-health-heartbeat when HP drops below 50%", () => {
    renderHook(() => useHealthAudio(60, true));

    expect(loopCalls).toContainEqual({
      sound: "low-health-heartbeat",
      options: { volume: 0.6 },
    });
  });

  it("plays near-death-heartbeat when HP drops below 20%", () => {
    renderHook(() => useHealthAudio(85, true));

    expect(loopCalls).toContainEqual({
      sound: "near-death-heartbeat",
      options: { volume: 0.6 },
    });
  });

  it("switches from low-health to near-death when HP drops further", () => {
    const { rerender } = renderHook(
      ({ damage, active }) => useHealthAudio(damage, active),
      { initialProps: { damage: 60, active: true } }
    );

    expect(loopCalls).toHaveLength(1);
    expect(loopCalls[0].sound).toBe("low-health-heartbeat");

    rerender({ damage: 85, active: true });

    expect(stopCalls).toContain("low-health-heartbeat");
    expect(loopCalls).toContainEqual({
      sound: "near-death-heartbeat",
      options: { volume: 0.6 },
    });
  });

  it("stops sound when HP recovers above 50%", () => {
    const { rerender } = renderHook(
      ({ damage, active }) => useHealthAudio(damage, active),
      { initialProps: { damage: 60, active: true } }
    );

    expect(loopCalls[0].sound).toBe("low-health-heartbeat");

    rerender({ damage: 30, active: true });

    expect(stopCalls).toContain("low-health-heartbeat");
  });

  it("stops sound when game becomes inactive", () => {
    const { rerender } = renderHook(
      ({ damage, active }) => useHealthAudio(damage, active),
      { initialProps: { damage: 60, active: true } }
    );

    expect(loopCalls[0].sound).toBe("low-health-heartbeat");

    rerender({ damage: 60, active: false });

    expect(stopCalls).toContain("low-health-heartbeat");
  });

  it("does not restart sound when damage changes within same tier", () => {
    const { rerender } = renderHook(
      ({ damage, active }) => useHealthAudio(damage, active),
      { initialProps: { damage: 55, active: true } }
    );

    expect(loopCalls).toHaveLength(1);

    rerender({ damage: 65, active: true });

    // Should not have started a second loop
    expect(loopCalls).toHaveLength(1);
  });

  it("stops sound on unmount", () => {
    const { unmount } = renderHook(() => useHealthAudio(60, true));

    expect(loopCalls[0].sound).toBe("low-health-heartbeat");

    unmount();

    expect(stopCalls).toContain("low-health-heartbeat");
  });
});
