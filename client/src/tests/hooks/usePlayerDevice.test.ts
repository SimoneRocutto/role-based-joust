import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock dependencies before importing the hook
const mockStart = vi.fn();
const mockLastData = { current: null as any };
vi.mock("@/hooks/useAccelerometer", () => ({
  useAccelerometer: () => ({
    start: mockStart,
    lastData: mockLastData.current,
  }),
}));

vi.mock("@/hooks/useWakeLock", () => ({
  useWakeLock: () => ({
    enable: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/hooks/useFullscreen", () => ({
  useFullscreen: () => ({
    enter: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mockSendMovement = vi.fn();
vi.mock("@/services/socket", () => ({
  socketService: {
    sendMovement: (...args: any[]) => mockSendMovement(...args),
  },
}));

vi.mock("@/utils/permissions", () => ({
  requestMotionPermission: vi.fn().mockResolvedValue(true),
}));

import { usePlayerDevice } from "@/hooks/usePlayerDevice";

describe("usePlayerDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLastData.current = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("starts with permissions not granted", () => {
      const { result } = renderHook(() => usePlayerDevice("player-1"));
      // Before async permissions resolve
      expect(result.current.permissionsGranted).toBe(false);
    });

    it("starts with portrait lock hidden", () => {
      const { result } = renderHook(() => usePlayerDevice("player-1"));
      expect(result.current.showPortraitLock).toBe(false);
    });
  });

  describe("permissions", () => {
    it("grants permissions and starts accelerometer on mount", async () => {
      const { result } = renderHook(() => usePlayerDevice("player-1"));

      // Wait for async permissions to resolve
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.permissionsGranted).toBe(true);
      expect(mockStart).toHaveBeenCalled();
    });
  });

  describe("orientation detection", () => {
    it("detects landscape on small screens as portrait lock", () => {
      // Simulate landscape on a phone
      Object.defineProperty(window, "innerWidth", { value: 800, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 400, writable: true });

      const { result } = renderHook(() => usePlayerDevice("player-1"));

      // Trigger resize
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.showPortraitLock).toBe(true);
    });

    it("does not show portrait lock on large screens", () => {
      Object.defineProperty(window, "innerWidth", { value: 1200, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true });

      const { result } = renderHook(() => usePlayerDevice("player-1"));

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.showPortraitLock).toBe(false);
    });

    it("does not show portrait lock in portrait mode", () => {
      Object.defineProperty(window, "innerWidth", { value: 400, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true });

      const { result } = renderHook(() => usePlayerDevice("player-1"));

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.showPortraitLock).toBe(false);
    });
  });

  describe("accelerometer data sending", () => {
    it("does not send movement without player id", async () => {
      mockLastData.current = { x: 1, y: 2, z: 3, timestamp: 1000 };

      renderHook(() => usePlayerDevice(null));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockSendMovement).not.toHaveBeenCalled();
    });
  });
});
