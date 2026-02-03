import type { GameMode, GameState } from "@/types/game.types";
import type { PlayerState, RoleInfo } from "@/types/player.types";

// In development, use empty string to connect via Vite proxy (same origin)
// In production, use the API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

class ApiService {
  private baseUrl: string;

  constructor() {
    // When API_BASE_URL is empty, this becomes "/api" which uses Vite proxy
    this.baseUrl = `${API_BASE_URL}/api`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // GET /api/game/config
  async getGameConfig(): Promise<{ success: boolean; devMode: boolean }> {
    return this.request<{ success: boolean; devMode: boolean }>("/game/config");
  }

  // GET /api/game/modes
  async getGameModes(): Promise<{ success: boolean; modes: GameMode[] }> {
    return this.request<{ success: boolean; modes: GameMode[] }>("/game/modes");
  }

  // GET /api/game/lobby
  async getLobbyPlayers(): Promise<{
    success: boolean;
    players: Array<{ id: string; name: string; number: number; isAlive: boolean; isReady: boolean }>;
  }> {
    return this.request("/game/lobby");
  }

  // POST /api/game/launch (combined create + start)
  async launchGame(payload: { mode: string; theme?: string }): Promise<{
    success: boolean;
    gameId: string;
    mode: GameMode;
    playerCount: number;
    state: string;
  }> {
    return this.request("/game/launch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // POST /api/game/create
  async createGame(payload: { mode: string; theme?: string }): Promise<{
    success: boolean;
    gameId: string;
    mode: GameMode;
  }> {
    return this.request("/game/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // POST /api/game/start
  async startGame(payload: {
    players: Array<{ id: string; name: string; socketId: string }>;
  }): Promise<{
    success: boolean;
    gameState: GameState;
  }> {
    return this.request("/game/start", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // GET /api/game/state
  async getGameState(): Promise<{
    success: boolean;
    state: GameState;
  }> {
    return this.request("/game/state");
  }

  // POST /api/game/stop
  async stopGame(): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request("/game/stop", {
      method: "POST",
    });
  }

  // POST /api/game/next-round
  async startNextRound(): Promise<{
    success: boolean;
    round: number;
    totalRounds: number;
    error?: string;
  }> {
    return this.request("/game/next-round", {
      method: "POST",
    });
  }

  // GET /api/game/settings
  async getSettings(): Promise<{
    success: boolean;
    sensitivity: string;
    gameMode: string;
    theme: string;
    roundCount: number;
    movement: { dangerThreshold: number; damageMultiplier: number; oneshotMode: boolean };
    presets: Array<{
      key: string;
      label: string;
      description: string;
      damageMultiplier: number;
      oneshotMode?: boolean;
    }>;
    modes: Array<{ key: string; name: string; description: string }>;
    themes: string[];
  }> {
    return this.request("/game/settings");
  }

  // POST /api/game/settings
  async updateSettings(payload: {
    sensitivity?: string;
    gameMode?: string;
    theme?: string;
    roundCount?: number;
    dangerThreshold?: number;
    damageMultiplier?: number;
  }): Promise<{
    success: boolean;
    sensitivity: string;
    gameMode: string;
    theme: string;
    roundCount: number;
    movement: { dangerThreshold: number; damageMultiplier: number; oneshotMode: boolean };
  }> {
    return this.request("/game/settings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // GET /api/player/:playerId/role
  async getPlayerRole(playerId: string): Promise<{
    success: boolean;
    role: RoleInfo;
    player: PlayerState;
  }> {
    return this.request(`/player/${playerId}/role`);
  }

  // GET /api/player/:playerId/state
  async getPlayerState(playerId: string): Promise<{
    success: boolean;
    player: PlayerState;
  }> {
    return this.request(`/player/${playerId}/state`);
  }

  // POST /api/player/reconnect
  async reconnectPlayer(payload: { token: string; socketId: string }): Promise<{
    success: boolean;
    playerId: string;
    player: PlayerState;
  }> {
    return this.request("/player/reconnect", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

// Singleton instance
export const apiService = new ApiService();
