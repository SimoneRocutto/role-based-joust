type Role =
  | "berserker"
  | "ninja"
  | "villager"
  | "beast"
  | "beastHunter"
  | "troll"
  | "bodyguard"
  | "sibling"
  | "executioner";

interface RoleConfig {
  role: Role;
  count: number;
}

type PlayerCountConfig = Record<number, RoleConfig[]>;

export interface RoleThemes {
  [themeName: string]: PlayerCountConfig;
}

export const roleThemes: RoleThemes = {
  standard: {
    2: [
      { role: "ninja", count: 1 },
      { role: "villager", count: 1 },
    ],
    3: [
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "villager", count: 1 },
    ],
    4: [
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "villager", count: 2 },
    ],
    5: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "villager", count: 1 },
    ],
    6: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "villager", count: 2 },
    ],
    7: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "troll", count: 1 },
      { role: "villager", count: 2 },
    ],
    8: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "bodyguard", count: 1 },
      { role: "ninja", count: 1 },
      { role: "troll", count: 1 },
      { role: "villager", count: 2 },
    ],
    9: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "bodyguard", count: 1 },
      { role: "ninja", count: 1 },
      { role: "sibling", count: 2 },
      { role: "troll", count: 1 },
      { role: "villager", count: 1 },
    ],
    10: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "bodyguard", count: 1 },
      { role: "executioner", count: 1 },
      { role: "ninja", count: 1 },
      { role: "sibling", count: 2 },
      { role: "troll", count: 1 },
      { role: "villager", count: 1 },
    ],
    11: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "bodyguard", count: 1 },
      { role: "executioner", count: 1 },
      { role: "ninja", count: 1 },
      { role: "sibling", count: 2 },
      { role: "troll", count: 1 },
      { role: "villager", count: 2 },
    ],
    12: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "bodyguard", count: 1 },
      { role: "executioner", count: 1 },
      { role: "ninja", count: 2 },
      { role: "sibling", count: 2 },
      { role: "troll", count: 1 },
      { role: "villager", count: 2 },
    ],
    13: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "bodyguard", count: 1 },
      { role: "executioner", count: 1 },
      { role: "ninja", count: 2 },
      { role: "sibling", count: 2 },
      { role: "troll", count: 1 },
      { role: "villager", count: 3 },
    ],
    14: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 2 },
      { role: "bodyguard", count: 1 },
      { role: "executioner", count: 1 },
      { role: "ninja", count: 2 },
      { role: "sibling", count: 2 },
      { role: "troll", count: 1 },
      { role: "villager", count: 3 },
    ],
    15: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 2 },
      { role: "bodyguard", count: 1 },
      { role: "executioner", count: 1 },
      { role: "ninja", count: 2 },
      { role: "sibling", count: 2 },
      { role: "troll", count: 1 },
      { role: "villager", count: 4 },
    ],
    16: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 2 },
      { role: "bodyguard", count: 1 },
      { role: "executioner", count: 1 },
      { role: "ninja", count: 2 },
      { role: "sibling", count: 2 },
      { role: "troll", count: 1 },
      { role: "villager", count: 5 },
    ],
  },
  easy: {
    2: [
      { role: "ninja", count: 1 },
      { role: "villager", count: 1 },
    ],
    3: [
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "villager", count: 2 },
    ],
    4: [
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "villager", count: 2 },
    ],
    5: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "villager", count: 1 },
    ],
    6: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "villager", count: 2 },
    ],
    7: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "ninja", count: 1 },
      { role: "villager", count: 3 },
    ],
    8: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "ninja", count: 2 },
      { role: "villager", count: 4 },
    ],
    9: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 1 },
      { role: "ninja", count: 2 },
      { role: "villager", count: 4 },
    ],
    10: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 2 },
      { role: "ninja", count: 2 },
      { role: "villager", count: 4 },
    ],
    11: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 2 },
      { role: "ninja", count: 2 },
      { role: "villager", count: 5 },
    ],
    12: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 2 },
      { role: "ninja", count: 2 },
      { role: "villager", count: 6 },
    ],
    13: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 2 },
      { role: "ninja", count: 3 },
      { role: "villager", count: 6 },
    ],
    14: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 2 },
      { role: "ninja", count: 3 },
      { role: "villager", count: 7 },
    ],
    15: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 3 },
      { role: "ninja", count: 3 },
      { role: "villager", count: 7 },
    ],
    16: [
      { role: "beast", count: 1 },
      { role: "beastHunter", count: 1 },
      { role: "berserker", count: 3 },
      { role: "ninja", count: 3 },
      { role: "villager", count: 8 },
    ],
  },
};

// Helper to expand a config back into a flat role array for dealing/shuffling
export function expandRolePool(
  theme: PlayerCountConfig,
  playerCount: number
): Role[] {
  const rolePool = theme[playerCount];

  if (!rolePool) return [];

  return rolePool.flatMap(({ role, count }) => Array(count).fill(role));
}

/**
 * Get roles for a specific theme
 */
export function getRoleTheme(themeName: string) {
  const theme = roleThemes[themeName];
  if (!theme) {
    console.warn(`Theme '${themeName}' not found, using 'standard'`);
    return roleThemes.standard;
  }
  return theme;
}

/**
 * Get all available theme names
 */
export function getAvailableThemes(): string[] {
  return Object.keys(roleThemes);
}

/**
 * Check if a theme exists
 */
export function themeExists(themeName: string): boolean {
  return themeName in roleThemes;
}
