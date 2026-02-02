import { GameMode } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";
import { updateMovementConfig, resetMovementConfig } from "@/config/gameConfig";

const logger = Logger.getInstance();

/**
 * ClassicMode - Pure survival mode
 *
 * Rules:
 * - No roles (everyone is BasePlayer)
 * - Single round
 * - Last player standing wins
 * - Simple scoring (alive = 1 point, dead = 0)
 */
export class ClassicMode extends GameMode {
  override name = "Classic";
  override description = "Pure movement survival. Last player standing wins!";
  override minPlayers = 2;
  override maxPlayers = 20;
  override useRoles = false;
  override multiRound = false;
  override roundCount = 1;

  /**
   * Configure classic mode: 3s countdown + oneshot damage
   */
  override onModeSelected(engine: GameEngine): void {
    super.onModeSelected(engine);
    engine.setCountdownDuration(3);
    updateMovementConfig({ oneshotMode: true });
  }

  /**
   * Reset movement config on game end
   */
  override onGameEnd(engine: GameEngine): void {
    super.onGameEnd(engine);
    resetMovementConfig();
  }

  /**
   * Enable tempo shift event in classic mode
   */
  override getGameEvents(): string[] {
    return ["tempo-shift"];
  }

  /**
   * No roles in classic mode
   */
  getRolePool(playerCount: number): string[] {
    return []; // Empty array = no roles
  }

  /**
   * Game ends when 1 or 0 players remain effectively alive
   * (considers disconnection grace period)
   */
  checkWinCondition(engine: GameEngine): WinCondition {
    // Use effectively alive to handle disconnections
    const effectivelyAlive = this.getEffectivelyAlivePlayers(engine);

    // One player remains - they win
    if (effectivelyAlive.length === 1) {
      const [winner] = effectivelyAlive;
      logger.info("MODE", `${winner.name} wins Classic mode!`);
      return {
        roundEnded: true,
        gameEnded: true,
        winner: winner,
      };
    }

    // No players remain - draw
    if (effectivelyAlive.length === 0) {
      logger.info(
        "MODE",
        "Classic mode ended in a draw - all players eliminated or disconnected"
      );
      return {
        roundEnded: true,
        gameEnded: true,
        winner: null,
      };
    }

    // Multiple players alive - continue
    return {
      roundEnded: false,
      gameEnded: false,
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
   * Log elimination
   */
  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    const alive = this.getAliveCount(engine);
    logger.info(
      "MODE",
      `${victim.name} eliminated. ${alive} player${
        alive !== 1 ? "s" : ""
      } remaining.`
    );
  }
}
