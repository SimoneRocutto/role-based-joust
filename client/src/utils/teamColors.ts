/**
 * Team color definitions and utilities.
 * Used for health bars, lobby sections, player cards, and scoreboards.
 */

export interface TeamColorScheme {
  name: string
  /** Primary team color (Tailwind-500 equivalent) */
  primary: string
  /** Darker shade for "empty" portion of health bar */
  dark: string
  /** Light tint for backgrounds/borders */
  tint: string
  /** Border color for dashboard cards */
  border: string
  /** Tailwind class for bg tint */
  bgTintClass: string
  /** Tailwind class for border */
  borderClass: string
  /** Tailwind class for text */
  textClass: string
}

export const TEAM_COLORS: TeamColorScheme[] = [
  {
    name: 'Red Team',
    primary: '#ef4444',    // red-500
    dark: '#7f1d1d',       // red-900
    tint: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.8)',
    bgTintClass: 'bg-red-500/15',
    borderClass: 'border-red-500/80',
    textClass: 'text-red-400',
  },
  {
    name: 'Blue Team',
    primary: '#3b82f6',    // blue-500
    dark: '#1e3a5f',       // dark blue
    tint: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.8)',
    bgTintClass: 'bg-blue-500/15',
    borderClass: 'border-blue-500/80',
    textClass: 'text-blue-400',
  },
  {
    name: 'Green Team',
    primary: '#22c55e',    // green-500
    dark: '#14532d',       // green-900
    tint: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.8)',
    bgTintClass: 'bg-green-500/15',
    borderClass: 'border-green-500/80',
    textClass: 'text-green-400',
  },
  {
    name: 'Yellow Team',
    primary: '#eab308',    // yellow-500
    dark: '#713f12',       // yellow-900
    tint: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.8)',
    bgTintClass: 'bg-yellow-500/15',
    borderClass: 'border-yellow-500/80',
    textClass: 'text-yellow-400',
  },
]

/**
 * Get the health bar fill color.
 * - In team mode: uses team color.
 * - In non-team mode: green→red gradient based on health percentage.
 */
export function getHealthBarColor(healthPercent: number, teamId?: number | null): string {
  if (teamId != null && teamId >= 0 && teamId < TEAM_COLORS.length) {
    return TEAM_COLORS[teamId].primary
  }

  // Green→red gradient: interpolate between green (#22c55e) and red (#ef4444)
  const r = Math.round(34 + (239 - 34) * (1 - healthPercent))
  const g = Math.round(197 + (68 - 197) * (1 - healthPercent))
  const b = Math.round(94 + (68 - 94) * (1 - healthPercent))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Get the "empty" portion background color (missing health).
 * - In team mode: darker shade of team color.
 * - In non-team mode: dark gray.
 */
export function getHealthBarEmptyColor(teamId?: number | null): string {
  if (teamId != null && teamId >= 0 && teamId < TEAM_COLORS.length) {
    return TEAM_COLORS[teamId].dark
  }
  return '#1f2937' // gray-800
}

/**
 * Get the dead-state background color.
 * - In team mode: the team's dark/empty color so team identity is still visible.
 * - In non-team mode: standard dead gray.
 */
export function getDeadBackgroundColor(teamId?: number | null): string {
  if (teamId != null && teamId >= 0 && teamId < TEAM_COLORS.length) {
    return TEAM_COLORS[teamId].dark
  }
  return '#1f2937' // gray-800 (health-dead)
}

/**
 * Get team color scheme by team ID.
 * Returns null if teamId is invalid or null.
 */
export function getTeamColor(teamId: number | null | undefined): TeamColorScheme | null {
  if (teamId == null || teamId < 0 || teamId >= TEAM_COLORS.length) return null
  return TEAM_COLORS[teamId]
}

/**
 * Get team name by ID.
 */
export function getTeamName(teamId: number): string {
  if (teamId >= 0 && teamId < TEAM_COLORS.length) {
    return TEAM_COLORS[teamId].name
  }
  return `Team ${teamId + 1}`
}
