# Team Mode — Feature Specification

## Overview

Team mode is a **cross-cutting option** that applies on top of any existing game mode (Classic, Death Count, Role-Based). When enabled, players are divided into N teams. Individual scores are summed per team to determine the winning team.

## Settings (Admin)

- **Enable teams**: toggle (off by default)
- **Number of teams**: 2–4 (default 2, max 4). Only visible when teams are enabled.
- Persisted in `UserPreferences` alongside existing settings.

## Team Selection Phase

Team selection is a **dedicated phase** triggered by the admin clicking "Start Game" when teams are enabled. It is a lobby sub-state (the engine stays in `waiting`), tracked by a `selectionActive` flag on `TeamManager`.

### Flow

```
Lobby (waiting)
  ├── Teams disabled → "Start Game" → launchGame() → countdown
  └── Teams enabled  → "Start Game" → team selection phase
                          ├── Dashboard: team grid + shuffle + "Start Game" + "Cancel"
                          ├── Player phones: team color + tap to switch (no ready UI)
                          └── "Start Game" → launchGame() → countdown
```

### Default Assignment
- Players assigned **sequentially by player number** when selection starts.
- Example: 16 players, 4 teams → #1–#4 = Team 1, #5–#8 = Team 2, etc.
- Admin has a **Shuffle button** that randomly redistributes all players.

### Player Phone (during selection)
- Shows **team color background + team badge**.
- **Tapping the screen** cycles to the next team (1 → 2 → ... → N → 1).
- No ready/shake UI during team selection.

### Dashboard Layout
Team grid with **N sections** with distinct team colors:

| Teams | Layout |
|-------|--------|
| 2 | Vertical split (left/right) |
| 3 | Vertical triple split (3 columns) |
| 4 | Cross/quadrant split (2×2 grid) |

Each section has **compact player cards** (number + name only).

### Admin Controls (during selection)
- Settings hidden — only shuffle, start, and cancel buttons visible.
- "Start Game" calls `launchGame()` (disabled if any team is empty).
- "Cancel" returns to normal lobby.

### Constraints
- At least 1 player per team required to start.
- At least 2 players in lobby to enter team selection.

## During Gameplay

Round mechanics unchanged. Underlying mode controls damage, death, win conditions, respawns.

### Player Phone — Health Display

Battery-style HP bar (applies to ALL modes):
- **Non-team modes**: green → red gradient as health drains.
- **Team mode**: bar uses team color instead of gradient.
- **Dead state**: background becomes empty/light team color. Skull UI on top.

### Dashboard
- Normal player grid during active round.
- Player cards color-coded by team (border or background tint).

## Scoring

- Individual scores earned per underlying mode rules.
- **Team score = sum of members' individual scores.**
- Round end scoreboard: team leaderboard + individual breakdown.
- Game end scoreboard: winning team highlighted + who carried.

## Socket Events

| Event | Direction | Payload | Notes |
|-------|-----------|---------|-------|
| `team:switch` | Client → Server | `{ }` | Player taps to cycle team |
| `team:selection` | Server → All | `{ active: boolean }` | Team selection phase started/cancelled |
| `team:update` | Server → All | `{ teams: { [teamId]: playerId[] } }` | Broadcast on team change |
| `lobby:update` | Modified | Add `teamId` to each player | Extended |
| `round:end` / `game:end` | Modified | Add `teamScores` array | Team aggregates |

## Data Model

### Server
```
UserPreferences += {
  teamsEnabled: boolean;
  teamCount: number;  // 2-4
}
```

TeamManager maps playerId → teamId. Has `selectionActive` flag for team selection phase. Reset on game stop.

### REST Endpoints
- `POST /api/game/team-selection` — Enter team selection phase (assigns teams, broadcasts `team:selection`)
- `POST /api/game/teams/shuffle` — Shuffle team assignments
- `GET /api/game/teams` — Get current team assignments
- `GET /api/game/state` — Includes `teamSelectionActive` in response

### Client
```
PlayerState += {
  teamId: number | null;  // null when teams disabled
}

TeamScore {
  teamId: number;
  teamName: string;
  teamColor: string;
  score: number;
  roundPoints: number;
  rank: number;
  players: ScoreEntry[];
}
```

## Team Identity

| Team | Name | Color |
|------|------|-------|
| 0 | Red Team | red-500 |
| 1 | Blue Team | blue-500 |
| 2 | Green Team | green-500 |
| 3 | Yellow Team | yellow-500 |
