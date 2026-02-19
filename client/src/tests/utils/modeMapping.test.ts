import { describe, it, expect } from "vitest";
import {
  getCombinedModeKey,
  parseCombinedMode,
  getModeDisplayName,
  SENSITIVITY_LABELS,
  COMBINED_MODES,
} from "@/utils/modeMapping";

describe("modeMapping", () => {
  describe("COMBINED_MODES", () => {
    it("has 7 entries (3 solo + 3 team + domination)", () => {
      expect(COMBINED_MODES).toHaveLength(7);
    });

    it("has unique keys", () => {
      const keys = COMBINED_MODES.map((m) => m.key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe("getCombinedModeKey", () => {
    it("returns solo mode key for non-team", () => {
      expect(getCombinedModeKey("classic", false)).toBe("classic");
      expect(getCombinedModeKey("death-count", false)).toBe("death-count");
      expect(getCombinedModeKey("role-based", false)).toBe("role-based");
    });

    it("returns team mode key for team", () => {
      expect(getCombinedModeKey("classic", true)).toBe("classic-team");
      expect(getCombinedModeKey("death-count", true)).toBe("death-count-team");
      expect(getCombinedModeKey("role-based", true)).toBe("role-based-team");
    });

    it("falls back to serverMode for unknown modes", () => {
      expect(getCombinedModeKey("unknown", false)).toBe("unknown");
    });
  });

  describe("parseCombinedMode", () => {
    it("parses solo mode keys", () => {
      expect(parseCombinedMode("classic")).toEqual({ serverMode: "classic", teams: false });
      expect(parseCombinedMode("role-based")).toEqual({ serverMode: "role-based", teams: false });
    });

    it("parses team mode keys", () => {
      expect(parseCombinedMode("classic-team")).toEqual({ serverMode: "classic", teams: true });
      expect(parseCombinedMode("role-based-team")).toEqual({ serverMode: "role-based", teams: true });
    });

    it("falls back for unknown keys", () => {
      expect(parseCombinedMode("unknown")).toEqual({ serverMode: "unknown", teams: false });
    });
  });

  describe("getModeDisplayName", () => {
    it("returns correct display names for solo modes", () => {
      expect(getModeDisplayName("classic")).toBe("Classic");
      expect(getModeDisplayName("death-count")).toBe("Death Count");
      expect(getModeDisplayName("role-based")).toBe("Roles");
    });

    it("returns correct display names for team modes", () => {
      expect(getModeDisplayName("classic", true)).toBe("Classic Team");
      expect(getModeDisplayName("role-based", true)).toBe("Roles Team");
    });
  });

  describe("SENSITIVITY_LABELS", () => {
    it("maps known sensitivity keys", () => {
      expect(SENSITIVITY_LABELS["low"]).toBe("Low");
      expect(SENSITIVITY_LABELS["medium"]).toBe("Medium");
      expect(SENSITIVITY_LABELS["high"]).toBe("High");
      expect(SENSITIVITY_LABELS["extreme"]).toBe("Extreme");
      expect(SENSITIVITY_LABELS["oneshot"]).toBe("One Shot");
    });
  });
});
