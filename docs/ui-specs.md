# Extended Joust - Complete Specification

## UI Specifications

---

## 📱 1. Join View (`/join`)

### Purpose

Player enters their name and joins the game lobby.

### Layout (Portrait Mobile)

```
┌─────────────────────────────┐
│                             │
│    EXTENDED JOUST           │
│                             │
│  ┌─────────────────────────┐│
│  │ Enter your name...      ││
│  └─────────────────────────┘│
│                             │
│      [JOIN GAME]            │
│                             │
│  Lobby Code: #GAME-1234     │
│                             │
└─────────────────────────────┘
```

### Functionality

**Input Validation**:

- Name: 1-20 characters, alphanumeric + spaces
- Trim whitespace
- Prevent duplicate names (server validates)

**Connection Flow**:

1. User enters name
2. Click "Join Game" button
3. Client generates `playerId` (UUID)
4. Emit `socket.emit('player:join', { playerId, name })`
5. Wait for `player:joined` response
6. Store `sessionToken` in `localStorage`
7. Redirect to `/player`

**Error Handling**:

| Error                | UI Response                                                     |
| -------------------- | --------------------------------------------------------------- |
| Empty name           | Show "Name required" below input                                |
| Name taken           | Show "Name already in use"                                      |
| Server offline       | Show "Cannot connect. Check WiFi and try again." + Retry button |
| Game already started | Show "Game in progress. Wait for next game."                    |

### Component Structure

```tsx
// JoinView.tsx
function JoinView() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (name.trim().length === 0) {
      setError("Name required");
      return;
    }

    setJoining(true);
    socket.emit("player:join", {
      playerId: generateUUID(),
      name: name.trim(),
    });
  };

  useEffect(() => {
    socket.on("player:joined", (data) => {
      if (data.success) {
        localStorage.setItem("sessionToken", data.sessionToken);
        localStorage.setItem("playerId", data.playerId);
        localStorage.setItem("playerNumber", data.playerNumber.toString());
        navigate("/player");
      }
    });

    socket.on("error", ({ message }) => {
      setError(message);
      setJoining(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-4xl font-bold text-white text-center">
          EXTENDED JOUST
        </h1>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
          className="w-full px-4 py-3 text-xl rounded-lg"
          maxLength={20}
          disabled={joining}
        />

        {error && <p className="text-red-400 text-center">{error}</p>}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg"
        >
          {joining ? "JOINING..." : "JOIN GAME"}
        </button>

        <p className="text-gray-400 text-center text-sm">
          Lobby Code: #GAME-1234
        </p>
      </div>
    </div>
  );
}
```

---

## 📱 2. Player View (`/player`)

### Purpose

Main game interface displayed on player's phone (chest-mounted, portrait mode).

### States

#### 2.1 Lobby State (Before Game Starts)

```
┌─────────────────┐
│ ● Connected 75% │ ← Status bar
├─────────────────┤
│                 │
│   #7            │ ← Player number (large)
│   Alice         │ ← Player name
│                 │
│  Waiting for    │
│  game to start…│
│                 │
└─────────────────┘
```

**Display**:

- Player number (large, prominent)
- Player name
- "Waiting for game to start..." message
- Connection indicator
- Battery percentage
- No shake-to-ready in lobby — ready state has moved to the pre-game phase

#### 2.2 Pre-Game State (After Admin Launches Game)

```
┌─────────────────┐
│ ● Connected 75% │ ← Status bar
├─────────────────┤
│                 │
│  MODE RECAP     │
│  Role-Based     │ ← Mode name
│  3 rounds       │ ← Round count
│  Medium         │ ← Sensitivity label
│                 │
│   #7  Alice     │ ← Player number + name
│                 │
│  SHAKE TO READY │ ← Shake prompt (or click in dev mode)
│  ✓ READY        │ ← Shown after shaking
│                 │
└─────────────────┘
```

**Display**:

- Mode recap: mode name, round count, sensitivity label
- Player number and name
- Shake-to-ready prompt (or click in dev mode)
- Ready confirmation once the player has readied up

#### 2.3 Active Game State (Playing)

```
┌─────────────────┐
│ ● Connected 75% │ ← Status bar (5% height)
├─────────────────┤
│█████████████████│
│█████████████████│
│█████████████████│
│██████ 7 ████████│ ← Colored background (70% height)
│█████████████████│   Number = white (giant)
│█████████████████│   Background color = health status
│█████████████████│
├─────────────────┤
│   🛡️ 2s         │ ← Info bar (25% height)
│                 │   Status effects
│   🎯 Target:#3  │   Target display (if applicable)
│     Pts: 15     │   Current points
└─────────────────┘
```

