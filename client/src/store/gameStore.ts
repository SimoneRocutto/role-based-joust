import { create } from "zustand";
import type { PlayerState, RoleInfo } from "@/types/player.types";
import type { GameStateType, ScoreEntry } from "@/types/game.types";

interface GameStore {
  // Connection state
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;

  // Player state
  myPlayerId: string | null;
  myPlayerNumber: number | null;
  myPlayer: PlayerState | null;
  myRole: RoleInfo | null;
  myTarget: { number: number; name: string } | null;

  // Game state
  gameState: GameStateType;
  gameTime: number;
  currentRound: number;
  totalRounds: number;
  mode: string | null;

  // Countdown state
  countdownSeconds: number;
  countdownPhase: "countdown" | "go" | null;

  // All players (for dashboard)
  players: PlayerState[];

  // UI state
  latestEvent: string | null;
  scores: ScoreEntry[];

  // Actions
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean, attempts: number) => void;
  setMyPlayer: (playerId: string, playerNumber: number) => void;
  setMyRole: (role: RoleInfo) => void;
  setMyTarget: (target: { number: number; name: string } | null) => void;
  updatePlayer: (player: PlayerState) => void;
  updatePlayers: (players: PlayerState[]) => void;
  setGameState: (state: GameStateType) => void;
  setGameTime: (time: number) => void;
  setRound: (current: number, total: number) => void;
  setMode: (mode: string) => void;
  setLatestEvent: (event: string) => void;
  setScores: (scores: ScoreEntry[]) => void;
  setCountdown: (seconds: number, phase: "countdown" | "go" | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  isConnected: false,
  isReconnecting: false,
  reconnectAttempts: 0,

  myPlayerId: null,
  myPlayerNumber: null,
  myPlayer: null,
  myRole: null,
  myTarget: null,

  gameState: "waiting",
  gameTime: 0,
  currentRound: 0,
  totalRounds: 0,
  mode: null,

  countdownSeconds: 0,
  countdownPhase: null,

  players: [],

  latestEvent: null,
  scores: [],

  // Actions
  setConnected: (connected) => set({ isConnected: connected }),

  setReconnecting: (reconnecting, attempts) =>
    set({ isReconnecting: reconnecting, reconnectAttempts: attempts }),

  setMyPlayer: (playerId, playerNumber) =>
    set({ myPlayerId: playerId, myPlayerNumber: playerNumber }),

  setMyRole: (role) => set({ myRole: role }),

  setMyTarget: (target) => set({ myTarget: target }),

  updatePlayer: (player) => {
    // Update my player if it's me
    if (get().myPlayerId === player.id) {
      set({ myPlayer: player });
    }

    // Update in players list
    set((state) => ({
      players: state.players.map((p) => (p.id === player.id ? player : p)),
    }));
  },

  updatePlayers: (players) => {
    set({ players });

    // Update myPlayer if it's in the list
    const myPlayerId = get().myPlayerId;
    if (myPlayerId) {
      const myPlayer = players.find((p) => p.id === myPlayerId);
      if (myPlayer) {
        set({ myPlayer });
      }
    }
  },

  setGameState: (state) => set({ gameState: state }),

  setGameTime: (time) => set({ gameTime: time }),

  setRound: (current, total) =>
    set({ currentRound: current, totalRounds: total }),

  setMode: (mode) => set({ mode }),

  setLatestEvent: (event) => set({ latestEvent: event }),

  setScores: (scores) => set({ scores }),

  setCountdown: (seconds, phase) =>
    set({ countdownSeconds: seconds, countdownPhase: phase }),

  reset: () =>
    set({
      myPlayerId: null,
      myPlayerNumber: null,
      myPlayer: null,
      myRole: null,
      myTarget: null,
      gameState: "waiting",
      gameTime: 0,
      currentRound: 0,
      totalRounds: 0,
      mode: null,
      countdownSeconds: 0,
      countdownPhase: null,
      players: [],
      latestEvent: null,
      scores: [],
    }),
}));
