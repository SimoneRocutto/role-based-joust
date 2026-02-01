// ============================================================================
// EXTENDING THE GAME - Code Examples
// ============================================================================
//
// This file contains reference implementations for extending the game with
// new roles, status effects, and game modes. These are examples, not all of
// them exist as actual files in the codebase. See CLAUDE.md for the list of
// currently implemented roles, effects, and modes.
//
// The auto-discovery pattern means you just need to:
// - Add a role file to server/src/models/roles/
// - Add a status effect file to server/src/models/statusEffects/
// - Add a game mode file to server/src/gameModes/
// No manual registration needed.
//

// ============================================================================
// PART 1: ROLES
// ============================================================================
//
// Roles extend BasePlayer and override lifecycle hooks to implement abilities.
// Key hooks: onInit, onTick, beforeDeath, die, onDeath, onPlayerDeath
// Each role has a static priority (higher = executes earlier in tick order).
//
// Currently implemented: Vampire, Beast, BeastHunter, Angel
// Examples below include both implemented and hypothetical roles.

// --- Vampire (IMPLEMENTED) ---
// Priority 20. Enters bloodlust every 30s. Must kill within 5s or die.
// Gains 5 points on bloodlust kill. Listens to player:death events.

import { BasePlayer } from '../BasePlayer';
import type { PlayerData } from '../../types/player.types';
import { Logger } from '../../utils/Logger';
import { GameEvents } from '../../utils/GameEvents';

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export class Vampire extends BasePlayer {
  static override priority: number = 20;
  static displayName: string = 'Vampire';
  static description: string = 'Enter bloodlust every 30s. Kill or be killed!';
  static difficulty: string = 'hard';

  private readonly bloodlustCooldown: number = 30000;
  private readonly bloodlustDuration: number = 5000;
  private bloodlustActive: boolean = false;
  private nextBloodlustTime: number = 30000;
  private bloodlustEndTime: number | null = null;
  private deathListener: ((victim: BasePlayer, time: number) => void) | null = null;

  constructor(data: PlayerData) {
    super(data);
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);
    if (!this.bloodlustActive && gameTime >= this.nextBloodlustTime && this.isAlive) {
      this.enterBloodlust(gameTime);
    }
    if (this.bloodlustActive && this.bloodlustEndTime && gameTime >= this.bloodlustEndTime) {
      this.die(gameTime); // Nobody died in time
    }
  }

  private enterBloodlust(gameTime: number): void {
    this.bloodlustActive = true;
    this.bloodlustEndTime = gameTime + this.bloodlustDuration;

    this.deathListener = (victim: BasePlayer, deathTime: number) => {
      if (this.bloodlustActive && victim.id !== this.id && this.isAlive) {
        this.addPoints(5, 'bloodlust_kill');
        this.exitBloodlust(deathTime);
      }
    };

    gameEvents.on('player:death', this.deathListener);
    gameEvents.emit('vampire:bloodlust:start', { vampire: this });
  }

  private exitBloodlust(gameTime: number): void {
    this.bloodlustActive = false;
    this.bloodlustEndTime = null;
    if (this.deathListener) {
      gameEvents.off('player:death', this.deathListener);
      this.deathListener = null;
    }
    this.nextBloodlustTime = gameTime + this.bloodlustCooldown;
    gameEvents.emit('vampire:bloodlust:end', { vampire: this });
  }

  override onDeath(gameTime: number): void {
    super.onDeath(gameTime);
    if (this.deathListener) {
      gameEvents.off('player:death', this.deathListener);
    }
  }
}

// --- Beast (IMPLEMENTED) ---
// Priority 10. Simple role: 50% more damage resistance via toughness.

export class Beast extends BasePlayer {
  static override priority: number = 10;
  static displayName: string = 'Beast';
  static description: string = 'Increased toughness, but hunted by BeastHunters';
  static difficulty: string = 'easy';

  constructor(data: PlayerData) {
    super(data);
    this.toughness = 1.5; // 50% more resistant
  }
}

// --- Angel (IMPLEMENTED) ---
// Priority 50. Prevents first death with 3s invulnerability, then dies when it expires.

import { Invulnerability } from '../statusEffects/Invulnerability';

export class Angel extends BasePlayer {
  static override priority: number = 50;
  static displayName: string = 'Angel';
  static description: string = 'Divine protection prevents first death';
  static difficulty: string = 'normal';

  private hasUsedDivineProtection: boolean = false;

