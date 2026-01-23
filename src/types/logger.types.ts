export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogCategory =
  | "PLAYER"
  | "STATUS"
  | "GAME"
  | "ABILITY"
  | "DAMAGE"
  | "MOVEMENT"
  | "MODE"
  | "SOCKET"
  | "HTTP"
  | "SERVER";

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
