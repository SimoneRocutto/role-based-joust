import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store/gameStore'
import type { PlayerState } from '@/types/player.types'

// Helper to create a mock player
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

describe('gameStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useGameStore.getState().reset()
  })

  describe('initial state', () => {
    it('has correct initial values', () => {
      const state = useGameStore.getState()

      expect(state.isConnected).toBe(false)
      expect(state.isReconnecting).toBe(false)
      expect(state.reconnectAttempts).toBe(0)
      expect(state.myPlayerId).toBe(null)
      expect(state.myPlayerNumber).toBe(null)
      expect(state.myPlayer).toBe(null)
      expect(state.myRole).toBe(null)
      expect(state.myTarget).toBe(null)
      expect(state.gameState).toBe('waiting')
      expect(state.gameTime).toBe(0)
      expect(state.currentRound).toBe(0)
      expect(state.totalRounds).toBe(0)
      expect(state.mode).toBe(null)
      expect(state.countdownSeconds).toBe(0)
      expect(state.countdownPhase).toBe(null)
      expect(state.readyPlayers.size).toBe(0)
      expect(state.readyCount).toEqual({ ready: 0, total: 0 })
      expect(state.isDevMode).toBe(false)
      expect(state.myIsReady).toBe(false)
      expect(state.players).toEqual([])
      expect(state.latestEvent).toBe(null)
      expect(state.scores).toEqual([])
    })
  })

  describe('connection state', () => {
    it('setConnected updates connection state', () => {
      const { setConnected } = useGameStore.getState()

      setConnected(true)
      expect(useGameStore.getState().isConnected).toBe(true)

      setConnected(false)
      expect(useGameStore.getState().isConnected).toBe(false)
    })

    it('setReconnecting updates reconnection state and attempts', () => {
      const { setReconnecting } = useGameStore.getState()

      setReconnecting(true, 3)
      const state = useGameStore.getState()
      expect(state.isReconnecting).toBe(true)
      expect(state.reconnectAttempts).toBe(3)
    })
  })

  describe('player state', () => {
    it('setMyPlayer sets player id and number', () => {
      const { setMyPlayer } = useGameStore.getState()

      setMyPlayer('player-123', 5)
      const state = useGameStore.getState()
      expect(state.myPlayerId).toBe('player-123')
      expect(state.myPlayerNumber).toBe(5)
    })

    it('setMyRole sets role info', () => {
      const { setMyRole } = useGameStore.getState()
      const role = {
        name: 'Vampire',
        displayName: 'Vampire',
        description: 'Drain others to heal',
        difficulty: 'Medium',
      }

      setMyRole(role)
      expect(useGameStore.getState().myRole).toEqual(role)
    })

    it('setMyTarget sets target info', () => {
      const { setMyTarget } = useGameStore.getState()
      const target = { number: 3, name: 'Target Player' }

      setMyTarget(target)
      expect(useGameStore.getState().myTarget).toEqual(target)

      setMyTarget(null)
      expect(useGameStore.getState().myTarget).toBe(null)
    })

    it('updatePlayer updates player in players list', () => {
      const { updatePlayers, updatePlayer } = useGameStore.getState()
      const player1 = createMockPlayer({ id: 'player-1', name: 'Player 1' })
      const player2 = createMockPlayer({ id: 'player-2', name: 'Player 2' })

      updatePlayers([player1, player2])

      const updatedPlayer1 = { ...player1, accumulatedDamage: 25 }
      updatePlayer(updatedPlayer1)

      const state = useGameStore.getState()
      expect(state.players[0].accumulatedDamage).toBe(25)
      expect(state.players[1].accumulatedDamage).toBe(0)
    })

    it('updatePlayer updates myPlayer when matching id', () => {
      const { setMyPlayer, updatePlayers, updatePlayer } = useGameStore.getState()
      const player = createMockPlayer({ id: 'my-player' })

      setMyPlayer('my-player', 1)
      updatePlayers([player])

      const updatedPlayer = { ...player, accumulatedDamage: 50 }
      updatePlayer(updatedPlayer)

      expect(useGameStore.getState().myPlayer?.accumulatedDamage).toBe(50)
    })

    it('updatePlayers replaces entire players list', () => {
      const { updatePlayers } = useGameStore.getState()
      const players1 = [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'p2' }),
      ]
      const players2 = [
        createMockPlayer({ id: 'p3' }),
        createMockPlayer({ id: 'p4' }),
        createMockPlayer({ id: 'p5' }),
      ]

      updatePlayers(players1)
      expect(useGameStore.getState().players).toHaveLength(2)

      updatePlayers(players2)
      expect(useGameStore.getState().players).toHaveLength(3)
      expect(useGameStore.getState().players[0].id).toBe('p3')
    })

    it('updatePlayers updates myPlayer when found in list', () => {
      const { setMyPlayer, updatePlayers } = useGameStore.getState()

      setMyPlayer('my-player', 2)

      const players = [
        createMockPlayer({ id: 'p1' }),
        createMockPlayer({ id: 'my-player', accumulatedDamage: 30 }),
      ]

      updatePlayers(players)
      expect(useGameStore.getState().myPlayer?.accumulatedDamage).toBe(30)
    })
  })

  describe('game state', () => {
    it('setGameState updates game state', () => {
      const { setGameState } = useGameStore.getState()

      setGameState('countdown')
      expect(useGameStore.getState().gameState).toBe('countdown')

      setGameState('active')
      expect(useGameStore.getState().gameState).toBe('active')

      setGameState('round-ended')
      expect(useGameStore.getState().gameState).toBe('round-ended')

      setGameState('finished')
      expect(useGameStore.getState().gameState).toBe('finished')
    })

    it('setGameTime updates game time', () => {
      const { setGameTime } = useGameStore.getState()

      setGameTime(5000)
      expect(useGameStore.getState().gameTime).toBe(5000)
    })

    it('setRound updates round info', () => {
      const { setRound } = useGameStore.getState()

      setRound(2, 5)
      const state = useGameStore.getState()
      expect(state.currentRound).toBe(2)
      expect(state.totalRounds).toBe(5)
    })

    it('setMode updates game mode', () => {
      const { setMode } = useGameStore.getState()

      setMode('role-based')
      expect(useGameStore.getState().mode).toBe('role-based')
    })
  })

  describe('countdown state', () => {
    it('setCountdown updates countdown info', () => {
      const { setCountdown } = useGameStore.getState()

      setCountdown(3, 'countdown')
      let state = useGameStore.getState()
      expect(state.countdownSeconds).toBe(3)
      expect(state.countdownPhase).toBe('countdown')

      setCountdown(0, 'go')
      state = useGameStore.getState()
      expect(state.countdownSeconds).toBe(0)
      expect(state.countdownPhase).toBe('go')

      setCountdown(0, null)
      state = useGameStore.getState()
      expect(state.countdownPhase).toBe(null)
    })
  })

  describe('ready state', () => {
    it('setPlayerReady adds player to readyPlayers set', () => {
      const { updatePlayers, setPlayerReady } = useGameStore.getState()
      const players = [createMockPlayer({ id: 'p1' })]
      updatePlayers(players)

      setPlayerReady('p1', true)
      expect(useGameStore.getState().readyPlayers.has('p1')).toBe(true)
    })

    it('setPlayerReady removes player from readyPlayers when false', () => {
      const { updatePlayers, setPlayerReady } = useGameStore.getState()
      const players = [createMockPlayer({ id: 'p1' })]
      updatePlayers(players)

      setPlayerReady('p1', true)
      expect(useGameStore.getState().readyPlayers.has('p1')).toBe(true)

      setPlayerReady('p1', false)
      expect(useGameStore.getState().readyPlayers.has('p1')).toBe(false)
    })

    it('setPlayerReady updates player isReady in players list', () => {
      const { updatePlayers, setPlayerReady } = useGameStore.getState()
      const players = [
        createMockPlayer({ id: 'p1', isReady: false }),
        createMockPlayer({ id: 'p2', isReady: false }),
      ]
      updatePlayers(players)

      setPlayerReady('p1', true)
      const state = useGameStore.getState()
      expect(state.players[0].isReady).toBe(true)
      expect(state.players[1].isReady).toBe(false)
    })

    it('setPlayerReady updates myIsReady when it is my player', () => {
      const { setMyPlayer, updatePlayers, setPlayerReady } = useGameStore.getState()
      setMyPlayer('p1', 1)
      updatePlayers([createMockPlayer({ id: 'p1' })])

      expect(useGameStore.getState().myIsReady).toBe(false)

      setPlayerReady('p1', true)
      expect(useGameStore.getState().myIsReady).toBe(true)
    })

    it('setReadyCount updates ready count', () => {
      const { setReadyCount } = useGameStore.getState()

      setReadyCount({ ready: 3, total: 5 })
      expect(useGameStore.getState().readyCount).toEqual({ ready: 3, total: 5 })
    })

    it('setDevMode updates dev mode flag', () => {
      const { setDevMode } = useGameStore.getState()

      setDevMode(true)
      expect(useGameStore.getState().isDevMode).toBe(true)

      setDevMode(false)
      expect(useGameStore.getState().isDevMode).toBe(false)
    })

    it('setMyReady updates my ready state', () => {
      const { setMyReady } = useGameStore.getState()

      setMyReady(true)
      expect(useGameStore.getState().myIsReady).toBe(true)
    })

    it('resetReadyState clears all ready state', () => {
      const { setPlayerReady, setReadyCount, setMyReady, updatePlayers, resetReadyState } = useGameStore.getState()

      updatePlayers([createMockPlayer({ id: 'p1' })])
      setPlayerReady('p1', true)
      setReadyCount({ ready: 1, total: 1 })
      setMyReady(true)

      resetReadyState()
      const state = useGameStore.getState()
      expect(state.readyPlayers.size).toBe(0)
      expect(state.readyCount).toEqual({ ready: 0, total: 0 })
      expect(state.myIsReady).toBe(false)
    })
  })

  describe('UI state', () => {
    it('setLatestEvent updates latest event', () => {
      const { setLatestEvent } = useGameStore.getState()

      setLatestEvent('Player 1 eliminated Player 2')
      expect(useGameStore.getState().latestEvent).toBe('Player 1 eliminated Player 2')
    })

    it('setScores updates scores', () => {
      const { setScores } = useGameStore.getState()
      const scores = [
        { playerId: 'p1', playerName: 'Player 1', playerNumber: 1, score: 100, rank: 1, status: 'winner' },
        { playerId: 'p2', playerName: 'Player 2', playerNumber: 2, score: 50, rank: 2, status: 'runner-up' },
      ]

      setScores(scores)
      expect(useGameStore.getState().scores).toEqual(scores)
    })
  })

  describe('reset', () => {
    it('reset returns store to initial state', () => {
      const store = useGameStore.getState()

      // Modify state
      store.setConnected(true)
      store.setMyPlayer('player-1', 1)
      store.setGameState('active')
      store.updatePlayers([createMockPlayer()])
      store.setScores([{ playerId: 'p1', playerName: 'P1', playerNumber: 1, score: 100, rank: 1, status: 'winner' }])

      // Reset
      store.reset()

      const state = useGameStore.getState()
      expect(state.myPlayerId).toBe(null)
      expect(state.myPlayerNumber).toBe(null)
      expect(state.myPlayer).toBe(null)
      expect(state.myRole).toBe(null)
      expect(state.myTarget).toBe(null)
      expect(state.gameState).toBe('waiting')
      expect(state.gameTime).toBe(0)
      expect(state.currentRound).toBe(0)
      expect(state.totalRounds).toBe(0)
      expect(state.mode).toBe(null)
      expect(state.countdownSeconds).toBe(0)
      expect(state.countdownPhase).toBe(null)
      expect(state.readyPlayers.size).toBe(0)
      expect(state.readyCount).toEqual({ ready: 0, total: 0 })
      expect(state.myIsReady).toBe(false)
      expect(state.players).toEqual([])
      expect(state.latestEvent).toBe(null)
      expect(state.scores).toEqual([])
    })

    it('reset does not affect connection state', () => {
      const store = useGameStore.getState()

      store.setConnected(true)
      store.reset()

      // isConnected is not reset
      expect(useGameStore.getState().isConnected).toBe(true)
    })
  })
})
