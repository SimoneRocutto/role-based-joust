export interface RoleThemes {
  [themeName: string]: string[];
}

export const roleThemes: RoleThemes = {
  // Standard theme - balanced roles
  standard: [
    "ironclad",
    "beast",
    "beastHunter",
    "survivor",
    "executioner",
    "bodyguard",
    "berserker",
    "ninja",
    "masochist",
    "sibling",
    "vulture",
  ],

  // Halloween theme - spooky roles
  halloween: ["witch", "werewolf", "ghost", "zombie", "vampire"],

  // Mafia theme - crime/detective roles
  mafia: ["godfather", "detective", "doctor", "civilian", "hitman"],

  // Fantasy theme - RPG-style roles
  fantasy: ["wizard", "knight", "rogue", "cleric", "barbarian"],

  // Sci-fi theme - futuristic roles
  scifi: ["cyborg", "alien", "android", "soldier", "scientist"],
};

/**
 * Get roles for a specific theme
 */
export function getRoleTheme(themeName: string): string[] {
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
