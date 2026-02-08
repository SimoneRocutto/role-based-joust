# Death Count Mode — Specification

## Overview

Death Count is a time-based survival mode where players respawn after dying. The player who dies the fewest times during the round wins. Unlike Classic/RoleBased modes where death is permanent and the round ends when one player remains, Death Count rounds run on a fixed timer and players come back to life after a 5-second respawn delay.

## Core Rules

- **Round duration**: 90 seconds by default, configurable in settings
- **Respawn**: When a player dies, they stay dead for 5 seconds, then automatically respawn with full health
- **No roles**: Uses `BasePlayer` (no role assignments)
- **Scoring**: Rank-based — fewer deaths = more points (see Scoring section)
- **Multi-round**: 3 rounds by default (uses the existing `roundCount` setting)
- **SpeedShift**: Enabled (same as Classic mode)

## Respawn Mechanic

### Death → Respawn flow

1. Player's accumulated damage reaches `deathThreshold` → `die()` is called
2. Mode's `onPlayerDeath()` increments the player's death counter
3. Mode records `respawnAt = gameTime + 5000` for this player
4. Player stays dead (`isAlive = false`) for 5 seconds — no damage processing
5. During this time, the physical player should walk away from where they died (this is communicated to them via the player screen showing a "Walk away! Respawning in X..." message)
6. On respawn tick (`gameTime >= respawnAt`):
   - `player.isAlive = true`
   - `player.accumulatedDamage = 0`
   - Clear all status effects
   - Emit `player:respawn` event
7. Player is immediately vulnerable after respawn (no invulnerability period — the 5s walk-away time serves this purpose)

### Respawn near round end

If a player dies within the last 5 seconds of the round, they stay dead until round end. No respawn is needed since the round is about to finish.

## Scoring

### Per-round scoring: "players beaten"

Each player's round points = number of players who died MORE times than them.

Example with 4 players:
| Player | Deaths | Players with more deaths | Round points |
|--------|--------|--------------------------|--------------|
| Alice  | 2      | 3 (Bob, Carol, Dave)     | 3            |
| Bob    | 4      | 1 (Dave)                 | 1            |
| Carol  | 4      | 1 (Dave)                 | 1            |
| Dave   | 7      | 0                        | 0            |

Tied players earn the same points. The last-place player always earns 0.

### Multi-round totals

Round points transfer to `totalPoints` at the end of each round (same as Classic). After all rounds, the player with the highest `totalPoints` wins.

### Team mode compatibility

This scoring system works naturally with future team mode: sum each team member's points. The "players beaten" metric is individual, so team aggregation is straightforward.

## Round Timer

### Server-side

The mode uses the existing `roundDuration` property on `GameMode`. The `checkWinCondition()` method checks `engine.gameTime >= this.roundDuration` to end the round.

The remaining time is sent to clients via a new field in the `game:tick` payload:
```typescript
// Added to tick payload
roundTimeRemaining: number | null  // milliseconds remaining, null if no time limit
```

This field is `null` for modes without a time limit (Classic, RoleBased) and a number for Death Count. This avoids mode-specific branching on the client — the dashboard simply shows the timer when the value is non-null.

### Client-side (dashboard only)

- Display a countdown timer on the dashboard (MM:SS format)
- Timer is visible during the `active` game state
- Player screens do NOT show the timer

### Audio cues (dashboard TTS)

The dashboard plays TTS announcements at specific times:
- **30 seconds remaining**: `"30 seconds left"`
- **5, 4, 3, 2, 1**: `"5"`, `"4"`, `"3"`, `"2"`, `"1"`
- **0 (round end)**: `"Time up!"`

These are triggered client-side by the dashboard when `roundTimeRemaining` crosses the thresholds. The server does not need to emit special events for this — the client derives it from the tick data.

## Death Count in Tick Payload

Player death counts need to be visible on the dashboard player cards. Add a new field to each player entry in the `game:tick` payload:

```typescript
// Added to player data in tick payload
deathCount: number  // 0 for modes that don't track deaths
```

The mode tracks deaths internally in a `Map<string, number>`. The engine reads this from the mode when building the tick payload, via a new optional method on `GameMode`:

```typescript
// New optional method on GameMode base class
getPlayerDeathCount(playerId: string): number {
  return 0; // Default: no death tracking
}
```

DeathCountMode overrides this to return from its internal map.

## Socket Events

### New: `player:respawn`

Emitted when a player respawns after the 5-second delay.

```typescript
// Server → Client
{
  playerId: string;
  playerName: string;
  playerNumber: number;
  gameTime: number;
}
```

This event is designed to be reusable by future features (e.g., Zombie role in RoleBased mode). The client uses it to:
- Un-skull the player on the dashboard player grid
- Show a respawn animation/indicator on the dashboard
- Update the player's own screen from "dead/walk away" to "active"
- Play the `respawn` SFX on the player's phone

### New: `player:respawn-pending`

Emitted when a player dies and a respawn is scheduled. Sent **only to the dying player** so their phone can start the respawn countdown UX.

```typescript
// Server → Client (targeted to the dying player)
{
  respawnIn: number;  // milliseconds until respawn (5000)
}
```

The player's phone uses this to:
- Show the "Walk away! Respawning in X..." screen
- At 3 seconds remaining, play TTS: `"respawning in 3, 2, 1"`
- At 0, play the `respawn` SFX (triggered by the `player:respawn` event)

