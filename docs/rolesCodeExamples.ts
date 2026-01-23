// ============================================================================
// src/models/roles/Vampire.ts
// ============================================================================

import { BasePlayer } from '../BasePlayer';
import type { PlayerData } from '../../types/player.types';
import { Logger } from '../../utils/Logger';
import { GameEvents } from '../../utils/GameEvents';

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export class Vampire extends BasePlayer {
  static override priority: number = 20; // MEDIUM
  static displayName: string = 'Vampire';
  static description: string = 'Enter bloodlust every 30s. Kill or be killed!';
  static difficulty: string = 'hard';

  // Vampire-specific state
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
    logger.logRoleAbility(this, 'VAMPIRE_INIT', {
      firstBloodlustAt: this.nextBloodlustTime
    });
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);

    // Check if we should enter bloodlust
    if (!this.bloodlustActive && gameTime >= this.nextBloodlustTime && this.isAlive) {
      this.enterBloodlust(gameTime);
    }

    // Check if bloodlust should end (nobody died in time)
    if (this.bloodlustActive && this.bloodlustEndTime && gameTime >= this.bloodlustEndTime) {
      logger.logRoleAbility(this, 'BLOODLUST_TIMEOUT', {
        noDeath: true
      });
      this.die(gameTime);
    }
  }

  private enterBloodlust(gameTime: number): void {
    this.bloodlustActive = true;
    this.bloodlustEndTime = gameTime + this.bloodlustDuration;
    
    logger.logRoleAbility(this, 'BLOODLUST_START', {
      endTime: this.bloodlustEndTime,
      timeRemaining: this.bloodlustDuration
    });
    
    // Listen for ANY death event
    this.deathListener = (victim: BasePlayer, deathTime: number) => {
      if (this.bloodlustActive && victim.id !== this.id && this.isAlive) {
        this.onBloodlustKill(deathTime);
      }
    };
    
    gameEvents.on('player:death', this.deathListener);
    gameEvents.emit('vampire:bloodlust:start', { vampire: this });
  }

  private onBloodlustKill(gameTime: number): void {
    if (!this.bloodlustActive) return;
    
    logger.logRoleAbility(this, 'BLOODLUST_SATISFIED', {
      pointsGained: 5
    });
    
    this.exitBloodlust(gameTime, true);
  }

  private exitBloodlust(gameTime: number, successful: boolean): void {
    this.bloodlustActive = false;
    this.bloodlustEndTime = null;
    
    // Clean up death listener
    if (this.deathListener) {
      gameEvents.off('player:death', this.deathListener);
      this.deathListener = null;
    }
    
    logger.logRoleAbility(this, 'BLOODLUST_END', {
      successful,
      pointsGained: successful ? 5 : 0
    });
    
    if (successful) {
      this.addPoints(5, 'bloodlust_kill');
    }
    
    // Schedule next bloodlust
    this.nextBloodlustTime = gameTime + this.bloodlustCooldown;
    
    gameEvents.emit('vampire:bloodlust:end', { vampire: this, successful });
  }

  override onDeath(gameTime: number): void {
    super.onDeath(gameTime);
    
    // Clean up if we die during bloodlust
    if (this.deathListener) {
      gameEvents.off('player:death', this.deathListener);
      this.deathListener = null;
    }
  }

  // Utility methods for UI
  getRoleDescription(): string {
    return Vampire.description;
  }

  getRoleAbilities(): string[] {
    return [
      'Bloodlust every 30 seconds',
      'Must kill within 5 seconds or die',
      'Gain 5 points on bloodlust kill'
    ];
  }

  getRoleState(): VampireState {
    const gameEngine = (global as any).gameEngine;
    const currentTime = gameEngine ? gameEngine.gameTime : 0;
    
    return {
      bloodlustActive: this.bloodlustActive,
      timeUntilBloodlust: Math.max(0, this.nextBloodlustTime - currentTime),
      bloodlustTimeRemaining: this.bloodlustActive && this.bloodlustEndTime
        ? Math.max(0, this.bloodlustEndTime - currentTime)
        : 0
    };
  }
}

interface VampireState {
  bloodlustActive: boolean;
  timeUntilBloodlust: number;
  bloodlustTimeRemaining: number;
}

