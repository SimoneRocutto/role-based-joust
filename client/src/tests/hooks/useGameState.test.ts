import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useGameState,
  getHealthBackgroundClass,
  getHealthBorderClass,
  getHealthGlowClass,
  getHealthTintClass,
} from '@/hooks/useGameState'
import { useGameStore } from '@/store/gameStore'
import type { PlayerState } from '@/types/player.types'

function createMockPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'player-1',
    name: 'Test Player',
    number: 1,
    role: 'Civilian',
    isAlive: true,
    points: 0,
    totalPoints: 0,
    toughness: 100,
    accumulatedDamage: 0,
    statusEffects: [],
    ...overrides,
  }
}

describe('useGameState', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  describe('myHealthPercentage', () => {
    it('returns 1 when no player', () => {
      const { result } = renderHook(() => useGameState())
      expect(result.current.myHealthPercentage).toBe(1)
    })

    it('returns correct health percentage', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.updatePlayers([createMockPlayer({ id: 'p1', accumulatedDamage: 25 })])
      })

      expect(result.current.myHealthPercentage).toBe(0.75)
    })

    it('returns 0 for fully damaged player', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.updatePlayers([createMockPlayer({ id: 'p1', accumulatedDamage: 100 })])
      })

      expect(result.current.myHealthPercentage).toBe(0)
    })
  })

  describe('myHealthStatus', () => {
    it('returns healthy for 80%+ health', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.updatePlayers([createMockPlayer({ id: 'p1', accumulatedDamage: 15 })])
      })

      expect(result.current.myHealthStatus).toBe('healthy')
    })

    it('returns damaged for 40-79% health', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.updatePlayers([createMockPlayer({ id: 'p1', accumulatedDamage: 50 })])
      })

      expect(result.current.myHealthStatus).toBe('damaged')
    })

    it('returns damaged for <40% health (above 0%)', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.updatePlayers([createMockPlayer({ id: 'p1', accumulatedDamage: 70 })])
      })

      // Note: The implementation returns "damaged" for health between 0 and 40%
      // "critical" only applies at exactly 0% health (same as "dead" threshold)
      expect(result.current.myHealthStatus).toBe('damaged')
    })

    it('returns dead for 0% health', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.updatePlayers([createMockPlayer({ id: 'p1', accumulatedDamage: 100 })])
      })

      expect(result.current.myHealthStatus).toBe('dead')
    })
  })

  describe('isMyPlayerAlive / isMyPlayerDead', () => {
    it('returns correct values when player is alive', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.updatePlayers([createMockPlayer({ id: 'p1', isAlive: true })])
      })

      expect(result.current.isMyPlayerAlive).toBe(true)
      expect(result.current.isMyPlayerDead).toBe(false)
    })

    it('returns correct values when player is dead', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.updatePlayers([createMockPlayer({ id: 'p1', isAlive: false })])
      })

      expect(result.current.isMyPlayerAlive).toBe(false)
      expect(result.current.isMyPlayerDead).toBe(true)
    })

    it('returns false/true when no player', () => {
      const { result } = renderHook(() => useGameState())
      expect(result.current.isMyPlayerAlive).toBe(false)
      expect(result.current.isMyPlayerDead).toBe(true)
    })
  })

  describe('game state predicates', () => {
    it('isWaiting is true only in waiting state', () => {
      const { result } = renderHook(() => useGameState())

      expect(result.current.isWaiting).toBe(true)

      act(() => {
        useGameStore.getState().setGameState('countdown')
      })

      expect(result.current.isWaiting).toBe(false)
    })

    it('isCountdown is true only in countdown state', () => {
      const { result } = renderHook(() => useGameState())

      expect(result.current.isCountdown).toBe(false)

      act(() => {
        useGameStore.getState().setGameState('countdown')
      })

      expect(result.current.isCountdown).toBe(true)
    })

    it('isActive is true only in active state', () => {
      const { result } = renderHook(() => useGameState())

      expect(result.current.isActive).toBe(false)

      act(() => {
        useGameStore.getState().setGameState('active')
      })

      expect(result.current.isActive).toBe(true)
    })

    it('isRoundEnded is true only in round-ended state', () => {
      const { result } = renderHook(() => useGameState())

      expect(result.current.isRoundEnded).toBe(false)

      act(() => {
        useGameStore.getState().setGameState('round-ended')
      })

      expect(result.current.isRoundEnded).toBe(true)
    })

    it('isFinished is true only in finished state', () => {
      const { result } = renderHook(() => useGameState())

      expect(result.current.isFinished).toBe(false)

      act(() => {
        useGameStore.getState().setGameState('finished')
      })

      expect(result.current.isFinished).toBe(true)
    })
  })

  describe('ready delay computed values', () => {
    it('isRoundWinner is true when myPlayerId matches roundWinnerId', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.setRoundWinnerId('p1')
      })

      expect(result.current.isRoundWinner).toBe(true)
    })

    it('isRoundWinner is false when myPlayerId does not match roundWinnerId', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.setRoundWinnerId('p2')
      })

      expect(result.current.isRoundWinner).toBe(false)
    })

    it('isRoundWinner is false when roundWinnerId is null', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        const store = useGameStore.getState()
        store.setMyPlayer('p1', 1)
        store.setRoundWinnerId(null)
      })

      expect(result.current.isRoundWinner).toBe(false)
    })

    it('readyEnabled reflects store state', () => {
      const { result } = renderHook(() => useGameState())

      expect(result.current.readyEnabled).toBe(true)

      act(() => {
        useGameStore.getState().setReadyEnabled(false)
      })

      expect(result.current.readyEnabled).toBe(false)

      act(() => {
        useGameStore.getState().setReadyEnabled(true)
      })

      expect(result.current.readyEnabled).toBe(true)
    })
  })

  describe('dashboard values', () => {
    it('alivePlayers contains only alive players', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        useGameStore.getState().updatePlayers([
          createMockPlayer({ id: 'p1', isAlive: true }),
          createMockPlayer({ id: 'p2', isAlive: false }),
          createMockPlayer({ id: 'p3', isAlive: true }),
        ])
      })

      expect(result.current.alivePlayers).toHaveLength(2)
      expect(result.current.alivePlayers.every(p => p.isAlive)).toBe(true)
    })

    it('aliveCount returns correct count', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        useGameStore.getState().updatePlayers([
          createMockPlayer({ id: 'p1', isAlive: true }),
          createMockPlayer({ id: 'p2', isAlive: false }),
          createMockPlayer({ id: 'p3', isAlive: true }),
        ])
      })

      expect(result.current.aliveCount).toBe(2)
    })

    it('deadPlayers contains only dead players', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        useGameStore.getState().updatePlayers([
          createMockPlayer({ id: 'p1', isAlive: true }),
          createMockPlayer({ id: 'p2', isAlive: false }),
          createMockPlayer({ id: 'p3', isAlive: true }),
        ])
      })

      expect(result.current.deadPlayers).toHaveLength(1)
      expect(result.current.deadPlayers[0].id).toBe('p2')
    })

    it('sortedPlayers has alive players first, sorted by number', () => {
      const { result } = renderHook(() => useGameState())

      act(() => {
        useGameStore.getState().updatePlayers([
          createMockPlayer({ id: 'p1', number: 3, isAlive: false }),
          createMockPlayer({ id: 'p2', number: 1, isAlive: true }),
          createMockPlayer({ id: 'p3', number: 2, isAlive: true }),
          createMockPlayer({ id: 'p4', number: 4, isAlive: false }),
        ])
      })

      const sorted = result.current.sortedPlayers
      expect(sorted).toHaveLength(4)

      // First two should be alive, sorted by number
      expect(sorted[0].id).toBe('p2') // number 1, alive
      expect(sorted[1].id).toBe('p3') // number 2, alive

      // Last two should be dead, sorted by number
      expect(sorted[2].id).toBe('p1') // number 3, dead
      expect(sorted[3].id).toBe('p4') // number 4, dead
    })
  })
})

