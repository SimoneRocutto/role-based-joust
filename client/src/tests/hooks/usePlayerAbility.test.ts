import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSendTap = vi.fn();
let tapResultCallback: ((data: any) => void) | null = null;

vi.mock("@/services/socket", () => ({
  socketService: {
    sendTap: (...args: any[]) => mockSendTap(...args),
    onTapResult: vi.fn((cb: any) => {
      tapResultCallback = cb;
    }),
    off: vi.fn(),
  },
}));

const mockPlaySfx = vi.fn();
vi.mock("@/services/audio", () => ({
  audioManager: {
    playSfx: (...args: any[]) => mockPlaySfx(...args),
  },
}));

import { usePlayerAbility } from "@/hooks/usePlayerAbility";

describe("usePlayerAbility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tapResultCallback = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("starts with null chargeInfo", () => {
      const { result } = renderHook(() => usePlayerAbility("player-1"));
      expect(result.current.chargeInfo).toBeNull();
    });
  });

  describe("handleTap", () => {
    it("sends tap event to server", () => {
      const { result } = renderHook(() => usePlayerAbility("player-1"));

      act(() => {
        result.current.handleTap();
      });

      expect(mockSendTap).toHaveBeenCalledWith("player-1");
    });

    it("does nothing without player id", () => {
      const { result } = renderHook(() => usePlayerAbility(null));

      act(() => {
        result.current.handleTap();
      });

      expect(mockSendTap).not.toHaveBeenCalled();
    });

    it("debounces taps within 300ms", () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      const { result } = renderHook(() => usePlayerAbility("player-1"));

      act(() => {
        result.current.handleTap();
      });
      expect(mockSendTap).toHaveBeenCalledTimes(1);

      // Tap again within 300ms
      vi.spyOn(Date, "now").mockReturnValue(now + 200);
      act(() => {
        result.current.handleTap();
      });
      expect(mockSendTap).toHaveBeenCalledTimes(1);

      // Tap after 300ms
      vi.spyOn(Date, "now").mockReturnValue(now + 301);
      act(() => {
        result.current.handleTap();
      });
      expect(mockSendTap).toHaveBeenCalledTimes(2);
    });
  });

  describe("tap results", () => {
    it("updates chargeInfo on tap result", () => {
      const { result } = renderHook(() => usePlayerAbility("player-1"));

      const charges = { current: 2, max: 3, cooldownRemaining: 0 };
      act(() => {
        tapResultCallback?.({
          success: true,
          charges,
        });
      });

      expect(result.current.chargeInfo).toEqual(charges);
    });

    it("plays power-activation sound on success", () => {
      renderHook(() => usePlayerAbility("player-1"));

      act(() => {
        tapResultCallback?.({
          success: true,
          charges: { current: 1, max: 3, cooldownRemaining: 0 },
        });
      });

      expect(mockPlaySfx).toHaveBeenCalledWith("power-activation", {
        volume: 0.6,
      });
    });

    it("plays no-charges sound on no_charges failure", () => {
      renderHook(() => usePlayerAbility("player-1"));

      act(() => {
        tapResultCallback?.({
          success: false,
          reason: "no_charges",
          charges: { current: 0, max: 3, cooldownRemaining: 0 },
        });
      });

      expect(mockPlaySfx).toHaveBeenCalledWith("no-charges", { volume: 0.4 });
    });

    it("does not update chargeInfo when charges is null", () => {
      const { result } = renderHook(() => usePlayerAbility("player-1"));

      act(() => {
        tapResultCallback?.({
          success: false,
          reason: "some_reason",
          charges: null,
        });
      });

      expect(result.current.chargeInfo).toBeNull();
    });
  });
});
