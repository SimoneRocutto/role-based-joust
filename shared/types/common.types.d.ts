/**
 * Shared types — single source of truth for server ↔ client wire format.
 *
 * These types describe what travels over the network (socket.io / REST).
 * Server-internal types (with BasePlayer refs, etc.) stay in server/src/types/.
 */

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export type GameStateType =
  | "waiting"
  | "pre-game"
  | "countdown"
  | "active"
  | "round-ended"
  | "finished";

// ---------------------------------------------------------------------------
// Player state (full, as sent in lobby/reconnect snapshots)
// ---------------------------------------------------------------------------

export interface StatusEffectInfo {
  type: string;
  priority: number;
  timeLeft: number | null;
}

export interface RoleInfo {
  name: string;
  displayName: string;
  description: string;
  difficulty: string;
  targetNumber?: number;
  targetName?: string;
}

export interface PlayerState {
  id: string;
  name: string;
  number: number;
  role: string;
  isAlive: boolean;
  points: number;
  totalPoints: number;
  toughness: number;
  accumulatedDamage: number;
  statusEffects: StatusEffectInfo[];
  deathCount?: number;
  isDisconnected?: boolean;
  graceTimeRemaining?: number;
  isReady?: boolean;
  isConnected?: boolean;
  teamId?: number | null;
}

// ---------------------------------------------------------------------------
// Game tick player state (compact, sent every 100ms)
// ---------------------------------------------------------------------------

export interface GameTickPlayerState {
  id: string;
  name: string;
  number: number;
  isAlive: boolean;
  accumulatedDamage: number;
  points: number;
  totalPoints: number;
  toughness: number;
  deathCount: number;
  isDisconnected: boolean;
  disconnectedAt: number | null;
  graceTimeRemaining: number;
  statusEffects: StatusEffectInfo[];
}

// ---------------------------------------------------------------------------
// Scores (wire format — flat, no BasePlayer refs)
// ---------------------------------------------------------------------------

export interface ClientScoreEntry {
  playerId: string;
  playerName: string;
  playerNumber: number;
  score: number;
  roundPoints: number;
  rank: number;
  status: string;
  teamId?: number | null;
  deathCount?: number;
}

export interface TeamScore {
  teamId: number;
  teamName: string;
  teamColor: string;
  score: number;
  roundPoints: number;
  rank: number;
  players: ClientScoreEntry[];
}

// ---------------------------------------------------------------------------
// Base state (Domination mode)
// ---------------------------------------------------------------------------

export interface BaseState {
  baseId: string;
  baseNumber: number;
  ownerTeamId: number | null;
  controlProgress: number; // 0-1, progress toward next point
  isConnected: boolean;
}

// ---------------------------------------------------------------------------
// Ability charges
// ---------------------------------------------------------------------------

export interface ChargeInfo {
  current: number;
  max: number;
  cooldownRemaining: number;
}
