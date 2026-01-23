# Johann Sebastian Joust - TypeScript System Explanations

## Project Philosophy

This server is built with TypeScript for type safety and maintainability. Key principles:

1. **Server Authority**: Controllers (phones) are "dumb" - they only send raw accelerometer data. All game logic runs server-side.

2. **Tick-Based Timing**: Central clock ticks every 100ms. All time-based mechanics calculate relative to game time. NEVER use setTimeout for game logic.

3. **Priority-Based Execution**: Multiple effects/abilities execute in priority order (highest first), ensuring predictable behavior.

4. **Event-Driven Communication**: Roles/effects communicate via events, not direct calls. Loose coupling enables easy extension.

5. **Auto-Discovery**: New roles, effects, and game modes auto-load from directories. No manual registration.

6. **Type Safety**: TypeScript catches errors at compile time, provides IntelliSense, and serves as documentation.

7. **Game Modes**: Different rule sets (Classic, Role-Based, themed modes) without touching core code.

---

## Core Systems Explained

### 1. BasePlayer - The Foundation

BasePlayer is the abstract base class for all players. Written in TypeScript with strict typing:

**Type Definitions:**

```typescript
interface MovementData {
  x: number;
  y: number;
  z: number;
  intensity?: number;
  timestamp: number;
}

interface MovementConfig {
  dangerThreshold: number;
  damageMultiplier: number;
  historySize: number;
  smoothingEnabled: boolean;
}
```

**Core Properties:**

- Identity: `id: string`, `name: string`, `socketId: string`
- State: `isAlive: boolean`, `points: number`, `toughness: number`
- Movement: `lastMovementData: MovementData | null`, `movementHistory: MovementData[]`
- Damage: `deathThreshold: number`, `accumulatedDamage: number`
- Status: `statusEffects: Map<string, StatusEffect>`
- Priority: `priority: number` (from static property)

**Movement Processing Flow:**

1. Receives MovementData from controller
2. Calculates intensity (0-1) from accelerometer values
3. Updates movement history for smoothing
4. Notifies status effects (priority order)
5. Checks if intensity exceeds danger threshold
6. If yes, applies damage

**Damage System Flow:**

1. Base damage from movement
2. Status effects modify (priority order)
3. Apply toughness (divide damage)
4. Check if damage ≥ deathThreshold
5. Call beforeDeath() (status effects can prevent)
6. If not prevented, die()

**Type Safety Benefits:**

- Compile error if passing wrong types to methods
- IDE autocomplete for all properties/methods
- Null safety with strict null checks
- Interface contracts enforced

### 2. StatusEffect - Modular Buffs/Debuffs

StatusEffect is an abstract class with TypeScript generics support:

**Base Structure:**

```typescript
abstract class StatusEffect {
  readonly id: string;
  readonly target: BasePlayer;
  duration: number | null;
  startTime: number | null;
  endTime: number | null;
  isActive: boolean;
  readonly priority: number;

  static priority: number = 0;

  abstract onApply(gameTime: number): void;
  abstract onRemove(gameTime: number): void;

  onTick(gameTime: number, deltaTime: number): void {}
  onMovement(gameTime: number, intensity: number): void {}
  modifyIncomingDamage(damage: number): number {
    return damage;
  }
  onPreventDeath(gameTime: number): boolean {
    return false;
  }
}
```

**Lifecycle:**

- onApply(): Setup when first applied
- onTick(): Runs every 100ms while active
- onRemove(): Cleanup when removed/expired
- onRefresh(): When same effect reapplied

**Type Safety:**

- Target is guaranteed to be BasePlayer
- Duration is `number | null` (explicit null handling)
- Return types enforced (modifyIncomingDamage returns number)
- Abstract methods must be implemented

### 3. GameMode System

GameMode is the Strategy pattern for different game variants:

**Core Concept:**
Each mode controls:

- Which roles to use (if any)
- How to score events
- Win conditions
- Round structure
- Special mechanics

**Type Definition:**

```typescript
interface WinCondition {
  roundEnded: boolean;
  gameEnded: boolean;
  winner: BasePlayer | null;
}

interface ScoreEntry {
  player: BasePlayer;
  score: number;
  rank: number;
  status: string;
}

interface ModeConfig {
  useRoles: boolean;
  multiRound: boolean;
  roundCount: number;
  roundDuration: number | null;
}
```

**Template Method Pattern:**
GameMode defines the flow, subclasses override hooks:

