# Domination Mode — Specification

## Overview

Domination is a team-based objective mode inspired by UT's domination. Teams compete to control physical "bases" (phones placed in the play area). Holding a base earns points over time. The first team to reach the point threshold wins.

Unlike other modes where staying still is the only mechanic, Domination adds spatial objectives — players must physically move to bases to capture them, while still managing their movement sensitivity. Dead players respawn after a delay at their team's spawn area.

## How It Works (Player Rules)

### Setup

1. The admin places 1–3 phones in the play area as **bases**. Each base phone connects via a special `/base` URL.
2. Players join on their own phones as usual, then are assigned to teams during pre-game.
3. Each team has a physical "spawn area" somewhere in the play area (not enforced by the game — this is a social contract).

### Gameplay

- **Objective**: Control bases to earn points. First team to reach the point target wins.
- **Capturing a base**: Walk to a base phone and tap it. Each tap cycles the base to the next team (Red → Blue → Green → Red → ...). Keep tapping until the base shows your team's color.
- **Scoring**: Every 5 seconds a base stays under the same team's control, that team earns 1 point.
- **Dying**: If you move too much, you die and must return to your team's spawn area. Your phone shows a 10-second respawn countdown. You cannot interact with bases while dead.
- **Winning**: The first team to reach the configured point target (default 20) wins immediately.

### Tips

- Coordinate with your team: some players guard bases while others attack.
- A base only scores if it stays uncontested for the full 5-second interval.
- With multiple bases, spreading out is more effective than grouping.

## Core Rules

- **Teams required**: Always played with 2–4 teams
- **Bases**: 1–3 configurable base phones
- **Control scoring**: 1 point per base per 5-second uninterrupted hold
- **Win condition**: First team to reach the point target wins (default 20)
- **Respawn**: 10-second respawn timer after death
- **No roles**: Uses `BasePlayer` (no role assignments)
- **No round system**: Single continuous game until a team wins
- **SpeedShift**: Enabled

## Base Phone

### Connection

Base phones connect via a dedicated `/base` route (not `/player`). On connecting, a base phone:
1. Navigates to `/base`
2. Sends a `base:register` socket event
3. Server assigns a `baseId` and acknowledges with `base:registered`
4. Dashboard shows the base as a connected control point

### Base States

Each base is in one of these states:
- **Neutral** (initial): No team controls it. Shown as gray/white. No points awarded.
- **Controlled by Team N**: Shows that team's color. Starts the 5-second scoring timer.

### Tap Cycling

Taps are only processed during the active game state. Before the game starts (lobby, pre-game, countdown) and after it ends, taps are ignored. All bases start neutral at "GO!".

When a base phone is tapped during active play:
1. Base advances to the next team in sequence: Neutral → Team 1 → Team 2 → ... → Team 1 → ...
2. Server resets the 5-second control timer for this base (the new team must hold for a full 5s to score)
3. Server broadcasts `base:captured` event with new owner
4. Base phone updates its display to show the new team's color

There is no tap cooldown. Two players spam-tapping a contested base will prevent either team from scoring — holding area control IS the gameplay. Teams must push opponents away from a base to score.

**Note**: The first tap always switches from Neutral to Team 1 (Red). Subsequent taps cycle through teams in order. With 2 teams, every tap toggles between them. With 3+ teams, players tap until they see their team's color — this is intentionally simple rather than requiring player identification.

### Base Phone UI

