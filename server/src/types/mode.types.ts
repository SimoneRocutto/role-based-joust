export interface ModeConfig {
  useRoles: boolean;
  multiRound: boolean;
  roundCount: number;
  roundDuration: number | null;
}

export interface ModeInfo {
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  useRoles: boolean;
  multiRound: boolean;
  roundCount: number;
}

export type RoleTheme = string[];

export interface RoleAssignmentConfig {
  pool?: string[];
  theme?: string;
  custom?: boolean;
}