  override beforeDeath(gameTime: number): void {
    if (!this.hasUsedDivineProtection) {
      this.hasUsedDivineProtection = true;
      this.applyStatusEffect(Invulnerability, gameTime, 3000);
      return; // Prevent death
    }
    super.beforeDeath(gameTime);
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);
    // Die when invulnerability expires
    if (this.hasUsedDivineProtection && !this.hasStatusEffect(Invulnerability) && this.isAlive) {
      this.isAlive = false;
      this.onDeath(gameTime);
      gameEvents.emit('player:death', { victim: this, gameTime });
    }
  }
}

// --- Berserker (HYPOTHETICAL EXAMPLE) ---
// Higher danger threshold (can move more), gains points for aggressive play.

export class Berserker extends BasePlayer {
  static override priority: number = 15;
  static displayName: string = 'Berserker';
  static description: string = 'Less damage from movement, gains points for aggression';
  static difficulty: string = 'hard';

  private aggressiveMovementPoints: number = 0;

  constructor(data: PlayerData) {
    super(data);
    this.movementConfig = { ...this.movementConfig, dangerThreshold: 0.9 };
  }

  override checkMovementDamage(intensity: number, gameTime: number): void {
    super.checkMovementDamage(intensity, gameTime);
    if (intensity > 0.8) {
      this.aggressiveMovementPoints++;
      if (this.aggressiveMovementPoints >= 10) {
        this.addPoints(1, 'berserker_rage');
        this.aggressiveMovementPoints = 0;
      }
    }
  }
}


// ============================================================================
// PART 2: STATUS EFFECTS
// ============================================================================
//
// Status effects extend StatusEffect. They modify player behavior through hooks:
// - onApply/onRemove: Setup and teardown
// - onTick: Per-tick logic
// - onMovement: React to player movement
// - modifyIncomingDamage: Modify damage before it's applied
// - onPreventDeath: Can prevent death (return true to prevent)
//
// Priority determines execution order (higher = first).
// Currently implemented: Invulnerability(100), Shielded(80), Strengthened(60),
//                         Weakened(50), Excited(10)

import { StatusEffect } from '../StatusEffect';

// --- Invulnerability (IMPLEMENTED, priority 100) ---
// Blocks ALL damage. Sets isInvulnerable flag on player.

export class InvulnerabilityExample extends StatusEffect {
  static override priority: number = 100;

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;
    if (this.duration !== null) this.endTime = gameTime + this.duration;
    this.target.isInvulnerable = true;
  }

  onRemove(gameTime: number): void {
    this.isActive = false;
    this.target.isInvulnerable = false;
  }

  modifyIncomingDamage(damage: number): number {
    return 0; // Block all damage
  }
}

// --- Shielded (IMPLEMENTED, priority 80) ---
// Absorbs damage up to a capacity, then breaks.

export class ShieldedExample extends StatusEffect {
  static override priority: number = 80;
  private currentShield: number;

  constructor(target: BasePlayer, duration: number | null, shieldAmount: number = 50) {
    super(target, duration);
    this.currentShield = shieldAmount;
  }

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;
    if (this.duration !== null) this.endTime = gameTime + this.duration;
  }

  modifyIncomingDamage(damage: number): number {
    if (this.currentShield <= 0) return damage;
    if (damage <= this.currentShield) {
      this.currentShield -= damage;
      return 0;
    }
    const overflow = damage - this.currentShield;
    this.currentShield = 0;
    return overflow;
  }

  onRemove(gameTime: number): void { this.isActive = false; }
}

// --- Excited (IMPLEMENTED, priority 10) ---
// Must keep moving. If idle for 2s, player dies.

export class ExcitedExample extends StatusEffect {
  static override priority: number = 10;
  private lastMovementTime: number | null = null;
  private readonly maxIdleTime: number = 2000;

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;
    this.lastMovementTime = gameTime;
    if (this.duration !== null) this.endTime = gameTime + this.duration;
  }

  onTick(gameTime: number, deltaTime: number): void {
    if (this.lastMovementTime && (gameTime - this.lastMovementTime) > this.maxIdleTime) {
      this.target.die(gameTime);
    }
  }

  onMovement(gameTime: number, intensity: number): void {
    if (intensity > 0.1) this.lastMovementTime = gameTime;
  }

  onRemove(gameTime: number): void { this.isActive = false; }
}

// --- Blessed (HYPOTHETICAL EXAMPLE, priority 95) ---
// Prevents one death, then expires (consumed on use).

export class BlessedExample extends StatusEffect {
  static override priority: number = 95;
  private hasPreventedDeath: boolean = false;

  onApply(gameTime: number): void {
    this.isActive = true;
    this.startTime = gameTime;
    if (this.duration !== null) this.endTime = gameTime + this.duration;
  }