The base phone screen is minimal and designed to be visible from a distance:
- **Base number**: Always visible, large and centered. Displayed as `BASE 1` (or `BASE 2`, `BASE 3`) in a distinct style — the number uses a gold/amber color (#F59E0B) with a hexagonal or diamond-shaped outline behind it, clearly differentiating it from player phones which show plain white `#1` numbers. The "BASE" label above the number makes it unmistakable.
- **Neutral**: Dark background, gold base number, "TAP TO CAPTURE" text below
- **Controlled**: Full-screen team color background, gold base number stays visible, team name displayed below, pulsing border animation
- **Just captured**: Brief flash animation on team change

The base phone does NOT need to show:
- Health bars, player info, or game scores
- Any admin controls
- Connection status (beyond initial setup)

### Base Disconnect

If a base phone disconnects mid-game (battery dies, browser crash, etc.):
- The base **keeps its current owner** (state is preserved server-side)
- The scoring timer **pauses** — no points are awarded while disconnected
- The dashboard shows the base as disconnected (grayed-out indicator)
- When the base phone reconnects, it resumes from its previous state and the scoring timer restarts

## Scoring

### Point Accumulation

Points are tracked per-team (not per-player). Each base has an independent 5-second timer:

1. Team captures a base → timer resets to 0
2. Timer ticks up each game tick (100ms increments)
3. When timer reaches 5000ms → award 1 point to the controlling team, reset timer to 0
4. If ownership changes before 5s → timer resets, no point awarded

With multiple bases, each base scores independently. A team controlling 2 bases earns 2 points every 5 seconds.

### Win Check

On every point award, the server checks if any team has reached the point target. If so:
1. The game ends immediately
2. The winning team is announced
3. Dashboard shows final scores

### Scoreboard

The scoreboard (displayed on game end) shows:
- Team name and color
- Total points
- Sorted by points descending

## Respawn Mechanic

### Death → Respawn Flow

1. Player's accumulated damage reaches death threshold → `die()` is called
2. Player stays dead (`isAlive = false`) for 10 seconds
3. Player's phone shows "Return to spawn! Respawning in 10... 9..." countdown
4. During respawn, the player physically walks back to their team's spawn area
5. On respawn:
   - `player.isAlive = true`
   - `player.accumulatedDamage = 0`
   - Clear all status effects
   - Emit `player:respawn` event
6. Player is immediately vulnerable after respawn

### Phone Audio During Respawn

- **At death**: Death SFX
- **At 3 seconds remaining**: TTS `"respawning in 3, 2, 1"`
- **At 0 seconds**: Respawn SFX

## Game Flow

### Pre-game

Base phones can connect at any time — before or during the game. They simply navigate to `/base` and are registered immediately. The dashboard shows how many bases are connected (e.g., "Bases: 1/2") so the admin knows when all bases are ready.

The rest follows the same flow as other team modes:
1. Admin enables teams, configures settings (including base count)
2. Admin places base phones in the play area — they connect via `/base`
3. Players join and are assigned to teams
4. Admin clicks "Start Game" → enters pre-game
5. Players can tap to switch teams, shake to ready

The game can launch even if fewer bases than configured are connected (the admin decides when it's ready). If more bases connect mid-game, they join as neutral bases.

### Countdown

After pre-game, the countdown phase has a special addition for Domination:
1. Dashboard voice: **"Game is about to start, position on your spawn points!"**
2. When ended (~3s) standard countdown starts: **"3... 2... 1... GO!"**
3. Total countdown duration: ~6 seconds

### Active Game

- No round timer — game runs until a team wins
- SpeedShift game events are active
- Dashboard shows: base statuses, team scores, player grid

### Game End

When a team reaches the point target:
1. Game ends immediately
2. Dashboard announces winning team (voice + visual)
3. Scoreboard appears with final standings
4. Admin can return to lobby

## Settings

### New Settings

| Setting | Key | Default | Range | Description |
|---------|-----|---------|-------|-------------|
| Point target | `dominationPointTarget` | 20 | 5–100 | Points needed to win |
| Control interval | `dominationControlInterval` | 5 | 3–15 | Seconds of control needed per point |
| Respawn time | `dominationRespawnTime` | 10 | 5–30 | Seconds before respawn |
| Base count | `dominationBaseCount` | 1 | 1–3 | Number of bases expected |

These appear in the admin settings panel when Domination mode is selected.

### Settings API

`GET /api/game/settings` response includes:
```json
{
  "dominationPointTarget": 20,
  "dominationControlInterval": 5,
  "dominationRespawnTime": 10,
  "dominationBaseCount": 1
}
```

`POST /api/game/settings` accepts the same fields.

## Socket Events

### New: `base:register`

Client → Server. Sent by a base phone when it connects.

```typescript
// Base phone → Server
{
  // No payload needed — server assigns an ID
}
```

### New: `base:registered`

Server → Client (to the base phone). Confirms registration.

```typescript
// Server → Base phone
{
  baseId: string;
  baseNumber: number;  // 1-indexed display number
}
```

### New: `base:tap`

Client → Server. Sent when someone taps the base phone.

```typescript
// Base phone → Server
{
  baseId: string;
}
```

### New: `base:captured`

Server → All clients. Broadcast when a base changes ownership.

```typescript
// Server → All clients (including base phones)
{
  baseId: string;
  baseNumber: number;
  teamId: number;        // New controlling team
  teamName: string;      // "Red Team", "Blue Team", etc.
  teamColor: string;     // Hex color for display
}
```

### New: `base:point`

Server → All clients. Broadcast when a base awards a point.

```typescript
// Server → All clients
{
  baseId: string;
  baseNumber: number;
  teamId: number;
  teamScores: Record<number, number>;  // All team scores after this point
}
```

### New: `domination:win`

Server → All clients. Broadcast when a team wins.

```typescript
// Server → All clients
{
  winningTeamId: number;
  winningTeamName: string;
  teamScores: Record<number, number>;
}
```

### New: `base:status`

Server → All clients. Periodic update of all base states. Sent every tick as part of the game state, or as a standalone event.

```typescript
// Server → All clients
{
  bases: Array<{
    baseId: string;
    baseNumber: number;
    teamId: number | null;    // null = neutral
    controlProgress: number;  // 0-1, how close to scoring the next point
  }>;
}
```

### Reused Events

- `player:respawn` and `player:respawn-pending` — same as Death Count mode
- `game:tick` — includes player data as usual
- `team:update` — team assignments

## Dashboard UI

### Base Status Display

The dashboard shows each base's current state:
- **Base indicator**: Colored circle/badge for each base (1–3)
- **Team color**: Matches the controlling team, gray if neutral
- **Progress ring**: Visual 0–100% progress toward the next point
- **Score display**: Prominent team scores near the top

### Player Grid

Same as other team modes — players grouped by team, showing alive/dead status. Dead players show respawn countdown.

### Audio Cues (Dashboard)

- **Base captured**: Voice from dashboard: `"Blue Team captured Base 1"`. Debounced — only triggers after the base has been held by the same team for 1 second without changing, so rapid tap-cycling through teams (e.g., 3+ team games) doesn't spam the announcement.
- **Point scored**: SFX tick plays on the base phone (not dashboard) so nearby players hear it. Dashboard plays a subtle visual pulse on the base indicator instead.
- **Score milestones**: Voice at 50% and 75% of target: `"Red Team halfway there"`, `"Blue Team at 15 points"`
- **Game won**: Victory fanfare + `"Red Team wins!"`

## Implementation Plan

### Server

1. **`DominationMode`** (`server/src/gameModes/DominationMode.ts`):
   - Extends `GameMode`
   - Manages bases, control timers, team scores
   - Respawn logic (10s delay) — extracted into a shared `RespawnManager` utility used by both DeathCountMode and DominationMode, since the core respawn flow (track pending respawns, countdown, revive with full HP, emit events) is identical. Only the respawn duration differs (5s vs 10s, configurable).
   - Win condition: first team to point target
   - SpeedShift game events

2. **Base management** (within DominationMode or as a helper):
   - `bases: Map<string, BaseState>` tracking each base
   - Control timer per base
   - Tap handler: cycle team ownership
   - Point awarding on 5s intervals

3. **Socket handlers** (`server.ts`):
   - `base:register` → register base phone
   - `base:tap` → handle tap, cycle ownership
   - Broadcast base events

4. **Settings** (`gameConfig.ts`):
   - Add domination-specific settings with defaults

5. **Routes**:
   - Validate base count before launching domination mode

### Client

6. **New `/base` route and view** (`client/src/pages/BaseView.tsx`):
   - Minimal full-screen UI
   - Shows team color + name when controlled
   - Handles tap events
   - Registers with server on mount

7. **Dashboard updates**:
   - Base status indicators
   - Team score display
   - Dashboard audio cues for captures and scoring

8. **Player screen**:
   - Same as Death Count mode for respawn UI
   - No special domination-specific player UI needed

9. **Admin settings**:
   - Domination-specific settings (point target, control interval, respawn time, base count)
   - Shown when domination mode is selected

### Docs

10. Update `docs/communication.md` — Document new socket events
11. Update `docs/settings.md` — Document new settings

### Tests

12. **Server unit tests** — Base capture cycling, scoring intervals, win condition, respawn timing, multi-base scoring
13. **Client unit tests** — BaseView rendering, tap events, score display
14. **E2e tests** — Full domination game flow (base register → capture → scoring → win)
