import { describe, it, expect } from 'vitest'
import {
  TEAM_COLORS,
  getHealthBarColor,
  getHealthBarEmptyColor,
  getDeadBackgroundColor,
  getTeamColor,
  getTeamName,
} from '@/utils/teamColors'

describe('teamColors', () => {
  describe('TEAM_COLORS', () => {
    it('has 4 team color definitions', () => {
      expect(TEAM_COLORS).toHaveLength(4)
    })

    it('defines Red, Blue, Green, Yellow teams', () => {
      expect(TEAM_COLORS[0].name).toBe('Red Team')
      expect(TEAM_COLORS[1].name).toBe('Blue Team')
      expect(TEAM_COLORS[2].name).toBe('Green Team')
      expect(TEAM_COLORS[3].name).toBe('Yellow Team')
    })

    it('each team has required properties', () => {
      for (const team of TEAM_COLORS) {
        expect(team.primary).toBeTruthy()
        expect(team.dark).toBeTruthy()
        expect(team.tint).toBeTruthy()
        expect(team.border).toBeTruthy()
        expect(team.bgTintClass).toBeTruthy()
        expect(team.borderClass).toBeTruthy()
        expect(team.textClass).toBeTruthy()
      }
    })
  })

  describe('getHealthBarColor', () => {
    it('returns green-ish color at full health (no team)', () => {
      const color = getHealthBarColor(1.0)
      // Should be close to green (#22c55e → rgb(34, 197, 94))
      expect(color).toContain('rgb(34,')
    })

    it('returns red-ish color at low health (no team)', () => {
      const color = getHealthBarColor(0.0)
      // Should be close to red (#ef4444 → rgb(239, 68, 68))
      expect(color).toContain('rgb(239,')
    })

    it('returns team primary color when teamId is provided', () => {
      expect(getHealthBarColor(0.5, 0)).toBe('#ef4444') // Red team
      expect(getHealthBarColor(0.5, 1)).toBe('#3b82f6') // Blue team
      expect(getHealthBarColor(0.5, 2)).toBe('#22c55e') // Green team
      expect(getHealthBarColor(0.5, 3)).toBe('#eab308') // Yellow team
    })

    it('falls back to gradient when teamId is null', () => {
      const color = getHealthBarColor(0.5, null)
      expect(color).toContain('rgb(')
    })

    it('falls back to gradient when teamId is undefined', () => {
      const color = getHealthBarColor(0.5, undefined)
      expect(color).toContain('rgb(')
    })

    it('falls back to gradient when teamId is out of range', () => {
      const color = getHealthBarColor(0.5, 99)
      expect(color).toContain('rgb(')
    })
  })

  describe('getHealthBarEmptyColor', () => {
    it('returns gray when no team', () => {
      expect(getHealthBarEmptyColor()).toBe('#1f2937')
      expect(getHealthBarEmptyColor(null)).toBe('#1f2937')
    })

    it('returns team dark color when teamId provided', () => {
      expect(getHealthBarEmptyColor(0)).toBe('#7f1d1d') // Red dark
      expect(getHealthBarEmptyColor(1)).toBe('#1e3a5f') // Blue dark
    })
  })

  describe('getDeadBackgroundColor', () => {
    it('returns gray when no team', () => {
      expect(getDeadBackgroundColor()).toBe('#1f2937')
      expect(getDeadBackgroundColor(null)).toBe('#1f2937')
    })

    it('returns team dark color when teamId provided', () => {
      expect(getDeadBackgroundColor(0)).toBe('#7f1d1d') // Red dark
      expect(getDeadBackgroundColor(1)).toBe('#1e3a5f') // Blue dark
    })
  })

  describe('getTeamColor', () => {
    it('returns team color scheme for valid teamId', () => {
      const color = getTeamColor(0)
      expect(color).not.toBeNull()
      expect(color!.name).toBe('Red Team')
    })

    it('returns null for null teamId', () => {
      expect(getTeamColor(null)).toBeNull()
    })

    it('returns null for undefined teamId', () => {
      expect(getTeamColor(undefined)).toBeNull()
    })

    it('returns null for out-of-range teamId', () => {
      expect(getTeamColor(-1)).toBeNull()
      expect(getTeamColor(4)).toBeNull()
      expect(getTeamColor(99)).toBeNull()
    })
  })

  describe('getTeamName', () => {
    it('returns team name for valid IDs', () => {
      expect(getTeamName(0)).toBe('Red Team')
      expect(getTeamName(1)).toBe('Blue Team')
      expect(getTeamName(2)).toBe('Green Team')
      expect(getTeamName(3)).toBe('Yellow Team')
    })

    it('returns fallback name for invalid IDs', () => {
      expect(getTeamName(5)).toBe('Team 6')
      expect(getTeamName(99)).toBe('Team 100')
    })
  })
})