  onPreventDeath(gameTime: number): boolean {
    if (!this.hasPreventedDeath) {
      this.hasPreventedDeath = true;
      this.target.removeStatusEffect(this.id, gameTime);
      return true; // Death prevented
    }
    return false;
  }

  onRemove(gameTime: number): void { this.isActive = false; }
}


// ============================================================================
// PART 3: GAME MODES
// ============================================================================
//
// Game modes extend GameMode. They define:
// - Metadata (name, description, player limits)
// - Configuration (useRoles, multiRound, roundCount)
// - Abstract methods: getRolePool, checkWinCondition, calculateFinalScores
// - Optional hooks: onRoundStart, onTick, onPlayerDeath, etc.
//
// Currently implemented: ClassicMode, RoleBasedMode

import { GameMode, type WinCondition, type ScoreEntry, type ModeInfo } from './GameMode';
import type { GameEngine } from '../managers/GameEngine';
import { roleThemes } from '../config/roleThemes';

// --- ClassicMode (IMPLEMENTED) ---
// Pure survival, no roles, single round, last player standing wins.

export class ClassicMode extends GameMode {
  override name = 'Classic';
  override description = 'Pure movement survival. Last player standing wins!';
  override useRoles = false;
  override multiRound = false;

  getRolePool(playerCount: number): string[] {
    return []; // No roles
  }

  checkWinCondition(engine: GameEngine): WinCondition {
    const alive = engine.players.filter(p => p.isAlive);
    if (alive.length <= 1) {
      return { roundEnded: true, gameEnded: true, winner: alive[0] || null };
    }
    return { roundEnded: false, gameEnded: false, winner: null };
  }

  calculateFinalScores(engine: GameEngine): ScoreEntry[] {
    return engine.players.map(p => ({
      player: p,
      score: p.isAlive ? 1 : 0,
      rank: p.isAlive ? 1 : 2,
      status: p.isAlive ? 'Winner' : 'Eliminated',
    }));
  }
}

// --- RoleBasedMode (IMPLEMENTED) ---
// Uses role themes, multi-round (3), points-based scoring.
// Last player standing in each round gets +5 points.
// Winner is whoever has the most total points after all rounds.

export class RoleBasedMode extends GameMode {
  override name = 'Role Based';
  override description = 'Unique abilities. Earn points across multiple rounds!';
  override useRoles = true;
  override multiRound = true;
  override roundCount = 3;

  protected roleTheme: string;

  constructor(roleTheme: string = 'standard') {
    super();
    this.roleTheme = roleTheme;
  }

  getRolePool(playerCount: number): string[] {
    const theme = roleThemes[this.roleTheme] || roleThemes.standard;
    const pool: string[] = [];
    while (pool.length < playerCount) {
      pool.push(...theme);
    }
    return pool.slice(0, playerCount);
  }

  onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    const alive = engine.players.filter(p => p.isAlive);
    if (alive.length === 1) {
      alive[0].addPoints(5, 'last_standing');
    }
  }

  checkWinCondition(engine: GameEngine): WinCondition {
    const alive = engine.players.filter(p => p.isAlive);
    if (alive.length <= 1) {
      return {
        roundEnded: true,
        gameEnded: engine.currentRound >= this.roundCount,
        winner: null,
      };
    }
    return { roundEnded: false, gameEnded: false, winner: null };
  }

  onRoundEnd(engine: GameEngine): void {
    super.onRoundEnd(engine);
    engine.players.forEach(p => {
      p.totalPoints = (p.totalPoints || 0) + p.points;
    });
  }

  calculateFinalScores(engine: GameEngine): ScoreEntry[] {
    const sorted = [...engine.players].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    return sorted.map((p, i) => ({
      player: p,
      score: p.totalPoints || 0,
      rank: i + 1,
      status: i === 0 ? 'Champion' : `Rank ${i + 1}`,
    }));
  }
}


// ============================================================================
// TYPE DEFINITIONS (for reference)
// ============================================================================

export interface PlayerDataRef {
  id: string;
  name: string;
  socketId: string;
  isBot?: boolean;
  behavior?: string;
}

export interface MovementDataRef {
  x: number;
  y: number;
  z: number;
  intensity?: number;
  timestamp: number;
}

export interface StatusEffectConfigRef {
  duration?: number | null;
  [key: string]: any;
}

// Type guards for roles
export function isVampire(player: BasePlayer): player is Vampire {
  return player instanceof Vampire;
}

export function isBeast(player: BasePlayer): player is Beast {
  return player instanceof Beast;
}
