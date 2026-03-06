export type BotBehavior =
  | "random"
  | "aggressive"
  | "defensive"
  | "idle"
  | "chaotic"
  | "still";

export interface BotConfig {
  behavior: BotBehavior;
  autoPlayEnabled: boolean;
}

export type BotAction = "shake" | "still" | "die" | "damage";
