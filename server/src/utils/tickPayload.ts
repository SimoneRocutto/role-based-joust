import type { BasePlayer } from "@/models/BasePlayer";
import type { GameMode } from "@/gameModes/GameMode";
import type { GameTickPlayerState } from "@/types/events.types";

/**
 * Build the per-player state object for game tick emissions.
 * Used by both RoundSetupManager (countdown tick) and GameEngine (game loop tick).
 */
export function buildTickPlayerState(
  player: BasePlayer,
  gameTime: number,
  mode: GameMode | null
): GameTickPlayerState {
  return {
    id: player.id,
    name: player.name,
    isAlive: player.isAlive,
    accumulatedDamage: player.accumulatedDamage,
    points: player.points,
    totalPoints: player.totalPoints,
    toughness: player.toughness,
    deathCount: mode?.getPlayerDeathCount(player.id) ?? 0,
    isDisconnected: player.isDisconnected(),
    disconnectedAt: player.disconnectedAt,
    graceTimeRemaining: player.getGraceTimeRemaining(gameTime),
    statusEffects: player.getSortedStatusEffects().map((effect) => ({
      type: effect.constructor.name,
      priority: effect.priority,
      timeLeft: effect.getRemainingTime(gameTime),
    })),
  };
}