### Modified: `game:tick`

Add two optional fields to the tick payload:

```typescript
{
  gameTime: number;
  roundTimeRemaining: number | null;  // NEW — null for untimed modes
  players: [
    {
      id: string;
      name: string;
      isAlive: boolean;
      accumulatedDamage: number;
      points: number;
      totalPoints: number;
      toughness: number;
      deathCount: number;           // NEW — 0 for modes without death tracking
      isDisconnected: boolean;
      disconnectedAt: number | null;
      graceTimeRemaining: number | null;
    }
  ]
}
```

## Settings

### New setting: `roundDuration`

Add `roundDuration` to `UserPreferences`:

```typescript
interface UserPreferences {
  sensitivity: string;
  gameMode: string;
  theme: string;
  roundCount: number;
  roundDuration: number;  // NEW — seconds, default 90
}
```

- Persisted to `settings.json`
- Exposed via `GET /api/game/settings` and `POST /api/game/settings`
- Only used by modes that have `roundDuration !== null` — the mode reads this from preferences when selected
- The dashboard settings UI shows a round duration input (number field or slider) that appears when a timed mode is selected

### Settings API changes

`GET /api/game/settings` response adds:
```json
{
  "roundDuration": 90
}
```

`POST /api/game/settings` accepts:
```json
{
  "roundDuration": 120
}
```

Valid range: 30–300 seconds.

## Player Screen Changes

### During respawn (dead, waiting to respawn)

When the player is dead and has a pending respawn, their screen shows:
- A "Walk away!" message (prominent)
- Visual countdown to respawn: "Respawning in 5... 4... 3... 2... 1..."
- Their current death count

#### Phone audio cues during respawn

The player's phone plays TTS and SFX during the respawn countdown:
- **At 3 seconds remaining**: TTS `"respawning in 3, 2, 1"` (spoken from the phone)
- **At 0 seconds (respawn moment)**: Play the `respawn` SFX

This gives the player an audio signal that they're about to re-enter the game without needing to look at their screen.

### During active play

The player screen in Death Count mode is the same as Classic mode — no timer, no special UI beyond the existing health/damage display.

### Death count display

The player's death count is shown on their screen during active play (small, non-intrusive). This gives them awareness of their standing.

## Dashboard Changes

### Player cards

Each player card on the dashboard grid shows:
- Existing: name, number, health bar, alive/dead status
- New: death count badge (e.g., skull icon with number) — only shown when `deathCount > 0`

### Round timer

A prominent timer display on the dashboard during active rounds. Positioned at the top or center, large enough for spectators to see from a distance.

### Scoreboard (round end)

The round-end scoreboard shows:
- Player name
- Deaths this round
- Points this round
- Total points (cumulative)
- Sorted by total points (descending)

## Implementation Plan

### Server changes

1. **`GameMode` base class** — Add optional `getPlayerDeathCount(playerId)` method (returns 0 by default)
2. **`GameEngine`** — Include `deathCount` and `roundTimeRemaining` in tick payload by reading from mode
3. **`DeathCountMode`** (`server/src/gameModes/DeathCountMode.ts`) — New file:
   - Extends `GameMode`
   - Sets `roundDuration` from settings, `multiRound = true`, `roundCount` from settings
   - Tracks `deathCounts: Map<string, number>` and `pendingRespawns: Map<string, number>`
   - `onPlayerDeath()`: increment death count, schedule respawn
   - `onTick()`: check pending respawns, tick SpeedShift events
   - `checkWinCondition()`: check time elapsed, award points on round end
   - `calculateFinalScores()`: sort by totalPoints
   - `onRoundEnd()`: transfer points, cleanup
   - `getPlayerDeathCount()`: return from map
4. **`GameEvents`** — Add `emitPlayerRespawn()` and `onPlayerRespawn()` helpers
5. **`server.ts`** — Broadcast `player:respawn` event
6. **Settings** (`gameConfig.ts`) — Add `roundDuration` to `UserPreferences`, default 90
7. **Settings routes** — Accept and validate `roundDuration` in POST endpoint

### Client changes

8. **`socketService`** — Add `onPlayerRespawn()` listener
9. **`useSocket` hook** — Handle `player:respawn` event (update player store)
10. **`gameStore`** — Add `roundTimeRemaining` state, `deathCounts` map
11. **Dashboard timer component** — New component showing MM:SS countdown
12. **Dashboard TTS cues** — Trigger `audioManager.speak()` at 30s, 5-4-3-2-1-0
13. **Dashboard player cards** — Show death count badge when `deathCount > 0`
14. **Player screen** — Show respawn countdown when dead in death-count mode, show death count during play
15. **Settings UI** — Add round duration input (shown for timed modes)

### Docs

16. Update `docs/communication.md` — Document `player:respawn` event and tick payload changes
17. Update `docs/settings.md` — Document `roundDuration` setting

### Tests

18. **Server unit tests** — DeathCountMode scenarios (respawn timing, death counting, scoring with ties, round end on time, cleanup on game end)
19. **Client unit tests** — Timer display, TTS cue triggers, respawn event handling, death count display
20. **E2e tests** — Full death count game flow (start → deaths → respawns → round end → scoring)
