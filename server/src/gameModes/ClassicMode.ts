import { GameMode, type GameModeOptions } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";
import {
  applyTemporaryMovementConfig,
  restoreMovementConfig,
} from "@/config/gameConfig";
import { GameEventManager } from "@/managers/GameEventManager";
import { GameEventFactory } from "@/factories/GameEventFactory";

const logger = Logger.getInstance();

/**
 * ClassicMode - Pure survival mode
 *
 * Rules:
 * - No roles (everyone is BasePlayer)
 * - Configurable round count (default 1)
 * - Last player standing wins each round
 * - Simple scoring (alive = 1 point, dead = 0)
 */
export class ClassicMode extends GameMode {
  override name = "Classic";
  override description = "Pure movement survival. Last player standing wins!";
  override minPlayers = 2;
  override maxPlayers = 20;
  override useRoles = false;

  private eventManager = new GameEventManager();

  constructor(options?: GameModeOptions) {
    super(options);
    // Default to 1 round if not specified
    if (options?.roundCount === undefined) {
      this.roundCount = 1;
      this.multiRound = false;
    }
  }

  /**
   * Configure classic mode: 3s countdown + oneshot damage
   */
  override onModeSelected(engine: GameEngine): void {
    super.onModeSelected(engine);
    engine.setCountdownDuration(3);
  }

  /**
   * Register game events on round start
   */
  override onRoundStart(engine: GameEngine, roundNumber: number): void {
    super.onRoundStart(engine, roundNumber);

    const factory = GameEventFactory.getInstance();
    if (factory.eventExists("speed-shift")) {
      this.eventManager.registerEvent(factory.createEvent("speed-shift"));
    }

    this.eventManager.onRoundStart(engine, 0);
  }

  /**
   * Tick game events each frame
   */
  override onTick(engine: GameEngine, gameTime: number): void {
    this.eventManager.tick(engine, gameTime, engine.tickRate);
  }

  /**
   * Clean up events on round end
   */
  override onRoundEnd(engine: GameEngine): void {
    this.eventManager.cleanup(engine, engine.gameTime);
    super.onRoundEnd(engine);
  }

  /**
   * Restore movement config and clean up events on game end
   */
  override onGameEnd(engine: GameEngine): void {
    this.eventManager.cleanup(engine, engine.gameTime);
    super.onGameEnd(engine);
    restoreMovementConfig();
  }

  /**
   * No roles in classic mode
   */
  getRolePool(playerCount: number): string[] {
    return []; // Empty array = no roles
  }

  /**
   * Round ends when 1 or 0 players remain effectively alive
   * (considers disconnection grace period)
   * Game ends after configured number of rounds
   */
  checkWinCondition(engine: GameEngine): WinCondition {
    // Use effectively alive to handle disconnections
    const effectivelyAlive = this.getEffectivelyAlivePlayers(engine);

    // Multiple players alive - continue round
    if (effectivelyAlive.length > 1) {
      return {
        roundEnded: false,
        gameEnded: false,
        winner: null,
      };
    }

    // Round is over (0 or 1 players effectively alive)
    const roundEnded = true;
    const gameEnded = engine.currentRound >= this.roundCount;

    // One player remains - they win the round
    if (effectivelyAlive.length === 1) {
      const [winner] = effectivelyAlive;
      logger.info("MODE", `${winner.name} wins${gameEnded ? " Classic mode" : " the round"}!`);
      return {
        roundEnded,
        gameEnded,
        winner: gameEnded ? winner : null,
      };
    }

    // No players remain - draw
    logger.info(
      "MODE",
      "Classic mode round ended in a draw - all players eliminated or disconnected"
    );
    return {
      roundEnded,
      gameEnded,
      winner: null,
    };
  }

  /**
   * Simple scoring - winner gets 1 point
   */
  calculateFinalScores(engine: GameEngine): ScoreEntry[] {
    return engine.players.map((player) => ({
      player,
      score: player.isAlive ? 1 : 0,
      rank: player.isAlive ? 1 : 2,
      status: player.isAlive ? "Winner" : "Eliminated",
    }));
  }

  /**
   * Log elimination and notify game events
   */
  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    const alive = this.getAliveCount(engine);
    logger.info(
      "MODE",
      `${victim.name} eliminated. ${alive} player${
        alive !== 1 ? "s" : ""
      } remaining.`
    );
    this.eventManager.onPlayerDeath(victim, engine, engine.gameTime);
  }
}
