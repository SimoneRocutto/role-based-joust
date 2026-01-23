export type GameState = "waiting" | "active" | "round-ended" | "finished";

export interface GameSnapshot {
  gameTime: number;
  state: GameState;
  currentRound: number;
  alivePlayers: number;
  totalPlayers: number;
  players: PlayerState[];
}

export interface RoundInfo {
  roundNumber: number;
  startTime: number;
  endTime: number | null;
  winner: string | null;
  survivors: string[];
}

export interface WinCondition {
  roundEnded: boolean;
  gameEnded: boolean;
  winner: import("../models/BasePlayer").BasePlayer | null;
}

export interface ScoreEntry {
  player: import("../models/BasePlayer").BasePlayer;
  score: number;
  rank: number;
  status: string;
}
