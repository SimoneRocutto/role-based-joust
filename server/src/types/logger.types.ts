export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogCategory =
  | "APP"
  | "PLAYER"
  | "STATUS"
  | "GAME"
  | "ABILITY"
  | "DAMAGE"
  | "DEATH"
  | "MOVEMENT"
  | "MODE"
  | "SOCKET"
  | "INPUT"
  | "DEBUG"
  | "ENGINE"
  | "FACTORY"
  | "CONNECTION"
  | "STATE"
  | "EFFECT_MANAGER"
  | "HTTP"
  | "ERROR"
  | "SERVER"
  | "ANGEL"
  | "EVENT_MGR"
  | "SPEED_SHIFT";

export interface LogEntry {
  timestamp: string;
  gameTime: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data: Record<string, any>;
}

export interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  playerId?: string;
  since?: number;
}
