export type RoleConstructor = new (
  data: PlayerData
) => import("../models/BasePlayer").BasePlayer;

export type ModeConstructor = new (
  ...args: any[]
) => import("../gameModes/GameMode").GameMode;
