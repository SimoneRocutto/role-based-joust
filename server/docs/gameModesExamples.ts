// ============================================================================
// src/models/BasePlayer.ts - FOUNDATION CLASS
// ============================================================================

import type {
  PlayerData,
  MovementData,
  MovementConfig,
} from "../types/player.types";
import type { StatusEffect } from "./StatusEffect";
import { Logger } from "../utils/Logger";
import { gameConfig } from "../config/gameConfig";

const logger = Logger.getInstance();

export abstract class BasePlayer {
  // Identity
  readonly id: string;
  readonly name: string;
  socketId: string;

  // Game state
  isAlive: boolean = true;
  points: number = 0;
  totalPoints: number = 0;
  toughness: number = 1.0;

  // Movement
  lastMovementData: MovementData | null = null;
  movementHistory: MovementData[] = [];
  readonly historySize: number;
  movementConfig: MovementConfig;

  // Damage
  readonly deathThreshold: number;
  accumulatedDamage: number = 0;
  isInvulnerable: boolean = false;

  // Status effects
  statusEffects: Map<string, StatusEffect> = new Map();

  // Priority
  readonly priority: number;
  static priority: number = 0;

  constructor(data: PlayerData) {
    this.id = data.id;
    this.name = data.name;
    this.socketId = data.socketId;
    this.historySize = gameConfig.movement.historySize;
    this.movementConfig = { ...gameConfig.movement };
    this.deathThreshold = gameConfig.damage.baseThreshold;
    this.priority = (this.constructor as typeof BasePlayer).priority;
  }

  // ========== MOVEMENT PROCESSING ==========

  updateMovement(movementData: MovementData, gameTime: number): void {
    this.lastMovementData = movementData;

    this.movementHistory.push({ ...movementData, gameTime });
    if (this.movementHistory.length > this.historySize) {
      this.movementHistory.shift();
    }

    const intensity = this.calculateIntensity(movementData);
    movementData.intensity = intensity;

    const sortedEffects = this.getSortedStatusEffects();
    for (const effect of sortedEffects) {
      if (typeof effect.onMovement === "function") {
        effect.onMovement(gameTime, intensity);
      }
    }

    this.checkMovementDamage(intensity, gameTime);
  }

  protected calculateIntensity(movementData: MovementData): number {
    if (this.movementConfig.smoothingEnabled) {
      return this.calculateSmoothedIntensity();
    }
    return this.calculateInstantIntensity(movementData);
  }

  private calculateInstantIntensity(data: MovementData): number {
    const { x, y, z } = data;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const normalized = magnitude / 17.32;
    return Math.min(normalized, 1.0);
  }

  private calculateSmoothedIntensity(): number {
    if (this.movementHistory.length === 0) return 0;

    const sum = this.movementHistory.reduce((acc, data) => {
      const { x, y, z } = data;
      return acc + Math.sqrt(x * x + y * y + z * z);
    }, 0);

    const avg = sum / this.movementHistory.length;
    return Math.min(avg / 17.32, 1.0);
  }

  protected checkMovementDamage(intensity: number, gameTime: number): void {
    const threshold = this.movementConfig.dangerThreshold;

    if (intensity > threshold) {
      const excess = intensity - threshold;
      const baseDamage = excess * this.movementConfig.damageMultiplier;

      logger.debug("MOVEMENT", `${this.name} excessive`, {
        intensity,
        threshold,
        excess,
        baseDamage,
      });

      this.takeDamage(baseDamage, gameTime);
    }
  }

  // ========== DAMAGE SYSTEM ==========

  takeDamage(baseDamage: number, gameTime: number): void {
    if (!this.isAlive) return;

    let finalDamage = baseDamage;

    const sorted = this.getSortedStatusEffects();
    for (const effect of sorted) {
      if (typeof effect.modifyIncomingDamage === "function") {
        finalDamage = effect.modifyIncomingDamage(finalDamage);
        if (finalDamage === 0) break;
      }
    }

    const actual = finalDamage / this.toughness;

    logger.logPlayerAction(this, "TOOK_DAMAGE", {
      baseDamage,
      finalDamage,
      actual,
      toughness: this.toughness,
    });

    if (actual >= this.deathThreshold && !this.isInvulnerable) {
      this.beforeDeath(gameTime);
    }
  }

