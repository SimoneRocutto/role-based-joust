export type { PlayerState, StatusEffectInfo, RoleInfo } from "@shared/types";

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
