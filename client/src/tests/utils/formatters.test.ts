import { describe, it, expect } from 'vitest'
import {
  formatTime,
  formatHealth,
  getHealthPercentage,
  generateUUID,
  getPlayerNumberSize,
} from '@/utils/formatters'

describe('formatTime', () => {
  it('formats zero milliseconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('formats seconds correctly', () => {
    expect(formatTime(5000)).toBe('00:05')
    expect(formatTime(30000)).toBe('00:30')
    expect(formatTime(59000)).toBe('00:59')
  })

  it('formats minutes correctly', () => {
    expect(formatTime(60000)).toBe('01:00')
    expect(formatTime(90000)).toBe('01:30')
    expect(formatTime(120000)).toBe('02:00')
  })

  it('formats larger times correctly', () => {
    expect(formatTime(300000)).toBe('05:00')
    expect(formatTime(3600000)).toBe('60:00')
  })

  it('pads single-digit values with zeros', () => {
    expect(formatTime(1000)).toBe('00:01')
    expect(formatTime(61000)).toBe('01:01')
    expect(formatTime(605000)).toBe('10:05')
  })

  it('floors partial seconds', () => {
    expect(formatTime(1500)).toBe('00:01')
    expect(formatTime(1999)).toBe('00:01')
    expect(formatTime(2001)).toBe('00:02')
  })
})

describe('formatHealth', () => {
  it('formats full health as 100%', () => {
    expect(formatHealth(0)).toBe('100%')
    expect(formatHealth(0, 100)).toBe('100%')
  })

  it('formats zero health as 0%', () => {
    expect(formatHealth(100)).toBe('0%')
    expect(formatHealth(100, 100)).toBe('0%')
  })

  it('calculates health correctly', () => {
    expect(formatHealth(25)).toBe('75%')
    expect(formatHealth(50)).toBe('50%')
    expect(formatHealth(75)).toBe('25%')
  })

  it('works with custom max health', () => {
    expect(formatHealth(50, 200)).toBe('75%')
    expect(formatHealth(100, 200)).toBe('50%')
    expect(formatHealth(150, 200)).toBe('25%')
  })

  it('clamps health to valid range', () => {
    expect(formatHealth(-10)).toBe('100%') // Can't be more than 100%
    expect(formatHealth(150)).toBe('0%') // Can't be less than 0%
  })

  it('rounds to nearest integer', () => {
    expect(formatHealth(33.3)).toBe('67%')
    expect(formatHealth(66.6)).toBe('33%')
  })
})

describe('getHealthPercentage', () => {
  it('returns 1 for full health', () => {
    expect(getHealthPercentage(0)).toBe(1)
    expect(getHealthPercentage(0, 100)).toBe(1)
  })

  it('returns 0 for zero health', () => {
    expect(getHealthPercentage(100)).toBe(0)
    expect(getHealthPercentage(100, 100)).toBe(0)
  })

  it('returns correct fractional values', () => {
    expect(getHealthPercentage(25)).toBe(0.75)
    expect(getHealthPercentage(50)).toBe(0.5)
    expect(getHealthPercentage(75)).toBe(0.25)
  })

  it('works with custom max health', () => {
    expect(getHealthPercentage(50, 200)).toBe(0.75)
    expect(getHealthPercentage(100, 200)).toBe(0.5)
  })

  it('clamps to 0-1 range', () => {
    expect(getHealthPercentage(-10)).toBe(1) // Max 1
    expect(getHealthPercentage(150)).toBe(0) // Min 0
  })
})

describe('generateUUID', () => {
  it('generates a string in UUID format', () => {
    const uuid = generateUUID()
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })

  it('always has 4 as the version digit', () => {
    for (let i = 0; i < 10; i++) {
      const uuid = generateUUID()
      expect(uuid[14]).toBe('4')
    }
  })

  it('always has valid variant digits (8, 9, a, b)', () => {
    for (let i = 0; i < 10; i++) {
      const uuid = generateUUID()
      expect(['8', '9', 'a', 'b']).toContain(uuid[19])
    }
  })

  it('generates unique UUIDs', () => {
    const uuids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUID())
    }
    expect(uuids.size).toBe(100)
  })

  it('returns 36 character string', () => {
    expect(generateUUID()).toHaveLength(36)
  })
})

describe('getPlayerNumberSize', () => {
  it('returns small size for very narrow screens', () => {
    expect(getPlayerNumberSize(320)).toBe('180px')
    expect(getPlayerNumberSize(360)).toBe('180px')
    expect(getPlayerNumberSize(374)).toBe('180px')
  })

  it('returns normal size for phone-sized screens', () => {
    expect(getPlayerNumberSize(375)).toBe('220px')
    expect(getPlayerNumberSize(400)).toBe('220px')
    expect(getPlayerNumberSize(767)).toBe('220px')
  })

  it('returns large size for tablet and desktop screens', () => {
    expect(getPlayerNumberSize(768)).toBe('280px')
    expect(getPlayerNumberSize(1024)).toBe('280px')
    expect(getPlayerNumberSize(1920)).toBe('280px')
  })

  it('handles boundary values correctly', () => {
    expect(getPlayerNumberSize(374)).toBe('180px')
    expect(getPlayerNumberSize(375)).toBe('220px')
    expect(getPlayerNumberSize(767)).toBe('220px')
    expect(getPlayerNumberSize(768)).toBe('280px')
  })
})