  // ========== STATUS EFFECT MANAGEMENT ==========

  applyStatusEffect<T extends StatusEffect>(
    EffectClass: new (
      target: BasePlayer,
      duration: number | null,
      ...args: any[]
    ) => T,
    gameTime: number,
    duration: number | null,
    ...args: any[]
  ): T {
    const type = EffectClass.name;
    const existing = this.getStatusEffectByType(type);

    if (existing) {
      existing.onRefresh(gameTime, duration ?? undefined);
      return existing as T;
    }

    const effect = new EffectClass(this, duration, ...args);
    effect.onApply(gameTime);
    this.statusEffects.set(effect.id, effect);

    logger.logStatusEffect(this, effect, "APPLIED", { duration });
    return effect;
  }

  removeStatusEffect(id: string, gameTime: number): void {
    const effect = this.statusEffects.get(id);
    if (effect) {
      effect.onRemove(gameTime);
      this.statusEffects.delete(id);
      logger.logStatusEffect(this, effect, "REMOVED");
    }
  }

  getSortedStatusEffects(): StatusEffect[] {
    return Array.from(this.statusEffects.values()).sort(
      (a, b) => b.priority - a.priority
    );
  }

  hasStatusEffect(EffectClass: new (...args: any[]) => StatusEffect): boolean {
    return this.getStatusEffectByType(EffectClass.name) !== null;
  }

  getStatusEffectByType(type: string): StatusEffect | null {
    for (const effect of this.statusEffects.values()) {
      if (effect.constructor.name === type) return effect;
    }
    return null;
  }

  clearStatusEffects(gameTime: number): void {
    this.statusEffects.forEach((effect, id) => {
      this.removeStatusEffect(id, gameTime);
    });
  }

  // ========== LIFECYCLE HOOKS ==========

  onInit(gameTime: number): void {
    logger.logPlayerAction(this, "INIT", { role: this.constructor.name });
  }

  onTick(gameTime: number, deltaTime: number): void {
    const sorted = this.getSortedStatusEffects();

    for (const effect of sorted) {
      if (!this.isAlive) break;

      effect.onTick(gameTime, deltaTime);

      if (effect.shouldExpire(gameTime)) {
        this.removeStatusEffect(effect.id, gameTime);
      }
    }
  }

  beforeDeath(gameTime: number): void {
    const sorted = this.getSortedStatusEffects();

    for (const effect of sorted) {
      if (typeof effect.onPreventDeath === "function") {
        if (effect.onPreventDeath(gameTime)) {
          logger.info(
            "DEATH",
            `${this.name} prevented by ${effect.constructor.name}`
          );
          return;
        }
      }
    }

    this.die(gameTime);
  }

  die(gameTime: number): void {
    if (!this.isAlive) return;
    this.isAlive = false;

    logger.logPlayerAction(this, "DIED", {
      points: this.points,
      activeEffects: Array.from(this.statusEffects.keys()),
    });

    const sorted = this.getSortedStatusEffects();
    for (const effect of sorted) {
      if (typeof effect.onPlayerDeath === "function") {
        effect.onPlayerDeath(gameTime);
      }
    }

    this.onDeath(gameTime);

    const { GameEvents } = require("../utils/GameEvents");
    GameEvents.getInstance().emit("player:death", { victim: this, gameTime });
  }

  onDeath(gameTime: number): void {}

  onPlayerDeath(victim: BasePlayer, gameTime: number): void {}

  addPoints(amount: number, reason: string = ""): void {
    this.points += amount;
    logger.logPlayerAction(this, "POINTS", {
      amount,
      total: this.points,
      reason,
    });
  }
}

// ============================================================================
// src/gameModes/GameMode.ts - BASE CLASS
// ============================================================================

import type { GameEngine } from "../managers/GameEngine";
import type { BasePlayer } from "../models/BasePlayer";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance();

export interface WinCondition {
  roundEnded: boolean;
  gameEnded: boolean;
  winner: BasePlayer | null;
}

export interface ScoreEntry {
  player: BasePlayer;
  score: number;
  rank: number;
  status: string;
}

