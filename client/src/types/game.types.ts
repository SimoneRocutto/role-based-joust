import type { PlayerState } from "./player.types";

export type { GameStateType, TeamScore } from "@shared/types";
export type { ClientScoreEntry as ScoreEntry } from "@shared/types";

export interface GameState {
  gameTime: number;
  state: import("@shared/types").GameStateType;
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

export interface GameEndInfo {
  winner: {
    id: string;
    name: string;
    number: number;
  } | null;
  scores: import("@shared/types").ClientScoreEntry[];
  totalRounds: number;
}