// ============================================================================
// src/models/roles/Beast.ts
// ============================================================================

import { BasePlayer } from '../BasePlayer';
import type { PlayerData } from '../../types/player.types';
import { Logger } from '../../utils/Logger';

const logger = Logger.getInstance();

export class Beast extends BasePlayer {
  static override priority: number = 10; // MEDIUM_LOW
  static displayName: string = 'Beast';
  static description: string = 'Increased toughness, but hunted by BeastHunters';
  static difficulty: string = 'easy';

  constructor(data: PlayerData) {
    super(data);
    this.toughness = 1.5; // 50% more resistant
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    logger.logRoleAbility(this, 'BEAST_INIT', {
      toughness: this.toughness,
      damageReduction: '33%'
    });
  }

  getRoleDescription(): string {
    return Beast.description;
  }

  getRoleAbilities(): string[] {
    return [
      '50% increased damage resistance',
      'Targeted by BeastHunters for bonus points'
    ];
  }
}

// ============================================================================
// src/models/roles/BeastHunter.ts
// ============================================================================

import { BasePlayer } from '../BasePlayer';
import { Beast } from './Beast';
import type { PlayerData } from '../../types/player.types';
import { Logger } from '../../utils/Logger';
import { GameEvents } from '../../utils/GameEvents';

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export class BeastHunter extends BasePlayer {
  static override priority: number = 5; // LOW
  static displayName: string = 'Beast Hunter';
  static description: string = 'Gain bonus points for hunting the Beast';
  static difficulty: string = 'normal';

  constructor(data: PlayerData) {
    super(data);
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    
    // Listen for all death events
    gameEvents.on('player:death', (event: { victim: BasePlayer; gameTime: number }) => {
      this.onPlayerDeath(event.victim, event.gameTime);
    });
    
    logger.logRoleAbility(this, 'BEASTHUNTER_INIT', {
      bonus: '3 points for Beast kill'
    });
  }

  override onPlayerDeath(victim: BasePlayer, gameTime: number): void {
    // Check if victim is Beast and we're alive
    if (victim instanceof Beast && this.isAlive) {
      logger.logRoleAbility(this, 'BEAST_HUNTED', {
        pointsGained: 3,
        beastName: victim.name
      });
      
      this.addPoints(3, 'beast_kill');
    }
  }

  getRoleDescription(): string {
    return BeastHunter.description;
  }

  getRoleAbilities(): string[] {
    return [
      'Gain 3 points when Beast dies before you'
    ];
  }
}

// ============================================================================
// src/models/roles/Angel.ts
// ============================================================================

import { BasePlayer } from '../BasePlayer';
import { Invulnerability } from '../statusEffects/Invulnerability';
import type { PlayerData } from '../../types/player.types';
import { Logger } from '../../utils/Logger';
import { GameEvents } from '../../utils/GameEvents';

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export class Angel extends BasePlayer {
  static override priority: number = 50; // HIGH
  static displayName: string = 'Angel';
  static description: string = 'Divine protection prevents first death';
  static difficulty: string = 'normal';

  private hasUsedDivineProtection: boolean = false;
  private readonly divineProtectionDuration: number = 3000;

  constructor(data: PlayerData) {
    super(data);
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    logger.logRoleAbility(this, 'ANGEL_INIT', {
      protectionAvailable: true,
      duration: this.divineProtectionDuration
    });
  }

  override beforeDeath(gameTime: number): void {
    // First time dying: activate divine protection
    if (!this.hasUsedDivineProtection) {
      this.hasUsedDivineProtection = true;
      
      logger.logRoleAbility(this, 'DIVINE_PROTECTION_ACTIVATED', {
        duration: this.divineProtectionDuration
      });
      
      // Apply invulnerability status
      this.applyStatusEffect(Invulnerability, gameTime, this.divineProtectionDuration);
      
      logger.info('ANGEL', `${this.name} will die in ${this.divineProtectionDuration}ms`);
      
      return; // Prevent death for now
    }

    // Second time: actually die
    logger.logRoleAbility(this, 'DIVINE_PROTECTION_EXHAUSTED');
    super.beforeDeath(gameTime);
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);
    
    // Check if invulnerability expired and we should die
    if (this.hasUsedDivineProtection && 
        !this.hasStatusEffect(Invulnerability) && 
        this.isAlive) {
      
      logger.logRoleAbility(this, 'INVULNERABILITY_EXPIRED', {
        finalDeath: true
      });
      
      // Force death
      this.isAlive = false;
      this.onDeath(gameTime);
      
      gameEvents.emit('player:death', { victim: this, gameTime });
    }
  }

  getRoleDescription(): string {
    return Angel.description;
  }

  getRoleAbilities(): string[] {
    return [
      'First death grants 3 seconds of invulnerability',
      'Die when invulnerability expires'
    ];
  }

  getRoleState(): AngelState {
    return {
      protectionAvailable: !this.hasUsedDivineProtection,
      isInvulnerable: this.hasStatusEffect(Invulnerability)
    };
  }
}