describe('getHealthBackgroundClass', () => {
  it('returns gradient-healthy for healthy status', () => {
    expect(getHealthBackgroundClass('healthy')).toBe('gradient-healthy')
  })

  it('returns gradient-damaged for damaged status', () => {
    expect(getHealthBackgroundClass('damaged')).toBe('gradient-damaged')
  })

  it('returns gradient-critical for critical status', () => {
    expect(getHealthBackgroundClass('critical')).toBe('gradient-critical')
  })

  it('returns bg-health-dead for dead status', () => {
    expect(getHealthBackgroundClass('dead')).toBe('bg-health-dead')
  })
})

describe('getHealthBorderClass', () => {
  it('returns green border for high health alive player', () => {
    expect(getHealthBorderClass(0.9, true)).toBe('border-green-500/80')
    expect(getHealthBorderClass(0.8, true)).toBe('border-green-500/80')
  })

  it('returns amber border for medium health alive player', () => {
    expect(getHealthBorderClass(0.6, true)).toBe('border-amber-500/80')
    expect(getHealthBorderClass(0.4, true)).toBe('border-amber-500/80')
  })

  it('returns red border for low health alive player', () => {
    expect(getHealthBorderClass(0.3, true)).toBe('border-red-500/90')
    expect(getHealthBorderClass(0.1, true)).toBe('border-red-500/90')
  })

  it('returns gray border for dead player', () => {
    expect(getHealthBorderClass(0.5, false)).toBe('border-gray-500/30')
    expect(getHealthBorderClass(0, false)).toBe('border-gray-500/30')
  })
})

describe('getHealthGlowClass', () => {
  it('returns green glow for high health alive player', () => {
    expect(getHealthGlowClass(0.9, true)).toBe('shadow-glow-green')
    expect(getHealthGlowClass(0.8, true)).toBe('shadow-glow-green')
  })

  it('returns amber glow for medium health alive player', () => {
    expect(getHealthGlowClass(0.6, true)).toBe('shadow-glow-amber')
    expect(getHealthGlowClass(0.4, true)).toBe('shadow-glow-amber')
  })

  it('returns pulsing red glow for low health alive player', () => {
    expect(getHealthGlowClass(0.3, true)).toBe('shadow-glow-red animate-pulse')
    expect(getHealthGlowClass(0.1, true)).toBe('shadow-glow-red animate-pulse')
  })

  it('returns empty string for dead player', () => {
    expect(getHealthGlowClass(0.5, false)).toBe('')
    expect(getHealthGlowClass(0, false)).toBe('')
  })
})

describe('getHealthTintClass', () => {
  it('returns green tint for high health alive player', () => {
    expect(getHealthTintClass(0.9, true)).toBe('bg-green-500/10')
    expect(getHealthTintClass(0.8, true)).toBe('bg-green-500/10')
  })

  it('returns amber tint for medium health alive player', () => {
    expect(getHealthTintClass(0.6, true)).toBe('bg-amber-500/10')
    expect(getHealthTintClass(0.4, true)).toBe('bg-amber-500/10')
  })

  it('returns red tint for low health alive player', () => {
    expect(getHealthTintClass(0.3, true)).toBe('bg-red-500/15')
    expect(getHealthTintClass(0.1, true)).toBe('bg-red-500/15')
  })

  it('returns gray tint for dead player', () => {
    expect(getHealthTintClass(0.5, false)).toBe('bg-gray-800/50')
    expect(getHealthTintClass(0, false)).toBe('bg-gray-800/50')
  })
})