**Number Size**: Responsive based on screen size

- Small phones (<375px): `180px` font
- Normal phones (375-767px): `220px` font
- Large phones/tablets (>768px): `280px` font

**Background Colors** (Health-based):

| Health  | Background Gradient         | Number Color    | Special Effect         |
| ------- | --------------------------- | --------------- | ---------------------- |
| 80-100% | `#065f46 → #047857` (green) | White           | None                   |
| 40-79%  | `#92400e → #d97706` (amber) | **Black**       | None                   |
| <40%    | `#7f1d1d → #dc2626` (red)   | White           | **Pulsing** (1s cycle) |
| Dead    | `#1f2937` (gray)            | `#6b7280` (dim) | Static                 |

**Special States** (Override health colors):

| State        | Background                     | Number | Effect          | Trigger             |
| ------------ | ------------------------------ | ------ | --------------- | ------------------- |
| Invulnerable | `#e5e5e5 → #ffffff` (white)    | Black  | Glow pulse      | Angel ability, etc. |
| Bloodlust    | `#450a0a → #dc2626` (deep red) | White  | Heartbeat pulse | Vampire role        |

#### 2.4 Dead State

```
┌─────────────────┐
│ ● Connected 70% │
├─────────────────┤
│                 │
│                 │
│      💀         │ ← Skull emoji (80px)
│                 │
│   ELIMINATED    │ ← Text (32px)
│                 │
│                 │
└─────────────────┘
```

**Display**:

- Gray background (`#1f2937`)
- Large skull emoji (`80px`)
- "ELIMINATED" text
- Static (no updates to save battery)
- Still shows connection status (for reconnection)

### Info Bar Components

**Status Effects** (Top-left):

```tsx
// Shows only active effects (max 3)
<div className="flex gap-2 items-center">
  {hasInvulnerability && <span className="text-2xl">🛡️ {timeLeft}s</span>}
  {isBloodlust && <span className="text-2xl">🧛 {timeLeft}s</span>}
  {isStunned && <span className="text-2xl">❄️ {timeLeft}s</span>}
</div>
```

**Target Display** (Middle):

```tsx
// For roles with targets (Beast Hunter)
{
  hasTarget && <div className="text-xl">🎯 Target: #{targetNumber}</div>;
}
```

**Points** (Bottom-right):

```tsx
<div className="text-lg text-gray-400">Pts: {currentPoints}</div>
```

### Portrait Lock

If landscape detected:

```
┌──────────────────────────────────┐
│                                  │
│         ↻ ROTATE TO PORTRAIT     │
│                                  │
└──────────────────────────────────┘
```

Fullscreen overlay with rotation icon and message.

### Connection States

**Connected** (Green dot):

```tsx
<div className="flex items-center gap-2">
  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
  <span className="text-sm">Connected</span>
</div>
```

**Reconnecting** (Yellow dot, pulsing):

```tsx
<div className="flex items-center gap-2">
  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
  <span className="text-sm">Reconnecting...</span>
</div>
```

**Disconnected** (Red dot):

```tsx
<div className="flex items-center gap-2">
  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
  <span className="text-sm">Disconnected</span>
</div>
```

---

## 🖥️ 3. Dashboard View (`/dashboard`)

### Purpose

Public scoreboard projected on wall/large screen (landscape, 1920x1080+).

### Layout

```
┌───────────────────────────────────────────────────────────────┐
│ EXTENDED JOUST      Round 2/3              [ROLE-BASED]       │
│ ⏱️ 02:35 remaining                         🎵 Playing...      │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┏━━━━━━━┓  ┏━━━━━━━┓  ┏━━━━━━━┓  ┏━━━━━━━┓                   │
│  ┃ #1    ┃  ┃ #2    ┃  ┃ #3    ┃  ┃ #4    ┃   [Grid 4x4]      │
│  ┃ Alice ┃  ┃ Bob   ┃  ┃ Carol ┃  ┃ Dave  ┃                   │
│  ┃       ┃  ┃       ┃  ┃       ┃  ┃  💀   ┃                   │
│  ┃ 🛡️    ┃  ┃       ┃  ┃ 🧛    ┃  ┃       ┃                   │
│  ┗━━━━━━━┛  ┗━━━━━━━┛  ┗━━━━━━━┛  ┗━━━━━━━┛                   │
│                                                               │
│  [... 3 more rows of player cards ...]                        │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  🔴 LIVE: "Player #4 eliminated!"          ALIVE: 12 / 16     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Header Section

**Left**: Game title + round info

```tsx
<div>
  <h1 className="text-4xl font-bold">EXTENDED JOUST</h1>
  <p className="text-xl">
    Round {currentRound}/{totalRounds}
  </p>