interface AngelState {
  protectionAvailable: boolean;
  isInvulnerable: boolean;
}

// ============================================================================
// src/models/roles/Berserker.ts
// ============================================================================

import { BasePlayer } from '../BasePlayer';
import type { PlayerData, MovementConfig } from '../../types/player.types';
import { Logger } from '../../utils/Logger';

const logger = Logger.getInstance();

export class Berserker extends BasePlayer {
  static override priority: number = 15; // MEDIUM
  static displayName: string = 'Berserker';
  static description: string = 'Less damage from movement, gains points for aggression';
  static difficulty: string = 'hard';

  private aggressiveMovementPoints: number = 0;

  constructor(data: PlayerData) {
    super(data);
    
    // Override movement config for this role
    this.movementConfig = {
      ...this.movementConfig,
      dangerThreshold: 0.9,    // Can move more wildly
      damageMultiplier: 50      // Takes less damage
    };
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    logger.logRoleAbility(this, 'BERSERKER_INIT', {
      dangerThreshold: this.movementConfig.dangerThreshold
    });
  }

  override checkMovementDamage(intensity: number, gameTime: number): void {
    // Call parent
    super.checkMovementDamage(intensity, gameTime);
    
    // Award points for aggressive movement
    if (intensity > 0.8) {
      this.aggressiveMovementPoints++;
      
      if (this.aggressiveMovementPoints >= 10) {
        this.addPoints(1, 'berserker_rage');
        this.aggressiveMovementPoints = 0;
        logger.logRoleAbility(this, 'BERSERKER_RAGE', {
          bonus: '1 point for aggressive play'
        });
      }
    }
  }

  getRoleDescription(): string {
    return Berserker.description;
  }

  getRoleAbilities(): string[] {
    return [
      'Can move more wildly without dying',
      'Gain 1 point for every 10 aggressive movements'
    ];
  }
}

// ============================================================================
// src/models/roles/Medic.ts
// ============================================================================

import { BasePlayer } from '../BasePlayer';
import { Regenerating } from '../statusEffects/Regenerating';
import type { PlayerData } from '../../types/player.types';
import { Logger } from '../../utils/Logger';

const logger = Logger.getInstance();

export class Medic extends BasePlayer {
  static override priority: number = 25; // MEDIUM_HIGH
  static displayName: string = 'Medic';
  static description: string = 'Can heal nearby players';
  static difficulty: string = 'normal';

  private readonly healCooldown: number = 15000;
  private nextHealTime: number = 15000;
  private readonly healDuration: number = 5000;
  private readonly healPerSecond: number = 20;

  constructor(data: PlayerData) {
    super(data);
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    
    // Medic starts with self-regeneration
    this.applyStatusEffect(Regenerating, gameTime, null, 5);
    
    logger.logRoleAbility(this, 'MEDIC_INIT', {
      healCooldown: this.healCooldown
    });
  }

  override onTick(gameTime: number, deltaTime: number): void {
    super.onTick(gameTime, deltaTime);
    
    // Check if heal is ready
    if (gameTime >= this.nextHealTime && this.isAlive) {
      this.attemptHeal(gameTime);
    }
  }

