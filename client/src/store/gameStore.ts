import { create } from "zustand";
import type { PlayerState, RoleInfo } from "@/types/player.types";
import type { GameStateType, ScoreEntry, TeamScore } from "@/types/game.types";
import type { BaseState } from "@/types/socket.types";

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

  // Ready state
  readyPlayers: Set<string>;
  readyCount: { ready: number; total: number };
  isDevMode: boolean;
  myIsReady: boolean;
  readyEnabled: boolean;
  roundWinnerId: string | null;

  // All players (for dashboard)
  players: PlayerState[];

  // Timer state (for timed modes)
  roundTimeRemaining: number | null;
  respawnCountdown: number | null;

  // Team state
  teamsEnabled: boolean;
  teams: Record<number, string[]>;
  teamSelectionActive: boolean;
  teamScores: TeamScore[] | null;

  // Base state (Domination mode)
  bases: BaseState[];
  dominationTeamScores: Record<number, number>;

  // Mode recap (shown during pre-game)
  modeRecap: {
    modeName: string;
    roundCount: number;
    sensitivity: string;
  } | null;

  // UI state
  latestEvent: string | null;
  scores: ScoreEntry[];
  activeModeEvent: string | null;
  activeGameEvents: string[];

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
  setMode: (mode: string | null) => void;
  setLatestEvent: (event: string) => void;
  setScores: (scores: ScoreEntry[]) => void;
  setCountdown: (seconds: number, phase: "countdown" | "go" | null) => void;
  setPlayerReady: (playerId: string, isReady: boolean) => void;
  setReadyCount: (count: { ready: number; total: number }) => void;
  setDevMode: (isDevMode: boolean) => void;
  setMyReady: (isReady: boolean) => void;
  setReadyEnabled: (enabled: boolean) => void;
  setRoundWinnerId: (winnerId: string | null) => void;
  setActiveModeEvent: (event: string | null) => void;
  setActiveGameEvents: (events: string[]) => void;
  setRoundTimeRemaining: (time: number | null) => void;
  setRespawnCountdown: (countdown: number | null) => void;
  setTeamsEnabled: (enabled: boolean) => void;
  setTeams: (teams: Record<number, string[]>) => void;
  setTeamSelectionActive: (active: boolean) => void;
  setTeamScores: (scores: TeamScore[] | null) => void;
  setModeRecap: (
    recap: { modeName: string; roundCount: number; sensitivity: string } | null
  ) => void;
  setBases: (bases: BaseState[]) => void;
  setDominationTeamScores: (scores: Record<number, number>) => void;
  resetReadyState: () => void;
  clearIdentity: () => void;
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

  readyPlayers: new Set(),
  readyCount: { ready: 0, total: 0 },
  isDevMode: false,
  myIsReady: false,
  readyEnabled: true,
  roundWinnerId: null,

  players: [],

  roundTimeRemaining: null,
  respawnCountdown: null,

  teamsEnabled: false,
  teams: {},
  teamSelectionActive: false,
  teamScores: null,

  bases: [],
  dominationTeamScores: {},

  modeRecap: null,

  latestEvent: null,
  scores: [],
  activeModeEvent: null,
  activeGameEvents: [],

  // Actions
  setConnected: (connected) => set({ isConnected: connected }),

  setReconnecting: (reconnecting, attempts) =>
    set({ isReconnecting: reconnecting, reconnectAttempts: attempts }),

  setMyPlayer: (playerId, playerNumber) =>
    set({ myPlayerId: playerId, myPlayerNumber: playerNumber }),

  setMyRole: (role) => set({ myRole: role }),

  setMyTarget: (target) => set({ myTarget: target }),

  updatePlayer: (player) => {
    // Ensure statusEffects is always an array (reconnect payloads may omit it)
    const normalized = { statusEffects: [] as PlayerState["statusEffects"], ...player };

    // Update my player if it's me
    if (get().myPlayerId === normalized.id) {
      set({ myPlayer: normalized });
    }

    // Update in players list
    set((state) => ({
      players: state.players.map((p) => (p.id === normalized.id ? normalized : p)),
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

  setPlayerReady: (playerId, isReady) => {
    set((state) => {
      const newReadyPlayers = new Set(state.readyPlayers);
      if (isReady) {
        newReadyPlayers.add(playerId);
      } else {
        newReadyPlayers.delete(playerId);
      }

      // Update players list with ready state
      const updatedPlayers = state.players.map((p) =>
        p.id === playerId ? { ...p, isReady } : p
      );

      // Update myIsReady if it's my player
      const myIsReady =
        state.myPlayerId === playerId ? isReady : state.myIsReady;

      return {
        readyPlayers: newReadyPlayers,
        players: updatedPlayers,
        myIsReady,
      };
    });
  },

  setReadyCount: (count) => set({ readyCount: count }),

  setDevMode: (isDevMode) => set({ isDevMode }),

  setMyReady: (isReady) => set({ myIsReady: isReady }),

  setReadyEnabled: (enabled) => set({ readyEnabled: enabled }),

  setRoundWinnerId: (winnerId) => set({ roundWinnerId: winnerId }),

  setActiveModeEvent: (event) => set({ activeModeEvent: event }),

  setActiveGameEvents: (events) => set({ activeGameEvents: events }),

  setRoundTimeRemaining: (time) => set({ roundTimeRemaining: time }),

  setRespawnCountdown: (countdown) => set({ respawnCountdown: countdown }),

  setTeamsEnabled: (enabled) => set({ teamsEnabled: enabled }),

  setTeams: (teams) => set({ teams: teams }),

  setTeamSelectionActive: (active) => set({ teamSelectionActive: active }),

  setTeamScores: (scores) => set({ teamScores: scores }),

  setModeRecap: (recap) => set({ modeRecap: recap }),

  setBases: (bases) => set({ bases }),

  setDominationTeamScores: (scores) => set({ dominationTeamScores: scores }),

  resetReadyState: () =>
    set({
      readyPlayers: new Set(),
      readyCount: { ready: 0, total: 0 },
      myIsReady: false,
      readyEnabled: true,
      roundWinnerId: null,
      activeModeEvent: null,
      activeGameEvents: [],
      roundTimeRemaining: null,
      respawnCountdown: null,
      modeRecap: null,
    }),

  clearIdentity: () =>
    set({
      myPlayerId: null,
      myPlayerNumber: null,
      myPlayer: null,
      myRole: null,
      myTarget: null,
    }),

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
      readyPlayers: new Set(),
      readyCount: { ready: 0, total: 0 },
      myIsReady: false,
      readyEnabled: true,
      roundWinnerId: null,
      roundTimeRemaining: null,
      respawnCountdown: null,
      players: [],
      teamsEnabled: false,
      teamSelectionActive: false,
      teamScores: null,
      bases: [],
      dominationTeamScores: {},
      modeRecap: null,
      latestEvent: null,
      scores: [],
      activeModeEvent: null,
      activeGameEvents: [],
    }),
}));
