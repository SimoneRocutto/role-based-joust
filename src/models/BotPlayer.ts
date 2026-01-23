import { BasePlayer } from "./BasePlayer";
import type { PlayerData, MovementData } from "@/types/player.types";
import type { BotBehavior, BotAction } from "@/types/bot.types";

//! Maybe this file was truncated during generation
/**
 * BotPlayer - Simulated player for testing
 *
 * Behaviors:
 * - random: Unpredictable movement
 * - aggressive: High intensity movement (0.8-1.0)
 * - defensive: Low intensity movement (0.1-0.4)
 * - idle: Minimal movement (0-0.05)
 * - chaotic: Random bursts of movement
 */
export class BotPlayer extends BasePlayer {
  readonly isBot: boolean = true;
  readonly behavior: BotBehavior;
  private autoPlayEnabled: boolean = false;

  constructor(data: PlayerData, behavior: BotBehavior = "random") {
    super(data);
    this.behavior = behavior;
  }

  /**
   * Enable autonomous behavior
   */
  enableAutoPlay(): void {
    this.autoPlayEnabled = true;
  }

  /**
   * Disable autonomous behavior
   */
  disableAutoPlay(): void {
    this.autoPlayEnabled = false;
  }

  /**
   * Override onTick to execute bot behavior
   */
  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);

    if (this.autoPlayEnabled && this.isAlive) {
      this.executeBehavior(gameTime);
    }
  }

  /**
   * Execute behavior pattern
   */
  private executeBehavior(gameTime: number): void {
    let intensity: number;

    switch (this.behavior) {
      case "aggressive":
        intensity = this.aggressiveBehavior();
        break;
      case "defensive":
        intensity = this.defensiveBehavior();
        break;
      case "idle":
        intensity = this.idleBehavior();
        break;
      case "chaotic":
        intensity = this.chaoticBehavior();
        break;
      case "random":
      default:
        intensity = this.randomBehavior();
        break;
    }

    this.simulateMovement(intensity, gameTime);
  }

  /**
   * Aggressive behavior: High movement intensity
   */
  private aggressiveBehavior(): number {
    return 0.8 + Math.random() * 0.2; // 0.8-1.0
  }

  /**
   * Defensive behavior: Low, careful movement
   */
  private defensiveBehavior(): number {
    return 0.1 + Math.random() * 0.3; // 0.1-0.4
  }

  /**
   * Idle behavior: Minimal to no movement
   */
  private idleBehavior(): number {
    return Math.random() * 0.05; // 0-0.05
  }

  /**
   * Chaotic behavior: Random bursts of movement
   */
  private chaoticBehavior(): number {
    const shouldMove = Math.random() > 0.5;
    return shouldMove ? Math.random() : 0;
  }

  /**
   * Random behavior: Unpredictable
   */
  private randomBehavior(): number {
    return Math.random(); // 0-1
  }

  /**
   * Simulate movement data from intensity
   */
  private simulateMovement(intensity: number, gameTime: number): void {
    // Generate random direction
    const theta = Math.random() * 2 * Math.PI; // Random angle
    const phi = Math.random() * Math.PI; // Random angle

    // Convert spherical coordinates to Cartesian
    // Scale by intensity and max magnitude (17.32)
    const magnitude = intensity * 17.32;

    const movementData: MovementData = {
      x: magnitude * Math.sin(phi) * Math.cos(theta),
      y: magnitude * Math.sin(phi) * Math.sin(theta),
      z: magnitude * Math.cos(phi),
      intensity,
      timestamp: gameTime,
    };

    this.updateMovement(movementData, gameTime);
  }

  /**
   * Force bot to die (for testing)
   */
  forceDeath(gameTime: number): void {
    console.log(`[BOT] Forcing ${this.name} to die`);
    this.die(gameTime);
  }

  /**
   * Manually trigger specific actions
   */
  triggerAction(action: BotAction, gameTime: number, ...args: any[]): void {
    console.log(`[BOT] ${this.name} triggered action: ${action}`);

    switch (action) {
      case "shake":
        this.simulateMovement(0.9, gameTime);
        break;
      case "still":
        this.simulateMovement(0, gameTime);
        break;
      case "die":
        this.forceDeath(gameTime);
        break;
      case "damage":
        const damageAmount = (args[0] as number) || 100;
        this.takeDamage(damageAmount, gameTime);
        break;
      default:
        console.warn(`[BOT] Unknown action: ${action}`);
    }
  }

  /**
   * Get bot state for debugging
   */
  getBotState(): {
    isBot: boolean;
    behavior: BotBehavior;
    autoPlayEnabled: boolean;
    isAlive: boolean;
    lastIntensity: number;
  } {
    return {
      isBot: this.isBot,
      behavior: this.behavior,
      autoPlayEnabled: this.autoPlayEnabled,
      isAlive: this.isAlive,
      lastIntensity: this.lastMovementData?.intensity || 0,
    };
  }
}