</div>
```

**Center**: Timer

```tsx
<div className="text-3xl font-mono">
  ⏱️ {formatTime(timeRemaining)} remaining
</div>
```

**Right**: Mode badge + audio indicator

```tsx
<div className="flex items-center gap-4">
  <div className="px-4 py-2 bg-blue-600 rounded-lg text-xl">[ROLE-BASED]</div>
  {isPlayingMusic && <span className="text-lg">🎵 Playing...</span>}
</div>
```

### Player Grid

**Grid Layout**:

- 12 players: `4x3` grid
- 16 players: `4x4` grid
- 20 players: `5x4` grid

**Card Sizing**:

```typescript
const cardWidth = playerCount <= 12 ? 280 : playerCount <= 16 ? 250 : 220;
const gap = playerCount <= 16 ? 16 : 12;
```

**Sorting Algorithm**:

```typescript
const sortPlayers = (players: Player[]) => {
  return [...players].sort((a, b) => {
    // Dead players last
    if (a.isAlive && !b.isAlive) return -1;
    if (!a.isAlive && b.isAlive) return 1;

    // Both alive or both dead: sort by number
    return a.number - b.number;
  });
};
```

**IMPORTANT**: Do NOT sort by health. Dead players go to bottom, but alive players stay in number order.

### Player Card Design

```
┏━━━━━━━━━━━┓ ← Colored border (4px, glowing)
┃ #7  Grace ┃ ← Number (48px) + Name (32px)
┃ ████████  ┃ ← Health bar (NO HEALTH BAR, REMOVED)
┃ 🛡️        ┃ ← Status icon (40px, if active)
┗━━━━━━━━━━━┛
  ↑ Colored background tint (10% opacity)
```

**Border & Background Colors**:

| Health  | Border Color                        | Background Tint           | Glow Effect                                   |
| ------- | ----------------------------------- | ------------------------- | --------------------------------------------- |
| 80-100% | `rgba(16, 185, 129, 0.8)` green     | `rgba(16, 185, 129, 0.1)` | `0 0 20px rgba(16, 185, 129, 0.4)`            |
| 40-79%  | `rgba(245, 158, 11, 0.8)` amber     | `rgba(245, 158, 11, 0.1)` | `0 0 20px rgba(245, 158, 11, 0.4)`            |
| <40%    | `rgba(239, 68, 68, 0.9)` red        | `rgba(239, 68, 68, 0.15)` | `0 0 30px rgba(239, 68, 68, 0.6)` **PULSING** |
| Dead    | `rgba(107, 114, 128, 0.3)` dim gray | `rgba(31, 41, 55, 0.5)`   | None, opacity: 0.6                            |

**Status Icons** (Priority Display, show only ONE):

1. 🛡️ Invulnerable
2. 🧛 Vampire bloodlust
3. 🎯 Being hunted (Beast shows crosshair)
5. ❄️ Frozen/stunned

**Card Component**:

```tsx
function PlayerCard({ player }: { player: Player }) {
  const healthPercent = 1 - player.accumulatedDamage / 100;
  const isDead = !player.isAlive;

  const getBorderColor = () => {
    if (isDead) return "border-gray-500/30";
    if (healthPercent >= 0.8) return "border-green-500/80";
    if (healthPercent >= 0.4) return "border-amber-500/80";
    return "border-red-500/90";
  };

  const getGlow = () => {
    if (isDead) return "";
    if (healthPercent >= 0.8) return "shadow-[0_0_20px_rgba(16,185,129,0.4)]";
    if (healthPercent >= 0.4) return "shadow-[0_0_20px_rgba(245,158,11,0.4)]";
    return "shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse";
  };

  return (
    <div
      className={`
      relative rounded-lg border-4 p-4
      ${getBorderColor()}
      ${getGlow()}
      ${isDead ? "opacity-60" : ""}
    `}
    >
      {/* Number + Name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-5xl font-bold">#{player.number}</span>
        <span className="text-3xl">{player.name}</span>
      </div>

      {/* Status Icon (only if alive and has effect) */}
      {!isDead && player.activeStatusIcon && (
        <div className="text-4xl">{player.activeStatusIcon}</div>
      )}

      {/* Dead indicator */}
      {isDead && <div className="text-6xl">💀</div>}
    </div>
  );
}
```

### Event Feed (Bottom Bar)

```tsx
<div className="flex items-center justify-between px-8 py-4 bg-gray-800">
  {/* Live announcement */}
  <div className="flex items-center gap-2">
    {isSpeaking && (
      <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
    )}
    <span className="text-xl">{latestEvent}</span>
  </div>

  {/* Alive counter */}
  <div className="text-2xl font-bold">
    ALIVE: {aliveCount} / {totalPlayers}
  </div>
