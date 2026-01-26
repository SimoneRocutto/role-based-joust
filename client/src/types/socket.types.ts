import type { PlayerState, RoleInfo } from "./player.types";
import type { ScoreEntry } from "./game.types";

// Client → Server Events
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

// Server → Client Events
export interface PlayerJoinedPayload {
  success: boolean;
  playerId: string;
  playerNumber: number;
  socketId: string;
  sessionToken: string;
  name: string;
}

export interface PlayerReconnectedPayload {
  success: boolean;
  playerId: string;
  player: PlayerState;
}

export interface GameTickPlayerState {
  id: string;
  name: string;
  isAlive: boolean;
  accumulatedDamage: number;
  points: number;
  totalPoints: number;
  toughness: number;
}

export interface GameTickPayload {
  gameTime: number;
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
  scores: ScoreEntry[];
  gameTime: number;
}

export interface GameEndPayload {
  winner: {
    id: string;
    name: string;
    number: number;
  } | null;
  scores: ScoreEntry[];
  totalRounds: number;
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