```typescript
abstract class GameMode {
  abstract getRolePool(playerCount: number): string[];
  abstract checkWinCondition(engine: GameEngine): WinCondition;
  abstract calculateFinalScores(engine: GameEngine): ScoreEntry[];

  // Hook methods (optional)
  onRoundStart(engine: GameEngine, roundNumber: number): void {}
  onPlayerDeath(victim: BasePlayer, engine: GameEngine): void {}
  onTick(engine: GameEngine, gameTime: number): void {}
}
```

**Mode Variants:**

**ClassicMode:**

- No roles (everyone is BasePlayer)
- Single round
- Last man standing wins
- Simple scoring (alive = 1, dead = 0)

**RoleBasedMode:**

- Uses role themes (standard, halloween, mafia)
- Multi-round (default 3)
- Points accumulate across rounds
- Last standing gets 5 bonus points per round

**HalloweenMode:**

- Extends RoleBasedMode
- Uses halloween theme
- Special events (full moon, fog, candy rush)
- Events trigger on timers

**SurvivalMode:**

- No roles
- Difficulty increases over time
- Score by survival duration
- Damage multiplier grows

**Type Safety in Modes:**

- getRolePool must return string array
- checkWinCondition must return WinCondition
- Engine parameter is typed GameEngine
- Cannot accidentally return wrong types

### 4. RoleFactory - Auto-Discovery

Handles role creation with TypeScript typing:

**Type Definition:**

```typescript
interface RoleAssignmentConfig {
  pool?: string[];
  theme?: string;
  custom?: boolean;
}

type RoleConstructor = new (data: PlayerData) => BasePlayer;
```

**Registry Structure:**

```typescript
class RoleFactory {
  private roleRegistry: Map<string, RoleConstructor> = new Map();

  createRole(roleType: string, playerData: PlayerData): BasePlayer {
    const RoleClass = this.roleRegistry.get(roleType);
    if (!RoleClass) return new BasePlayer(playerData);
    return new RoleClass(playerData);
  }
}
```

**Auto-Discovery Process:**

1. Scans `src/models/roles/` directory
2. Imports each .ts file
3. Validates class extends BasePlayer (TypeScript check)
4. Adds to registry with normalized name
5. Logs success/failure

**Type Safety:**

- RoleConstructor type ensures proper constructor signature
- Can't register classes that don't extend BasePlayer
- playerData type is enforced
- Return type is always BasePlayer or subclass

### 5. GameModeFactory - Mode Auto-Discovery

Similar pattern for game modes:

**Type Definition:**

```typescript
type ModeConstructor = new (...args: any[]) => GameMode;

interface ModeInfo {
  key: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  useRoles: boolean;
  multiRound: boolean;
}
```

**Registry:**

```typescript
class GameModeFactory {
  private modeRegistry: Map<string, ModeConstructor> = new Map();

  createMode(modeName: string, ...args: any[]): GameMode {
    const ModeClass = this.modeRegistry.get(modeName);
    if (!ModeClass) throw new Error(`Mode '${modeName}' not found`);
    return new ModeClass(...args);
  }
}
```

**Mode Selection:**
User can choose mode at game start. Engine delegates all game logic to the mode.

### 6. GameEngine Integration

GameEngine delegates to currentMode:

**Type Definition:**

```typescript
type GameState = "waiting" | "active" | "round-ended" | "finished";

class GameEngine {
  players: BasePlayer[] = [];
  currentMode: GameMode | null = null;
  currentRound: number = 0;
  gameState: GameState = "waiting";
  gameTime: number = 0;

  setGameMode(mode: GameMode): void {
    this.currentMode = mode;
    mode.onModeSelected(this);
  }

  startGame(playerData: PlayerData[]): void {
    if (!this.currentMode) {
      throw new Error("Mode must be set");
    }
    // Mode determines roles
    const rolePool = this.currentMode.getRolePool(playerData.length);
    // ... assign roles and start
  }
}
```

**Delegation Pattern:**

- `startRound()` → `mode.onRoundStart()`
- `onTick()` → `mode.onTick()`
- `checkWin()` → `mode.checkWinCondition()`
- `onDeath()` → `mode.onPlayerDeath()`

**Type Safety:**

