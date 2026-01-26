import { ScoreEntry } from ".";

export interface GameTickPlayerState {
  id: string;
  name: string;
  isAlive: boolean;
  accumulatedDamage: number;
  points: number;
  totalPoints: number;
  toughness: number;
  isDisconnected: boolean;
  disconnectedAt: number | null;
  graceTimeRemaining: number;
}

export interface GameTickEvent {
  gameTime: number;
  players: GameTickPlayerState[];
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

export interface CountdownEvent {
  secondsRemaining: number;
  totalSeconds: number;
  phase: "countdown" | "go";
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