  private attemptHeal(gameTime: number): void {
    const engine = (global as any).gameEngine;
    if (!engine) return;
    
    const otherPlayers = engine.players.filter((p: BasePlayer) => 
      p.isAlive && p.id !== this.id
    );
    
    if (otherPlayers.length > 0) {
      // Heal random nearby player
      const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
      
      target.applyStatusEffect(
        Regenerating,
        gameTime,
        this.healDuration,
        this.healPerSecond
      );
      
      logger.logRoleAbility(this, 'HEAL', {
        target: target.name,
        healAmount: this.healPerSecond * (this.healDuration / 1000)
      });
      
      this.addPoints(2, 'heal');
      this.nextHealTime = gameTime + this.healCooldown;
    }
  }

  getRoleDescription(): string {
    return Medic.description;
  }

  getRoleAbilities(): string[] {
    return [
      'Passive self-regeneration',
      'Heal nearby players every 15 seconds',
      'Gain 2 points per heal'
    ];
  }
}

// ============================================================================
// src/models/roles/Assassin.ts
// ============================================================================

import { BasePlayer } from '../BasePlayer';
import type { PlayerData } from '../../types/player.types';
import { Logger } from '../../utils/Logger';
import { GameEvents } from '../../utils/GameEvents';

const logger = Logger.getInstance();
const gameEvents = GameEvents.getInstance();

export class Assassin extends BasePlayer {
  static override priority: number = 30; // MEDIUM_HIGH
  static displayName: string = 'Assassin';
  static description: string = 'Assigned a target. Bonus points for eliminating them.';
  static difficulty: string = 'hard';

  private target: BasePlayer | null = null;
  private targetId: string | null = null;

  constructor(data: PlayerData) {
    super(data);
  }

  override onInit(gameTime: number): void {
    super.onInit(gameTime);
    
    // Assign random target
    const engine = (global as any).gameEngine;
    if (engine) {
      const others = engine.players.filter((p: BasePlayer) => p.id !== this.id);
      if (others.length > 0) {
        this.target = others[Math.floor(Math.random() * others.length)];
        this.targetId = this.target.id;
        
        logger.logRoleAbility(this, 'TARGET_ASSIGNED', {
          targetName: this.target.name,
          bonus: '10 points if target dies first'
        });
      }
    }
    
    // Listen for deaths
    gameEvents.on('player:death', (event: { victim: BasePlayer; gameTime: number }) => {
      this.onPlayerDeath(event.victim, event.gameTime);
    });
  }

  override onPlayerDeath(victim: BasePlayer, gameTime: number): void {
    if (victim.id === this.targetId && this.isAlive) {
      logger.logRoleAbility(this, 'TARGET_ELIMINATED', {
        pointsGained: 10,
        victimName: victim.name
      });
      
      this.addPoints(10, 'assassination');
      this.target = null;
      this.targetId = null;
    }
  }

  getRoleDescription(): string {
    return Assassin.description;
  }

  getRoleAbilities(): string[] {
    return [
      'Assigned a random target at game start',
      'Gain 10 points if target dies before you'
    ];
  }

  getRoleState(): AssassinState {
    return {
      hasTarget: this.target !== null,
      targetName: this.target ? this.target.name : null
    };
  }
}

interface AssassinState {
  hasTarget: boolean;
  targetName: string | null;
}

// ============================================================================
// TYPE DEFINITIONS FOR ROLES
// ============================================================================

// src/types/player.types.ts

export interface PlayerData {
  id: string;
  name: string;
  socketId: string;
  isBot?: boolean;
  behavior?: string;
}

export interface MovementData {
  x: number;
  y: number;
  z: number;
  intensity?: number;
  timestamp: number;
}

export interface MovementConfig {
  dangerThreshold: number;
  damageMultiplier: number;
  historySize: number;
  smoothingEnabled: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  role: string;
  isAlive: boolean;
  points: number;
  totalPoints: number;
  toughness: number;
  statusEffects: StatusEffectInfo[];
}

interface StatusEffectInfo {
  type: string;
  priority: number;
  timeLeft: number | null;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isVampire(player: BasePlayer): player is Vampire {
  return player instanceof Vampire;
}

export function isBeast(player: BasePlayer): player is Beast {
  return player instanceof Beast;
}

export function isAngel(player: BasePlayer): player is Angel {
  return player instanceof Angel;
}

// Usage:
// if (isVampire(player)) {
//   const state = player.getRoleState(); // TypeScript knows getRoleState exists
// }