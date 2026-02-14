import { ScoreEntry } from ".";

export type { GameTickPlayerState } from "@shared/types";
export type { GameTickPayload as GameTickEvent } from "@shared/types";

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
  winnerId?: string | null;
}

export interface GameStartEvent {
  mode: string;
  totalRounds: number;
  sensitivity: string;
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

export interface CountdownEvent {
  secondsRemaining: number;
  totalSeconds: number;
  phase: "countdown" | "go";
  roundNumber: number;
  totalRounds: number;
}

export interface PlayerReadyEvent {
  playerId: string;
  playerName: string;
  playerNumber: number;
  isReady: boolean;
}

export interface ReadyCountEvent {
  ready: number;
  total: number;
}

export interface ReadyEnabledEvent {
  enabled: boolean;
}

export interface PlayerRespawnEvent {
  player: import("../models/BasePlayer").BasePlayer;
  gameTime: number;
}

export interface PlayerRespawnPendingEvent {
  player: import("../models/BasePlayer").BasePlayer;
  respawnIn: number;
}
