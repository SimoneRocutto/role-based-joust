import { GameMode } from "./GameMode";
import type { GameEngine } from "@/managers/GameEngine";
import type { BasePlayer } from "@/models/BasePlayer";
import type { WinCondition, ScoreEntry } from "@/types/index";
import { Logger } from "@/utils/Logger";

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
   * No roles in classic mode
   */
  getRolePool(playerCount: number): string[] {
    return []; // Empty array = no roles
  }

  /**
   * Game ends when 1 or 0 players remain alive
   */
  checkWinCondition(engine: GameEngine): WinCondition {
    const alive = this.getAlivePlayers(engine);

    // One player remains - they win
    if (alive.length === 1) {
      const [winner] = alive;
      logger.info("MODE", `${winner.name} wins Classic mode!`);
      return {
        roundEnded: true,
        gameEnded: true,
        winner: winner,
      };
    }

    // No players remain - draw
    if (alive.length === 0) {
      logger.info(
        "MODE",
        "Classic mode ended in a draw - all players eliminated"
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