export abstract class GameMode {
  // Metadata
  name: string = "Base Game Mode";
  description: string = "Base game mode";
  minPlayers: number = 2;
  maxPlayers: number = 20;

  // Configuration
  useRoles: boolean = false;
  multiRound: boolean = false;
  roundCount: number = 1;
  roundDuration: number | null = null;

  // Abstract methods - must implement
  abstract getRolePool(playerCount: number): string[];
  abstract checkWinCondition(engine: GameEngine): WinCondition;
  abstract calculateFinalScores(engine: GameEngine): ScoreEntry[];

  // Hook methods - optional override
  onModeSelected(engine: GameEngine): void {
    logger.info("MODE", `${this.name} selected`);
  }

  onRoundStart(engine: GameEngine, roundNumber: number): void {
    logger.info("MODE", `${this.name} round ${roundNumber} starting`);
  }

  onPlayerJoin(player: BasePlayer, engine: GameEngine): void {}

  onTick(engine: GameEngine, gameTime: number): void {}

  onPlayerMove(
    player: BasePlayer,
    intensity: number,
    engine: GameEngine
  ): void {}

  onPlayerDamage(
    player: BasePlayer,
    damage: number,
    engine: GameEngine
  ): void {}

  onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {}

  onRoundEnd(engine: GameEngine): void {
    logger.info("MODE", `${this.name} round ended`);
  }

  validate(playerCount: number): { valid: boolean; message?: string } {
    if (playerCount < this.minPlayers) {
      return {
        valid: false,
        message: `Requires at least ${this.minPlayers} players`,
      };
    }
    if (playerCount > this.maxPlayers) {
      return { valid: false, message: `Maximum ${this.maxPlayers} players` };
    }
    return { valid: true };
  }

  getInfo(): ModeInfo {
    return {
      name: this.name,
      description: this.description,
      minPlayers: this.minPlayers,
      maxPlayers: this.maxPlayers,
      useRoles: this.useRoles,
      multiRound: this.multiRound,
      roundCount: this.roundCount,
    };
  }
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

// ============================================================================
// src/gameModes/ClassicMode.ts
// ============================================================================

import { GameMode, type WinCondition, type ScoreEntry } from "./GameMode";
import type { GameEngine } from "../managers/GameEngine";
import type { BasePlayer } from "../models/BasePlayer";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance();

export class ClassicMode extends GameMode {
  override name = "Classic";
  override description = "Pure movement survival. Last player standing wins!";
  override useRoles = false;
  override multiRound = false;

  getRolePool(playerCount: number): string[] {
    return []; // No roles
  }

  onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    const alive = engine.players.filter((p) => p.isAlive);
    logger.info(
      "MODE",
      `${victim.name} eliminated. ${alive.length} remaining.`
    );
  }

  checkWinCondition(engine: GameEngine): WinCondition {
    const alive = engine.players.filter((p) => p.isAlive);

    if (alive.length === 1) {
      return {
        roundEnded: true,
        gameEnded: true,
        winner: alive[0],
      };
    }

    if (alive.length === 0) {
      return {
        roundEnded: true,
        gameEnded: true,
        winner: null,
      };
    }

    return { roundEnded: false, gameEnded: false, winner: null };
  }

  calculateFinalScores(engine: GameEngine): ScoreEntry[] {
    return engine.players.map((p) => ({
      player: p,
      score: p.isAlive ? 1 : 0,
      rank: p.isAlive ? 1 : 2,
      status: p.isAlive ? "Winner" : "Eliminated",
    }));
  }
}

// ============================================================================
// src/gameModes/RoleBasedMode.ts
// ============================================================================

import { GameMode, type WinCondition, type ScoreEntry } from "./GameMode";
import type { GameEngine } from "../managers/GameEngine";
import type { BasePlayer } from "../models/BasePlayer";
import { roleThemes } from "../config/roleThemes";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance();

export class RoleBasedMode extends GameMode {
  override name = "Role Based";
  override description =
    "Unique abilities. Earn points across multiple rounds!";
  override useRoles = true;
  override multiRound = true;
  override roundCount = 3;

  protected roleTheme: string;

  constructor(roleTheme: string = "standard") {
    super();
    this.roleTheme = roleTheme;
    this.description = `${this.description} Using ${roleTheme} roles.`;
  }

