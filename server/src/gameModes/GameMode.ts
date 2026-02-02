import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry, ModeInfo } from "@/types/index";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

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
    // Override if needed (e.g., for timed events)
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
    // Override if needed
  }

  /**
   * Called at the end of each round
   */
  onRoundEnd(engine: GameEngine): void {
    logger.info("MODE", `${this.name} round ended`, {
      currentRound: engine.currentRound,
      totalRounds: this.roundCount,
    });
  }

  /**
   * Called when entire game ends
   */
  onGameEnd(engine: GameEngine): void {
    logger.info("MODE", `${this.name} game ended`);
  }

  // ========================================================================
  // GAME EVENTS
  // ========================================================================

  /**
   * Get the list of game event names to activate for this mode.
   * Override in subclasses to enable specific events.
   * Event names must match what GameEventFactory can create.
   */
  getGameEvents(): string[] {
    return [];
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

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
