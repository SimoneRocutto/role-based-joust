import type { PlayerState } from ".";

export type { GameStateType } from "@shared/types";
// Backwards-compatible alias: server code uses `GameState` for the string union
export type { GameStateType as GameState } from "@shared/types";

export interface GameSnapshot {
  gameTime: number;
  state: import("@shared/types").GameStateType;
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
  roundPoints: number;
  rank: number;
  status: string;
}
