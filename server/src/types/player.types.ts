export interface PlayerData {
  id: string;
  name: string;
  socketId: string;
  isBot?: boolean;
  behavior?: string;
}

export interface MovementData {
  x: number;
  y: number;
  z: number;
  intensity?: number;
  timestamp: number;
  gameTime?: number;
}

export interface MovementConfig {
  dangerThreshold: number;
  damageMultiplier: number;
  historySize: number;
  smoothingEnabled: boolean;
  oneshotMode: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  role: string;
  isAlive: boolean;
  points: number;
  totalPoints: number;
  toughness: number;
  statusEffects: StatusEffectInfo[];
}

export interface StatusEffectInfo {
  type: string;
  priority: number;
  timeLeft: number | null;
}
