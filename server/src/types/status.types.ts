export interface StatusEffectConfig {
  duration?: number | null;
  [key: string]: any;
}

export type StatusEffectConstructor = new (
  target: import("../models/BasePlayer").BasePlayer,
  duration: number | null,
  ...args: any[]
) => import("../models/StatusEffect").StatusEffect;
