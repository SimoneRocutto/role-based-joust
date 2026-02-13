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
  player: PlayerState;
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
