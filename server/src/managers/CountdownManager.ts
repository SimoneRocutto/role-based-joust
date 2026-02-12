import type { BasePlayer } from "@/models/BasePlayer";
import type { GameMode } from "@/gameModes/GameMode";
import { GameEvents } from "@/utils/GameEvents";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export interface CountdownContext {
  players: BasePlayer[];
  currentMode: GameMode | null;
  currentRound: number;
  resetReadyState: () => void;
  onCountdownComplete: () => void;
}

/**
 * CountdownManager - Manages the pre-round countdown sequence
 *
 * Handles:
 * - Player reset before countdown (alive, damage, effects)
 * - Role assignment emission
 * - Countdown timer with per-second events
 * - Initial game tick emission during countdown
 */
export class CountdownManager {
  private countdownTimer: NodeJS.Timeout | null = null;
  private countdownSeconds: number = 0;
  private countdownDuration: number = 10;

  /**
   * Set the countdown duration (in seconds).
   * Use 0 or negative to skip countdown entirely.
   */
  setCountdownDuration(seconds: number): void {
    this.countdownDuration = Math.max(0, seconds);
    logger.info(
      "ENGINE",
      `Countdown duration set to ${this.countdownDuration}s`
    );
  }

  getCountdownDuration(): number {
    return this.countdownDuration;
  }

  /**
   * Start the pre-game countdown.
   * Resets players, emits role assignments, and counts down before calling onCountdownComplete.
   * @param ctx - Context with players, mode, round info, and callbacks
   * @param setGameState - Callback to set engine game state to "countdown"
   */
  startCountdown(
    ctx: CountdownContext,
    setGameState: (state: "countdown") => void
  ): void {
    logger.info("ENGINE", "Starting countdown", {
      duration: this.countdownDuration,
    });

    // Reset ready state for the new round
    ctx.resetReadyState();

    // Reset all players for the new round (before countdown so dashboard shows alive players)
    ctx.players.forEach((player) => {
      player.isAlive = true;
      player.accumulatedDamage = 0;
      player.points = 0;
      player.clearStatusEffects(0);
    });

    // Emit role assignments to each player
    this.emitRoleAssignments(ctx.players, ctx.currentMode);

    // Emit a game tick so dashboard shows fresh player states during countdown
    gameEvents.emitGameTick({
      gameTime: 0,
      roundTimeRemaining: ctx.currentMode?.roundDuration ?? null,
      players: ctx.players.map((p) => ({
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
        accumulatedDamage: p.accumulatedDamage,
        points: p.points,
        totalPoints: p.totalPoints,
        toughness: p.toughness,
        deathCount: ctx.currentMode?.getPlayerDeathCount(p.id) ?? 0,
        isDisconnected: p.isDisconnected(),
        disconnectedAt: p.disconnectedAt,
        graceTimeRemaining: p.getGraceTimeRemaining(0),
      })),
    });

    const roundNumber = ctx.currentRound;
    const totalRounds = ctx.currentMode?.roundCount || 1;

    // If countdown is 0, skip directly to game start
    if (this.countdownDuration <= 0) {
      logger.info("ENGINE", "Countdown skipped (duration=0)");
      gameEvents.emitCountdown({
        secondsRemaining: 0,
        totalSeconds: 0,
        phase: "go",
        roundNumber,
        totalRounds,
      });
      ctx.onCountdownComplete();
      return;
    }

    setGameState("countdown");
    this.countdownSeconds = this.countdownDuration;

    // Emit initial countdown event
    gameEvents.emitCountdown({
      secondsRemaining: this.countdownSeconds,
      totalSeconds: this.countdownDuration,
      phase: "countdown",
      roundNumber,
      totalRounds,
    });

    // Start countdown timer
    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;

      if (this.countdownSeconds > 0) {
        gameEvents.emitCountdown({
          secondsRemaining: this.countdownSeconds,
          totalSeconds: this.countdownDuration,
          phase: "countdown",
          roundNumber,
          totalRounds,
        });

        logger.debug("ENGINE", `Countdown: ${this.countdownSeconds}`);
      } else {
        // Countdown finished - emit GO and start round
        gameEvents.emitCountdown({
          secondsRemaining: 0,
          totalSeconds: this.countdownDuration,
          phase: "go",
          roundNumber,
          totalRounds,
        });

        logger.info("ENGINE", "Countdown complete - GO!");

        // Clear timer and start round
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }

        setTimeout(() => ctx.onCountdownComplete(), 1000);
      }
    }, 1000);
  }

  /**
   * Emit role assignment info to each player via their socket
   */
  private emitRoleAssignments(
    players: BasePlayer[],
    currentMode: GameMode | null
  ): void {
    // Skip role assignments for modes without roles (e.g., Classic)
    if (currentMode && !currentMode.useRoles) {
      logger.debug(
        "ENGINE",
        "Skipping role assignments (mode has no roles)"
      );
      return;
    }

    for (const player of players) {
      const roleInfo = {
        playerId: player.id,
        name: player.constructor.name.toLowerCase(),
        displayName:
          (player.constructor as any).displayName || player.constructor.name,
        description: (player.constructor as any).description || "",
        difficulty: (player.constructor as any).difficulty || "normal",
      };

      logger.debug(
        "ENGINE",
        `Emitting role assignment to ${player.name}`,
        roleInfo
      );

      gameEvents.emit("role:assigned", {
        ...roleInfo,
        socketId: player.socketId,
      });
    }
  }

  /**
   * Cancel the countdown timer. Call from stopGame().
   */
  cancel(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}
