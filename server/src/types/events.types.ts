import { ScoreEntry } from ".";

export interface GameTickEvent {
  gameTime: number;
}

export interface PlayerDeathEvent {
  victim: import("../models/BasePlayer").BasePlayer;
  gameTime: number;
  killer?: import("../models/BasePlayer").BasePlayer;
}

export interface PlayerEliminatedEvent {
  player: import("../models/BasePlayer").BasePlayer;
  gameTime: number;
  finalPoints: number;
}

export interface RoundStartEvent {
  roundNumber: number;
  totalRounds: number;
  gameTime: number;
}

export interface RoundEndEvent {
  roundNumber: number;
  scores: ScoreEntry[];
  gameTime: number;
}

export interface GameEndEvent {
  scores: ScoreEntry[];
  winner: import("../models/BasePlayer").BasePlayer | null;
  totalRounds: number;
}

export interface VampireBloodlustEvent {
  vampire: import("../models/BasePlayer").BasePlayer;
  active: boolean;
  timeRemaining?: number;
}

export interface ModeEvent {
  modeName: string;
  eventType: string;
  data: Record<string, any>;
}
