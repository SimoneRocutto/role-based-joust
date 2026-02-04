# Extended Joust - Complete Specification

## Communication Protocol

---

## Socket.IO Events

### Client → Server Events

#### `player:join`

**When**: Player enters name and clicks "Join Game"

**Payload**:

```typescript
{
  playerId: string,    // UUID generated client-side
  name: string         // Player's chosen name (1-20 chars)
}
```

**Server Response**: `player:joined` event

---

#### `player:move`

**When**: Accelerometer data available (throttled to 10Hz)

**Payload**:

```typescript
{
  playerId: string,
  x: number,           // -10 to +10
  y: number,           // -10 to +10
  z: number,           // -10 to +10
  timestamp?: number,  // Date.now()
  deviceType?: 'phone' | 'joycon' | 'custom'
}
```

**Throttling**: Send max 10 times per second (every 100ms)

---

#### `player:reconnect`

**When**: Player disconnects and attempts to rejoin using stored session token

**Payload**:

```typescript
{
  token: string       // Session token from localStorage (received in player:joined)
}
```

Note: The server obtains the new socket ID from the socket connection itself. Do not send `socketId` in the payload.

**Server Response**: `player:reconnected` event

---

#### `player:ready`

**When**: Player shakes device (or clicks in dev mode) to indicate readiness. Used in two phases:
- **Lobby**: Before game starts, players ready up so the admin can start the game
- **Between rounds**: Players ready up to trigger the next round automatically

**Payload**:

```typescript
{
  playerId: string
}
```

**Server Response**: `player:ready` broadcast + `ready:update` broadcast

---

#### `player:tap`

**When**: Player taps their phone screen to use an ability during active gameplay

**Payload**:

```typescript
{
  playerId: string
}
```

**Server Response**: `player:tap:result` event

---

#### `ping`

**When**: Every 5 seconds to maintain connection

**Payload**: None

**Server Response**: `pong` event

---

### Server → Client Events

#### `player:joined`

**When**: Response to successful `player:join` request

**Payload**:

```typescript
{
  success: boolean,
  playerId: string,
  playerNumber: number,     // 1-20 (assigned sequentially)
  socketId: string,
  sessionToken: string,     // Store in localStorage for reconnection
  name: string
}
```

---

#### `player:reconnected`

**When**: Response to `player:reconnect` request

**Success payload**:

```typescript
{
  success: true,
  playerId: string,
  playerNumber: number,
  player: {
    id: string,
    name: string,
    role: string,          // Role class name (e.g., "Vampire")
    isAlive: boolean,
    points: number
  } | null               // null if no active game
}
```

**Failure payload**:

```typescript
{
  success: false,
  error: string
}
```

---

#### `lobby:update`

**When**: A player joins, disconnects, or changes ready state in the lobby

**Payload**:

```typescript
{
  players: Array<{
    id: string,
    name: string,
    number: number,
    isReady: boolean
  }>
}
```

---

#### `game:countdown`

**When**: During the countdown before a round starts (emitted each tick of the countdown)

**Payload**:

```typescript
{
  secondsRemaining: number,
  totalSeconds: number,
  phase: 'countdown' | 'go'
}
```

---

#### `game:tick`

**When**: Every 100ms during active game

**Payload**:

```typescript
{
  gameTime: number,        // Milliseconds since round start
  players: Array<{
    id: string,
    name: string,
    isAlive: boolean,
    points: number,
    totalPoints: number,
    statusEffects: Array<{
      type: string,
      priority: number,
      timeLeft: number | null
    }>
  }>
}
```

---

#### `player:death`

**When**: Any player dies

**Payload**:

```typescript
{
  victimId: string,
  victimName: string,
  victimNumber: number,
  gameTime: number
}
```

---

#### `round:start`

**When**: Round begins (after countdown completes)

**Payload**:

```typescript
{
  roundNumber: number,
  totalRounds: number,
  gameTime: number
}
```

---

#### `round:end`

**When**: Round ends (0-1 players remaining)

**Payload**:

```typescript
{
  roundNumber: number,
  scores: Array<{
    playerId: string,
    playerName: string,
    playerNumber: number,
    score: number,          // Points earned this round
    rank: number,
    status: string          // "Winner", "Eliminated", etc.
  }>,
  gameTime: number
}
```

---

#### `game:end`

**When**: Game finished (after all rounds)

**Payload**:

