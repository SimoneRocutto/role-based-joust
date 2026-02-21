import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Re-implement ApiService for testing
class ApiService {
  private baseUrl = '/api'

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    return await response.json()
  }

  async getGameConfig() {
    return this.request<{ success: boolean; devMode: boolean }>('/game/config')
  }

  async getGameModes() {
    return this.request<{ success: boolean; modes: any[] }>('/game/modes')
  }

  async getLobbyPlayers() {
    return this.request<{
      success: boolean
      players: Array<{ id: string; name: string; number: number; isAlive: boolean; isReady: boolean }>
    }>('/game/lobby')
  }

  async launchGame(payload: { mode: string; theme?: string }) {
    return this.request<{
      success: boolean
      gameId: string
      mode: any
      playerCount: number
      state: string
    }>('/game/launch', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async createGame(payload: { mode: string; theme?: string }) {
    return this.request<{ success: boolean; gameId: string; mode: any }>('/game/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async startGame(payload: { players: Array<{ id: string; name: string; socketId: string }> }) {
    return this.request<{ success: boolean; gameState: any }>('/game/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async getGameState() {
    return this.request<{ success: boolean; state: any }>('/game/state')
  }

  async stopGame() {
    return this.request<{ success: boolean; message: string }>('/game/stop', {
      method: 'POST',
    })
  }

  async startNextRound() {
    return this.request<{ success: boolean; round: number; totalRounds: number; error?: string }>(
      '/game/next-round',
      { method: 'POST' }
    )
  }

  async getPlayerRole(playerId: string) {
    return this.request<{ success: boolean; role: any; player: any }>(`/player/${playerId}/role`)
  }

  async getPlayerState(playerId: string) {
    return this.request<{ success: boolean; player: any }>(`/player/${playerId}/state`)
  }

  async reconnectPlayer(payload: { token: string; socketId: string }) {
    return this.request<{ success: boolean; playerId: string; player: any }>('/player/reconnect', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async kickBase(baseId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/game/kick-base/${baseId}`, {
      method: 'POST',
    })
  }
}

describe('ApiService', () => {
  let api: ApiService
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    api = new ApiService()
    mockFetch = vi.fn()
    global.fetch = mockFetch as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockSuccessResponse(data: any) {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    })
  }

  function mockErrorResponse(status: number, statusText: string, body: any = {}) {
    mockFetch.mockResolvedValue({
      ok: false,
      status,
      statusText,
      json: () => Promise.resolve(body),
    })
  }

  describe('request handling', () => {
    it('includes Content-Type header', async () => {
      mockSuccessResponse({ success: true })

      await api.getGameConfig()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('throws error on non-ok response', async () => {
      mockErrorResponse(500, 'Internal Server Error')

      await expect(api.getGameConfig()).rejects.toThrow('HTTP 500: Internal Server Error')
    })

    it('uses error message from response body if available', async () => {
      mockErrorResponse(400, 'Bad Request', { message: 'Invalid game mode' })

      await expect(api.getGameConfig()).rejects.toThrow('Invalid game mode')
    })

    it('handles JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(api.getGameConfig()).rejects.toThrow('HTTP 500: Server Error')
    })
  })

  describe('GET endpoints', () => {
    it('getGameConfig calls correct endpoint', async () => {
      mockSuccessResponse({ success: true, devMode: false })

      const result = await api.getGameConfig()

      expect(mockFetch).toHaveBeenCalledWith('/api/game/config', expect.any(Object))
      expect(result).toEqual({ success: true, devMode: false })
    })

    it('getGameModes calls correct endpoint', async () => {
      const modes = [{ key: 'classic', name: 'Classic' }]
      mockSuccessResponse({ success: true, modes })

      const result = await api.getGameModes()

      expect(mockFetch).toHaveBeenCalledWith('/api/game/modes', expect.any(Object))
      expect(result.modes).toEqual(modes)
    })

    it('getLobbyPlayers calls correct endpoint', async () => {
      const players = [{ id: 'p1', name: 'Player 1', number: 1, isAlive: true, isReady: false }]
      mockSuccessResponse({ success: true, players })

      const result = await api.getLobbyPlayers()

      expect(mockFetch).toHaveBeenCalledWith('/api/game/lobby', expect.any(Object))
      expect(result.players).toEqual(players)
    })

    it('getGameState calls correct endpoint', async () => {
      const state = { gameTime: 5000, state: 'active' }
      mockSuccessResponse({ success: true, state })

      const result = await api.getGameState()

      expect(mockFetch).toHaveBeenCalledWith('/api/game/state', expect.any(Object))
      expect(result.state).toEqual(state)
    })

    it('getPlayerRole calls correct endpoint with player ID', async () => {
      const role = { name: 'Vampire', displayName: 'Vampire' }
      mockSuccessResponse({ success: true, role, player: {} })

      const result = await api.getPlayerRole('player-123')

      expect(mockFetch).toHaveBeenCalledWith('/api/player/player-123/role', expect.any(Object))
      expect(result.role).toEqual(role)
    })

    it('getPlayerState calls correct endpoint with player ID', async () => {
      const player = { id: 'p1', name: 'Alice' }
      mockSuccessResponse({ success: true, player })

      const result = await api.getPlayerState('p1')

      expect(mockFetch).toHaveBeenCalledWith('/api/player/p1/state', expect.any(Object))
      expect(result.player).toEqual(player)
    })
  })

  describe('POST endpoints', () => {
    it('launchGame sends POST with body', async () => {
      mockSuccessResponse({ success: true, gameId: 'game-1', mode: {}, playerCount: 4, state: 'countdown' })

      await api.launchGame({ mode: 'classic', theme: 'monsters' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/game/launch',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ mode: 'classic', theme: 'monsters' }),
        })
      )
    })

    it('createGame sends POST with body', async () => {
      mockSuccessResponse({ success: true, gameId: 'game-1', mode: {} })

      await api.createGame({ mode: 'role-based' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/game/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ mode: 'role-based' }),
        })
      )
    })

    it('startGame sends POST with players', async () => {
      mockSuccessResponse({ success: true, gameState: {} })

      const players = [{ id: 'p1', name: 'Alice', socketId: 'socket-1' }]
      await api.startGame({ players })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/game/start',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ players }),
        })
      )
    })

    it('stopGame sends POST with no body', async () => {
      mockSuccessResponse({ success: true, message: 'Game stopped' })

      await api.stopGame()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/game/stop',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('startNextRound sends POST', async () => {
      mockSuccessResponse({ success: true, round: 2, totalRounds: 5 })

      const result = await api.startNextRound()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/game/next-round',
        expect.objectContaining({
          method: 'POST',
        })
      )
      expect(result.round).toBe(2)
    })

    it('reconnectPlayer sends POST with token and socketId', async () => {
      mockSuccessResponse({ success: true, playerId: 'p1', player: {} })

      await api.reconnectPlayer({ token: 'session-token', socketId: 'socket-123' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/player/reconnect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'session-token', socketId: 'socket-123' }),
        })
      )
    })

    it('kickBase sends POST to correct endpoint with baseId', async () => {
      mockSuccessResponse({ success: true })

      const result = await api.kickBase('base-2')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/game/kick-base/base-2',
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toEqual({ success: true })
    })

    it('kickBase throws when server returns error', async () => {
      mockErrorResponse(400, 'Bad Request', { message: 'Cannot kick a base during active gameplay' })

      await expect(api.kickBase('base-1')).rejects.toThrow('Cannot kick a base during active gameplay')
    })
  })
})