</div>
```

### Between-Rounds Screen

Full-screen leaderboard:

```
┌─────────────────────────────────────────────────────┐
│              ROUND 2 COMPLETE                       │
│                                                     │
│  🏆 LEADERBOARD                                     │
│                                                     │
│  1st  🥇  #7  Grace      25 pts  (+10 this round)   │
│  2nd  🥈  #1  Alice      20 pts  (+5 this round)    │
│  3rd  🥉  #13 Mia        18 pts  (+8 this round)    │
│  4th      #3  Carol      15 pts  (+3 this round)    │
│  [... all players ...]                              │
│                                                     │
│              [NEXT ROUND]                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Manual button to start next round (no auto-advance).

### Dashboard Pre-Game Panel

When the admin launches the game, the dashboard transitions to a pre-game panel:

```
┌─────────────────────────────────────────────────────┐
│              PRE-GAME                                │
│                                                     │
│  Mode: Role-Based                                   │
│  Rounds: 3                                          │
│  Sensitivity: Medium                                │
│                                                     │
│  Ready: 5 / 8 players                               │
│                                                     │
│      [START GAME]        [STOP GAME]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Display**:

- Mode recap: mode name, round count, sensitivity label
- Ready count: X/Y players ready (updates in real time)
- "START GAME" button: force-starts the game (calls `POST /api/game/proceed`), bypassing the all-ready requirement
- "STOP GAME" button: cancels back to lobby (calls `POST /api/game/stop`)

The game auto-starts when all players are ready. The admin can force-start at any time without waiting.

### Admin Controls

**Lobby (Before Game Starts)**:

```tsx
<div className="p-8 space-y-4">
  <select onChange={handleModeChange}>
    <option value="classic">Classic</option>
    <option value="death-count">Death Count</option>
    <option value="role-based">Roles</option>
    <option value="classic-team">Classic Team</option>
    <option value="death-count-team">Death Count Team</option>
    <option value="role-based-team">Roles Team</option>
  </select>

  <div>
    <h3>Connected Players: {connectedPlayers.length}</h3>
    <ul>
      {connectedPlayers.map((p) => (
        <li key={p.id}>
          #{p.number} - {p.name}
        </li>
      ))}
    </ul>
  </div>

  <button onClick={startGame}>START GAME</button>
</div>
```

**Note**: The game mode dropdown combines solo and team variants into a single "Game Mode" dropdown with 6 options (Classic, Death Count, Roles, Classic Team, Death Count Team, Roles Team), replacing the previous separate mode dropdown + team toggle.

**During Game**:

```tsx
<button onClick={emergencyStop} className="bg-red-600">
  EMERGENCY STOP
</button>
```

---

## 🎨 Design Tokens

```typescript
// constants.ts
export const HEALTH_COLORS = {
  HEALTHY: { from: "#065f46", to: "#047857" },
  DAMAGED: { from: "#92400e", to: "#d97706" },
  CRITICAL: { from: "#7f1d1d", to: "#dc2626" },
  DEAD: "#1f2937",
  INVULNERABLE: { from: "#e5e5e5", to: "#ffffff" },
  BLOODLUST: { from: "#450a0a", to: "#dc2626" },
} as const;

export const HEALTH_THRESHOLDS = {
  HEALTHY: 0.8, // 80%+
  DAMAGED: 0.4, // 40-79%
  CRITICAL: 0.0, // <40%
} as const;

export const PLAYER_NUMBER_SIZES = {
  SMALL: "180px", // <375px width
  NORMAL: "220px", // 375-767px
  LARGE: "280px", // >768px
} as const;
```

---

Next: see `communication.md` →
