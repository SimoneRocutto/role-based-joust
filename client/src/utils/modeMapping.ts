/**
 * Mapping between combined UI mode keys and server mode + teams config.
 * Used by the dashboard settings to present a single dropdown.
 */

export interface CombinedMode {
  key: string;
  label: string;
  serverMode: string;
  teams: boolean;
}

export const COMBINED_MODES: CombinedMode[] = [
  { key: "classic", label: "Classic", serverMode: "classic", teams: false },
  { key: "death-count", label: "Death Count", serverMode: "death-count", teams: false },
  { key: "role-based", label: "Roles", serverMode: "role-based", teams: false },
  { key: "classic-team", label: "Classic Team", serverMode: "classic", teams: true },
  { key: "death-count-team", label: "Death Count Team", serverMode: "death-count", teams: true },
  { key: "role-based-team", label: "Roles Team", serverMode: "role-based", teams: true },
  { key: "domination", label: "Domination", serverMode: "domination", teams: true },
];

/**
 * Get the combined mode key from a server mode + teamsEnabled flag.
 */
export function getCombinedModeKey(serverMode: string, teamsEnabled: boolean): string {
  const entry = COMBINED_MODES.find(
    (m) => m.serverMode === serverMode && m.teams === teamsEnabled
  );
  return entry?.key ?? serverMode;
}

/**
 * Parse a combined mode key into server mode + teams flag.
 */
export function parseCombinedMode(key: string): { serverMode: string; teams: boolean } {
  const entry = COMBINED_MODES.find((m) => m.key === key);
  if (entry) {
    return { serverMode: entry.serverMode, teams: entry.teams };
  }
  // Fallback: treat as non-team server mode
  return { serverMode: key, teams: false };
}

/**
 * Get display name for a mode (optionally with team qualifier).
 */
export function getModeDisplayName(serverMode: string, teamsEnabled = false): string {
  const entry = COMBINED_MODES.find(
    (m) => m.serverMode === serverMode && m.teams === teamsEnabled
  );
  return entry?.label ?? serverMode;
}

/**
 * Map sensitivity preset keys to display labels.
 */
export const SENSITIVITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  extreme: "Extreme",
  oneshot: "One Shot",
};