  getRolePool(playerCount: number): string[] {
    const theme = roleThemes[this.roleTheme];

    if (!theme) {
      logger.warn(
        "MODE",
        `Theme '${this.roleTheme}' not found, using standard`
      );
      return roleThemes.standard;
    }

    const pool: string[] = [];
    while (pool.length < playerCount) {
      pool.push(...theme);
    }

    return pool.slice(0, playerCount);
  }

  onRoundStart(engine: GameEngine, roundNumber: number): void {
    super.onRoundStart(engine, roundNumber);
    logger.info("MODE", `Round ${roundNumber}/${this.roundCount} starting`);
  }

  onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    const alive = engine.players.filter((p) => p.isAlive);
    logger.info(
      "MODE",
      `${victim.name} (${victim.constructor.name}) eliminated`
    );

    if (alive.length === 1) {
      const [winner] = alive;
      winner.addPoints(5, "last_standing");
      logger.info("MODE", `${winner.name} is last standing! +5 points`);
    }
  }

  checkWinCondition(engine: GameEngine): WinCondition {
    const alive = engine.players.filter((p) => p.isAlive);

    if (alive.length <= 1) {
      const roundEnded = true;
      const gameEnded = engine.currentRound >= this.roundCount;

      return { roundEnded, gameEnded, winner: null };
    }

    return { roundEnded: false, gameEnded: false, winner: null };
  }

  onRoundEnd(engine: GameEngine): void {
    super.onRoundEnd(engine);

    engine.players.forEach((p) => {
      p.totalPoints = (p.totalPoints || 0) + p.points;
    });

    const roundScores = [...engine.players]
      .sort((a, b) => b.points - a.points)
      .map((p) => `${p.name}: ${p.points}pts`);

    logger.info("MODE", `Round scores: ${roundScores.join(", ")}`);
  }

  calculateFinalScores(engine: GameEngine): ScoreEntry[] {
    const sorted = [...engine.players].sort(
      (a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)
    );

    return sorted.map((p, i) => ({
      player: p,
      score: p.totalPoints || 0,
      rank: i + 1,
      status: i === 0 ? "Champion" : `Rank ${i + 1}`,
    }));
  }

  override getInfo(): ModeInfo & { roleTheme: string } {
    return {
      ...super.getInfo(),
      roleTheme: this.roleTheme,
    };
  }
}

// ============================================================================
// src/gameModes/HalloweenMode.ts
// ============================================================================

import { RoleBasedMode } from "./RoleBasedMode";
import type { GameEngine } from "../managers/GameEngine";
import type { BasePlayer } from "../models/BasePlayer";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance();

interface HalloweenEvent {
  name: string;
  time: number;
}

export class HalloweenMode extends RoleBasedMode {
  override name = "Halloween Night";
  override description =
    "🎃 Spooky themed roles with special Halloween events!";

  private nextEventTime: number = 30000;
  private readonly eventInterval: number = 45000;
  private eventHistory: HalloweenEvent[] = [];

  constructor() {
    super("halloween");
  }

  override onModeSelected(engine: GameEngine): void {
    super.onModeSelected(engine);
    logger.info("MODE", "🎃 Welcome to Halloween Night!");
  }

  override onRoundStart(engine: GameEngine, roundNumber: number): void {
    super.onRoundStart(engine, roundNumber);
    this.nextEventTime = 30000;
    this.eventHistory = [];
    logger.info("MODE", "🌙 The moon rises... strange things await...");
  }

  override onTick(engine: GameEngine, gameTime: number): void {
    super.onTick(engine, gameTime);

    if (gameTime >= this.nextEventTime) {
      this.triggerHalloweenEvent(engine, gameTime);
      this.nextEventTime = gameTime + this.eventInterval;
    }
  }

