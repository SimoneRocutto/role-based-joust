import type { BasePlayer } from "@/models/BasePlayer";
import type { GameSnapshot, RoundInfo } from "@/types/game.types";
import type { PlayerState } from "@/types/player.types";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * GameState - Tracks and manages game state
 *
 * This is a lightweight manager for state tracking.
 * Most game logic lives in GameEngine.
 *
 * Features:
 * - Round history tracking
 * - State snapshots for debugging
 * - Player state queries
 */
export class GameState {
  private roundHistory: RoundInfo[] = [];

  /**
   * Record a completed round
   */
  recordRound(
    roundNumber: number,
    startTime: number,
    endTime: number,
    winner: string | null,
    survivors: string[]
  ): void {
    const roundInfo: RoundInfo = {
      roundNumber,
      startTime,
      endTime,
      winner,
      survivors,
    };

    this.roundHistory.push(roundInfo);

    logger.debug("STATE", `Round ${roundNumber} recorded`, {
      duration: endTime - startTime,
      survivors: survivors.length,
    });
  }

  /**
   * Get round history
   */
  getRoundHistory(): RoundInfo[] {
    return [...this.roundHistory];
  }

  /**
   * Get specific round info
   */
  getRound(roundNumber: number): RoundInfo | undefined {
    return this.roundHistory.find((r) => r.roundNumber === roundNumber);
  }

  /**
   * Create game snapshot
   */
  createSnapshot(
    gameTime: number,
    state: string,
    currentRound: number,
    players: BasePlayer[]
  ): GameSnapshot {
    const alivePlayers = players.filter((p) => p.isAlive).length;

    return {
      gameTime,
      state: state as any,
      currentRound,
      alivePlayers,
      totalPlayers: players.length,
      players: players.map((p) => this.getPlayerState(p, gameTime)),
    };
  }

  /**
   * Get player state with status effects
   */
  private getPlayerState(player: BasePlayer, gameTime: number): PlayerState {
    return {
      id: player.id,
      name: player.name,
      role: player.constructor.name,
      isAlive: player.isAlive,
      points: player.points,
      totalPoints: player.totalPoints,
      toughness: player.toughness,
      statusEffects: Array.from(player.statusEffects.values()).map(
        (effect) => ({
          type: effect.constructor.name,
          priority: effect.priority,
          timeLeft: effect.getRemainingTime(gameTime),
        })
      ),
    };
  }

  /**
   * Clear all state (reset)
   */
  clear(): void {
    this.roundHistory = [];
    logger.debug("STATE", "Game state cleared");
  }

  /**
   * Get statistics summary
   */
  getStatistics(): {
    totalRounds: number;
    averageRoundDuration: number;
    totalSurvivors: number;
  } {
    if (this.roundHistory.length === 0) {
      return {
        totalRounds: 0,
        averageRoundDuration: 0,
        totalSurvivors: 0,
      };
    }

    const totalDuration = this.roundHistory.reduce((sum, round) => {
      const duration = (round.endTime || 0) - round.startTime;
      return sum + duration;
    }, 0);

    const totalSurvivors = this.roundHistory.reduce(
      (sum, round) => sum + round.survivors.length,
      0
    );

    return {
      totalRounds: this.roundHistory.length,
      averageRoundDuration: totalDuration / this.roundHistory.length,
      totalSurvivors,
    };
  }
}
