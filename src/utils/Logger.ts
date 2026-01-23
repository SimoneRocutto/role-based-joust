import * as fs from "fs";
import * as path from "path";
import type {
  LogLevel,
  LogCategory,
  LogEntry,
  LogFilter,
} from "@/types/logger.types";
import type { BasePlayer } from "@/models/BasePlayer";
import type { StatusEffect } from "@/models/StatusEffect";

/**
 * Logger - Singleton logging system
 *
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Categorized logs (PLAYER, STATUS, GAME, etc.)
 * - Console output with colors
 * - Optional file output
 * - Filtering and querying
 * - Export functionality
 */
export class Logger {
  private static instance: Logger;

  private logs: LogEntry[] = [];
  private logLevel: LogLevel;
  private logToFile: boolean;
  private logFilePath: string;

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private readonly colors: Record<LogLevel, string> = {
    debug: "\x1b[36m", // Cyan
    info: "\x1b[32m", // Green
    warn: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
  };

  private readonly reset = "\x1b[0m";

  private constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
    this.logToFile = process.env.LOG_TO_FILE === "true";
    this.logFilePath = path.join(process.cwd(), "logs", "game.log");

    if (this.logToFile) {
      this.ensureLogDirectory();
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private ensureLogDirectory(): void {
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatMessage(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data: Record<string, any>
  ): LogEntry {
    const gameEngine = (global as any).gameEngine;
    const gameTime = gameEngine ? gameEngine.gameTime : 0;

    return {
      timestamp: new Date().toISOString(),
      gameTime,
      level,
      category,
      message,
      data,
    };
  }

  private writeToConsole(entry: LogEntry): void {
    const color = this.colors[entry.level];
    const consoleMessage = `${color}[${entry.gameTime}ms] [${entry.category}] ${entry.message}${this.reset}`;

    const hasData = Object.keys(entry.data).length > 0;
    if (hasData) {
      console.log(consoleMessage, entry.data);
    } else {
      console.log(consoleMessage);
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (this.logToFile) {
      try {
        fs.appendFileSync(
          this.logFilePath,
          JSON.stringify(entry) + "\n",
          "utf8"
        );
      } catch (error) {
        console.error("Failed to write to log file:", error);
      }
    }
  }

  /**
   * Main log method
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data: Record<string, any> = {}
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatMessage(level, category, message, data);
    this.logs.push(entry);

    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  /**
   * Convenience methods for each log level
   */
  debug(
    category: LogCategory,
    message: string,
    data: Record<string, any> = {}
  ): void {
    this.log("debug", category, message, data);
  }

  info(
    category: LogCategory,
    message: string,
    data: Record<string, any> = {}
  ): void {
    this.log("info", category, message, data);
  }

  warn(
    category: LogCategory,
    message: string,
    data: Record<string, any> = {}
  ): void {
    this.log("warn", category, message, data);
  }

  error(
    category: LogCategory,
    message: string,
    data: Record<string, any> = {}
  ): void {
    this.log("error", category, message, data);
  }

  /**
   * Specialized logging methods
   */
  logPlayerAction(
    player: BasePlayer,
    action: string,
    details: Record<string, any> = {}
  ): void {
    this.info("PLAYER", `${player.name} - ${action}`, {
      playerId: player.id,
      role: player.constructor.name,
      isAlive: player.isAlive,
      points: player.points,
      ...details,
    });
  }

  logStatusEffect(
    player: BasePlayer,
    effect: StatusEffect,
    action: string,
    details: Record<string, any> = {}
  ): void {
    this.info(
      "STATUS",
      `${player.name} - ${action} ${effect.constructor.name}`,
      {
        playerId: player.id,
        effectId: effect.id,
        priority: effect.priority,
        ...details,
      }
    );
  }

  logGameEvent(event: string, details: Record<string, any> = {}): void {
    this.info("GAME", event, details);
  }

  logRoleAbility(
    player: BasePlayer,
    ability: string,
    details: Record<string, any> = {}
  ): void {
    this.debug(
      "ABILITY",
      `${player.name} (${player.constructor.name}) - ${ability}`,
      details
    );
  }

  /**
   * Query and filter logs
   */
  getLogs(filter: LogFilter = {}): LogEntry[] {
    let filtered = [...this.logs];

    if (filter.level) {
      filtered = filtered.filter((log) => log.level === filter.level);
    }

    if (filter.category) {
      filtered = filtered.filter((log) => log.category === filter.category);
    }

    if (filter.playerId) {
      filtered = filtered.filter(
        (log) => log.data.playerId === filter.playerId
      );
    }

    if (filter.since !== undefined) {
      filtered = filtered.filter((log) => log.gameTime >= filter.since!);
    }

    return filtered;
  }

  /**
   * Export logs to file
   */
  exportLogs(filename: string): void {
    const filepath = path.join(process.cwd(), "logs", filename);
    fs.writeFileSync(filepath, JSON.stringify(this.logs, null, 2), "utf8");
    this.info("GAME", `Logs exported to ${filepath}`);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Generate summary of logs
   */
  generateSummary(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    timeRange: { start: number; end: number };
  } {
    const summary = {
      totalLogs: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      timeRange: {
        start: this.logs[0]?.gameTime || 0,
        end: this.logs[this.logs.length - 1]?.gameTime || 0,
      },
    };

    this.logs.forEach((log) => {
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
      summary.byCategory[log.category] =
        (summary.byCategory[log.category] || 0) + 1;
    });

    return summary;
  }
}
