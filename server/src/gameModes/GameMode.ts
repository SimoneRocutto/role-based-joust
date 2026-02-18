import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry, ModeInfo } from "@/types/index";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/GameEvents";
import { GameEventManager } from "@/managers/GameEventManager";
import { GameEventFactory } from "@/factories/GameEventFactory";
import { gameConfig } from "@/config/gameConfig";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

/**
 * Options for creating a game mode instance.
 */
export interface GameModeOptions {
  roundCount?: number;
  roundDuration?: number;
}

/**
 * GameMode - Abstract base class for all game modes
 *
 * Game modes control:
 * - Which roles to use (if any)
 * - Win conditions
 * - Scoring logic
 * - Round structure
 * - Special mechanics
 *
 * Subclasses implement the Strategy pattern to define different game variants.
 */
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
  roundDuration: number | null = null; // null = no time limit

  // Placement scoring
  protected placementBonuses: number[] = gameConfig.scoring.placementBonuses;
  protected deathOrder: BasePlayer[] = [];

  // Game events
  protected eventManager = new GameEventManager();

  constructor(options?: GameModeOptions) {
    if (options?.roundCount !== undefined) {
      this.roundCount = options.roundCount;
      // Enable multiRound if roundCount > 1
      if (this.roundCount > 1) {
        this.multiRound = true;
      }
    }
  }

  // ========================================================================
  // ABSTRACT METHODS - Must implement in subclasses
  // ========================================================================

  /**
   * Get the pool of roles for this mode
   * Return empty array for no roles (classic mode)
   */
  abstract getRolePool(playerCount: number): string[];

  /**
   * Check if the round/game should end
   * Return win condition with winner info
   */
  abstract checkWinCondition(engine: GameEngine): WinCondition;

  /**
   * Calculate final scores at end of game
   * Return sorted array of score entries
   */
  abstract calculateFinalScores(engine: GameEngine): ScoreEntry[];

  // ========================================================================
  // OPTIONAL HOOK METHODS - Override as needed
  // ========================================================================

  /**
   * Called when this mode is selected
   */
  onModeSelected(engine: GameEngine): void {
    logger.info("MODE", `${this.name} selected`, {
      description: this.description,
      useRoles: this.useRoles,
      multiRound: this.multiRound,
      roundCount: this.roundCount,
    });
  }

  /**
   * Called at the start of each round
   */
  onRoundStart(engine: GameEngine, roundNumber: number): void {
    logger.info("MODE", `${this.name} round ${roundNumber} starting`, {
      totalRounds: this.roundCount,
      playerCount: engine.players.length,
    });

    // Reset death tracking
    this.deathOrder = [];

    // Listen for player deaths (round-scoped, auto-cleaned)
    gameEvents.onPlayerDeath((payload) => {
      this.onPlayerDeath(payload.victim, engine);
    });

    // Register game events from subclass configuration
    const factory = GameEventFactory.getInstance();
    for (const eventName of this.getGameEvents()) {
      if (factory.eventExists(eventName)) {
        this.eventManager.registerEvent(factory.createEvent(eventName));
      }
    }
    this.eventManager.onRoundStart(engine, 0);
  }

  /**
   * Called when a player joins (before game starts)
   */
  onPlayerJoin(player: BasePlayer, engine: GameEngine): void {
    // Override if needed
  }

  /**
   * Called every game tick
   */
  onTick(engine: GameEngine, gameTime: number): void {
    this.eventManager.tick(engine, gameTime, engine.tickRate);
  }

  /**
   * Called when a player moves
   */
  onPlayerMove(
    player: BasePlayer,
    intensity: number,
    engine: GameEngine
  ): void {
    // Override if needed
  }

  /**
   * Called when a player takes damage
   */
  onPlayerDamage(player: BasePlayer, damage: number, engine: GameEngine): void {
    // Override if needed
  }

  /**
   * Called when a player dies
   */
  onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    this.deathOrder.push(victim);
    this.eventManager.onPlayerDeath(victim, engine, engine.gameTime);
  }

  /**
   * Called at the end of each round
   */
  onRoundEnd(engine: GameEngine): void {
    this.eventManager.cleanup(engine, engine.gameTime);
    logger.info("MODE", `${this.name} round ended`, {
      currentRound: engine.currentRound,
      totalRounds: this.roundCount,
    });
  }

  /**
   * Called when entire game ends
   */
  onGameEnd(engine: GameEngine): void {
    this.eventManager.cleanup(engine, engine.gameTime);
    logger.info("MODE", `${this.name} game ended`);
  }

  // ========================================================================
  // GAME EVENTS CONFIGURATION
  // ========================================================================

  /**
   * Return the names of game events to register each round.
   * Override in subclasses to opt in to specific events.
   */
  getGameEvents(): string[] {
    return [];
  }

  // ========================================================================
  // PLACEMENT SCORING
  // ========================================================================

  /**
   * Award points based on placement.
   * Alive players share 1st place, then dead players in reverse death order.
   */
  protected awardPlacementBonuses(alive: BasePlayer[]): void {
    let position = 0;

    // Alive players all get 1st place
    for (const player of alive) {
      const bonus =
        player.placementBonusOverrides?.[position] ??
        this.placementBonuses[position] ??
        0;
      if (bonus > 0) {
        player.addPoints(bonus, `placement_${position + 1}`);
        logger.info(
          "MODE",
          `${player.name} placed #${position + 1}! +${bonus} points`
        );
      }
    }

    // Dead players in reverse death order (last to die = 2nd place, etc.)
    position = 1;
    for (let i = this.deathOrder.length - 1; i >= 0; i--) {
      const player = this.deathOrder[i];
      const bonus =
        player.placementBonusOverrides?.[position] ??
        this.placementBonuses[position] ??
        0;
      if (bonus > 0) {
        player.addPoints(bonus, `placement_${position + 1}`);
        logger.info(
          "MODE",
          `${player.name} placed #${position + 1}! +${bonus} points`
        );
      }
      position++;
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get the death count for a player in this mode.
   * Override in modes that track deaths (e.g., DeathCountMode).
   */
  getPlayerDeathCount(playerId: string): number {
    return 0;
  }

  /**
   * Validate player count for this mode
   */
  validate(
    playerCount: number,
    testMode: boolean = false
  ): { valid: boolean; message?: string } {
    // Skip validation in test mode
    if (testMode) {
      return { valid: true };
    }

    if (playerCount < this.minPlayers) {
      return {
        valid: false,
        message: `${this.name} requires at least ${this.minPlayers} players`,
      };
    }

    if (playerCount > this.maxPlayers) {
      return {
        valid: false,
        message: `${this.name} supports maximum ${this.maxPlayers} players`,
      };
    }

    return { valid: true };
  }

  /**
   * Get mode information for UI/API
   */
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

  /**
   * Get alive players count
   */
  protected getAliveCount(engine: GameEngine): number {
    return engine.players.filter((p) => p.isAlive).length;
  }

  /**
   * Get alive players
   */
  protected getAlivePlayers(engine: GameEngine): BasePlayer[] {
    return engine.players.filter((p) => p.isAlive);
  }

  /**
   * Get effectively alive players (alive AND connected or within grace period)
   * Use this for win condition checks to handle disconnections properly
   */
  protected getEffectivelyAlivePlayers(engine: GameEngine): BasePlayer[] {
    return engine.getEffectivelyAlivePlayers();
  }

  /**
   * Get count of effectively alive players
   */
  protected getEffectivelyAliveCount(engine: GameEngine): number {
    return this.getEffectivelyAlivePlayers(engine).length;
  }
}