  private triggerHalloweenEvent(engine: GameEngine, gameTime: number): void {
    const events = [
      { name: "Full Moon", fn: this.fullMoonEvent },
      { name: "Fog Rolls In", fn: this.fogEvent },
      { name: "Candy Rush", fn: this.candyRushEvent },
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    this.eventHistory.push({ name: event.name, time: gameTime });

    logger.info("MODE", `🎃 Halloween Event: ${event.name}`);
    event.fn.call(this, engine, gameTime);
  }

  private fullMoonEvent(engine: GameEngine, gameTime: number): void {
    logger.info("MODE", "🌕 The full moon empowers werewolves!");
    // Implementation depends on Werewolf role existing
  }

  private fogEvent(engine: GameEngine, gameTime: number): void {
    logger.info("MODE", "🌫️ Thick fog! Movement is harder to judge!");

    engine.players.forEach((p) => {
      if (p.isAlive) {
        const original = p.movementConfig.dangerThreshold;
        p.movementConfig.dangerThreshold = original * 0.8;

        setTimeout(() => {
          p.movementConfig.dangerThreshold = original;
        }, 10000);
      }
    });
  }

  private candyRushEvent(engine: GameEngine, gameTime: number): void {
    logger.info("MODE", "🍬 Sugar rush! All players gain hyperactive status!");

    engine.players.forEach((p) => {
      if (p.isAlive) {
        const original = p.movementConfig.dangerThreshold;
        p.movementConfig.dangerThreshold = original * 1.3;

        setTimeout(() => {
          p.movementConfig.dangerThreshold = original;
        }, 8000);
      }
    });
  }

  override onRoundEnd(engine: GameEngine): void {
    super.onRoundEnd(engine);
    const events = this.eventHistory.map((e) => e.name).join(", ");
    logger.info("MODE", `Halloween events this round: ${events}`);
  }
}

// ============================================================================
// src/managers/GameEngine.ts
// ============================================================================

import type { BasePlayer } from "../models/BasePlayer";
import type { PlayerData } from "../types/player.types";
import type { GameMode, WinCondition, ScoreEntry } from "../gameModes/GameMode";
import { RoleFactory } from "../factories/RoleFactory";
import { GameEvents } from "../utils/GameEvents";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export type GameState = "waiting" | "active" | "round-ended" | "finished";

export class GameEngine {
  players: BasePlayer[] = [];
  currentMode: GameMode | null = null;
  currentRound: number = 0;
  gameState: GameState = "waiting";
  gameTime: number = 0;
  readonly tickRate: number = 100;
  private gameLoop: NodeJS.Timeout | null = null;
  testMode: boolean = false;

  setGameMode(mode: GameMode): void {
    this.currentMode = mode;
    this.currentMode.onModeSelected(this);

    logger.info("GAME", `Game mode set: ${mode.name}`, {
      description: mode.description,
      useRoles: mode.useRoles,
      rounds: mode.roundCount,
    });
  }

  startGame(playerData: PlayerData[]): void {
    if (!this.currentMode) {
      throw new Error("Game mode must be set before starting");
    }

    const validation = this.currentMode.validate(playerData.length);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const rolePool = this.currentMode.getRolePool(playerData.length);

    if (rolePool.length > 0) {
      this.players = RoleFactory.getInstance().assignRoles(playerData, {
        pool: rolePool,
      });
    } else {
      const { BasePlayer } = require("../models/BasePlayer");
      this.players = playerData.map((d) => new BasePlayer(d));
    }

    this.currentRound = 1;
    this.startRound();
  }

  private startRound(): void {
    this.gameTime = 0;

    this.players.forEach((p) => {
      p.isAlive = true;
      p.points = 0;
      p.clearStatusEffects(0);
      p.onInit(0);
    });

    if (this.currentMode) {
      this.currentMode.onRoundStart(this, this.currentRound);
    }

    this.gameState = "active";
    this.startGameLoop();
  }

  private startGameLoop(): void {
    this.gameLoop = setInterval(() => {
      this.gameTime += this.tickRate;

      if (this.currentMode) {
        this.currentMode.onTick(this, this.gameTime);
      }

      const sorted = this.getSortedPlayers();
      for (const player of sorted) {
        if (player.isAlive) {
          player.onTick(this.gameTime, this.tickRate);
        }
      }

      gameEvents.emit("game:tick", { gameTime: this.gameTime });

      if (this.currentMode) {
        const condition = this.currentMode.checkWinCondition(this);
        if (condition.roundEnded) {
          this.endRound(condition);
        }
      }
    }, this.tickRate);
  }

