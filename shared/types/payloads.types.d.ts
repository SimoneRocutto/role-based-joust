/**
 * Socket event payload types — shared between server and client.
 *
 * These define the exact shape of every socket.io message on the wire.
 */

import type {
  PlayerState,
  RoleInfo,
  GameTickPlayerState,
  ClientScoreEntry,
  TeamScore,
  ChargeInfo,
  BaseState,
} from "./common.types";

// ---------------------------------------------------------------------------
// Client → Server
// ---------------------------------------------------------------------------

export interface PlayerJoinPayload {
  playerId: string;
  name: string;
}

export interface PlayerMovePayload {
  playerId: string;
  x: number;
  y: number;
  z: number;
  timestamp: number;
  deviceType?: "phone" | "joycon" | "custom";
}

export interface PlayerReconnectPayload {
  token: string;
  socketId: string;
}

// ---------------------------------------------------------------------------
// Server → Client
// ---------------------------------------------------------------------------

export interface PlayerJoinedPayload {
  success: boolean;
  playerId: string;
  playerNumber: number;
  socketId: string;
  sessionToken: string;
  name: string;
  teamId?: number | null;
}

export interface PlayerReconnectedPayload {
  success: boolean;
  playerId: string;
  playerNumber: number;
  player: PlayerState;
  gameState: string;
  currentRound: number;
  totalRounds: number;
  mode: string | null;
}

export interface GameTickPayload {
  gameTime: number;
  roundTimeRemaining: number | null;
  players: GameTickPlayerState[];
}

export interface PlayerDeathPayload {
  victimId: string;
  victimName: string;
  victimNumber: number;
  gameTime: number;
}

export interface RoundStartPayload {
  roundNumber: number;
  totalRounds: number;
  gameTime: number;
  gameEvents: string[];
}

export interface RoundEndPayload {
  roundNumber: number;
  scores: ClientScoreEntry[];
  gameTime: number;
  winnerId: string | null;
  teamScores?: TeamScore[] | null;
}

export interface GameStartPayload {
  mode: string;
  totalRounds: number;
  sensitivity: string;
}

export interface GameEndPayload {
  winner: {
    id: string;
    name: string;
    number: number;
  } | null;
  scores: ClientScoreEntry[];
  totalRounds: number;
  teamScores?: TeamScore[] | null;
}

export interface VampireBloodlustPayload {
  vampireId: string;
  vampireName: string;
  vampireNumber: number;
  active: boolean;
}

export interface RoleAssignedPayload extends RoleInfo {}

export interface RoleUpdatedPayload extends RoleInfo {}

export interface SocketErrorPayload {
  message: string;
  code: string;
}

export interface PlayerReadyPayload {
  playerId: string;
  playerName: string;
  playerNumber: number;
  isReady: boolean;
}

export interface ReadyCountPayload {
  ready: number;
  total: number;
}

export interface ModeEventPayload {
  modeName: string;
  eventType: string;
  data: Record<string, any>;
}

export interface ReadyEnabledPayload {
  enabled: boolean;
}

export interface PlayerRespawnPayload {
  playerId: string;
  playerName: string;
  playerNumber: number;
  gameTime: number;
}

export interface PlayerRespawnPendingPayload {
  respawnIn: number;
}

export interface TapResultPayload {
  success: boolean;
  reason?: string;
  charges: ChargeInfo | null;
}

export interface CountdownPayload {
  secondsRemaining: number;
  totalSeconds: number;
  phase: "countdown" | "go";
  roundNumber: number;
  totalRounds: number;
}

// ---------------------------------------------------------------------------
// Domination / Base events
// ---------------------------------------------------------------------------

export interface BaseRegisteredPayload {
  baseId: string;
  baseNumber: number;
  ownerTeamId?: number | null;
  gameState?: string;
}

export interface BaseCapturedPayload {
  baseId: string;
  baseNumber: number;
  teamId: number;
  teamName: string;
  teamColor: string;
}

export interface BasePointPayload {
  baseId: string;
  baseNumber: number;
  teamId: number;
  teamScores: Record<number, number>;
}

export interface BaseStatusPayload {
  bases: BaseState[];
}

export interface DominationWinPayload {
  winningTeamId: number;
  winningTeamName: string;
  teamScores: Record<number, number>;
}

export interface PlayerDamagePayload {
  totalDamage: number;
}
