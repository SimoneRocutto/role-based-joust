# Game Events System — Architecture Specification

## Overview

"Game events" are temporary, game-wide effects that alter gameplay for all players simultaneously. Examples:

- **Classic "Speed Shift"**: Threshold increases, music speeds up — players can move more freely. Probability-based transitions between slow/fast phases.
- **Role-Based "Hollow Moon"**: Werewolves get buffed, dashboard background changes, wolf howling plays.

Game events are distinct from the existing `GameEvents` utility class (which is a Socket.IO message bus). To avoid confusion, the class is named `GameEvent` (singular) while the message bus remains `GameEvents` (plural).

## Design Goals

1. **Fits existing patterns** — lifecycle hooks like StatusEffect, auto-discovery like roles/modes
2. **Tick-based timing** — uses `gameTime`, no `setTimeout`
3. **Server-authoritative** — server decides when events start/end; clients react to broadcasts
4. **Mode-driven** — each game mode declares which events it uses and configures them
5. **Extensible** — adding a new event = adding a file, no engine changes

## Recommended Architecture

After evaluating multiple approaches, the recommended design uses a **mode-owned event manager with auto-discovered event classes**. This combines the simplicity of mode ownership with the extensibility of auto-discovery.

The alternatives considered are documented in the [Alternatives Considered](#alternatives-considered) section at the end.

---

## Core Design

### GameEvent Base Class

**Location:** `server/src/gameEvents/GameEvent.ts`

```typescript
import type { GameEngine } from "@/managers/GameEngine";

export abstract class GameEvent {
  // ===== IDENTITY =====
  readonly id: string;                    // Unique instance ID (e.g., "speed-shift-1")
  static readonly eventKey: string;       // Static key for lookup (e.g., "speed-shift")
  static readonly displayName: string;    // Human-readable name
  static readonly description: string;    // Shown on dashboard

  // ===== STATE =====
  isActive: boolean = false;              // Currently running
  startTime: number | null = null;        // gameTime when activated
  duration: number | null = null;         // null = indefinite (event manages its own end)

  // ===== PRIORITY =====
  readonly priority: number;              // Higher = processes first (same as StatusEffect)
  static priority: number = 10;          // Default priority

  constructor() {
    this.id = `${(this.constructor as typeof GameEvent).eventKey}-${Date.now()}`;
    this.priority = (this.constructor as typeof GameEvent).priority;
  }

  // ===== LIFECYCLE HOOKS =====

  /**
   * Called when the event activates.
   * Apply game-wide modifications here (config changes, player buffs, etc.)
   * Must emit a mode:event for the client to react.
   */
  abstract onStart(engine: GameEngine, gameTime: number): void;

  /**
   * Called when the event deactivates.
   * Revert all modifications made in onStart.
   * Must emit a mode:event to tell the client to revert.
   */
  abstract onEnd(engine: GameEngine, gameTime: number): void;

  /**
   * Called every game tick (100ms) while active.
   * Use for ongoing effects, state transitions, probability checks.
   */
  onTick(engine: GameEngine, gameTime: number, deltaTime: number): void {
    // Override as needed
  }

  // ===== TRIGGER LOGIC =====

  /**
   * Called every tick while the event is NOT active.
   * Return true to activate the event.
   * Use for timer-based or condition-based activation.
   */
  shouldActivate(engine: GameEngine, gameTime: number): boolean {
    return false; // Override in subclasses
  }

  /**
   * Called every tick while the event IS active.
   * Return true to deactivate. Also checked against duration.
   */
  shouldDeactivate(engine: GameEngine, gameTime: number): boolean {
    // Default: deactivate when duration expires
    if (this.duration !== null && this.startTime !== null) {
      return gameTime - this.startTime >= this.duration;
    }
    return false; // Override for custom deactivation
  }

  // ===== OPTIONAL HOOKS =====

  /**
   * Called when a player dies while the event is active.
   */
  onPlayerDeath(victim: any, engine: GameEngine, gameTime: number): void {
    // Override as needed
  }

  /**
   * Called on round start. Use to reset internal state.
   */
  onRoundStart(engine: GameEngine, gameTime: number): void {
    // Override as needed
  }

  // ===== QUERIES =====

  getRemainingTime(gameTime: number): number | null {
    if (this.duration === null || this.startTime === null) return null;
    return Math.max(0, this.duration - (gameTime - this.startTime));
  }

  getInfo(gameTime: number): GameEventInfo {
    return {
      id: this.id,
      key: (this.constructor as typeof GameEvent).eventKey,
      displayName: (this.constructor as typeof GameEvent).displayName,
      description: (this.constructor as typeof GameEvent).description,
      isActive: this.isActive,
      remainingTime: this.getRemainingTime(gameTime),
    };
  }
}

export interface GameEventInfo {
  id: string;
  key: string;
  displayName: string;
  description: string;
  isActive: boolean;
  remainingTime: number | null;
}
```

### GameEventManager

**Location:** `server/src/managers/GameEventManager.ts`

Manages the lifecycle of all game events during a round. Owned by GameMode, ticked by GameEngine.

```typescript
import type { GameEngine } from "@/managers/GameEngine";
import type { GameEvent } from "@/gameEvents/GameEvent";

export class GameEventManager {
  private events: GameEvent[] = [];         // All registered events
  private activeEvents: GameEvent[] = [];   // Currently active subset

  /**
   * Register events for this round.
   * Called by the mode in onRoundStart.
   */
  registerEvent(event: GameEvent): void { ... }

  /**
   * Called every game tick by the mode's onTick.
   * Checks activation conditions for inactive events,
   * ticks active events, checks deactivation conditions.
   */
  tick(engine: GameEngine, gameTime: number, deltaTime: number): void {
    // 1. Check inactive events for activation (sorted by priority)
    for (const event of this.getInactiveEvents()) {
      if (event.shouldActivate(engine, gameTime)) {
        this.activateEvent(event, engine, gameTime);
      }
    }

    // 2. Tick active events (sorted by priority)
    for (const event of this.getSortedActiveEvents()) {
      event.onTick(engine, gameTime, deltaTime);

      // 3. Check if event should deactivate
      if (event.shouldDeactivate(engine, gameTime)) {
        this.deactivateEvent(event, engine, gameTime);
      }
    }
  }

  /**
   * Activate an event.
   */
  private activateEvent(event: GameEvent, engine: GameEngine, gameTime: number): void {
    event.isActive = true;
    event.startTime = gameTime;
    event.onStart(engine, gameTime);
    this.activeEvents.push(event);
  }

  /**
   * Deactivate an event.
   */
  private deactivateEvent(event: GameEvent, engine: GameEngine, gameTime: number): void {
    event.onEnd(engine, gameTime);
    event.isActive = false;
    event.startTime = null;
    this.activeEvents = this.activeEvents.filter(e => e.id !== event.id);
  }

  /**
   * Deactivate all events and clear. Called on round end.
   */
  cleanup(engine: GameEngine, gameTime: number): void { ... }

  /**
   * Notify events of player death.
   */
  onPlayerDeath(victim: any, engine: GameEngine, gameTime: number): void {
    for (const event of this.getSortedActiveEvents()) {
      event.onPlayerDeath(victim, engine, gameTime);
    }
  }

  /**
   * Notify events of round start (for internal reset).
   */
  onRoundStart(engine: GameEngine, gameTime: number): void {
    for (const event of this.events) {
      event.onRoundStart(engine, gameTime);
    }
  }

  getActiveEvents(): GameEvent[] { ... }
  getEventInfo(gameTime: number): GameEventInfo[] { ... }

  private getSortedActiveEvents(): GameEvent[] {
    return [...this.activeEvents].sort((a, b) => b.priority - a.priority);
  }

  private getInactiveEvents(): GameEvent[] {
    return this.events.filter(e => !e.isActive);
  }
}
```

### GameEventFactory (Auto-Discovery)

**Location:** `server/src/factories/GameEventFactory.ts`

Follows the exact same pattern as `RoleFactory` and `GameModeFactory`:

```typescript
export class GameEventFactory {
  // Singleton
  // Scans server/src/gameEvents/ (excluding GameEvent.ts base class)
  // Validates each export extends GameEvent
  // Registers by static eventKey

  createEvent(eventKey: string, ...args: any[]): GameEvent;
  getAvailableEvents(): string[];
  eventExists(eventKey: string): boolean;
}
```

**Auto-discovery:** Place any `.ts` file in `server/src/gameEvents/` that exports a class extending `GameEvent` and it will be automatically available.

---

## Integration Points

### 1. GameMode Integration

Modes that use game events create a `GameEventManager` and wire it into their lifecycle hooks.

```typescript
// In ClassicMode or RoleBasedMode:
class ClassicMode extends GameMode {
  private eventManager = new GameEventManager();

  override onRoundStart(engine: GameEngine, roundNumber: number): void {
    super.onRoundStart(engine, roundNumber);

    // Register events for this mode
    const factory = GameEventFactory.getInstance();
    if (factory.eventExists("speed-shift")) {
      this.eventManager.registerEvent(factory.createEvent("speed-shift"));
    }

    this.eventManager.onRoundStart(engine, 0);
  }

  override onTick(engine: GameEngine, gameTime: number): void {
    // Delegate to event manager — this is the only required hook
    this.eventManager.tick(engine, gameTime, engine.tickRate);
  }

  override onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {
    super.onPlayerDeath(victim, engine);
    this.eventManager.onPlayerDeath(victim, engine, engine.gameTime);
  }

  override onRoundEnd(engine: GameEngine): void {
    this.eventManager.cleanup(engine, engine.gameTime);
    super.onRoundEnd(engine);
  }
}
```

**Why mode-owned, not engine-owned:** Different modes need different events with different configurations. ClassicMode uses SpeedShift; RoleBasedMode might use HollowMoon. The mode is the natural owner. The engine doesn't need to know about game events at all.

### 2. Client Communication via mode:event

Game events communicate to clients through the existing `mode:event` infrastructure (already defined in `GameEvents` utility but not yet wired to Socket.IO).

**Wiring needed in `server/src/server.ts`:**
```typescript
gameEvents.onModeEvent((payload) => {
  io.emit("mode:event", payload);
});
```

**Wiring needed in `client/src/services/socket.ts`:**
```typescript
onModeEvent(callback: (data: ModeEventPayload) => void) {
  this.on("mode:event", callback);
}
```

**Event payload convention:**
```typescript
// When SpeedShift activates:
gameEvents.emitModeEvent({
  modeName: "Classic",
  eventType: "speed-shift:start",
  data: { phase: "fast", dangerThreshold: 0.30 }
});

// When SpeedShift deactivates:
gameEvents.emitModeEvent({
  modeName: "Classic",
  eventType: "speed-shift:end",
  data: { phase: "slow", dangerThreshold: 0.10 }
});
```

The client listens for `mode:event` and dispatches to appropriate handlers (music speed, background color, UI effects). This keeps the server from knowing about client presentation.

### 3. Game Tick Payload (Optional Enhancement)

To let the dashboard show active events, the `game:tick` payload could include active event info. This is optional — clients can also track events from `mode:event` start/end messages.

```typescript
// In GameEngine.tick() or mode.onTick():
gameEvents.emitGameTick({
  gameTime: this.gameTime,
  players: [...],
  activeEvents: this.eventManager?.getEventInfo(this.gameTime) ?? [],
});
```

This requires a minor extension to `GameTickEvent` in `events.types.ts`.

---

## Example: SpeedShift Event (Classic Mode)

**Location:** `server/src/gameEvents/SpeedShift.ts`

This is the "random" event from the TODO. Alternates between slow (normal) and fast (relaxed threshold, faster music) phases with escalating probability.

```typescript
import { GameEvent } from "./GameEvent";
import type { GameEngine } from "@/managers/GameEngine";
import { updateMovementConfig, gameConfig } from "@/config/gameConfig";
import { GameEvents } from "@/utils/GameEvents";

const gameEvents = GameEvents.getInstance();

export class SpeedShift extends GameEvent {
  static readonly eventKey = "speed-shift";
  static readonly displayName = "Speed Shift";
  static readonly description = "Threshold changes — move faster!";
  static priority = 10;

  // Internal state
  private phase: "slow" | "fast" = "slow";
  private consecutiveChecks: number = 0;
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL = 5000; // 5 seconds

  // Config
  private readonly SLOW_STAY_BASE = 3 / 4;   // 75% chance to stay slow each check
  private readonly FAST_STAY_BASE = 2 / 3;   // 67% chance to stay fast each check
  private readonly FAST_THRESHOLD = 0.30;     // More forgiving during fast phase
  private savedThreshold: number = 0.10;      // Remember the original threshold

  onRoundStart(engine: GameEngine, gameTime: number): void {
    this.phase = "slow";
    this.consecutiveChecks = 0;
    this.lastCheckTime = 0;
  }

  // This event is always "active" during a round — it manages
  // its own slow/fast transitions internally rather than using
  // shouldActivate/shouldDeactivate. We activate it immediately.
  shouldActivate(engine: GameEngine, gameTime: number): boolean {
    return gameTime >= 0; // Activate on first tick
  }

  shouldDeactivate(): boolean {
    return false; // Stays active for the whole round
  }

  onStart(engine: GameEngine, gameTime: number): void {
    this.savedThreshold = gameConfig.movement.dangerThreshold;
    this.lastCheckTime = gameTime;
    // Start in slow phase — no changes needed
  }

  onEnd(engine: GameEngine, gameTime: number): void {
    // Restore threshold when round ends
    if (this.phase === "fast") {
      updateMovementConfig({ dangerThreshold: this.savedThreshold });
    }
  }

  onTick(engine: GameEngine, gameTime: number, deltaTime: number): void {
    // Check every 5 seconds
    if (gameTime - this.lastCheckTime < this.CHECK_INTERVAL) return;
    this.lastCheckTime = gameTime;
    this.consecutiveChecks++;

    const stayBase = this.phase === "slow" ? this.SLOW_STAY_BASE : this.FAST_STAY_BASE;
    const stayProbability = Math.pow(stayBase, this.consecutiveChecks);

    // Roll the dice
    if (Math.random() > stayProbability) {
      this.transition(engine, gameTime);
    }
  }

  private transition(engine: GameEngine, gameTime: number): void {
    this.consecutiveChecks = 0; // Reset counter

    if (this.phase === "slow") {
      this.phase = "fast";
      updateMovementConfig({ dangerThreshold: this.FAST_THRESHOLD });
      gameEvents.emitModeEvent({
        modeName: "Classic",
        eventType: "speed-shift:start",
        data: { phase: "fast", dangerThreshold: this.FAST_THRESHOLD },
      });
    } else {
      this.phase = "slow";
      updateMovementConfig({ dangerThreshold: this.savedThreshold });
      gameEvents.emitModeEvent({
        modeName: "Classic",
        eventType: "speed-shift:end",
        data: { phase: "slow", dangerThreshold: this.savedThreshold },
      });
    }
  }
}
```

### Client Handling (sketch)

```typescript
// In DashboardView or useSocket hook:
socketService.onModeEvent((data) => {
  if (data.eventType === "speed-shift:start") {
    audioManager.setMusicRate(2.0);       // Double speed
    // Dashboard could change background color
  } else if (data.eventType === "speed-shift:end") {
    audioManager.setMusicRate(1.0);       // Normal speed
  }
});
```

Note: `AudioManager.setMusicRate()` doesn't exist yet — it would need to be added. Howler.js supports `rate()` on Howl instances, so this is a small addition.

---

## File Structure After Implementation

```
server/src/
  gameEvents/
    GameEvent.ts              # Base class (like GameMode.ts, StatusEffect.ts)
    SpeedShift.ts             # Classic mode's speed shift event
    # Future: HollowMoon.ts, SuddenDeath.ts, etc.
  factories/
    GameEventFactory.ts       # Auto-discovery (same pattern as others)
  managers/
    GameEventManager.ts       # Lifecycle manager (used by modes)
```

---

## Naming Clarification

| Term | Meaning |
|------|---------|
| `GameEvents` (plural, existing) | The Socket.IO event bus — `server/src/utils/GameEvents.ts`. Unchanged. |
| `GameEvent` (singular, new) | Base class for game-wide effects — `server/src/gameEvents/GameEvent.ts` |
| `GameEventManager` (new) | Manages active events during a round — owned by each GameMode |
| `GameEventFactory` (new) | Auto-discovers and instantiates GameEvent subclasses |

---

## What Doesn't Change

- **GameEngine** — No changes needed. Modes already have `onTick`, `onRoundStart`, `onRoundEnd` hooks.
- **BasePlayer / StatusEffect** — No changes. Game events modify global config (e.g., `updateMovementConfig`), not individual players. If a game event needs to affect a specific player, it applies a StatusEffect to them.
- **GameEvents utility** — No changes to the class. We just wire `mode:event` to Socket.IO.
- **Existing tests** — No breakage. Game events are additive.

---

## Implementation Checklist

When implementing this spec, follow this order:

1. Create `server/src/gameEvents/GameEvent.ts` base class
2. Create `server/src/factories/GameEventFactory.ts` (auto-discovery)
3. Create `server/src/managers/GameEventManager.ts`
4. Wire `mode:event` → Socket.IO in `server/src/server.ts`
5. Wire `mode:event` listener in `client/src/services/socket.ts`
6. Add `setMusicRate(rate)` to `client/src/services/audio.ts` (Howler supports this)
7. Implement `SpeedShift.ts` as the first concrete event
8. Integrate `GameEventManager` into `ClassicMode`
9. Add client-side `mode:event` handler for speed-shift (audio rate + optional UI)
10. Write server tests for GameEvent lifecycle, SpeedShift probability, GameEventManager
11. Write client tests for mode:event handling
12. Update `docs/architecture.md`, `docs/type-system.md`, and `docs/extending-the-game.ts`