  getSortedPlayers(): BasePlayer[] {
    return [...this.players].sort((a, b) => b.priority - a.priority);
  }

  private endRound(condition: WinCondition): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }

    this.gameState = "round-ended";

    if (this.currentMode) {
      this.currentMode.onRoundEnd(this);
    }

    if (condition.gameEnded) {
      this.endGame();
    } else {
      this.currentRound++;
      setTimeout(() => this.startRound(), 3000);
    }
  }

  private endGame(): void {
    this.gameState = "finished";

    const finalScores = this.currentMode?.calculateFinalScores(this) || [];

    logger.logGameEvent("GAME_END", {
      mode: this.currentMode?.name,
      winner: finalScores[0]?.player.name,
      scores: finalScores,
    });

    gameEvents.emit("game:end", { scores: finalScores });
  }
}

// ============================================================================
// src/config/roleThemes.ts
// ============================================================================

export interface RoleThemes {
  [themeName: string]: string[];
}

export const roleThemes: RoleThemes = {
  standard: ["vampire", "beast", "beastHunter", "angel", "berserker"],

  halloween: ["witch", "werewolf", "ghost", "zombie", "vampire"],

  mafia: ["godfather", "detective", "doctor", "civilian", "hitman"],
};

// ============================================================================
// src/factories/GameModeFactory.ts
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import type { GameMode, ModeInfo } from "../gameModes/GameMode";

type ModeConstructor = new (...args: any[]) => GameMode;

export class GameModeFactory {
  private static instance: GameModeFactory;
  private modeRegistry: Map<string, ModeConstructor> = new Map();
  private modesDir: string;

  private constructor() {
    this.modesDir = path.join(__dirname, "../gameModes");
    this.loadModes();
  }

  static getInstance(): GameModeFactory {
    if (!GameModeFactory.instance) {
      GameModeFactory.instance = new GameModeFactory();
    }
    return GameModeFactory.instance;
  }

  private loadModes(): void {
    if (!fs.existsSync(this.modesDir)) {
      console.warn(`Game modes directory not found: ${this.modesDir}`);
      return;
    }

    const files = fs
      .readdirSync(this.modesDir)
      .filter((f) => f.endsWith(".ts") && f !== "GameMode.ts");

    files.forEach((file) => {
      try {
        const ModeClass =
          require(path.join(this.modesDir, file)).default ||
          require(path.join(this.modesDir, file));

        const instance = new ModeClass();
        const key = this.normalizeModeName(instance.name);

        this.modeRegistry.set(key, ModeClass);
        console.log(`✓ Loaded game mode: ${instance.name} (${key})`);
      } catch (err) {
        console.error(
          `Failed to load game mode ${file}:`,
          (err as Error).message
        );
      }
    });

    console.log(`Loaded ${this.modeRegistry.size} game modes total`);
  }

  private normalizeModeName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, "-");
  }

  createMode(modeName: string, ...args: any[]): GameMode {
    const key = this.normalizeModeName(modeName);
    const ModeClass = this.modeRegistry.get(key);

    if (!ModeClass) {
      throw new Error(`Game mode '${modeName}' not found`);
    }

    return new ModeClass(...args);
  }

  getAvailableModes(): Array<ModeInfo & { key: string }> {
    return Array.from(this.modeRegistry.entries()).map(([key, ModeClass]) => {
      const instance = new ModeClass();
      return {
        key,
        ...instance.getInfo(),
      };
    });
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Classic Mode
import { GameEngine } from './managers/GameEngine';
import { GameModeFactory } from './factories/GameModeFactory';

const engine = new GameEngine();
const factory = GameModeFactory.getInstance();

const classicMode = factory.createMode('classic');
engine.setGameMode(classicMode);
engine.startGame(players);

// Example 2: Role-Based with Standard Roles
const roleMode = factory.createMode('role-based', 'standard');
engine.setGameMode(roleMode);
engine.startGame(players);

// Example 3: Halloween Event
const halloweenMode = factory.createMode('halloween-night');
engine.setGameMode(halloweenMode);
engine.startGame(players);

// Example 4: List Available Modes
const modes = factory.getAvailableModes();
console.log('Available modes:', modes);
*/
