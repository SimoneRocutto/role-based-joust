export interface MovementData {
  x: number;
  y: number;
  z: number;
  intensity?: number;
  timestamp: number;
}

export interface PlayerData {
  id: string;
  name: string;
  number: number;
  socketId: string;
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