```typescript
{
  winner: {
    id: string,
    name: string,
    number: number
  } | null,
  scores: Array<{
    playerId: string,
    playerName: string,
    playerNumber: number,
    score: number,          // Total points across all rounds
    rank: number,
    status: string
  }>,
  totalRounds: number
}
```

---

#### `game:stopped`

**When**: Admin stops the game via dashboard

**Payload**: `{}` (empty object)

---

#### `vampire:bloodlust`

**When**: Vampire bloodlust state changes

**Payload**:

```typescript
{
  vampireId: string,
  vampireName: string,
  active: boolean          // true = started, false = ended
}
```

---

#### `role:assigned`

**When**: Game starts, each player receives their role privately (emitted directly to the player's socket, not broadcast)

**Payload**:

```typescript
{
  playerId: string,
  name: string,            // Role internal name (e.g., "vampire")
  displayName: string,     // Human-readable name (e.g., "Vampire")
  description: string,     // Role description
  difficulty: string       // Difficulty level
}
```

---

#### `player:ready`

**When**: A player marks themselves as ready (broadcast to all clients)

**Payload**:

```typescript
{
  playerId: string,
  playerName: string,
  playerNumber: number,
  isReady: boolean
}
```

---

#### `ready:update`

**When**: Ready count changes (broadcast to all clients)

**Payload**:

```typescript
{
  ready: number,           // Count of ready players
  total: number            // Total players
}
```

---

#### `pong`

**When**: Response to `ping` heartbeat

**Payload**: None

---

#### `player:tap:result`

**When**: Response to `player:tap` ability use attempt

**Payload**:

```typescript
{
  success: boolean,
  reason?: string,           // If !success: 'no_charges' | 'game_not_active' | 'player_dead' | 'player_not_found' | 'ability_failed'
  charges: {
    current: number,         // Current charges remaining
    max: number,             // Maximum charges for this role
    cooldownRemaining: number // ms until next charge regenerates (0 if no cooldown)
  } | null
}
```

---

#### `error`

**When**: Error notifications from server

**Payload**:

```typescript
{
  message: string,
  code: string             // e.g., 'INVALID_MOVEMENT_DATA', 'GAME_FULL'
}
```

---

## HTTP REST API Endpoints

### `POST /api/game/launch` (Primary)

**Purpose**: Create game mode and start with all lobby players. This is the primary way to start a game.

**Request**:

```typescript
{
  mode?: string,             // 'classic' | 'role-based' (default: 'role-based')
  theme?: string,            // For role-based: 'standard' | 'halloween' | etc.
  countdownDuration?: number // Seconds before round starts (default: 10, use 0 to skip)
}
```

**Response**:

```typescript
{
  success: boolean,
  gameId: string,
  mode: { name: string, description: string, minPlayers: number, maxPlayers: number },
  playerCount: number,
  state: string              // Engine state (e.g., 'countdown')
}
```

---

### `POST /api/game/next-round`

**Purpose**: Start the next round (re-assigns roles, starts countdown). Only valid when engine state is `round-ended`.

**Request**: None

**Response**:

```typescript
{
  success: boolean,
  round: number,             // New round number
  totalRounds: number
}
```

---

### `GET /api/game/config`

**Purpose**: Check if server is in dev mode

**Response**:

```typescript
{
  success: boolean,
  devMode: boolean
}
```

---

### `GET /api/game/modes`

**Purpose**: List available game modes

**Response**:

```typescript
{
  success: boolean,
  modes: Array<{
    key: string,
    name: string,
    description: string,
    minPlayers: number,
    maxPlayers: number,
    useRoles: boolean,
    multiRound: boolean,
    roundCount: number,
    roleTheme?: string
  }>
}
```

---

### `GET /api/game/lobby`

**Purpose**: Get connected players waiting in lobby

**Response**:

```typescript
{
  success: boolean,
  players: Array<{
    id: string,
    name: string,
    number: number,
    isReady: boolean
  }>
}
```

---

### `GET /api/game/state`

**Purpose**: Get current game snapshot

**Response**:

```typescript
{
  success: boolean,
  state: {
    gameTime: number,
    state: 'waiting' | 'countdown' | 'active' | 'round-ended' | 'finished',
    currentRound: number,
    mode: string,
    playerCount: number,
    alivePlayers: number,
    players: Array<{...}>
  }
}
```

---

### `POST /api/game/stop`

**Purpose**: Emergency stop current game

**Response**:

```typescript
{
  success: boolean,
  message: string
}
```

---

### `GET /api/game/settings`

**Purpose**: Get current settings including sensitivity, game mode, theme, and available options. Settings are persisted to disk and survive server restarts.

**Response**:

```typescript
{
  success: boolean,
  sensitivity: string,       // Current preset key ("low" | "medium" | "high" | "extreme" | "oneshot" | "custom")
  gameMode: string,          // Current default game mode (e.g., "role-based", "classic")
  theme: string,             // Current default theme (e.g., "standard", "halloween")
  movement: {
    dangerThreshold: number, // 0-1, intensity above which damage occurs
    damageMultiplier: number,// Multiplier for excess movement damage
    oneshotMode: boolean     // Any movement above threshold = instant death
  },
  presets: Array<{           // Available sensitivity presets
    key: string,
    label: string,
    description: string,
    damageMultiplier: number,
    oneshotMode?: boolean
  }>,
  modes: Array<{             // Available game modes
    key: string,
    name: string,
    description: string
  }>,
  themes: string[]           // Available role themes
}
```

---

### `POST /api/game/settings`

**Purpose**: Update game settings. All fields are optional — only provided fields are updated. Settings are persisted to `server/data/settings.json`.

**Request** (can combine multiple):

```typescript
{
  sensitivity?: string,       // Preset key: "low" | "medium" | "high" | "extreme" | "oneshot"
  gameMode?: string,          // Game mode key: "classic" | "role-based"
  theme?: string,             // Theme name: "standard" | "halloween" | etc.
  dangerThreshold?: number,   // 0.001-1 (custom sensitivity)
  damageMultiplier?: number   // 1-500 (custom sensitivity)
}
```

**Response**:

```typescript
{
  success: boolean,
  sensitivity: string,       // Current preset key or "custom"
  gameMode: string,          // Current game mode preference
  theme: string,             // Current theme preference
  movement: {
    dangerThreshold: number,
    damageMultiplier: number,
    oneshotMode: boolean
  }
}
```

**Note**: When `/api/game/launch` is called without `mode` or `theme`, it uses the persisted preferences from settings.

---

### `POST /api/game/create` (Deprecated)

**Purpose**: Create game lobby without starting. Use `/api/game/launch` instead.

**Request**:

```typescript
{
  mode: string,
  theme?: string
}
```

---

### `POST /api/game/start` (Deprecated)

**Purpose**: Start game with explicit player list. Use `/api/game/launch` instead.

**Request**:

```typescript
{
  players: Array<{ id: string, name: string, socketId: string }>
}
```

---

### `GET /api/player/:playerId/role`

**Purpose**: Get player's assigned role

**Response**:

```typescript
{
  success: boolean,
  role: { name: string, displayName: string, description: string, difficulty: string },
  player: { id: string, name: string, number: number, isAlive: boolean, points: number }
}
```

---

### `GET /api/player/:playerId/state`

**Purpose**: Get player's current state including status effects

**Response**:

```typescript
{
  success: boolean,
  player: {
    id: string,
    name: string,
    number: number,
    role: string,
    isAlive: boolean,
    points: number,
    totalPoints: number,
    toughness: number,
    statusEffects: Array<{ type: string, priority: number, timeLeft: number | null }>
  }
}
```

---

### `POST /api/player/reconnect`

**Purpose**: Reconnect with session token (HTTP alternative to Socket.IO reconnect)

**Request**:

```typescript
{
  token: string
}
```

---

## Auto-Reconnection Logic

```typescript
// On disconnect, attempt to reconnect using stored session token
socket.on("disconnect", (reason) => {
  const sessionToken = localStorage.getItem("sessionToken");
  if (!sessionToken) return;

  // Socket.IO handles reconnection automatically.
  // On reconnect, emit player:reconnect with session token.
  socket.emit("player:reconnect", { token: sessionToken });
});

socket.on("player:reconnected", (data) => {
  if (data.success) {
    updatePlayerState(data.player);
  } else {
    localStorage.removeItem("sessionToken");
    navigate("/join");
  }
});
```

---

## API Base URL Configuration

```typescript
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
```

**Environment Variables** (`.env` file):

```bash
# Development
VITE_API_BASE_URL=http://localhost:3000

# Production (same machine)
VITE_API_BASE_URL=http://localhost:3000

# Production (separate machines)
VITE_API_BASE_URL=http://192.168.1.100:3000
```

---

Next: see `client-structure.md` →
