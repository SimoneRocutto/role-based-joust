export type { PlayerState, StatusEffectInfo } from "@shared/types";

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
