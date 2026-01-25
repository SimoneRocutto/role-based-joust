export type BotBehavior =
  | "random"
  | "aggressive"
  | "defensive"
  | "idle"
  | "chaotic";

export interface BotConfig {
  behavior: BotBehavior;
  autoPlayEnabled: boolean;
}

export type BotAction = "shake" | "still" | "die" | "damage";