- GameState is union type (can't assign invalid state)
- currentMode can be null (checked before use)
- Mode methods return typed values
- Players array is typed

### 7. Role Themes

Themes are simple configuration:

**Type Definition:**

```typescript
type RoleTheme = string[];

interface RoleThemes {
  [themeName: string]: RoleTheme;
}
```

**Configuration:**

```typescript
const roleThemes: RoleThemes = {
  standard: ["vampire", "beast", "beastHunter", "angel"],
  halloween: ["witch", "werewolf", "ghost", "zombie"],
  mafia: ["godfather", "detective", "doctor", "civilian"],
};
```

**Usage:**
Modes reference themes by name. Roles themselves are theme-agnostic - they all live in `models/roles/`. A role can appear in multiple themes.

**Benefits:**

- Easy to add new themes (just add array)
- Mix and match roles
- Roles reusable across themes
- Type-safe theme access

### 8. Priority Execution System

Priority ensures deterministic behavior:

**Type Definition:**

```typescript
enum Priority {
  CRITICAL = 100,
  VERY_HIGH = 75,
  HIGH = 50,
  MEDIUM_HIGH = 30,
  MEDIUM = 20,
  MEDIUM_LOW = 10,
  LOW = 5,
  VERY_LOW = 1,
}
```

**Status Effect Priorities:**

- Invulnerability (100): Blocks damage first
- Weakened (50): Modifies stats after invulnerability
- Excited (10): Checks constraints last

**Role Priorities:**

- Angel (50): Prevents death first
- Vampire (20): Mid-priority abilities
- BeastHunter (5): Reacts to deaths last

**Implementation:**

```typescript
getSortedStatusEffects(): StatusEffect[] {
  return Array.from(this.statusEffects.values())
    .sort((a, b) => b.priority - a.priority);
}
```

**Type Safety:**

- Priority is number type
- Enum provides named constants
- Sort comparison is type-safe

### 9. Event System

Events use TypeScript for payload typing:

**Type Definitions:**

```typescript
interface GameTickEvent {
  gameTime: number;
}

interface PlayerDeathEvent {
  victim: BasePlayer;
  gameTime: number;
  killer?: BasePlayer;
}

interface RoundEndEvent {
  roundNumber: number;
  scores: ScoreEntry[];
}
```

**Event Emitter:**

```typescript
class GameEvents extends EventEmitter {
  emit(event: "game:tick", payload: GameTickEvent): boolean;
  emit(event: "player:death", payload: PlayerDeathEvent): boolean;
  emit(event: "round:end", payload: RoundEndEvent): boolean;

  on(event: "game:tick", listener: (payload: GameTickEvent) => void): this;
  on(
    event: "player:death",
    listener: (payload: PlayerDeathEvent) => void
  ): this;
}
```

**Type Safety:**

- Event names are string literals
- Payloads are strictly typed
- Listeners receive correct types
- IDE autocomplete for events

### 10. Movement Processing Pipeline

Fully typed pipeline:

**Step 1 - Reception:**

```typescript
interface MovementInput {
  playerId: string;
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

// Route handler
app.post("/player/move", (req, res) => {
  const data: MovementInput = req.body;
  player.updateMovement(data, engine.gameTime);
});
```

**Step 2 - Intensity Calculation:**

```typescript
calculateIntensity(data: MovementData): number {
  const { x, y, z } = data;
  const magnitude = Math.sqrt(x*x + y*y + z*z);
  return Math.min(magnitude / 17.32, 1.0);
}
```

**Step 3 - Damage Check:**

```typescript
checkMovementDamage(intensity: number, gameTime: number): void {
  if (intensity > this.movementConfig.dangerThreshold) {
    const damage = (intensity - this.movementConfig.dangerThreshold)
                   * this.movementConfig.damageMultiplier;
    this.takeDamage(damage, gameTime);
  }
}
```

**Type Safety Throughout:**

- MovementData enforces x, y, z are numbers
- Intensity is always number between 0-1
- gameTime is number (milliseconds)
- Compile error if types don't match

### 11. Testing with TypeScript

Tests benefit from types:

**Type Definition:**

```typescript
type TestFunction = (
  engine: GameEngine,
  logger: Logger
) => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFunction;
}
```

**Test Example:**

```typescript
runner.test("Vampire bloodlust", (engine: GameEngine) => {
  engine.createTestGame(["vampire", "beast", "beast", "beast"]);

  const vampire = engine.players.find(
    (p): p is Vampire => p instanceof Vampire
  );

  if (!vampire) throw new Error("Vampire not found");

  engine.fastForward(30000);

  if (!vampire.bloodlustActive) {
    throw new Error("Bloodlust should be active");
  }
});
```

**Type Safety:**

- Type guard `p is Vampire` narrows type
- Can't access vampire properties without check
- Test function signature is enforced
- Compile error if engine type wrong

### 12. Configuration with TypeScript

Configs are typed interfaces:

**Type Definition:**

```typescript
interface MovementConfig {
  dangerThreshold: number;
  damageMultiplier: number;
  historySize: number;
  smoothingEnabled: boolean;
}

interface GameConfig {
  movement: MovementConfig;
  damage: {
    baseThreshold: number;
    accumulatedMode: boolean;
  };
  tick: {
    rate: number;
  };
}
```

**Usage:**

```typescript
import { gameConfig } from "@/config/gameConfig";

// Type-safe access
const threshold = gameConfig.movement.dangerThreshold; // number
const smoothing = gameConfig.movement.smoothingEnabled; // boolean
```

**Benefits:**

- Can't access non-existent properties
- Type mismatch caught at compile time
- Refactoring is safe
- IDE autocomplete

### 13. Logging with Types

Logger methods are typed:

**Type Definition:**

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";
type LogCategory =
  | "PLAYER"
  | "STATUS"
  | "GAME"
  | "ABILITY"
  | "DAMAGE"
  | "MOVEMENT"
  | "MODE";

interface LogEntry {
  timestamp: string;
  gameTime: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data: Record<string, any>;
}

class Logger {
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, any>
  ): void;
  logPlayerAction(
    player: BasePlayer,
    action: string,
    details?: Record<string, any>
  ): void;
  logStatusEffect(
    player: BasePlayer,
    effect: StatusEffect,
    action: string,
    details?: Record<string, any>
  ): void;
}
```

**Type Safety:**

- Can't use invalid log level
- Category is restricted to valid values
- data is typed as object
- Return type is void

---

## TypeScript Benefits Summary

### Development Experience

- ✅ IntelliSense/autocomplete everywhere
- ✅ Compile-time error detection
- ✅ Refactoring with confidence
- ✅ Self-documenting code via types
- ✅ Better IDE navigation

### Code Quality

- ✅ Fewer runtime errors
- ✅ Explicit contracts (interfaces)
- ✅ Null safety with strict mode
- ✅ Type guards for narrowing
- ✅ Generic types for reusability

### Maintenance

- ✅ Breaking changes caught immediately
- ✅ Easier onboarding (types as docs)
- ✅ Safer collaborative development
- ✅ Better debugging (type info)

### Architecture

- ✅ Abstract classes enforce contracts
- ✅ Interfaces define expectations
- ✅ Union types for valid states
- ✅ Discriminated unions for events
- ✅ Type guards for runtime checks

---

## Best Practices

### When Creating Roles:

- Define interface for role-specific properties
- Type all method parameters and returns
- Use type guards when checking role types
- Export type alongside class

### When Creating Status Effects:

- Type constructor parameters
- Type optional hooks properly
- Return types for modifiers
- Use readonly for immutable properties

### When Creating Game Modes:

- Extend GameMode abstract class
- Implement required abstract methods
- Type hook method parameters
- Return typed objects (WinCondition, ScoreEntry)

### When Using Events:

- Define event payload interfaces
- Type event listeners
- Use discriminated unions for multiple events
- Type guards in event handlers

### Performance Considerations:

- TypeScript compiles to optimized JS
- No runtime overhead from types
- Source maps for debugging
- Use strict mode for safety

---

## Common Patterns

### Type Guard Pattern:

```typescript
function isVampire(player: BasePlayer): player is Vampire {
  return player instanceof Vampire;
}

// Usage
if (isVampire(player)) {
  // TypeScript knows player is Vampire here
  player.bloodlustActive; // OK
}
```

### Abstract Class Pattern:

```typescript
abstract class BaseEntity {
  abstract onInit(): void;

  protected initialize(): void {
    this.onInit();
  }
}
```

### Generic Factory Pattern:

```typescript
class Factory<T extends BaseClass> {
  private registry: Map<string, new () => T> = new Map();

  create(type: string): T {
    const Class = this.registry.get(type);
    if (!Class) throw new Error(`Unknown type: ${type}`);
    return new Class();
  }
}
```

### Discriminated Union Pattern:

```typescript
type Result =
  | { success: true; data: GameData }
  | { success: false; error: string };

function handleResult(result: Result): void {
  if (result.success) {
    console.log(result.data); // TypeScript knows data exists
  } else {
    console.error(result.error); // TypeScript knows error exists
  }
}
```
