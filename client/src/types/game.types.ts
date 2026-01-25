import type { PlayerState } from "./player.types";

export type GameStateType = "waiting" | "active" | "round-ended" | "finished";

export interface GameState {
  gameTime: number;
  state: GameStateType;
  currentRound: number;
  mode: string;
  playerCount: number;
  alivePlayers: number;
  players: PlayerState[];
}

export interface GameMode {
  key: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  useRoles: boolean;
  multiRound: boolean;
  roundCount: number;
  roleTheme?: string;
}

export interface RoundInfo {
  roundNumber: number;
  totalRounds: number;
  gameTime: number;
}

export interface ScoreEntry {
  playerId: string;
  playerName: string;
  playerNumber: number;
  score: number;
  rank: number;
  status: string;
}

export interface GameEndInfo {
  winner: {
    id: string;
    name: string;
    number: number;
  } | null;
  scores: ScoreEntry[];
  totalRounds: number;
}
