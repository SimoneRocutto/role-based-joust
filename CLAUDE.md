# CLAUDE.md

This file is the primary entry point for Claude Code working on this repository. Read this first, then consult specific docs as needed using the index below.

## Workflow Rules

**These rules apply to every task. Follow them without being asked.**

1. **Always write or update tests.** When implementing new functionality, write tests for it. When changing existing behavior, update the relevant tests to match. Tests are not optional — they are part of the implementation. See `docs/testing.md` for the test frameworks and patterns used in this project. Remember to add e2e tests too when appropriate.
2. **Always run tests after changes.** After modifying server code, run `cd server && npm test`. After modifying client code, run `cd client && npm run test:run`. These are fast and should always pass before you consider a task done.
3. **Always check TypeScript after changes.** After any implementation, run `cd client && npx tsc --noEmit` to catch type errors. The server compiles as part of `npm test` so no separate check is needed there. Fix all errors before considering a task done.
4. **Suggest e2e tests when appropriate.** If changes affect game flow, socket events, UI interactions, or the join/play/dashboard user journey, remind the user to run e2e tests (`cd client && npm run test:e2e`). E2e tests are slower so don't run them automatically, but do flag when they're relevant.
5. **Update docs when changing features.** If you change a socket event, REST endpoint, game flow, role mechanic, or any documented behavior, update the relevant doc file(s) in the same task. Use the doc index below to find which file to update. This is part of the work, not a separate step.
6. **Prioritize code quality** Avoid repetitions and duplicated code. When you feel it is better to refactor an old part when introducing a new one, please consider doing so.
7. **Track TODO.md.** After completing a task, check `TODO.md` to see if the work resolves any listed item. If it does, remove that line from the file. When a task is done and there are remaining items in `TODO.md`, suggest tackling the next one (top item = highest priority).

## Project Overview

Extended Joust is a motion-based multiplayer party game (2-20 players). Players use smartphones as accelerometer controllers, holding them chest-mounted. Excessive movement causes damage; staying still keeps you alive. A central dashboard (projected on a screen) shows game state to spectators and the admin.

The game adds role-based mechanics on top of this core loop. Each player is secretly assigned a role (Vampire, Beast, Angel, etc.) that grants unique abilities. Roles are still being developed, but the framework for them is complete.

### Game Flow

1. **Lobby**: Admin opens dashboard at `/dashboard`. Players join at `/join`, enter a name, and land on `/player`. The dashboard shows who's connected. Players wait for the admin to start.
2. **Pre-Game**: Admin clicks "Start Game" on the dashboard. The game enters the `pre-game` state. Players see a mode recap (mode name, round count, sensitivity) and shake their device to ready up (or click in dev mode). The game auto-starts when all players are ready, or the admin can force-start at any time via the dashboard.
3. **Countdown + Role Assignment**: A countdown plays, during which each player is secretly assigned a role.
4. **Active Round**: Players try to stay still. Moving too much deals damage. Roles grant special abilities. The round ends when only one player is alive.
5. **Round End**: The last player alive earns 5 points. Points accumulate across rounds. Players shake to ready up for the next round. Once all ready, the next round starts automatically (no admin action needed between rounds).
6. **Game End**: After 3 rounds (will be configurable), the game ends. The dashboard shows a leaderboard ranked by total points. The admin clicks to return to the main dashboard to start a new game.

Roles are re-assigned randomly each round. Points carry through all rounds. The player with the most total points wins.

### Scoring

Currently, the only way to earn points is being the last player alive in a round (5 points). Future roles will grant bonus points (e.g., Vampire earns points when kills happen during bloodlust).

## Repository Structure

```
role-based-joust/
├── server/              # Express + Socket.IO backend (port 4000)
│   └── src/
│       ├── models/          # BasePlayer, StatusEffect, roles/, statusEffects/
│       ├── managers/        # GameEngine (100ms tick loop), GameState, ConnectionManager, TeamManager
│       ├── gameModes/       # ClassicMode, RoleBasedMode, DeathCountMode (auto-discovered)
│       ├── gameEvents/      # SpeedShift and other game-wide events (auto-discovered)
│       ├── factories/       # RoleFactory, GameModeFactory (auto-discovery)
│       ├── routes/          # game.routes.ts, player.routes.ts, debug.routes.ts
│       ├── config/          # gameConfig.ts, roleThemes.ts
│       ├── tests/           # Custom test runner + scenario tests
│       └── server.ts        # Entry point + socket event handlers
├── client/              # React/Vite frontend (port 5173 in dev)
│   └── src/
│       ├── pages/           # JoinView, PlayerView, DashboardView
│       ├── services/        # socket.ts, api.ts, accelerometer.ts, audio.ts
│       ├── store/           # Zustand gameStore.ts
│       └── hooks/           # useSocket, useAccelerometer, useReconnect, useShakeDetection, useModeEvents, etc.
│   └── e2e/             # Playwright end-to-end tests
├── shared/              # Shared types (single source of truth for wire format)
│   └── types/           # common.types.ts, payloads.types.ts, index.ts
├── docs/                # All documentation (see index below)
├── CLAUDE.md            # This file (read first)
└── TODO.md              # Pending features/tasks
```

## Build and Development Commands

### Server (`cd server`)

```bash
npm run dev          # Development with hot reload (ts-node-dev)
npm run build        # Compile TypeScript to dist/
npm run start        # Run production build
npm test             # Run ALL server tests (core + roles + effects + readyState)
npm run test:core    # Core functionality tests only
npm run test:roles   # Role-specific tests only
npm run test:effects # Status effect tests only
npm run lint         # ESLint
```

### Client (`cd client`)

```bash
npm run dev          # Vite dev server with proxy to :4000
npm run dev:https    # HTTPS mode (needed for iOS accelerometer)
npm run build        # Production build to dist/
npm run test:run     # Run all client unit tests (Vitest, single run)
npm run test         # Run client unit tests in watch mode
npm run test:e2e     # Run all Playwright e2e tests (starts server + client automatically)
npm run test:e2e:fast # E2e tests excluding slow countdown tests
npm run test:e2e:ui  # E2e tests with interactive Playwright UI
npm run lint         # ESLint
```

### Testing Summary

| Layer | Framework | Location | Command | Speed |
|-------|-----------|----------|---------|-------|
| Server unit | Custom runner (ts-node) | `server/src/tests/scenarios/` | `cd server && npm test` | Fast |
| Client unit | Vitest | `client/src/` (co-located) | `cd client && npm run test:run` | Fast |
| E2e | Playwright | `client/e2e/` | `cd client && npm run test:e2e` | Slow |

Server tests use a custom test runner (no Jest/Mocha) with `assert()`, `assertEqual()`, `assertContains()` helpers. Each test gets a fresh GameEngine instance in test mode.

E2e tests auto-start both the server (port 4000) and client (port 5173) before running. They cover: game start, game mechanics, reconnection, socket events, player join, dashboard/lobby, API endpoints, and edge cases.

## Architecture Patterns

### Server Authority
Phones are "dumb terminals" — they only send raw accelerometer data. All game logic (damage, roles, win conditions) runs on the server.

### Tick-Based Timing
Game loop ticks every 100ms. All timing uses `gameTime` (milliseconds since round start). Never use `setTimeout` for game logic.

### Game Engine States
`waiting` → `pre-game` → `countdown` → `active` → `round-ended` → `finished`

Note: The `pre-game` state is skipped in test mode and during auto-relaunch (between rounds).

### Auto-Discovery Pattern
New roles, status effects, game modes, and game events are auto-discovered from the filesystem:
- Add `server/src/models/roles/MyRole.ts` extending `BasePlayer` → loaded by RoleFactory
- Add `server/src/models/statusEffects/MyEffect.ts` extending `StatusEffect` → loaded automatically
- Add `server/src/gameModes/MyMode.ts` extending `GameMode` → loaded by GameModeFactory
- Add `server/src/gameEvents/MyEvent.ts` extending `GameEvent` → loaded by GameEventFactory

### Priority-Based Execution
Status effects and roles execute in priority order (higher = earlier):
- Critical (100): Invulnerability blocks damage
- High (50): Angel prevents death
- Medium (20): Vampire abilities
- Low (5-10): BeastHunter bonuses

### Event-Driven Communication
`GameEvents` singleton is the central event bus. Roles and effects communicate via events (`game:tick`, `player:death`, `vampire:bloodlust`, etc.) rather than direct method calls.

### Roles (Work in Progress)

Roles extend `BasePlayer` and override lifecycle hooks (`onInit`, `onTick`, `beforeDeath`, `die`, `onDeath`, `onAbilityUse`) to implement special abilities. Currently implemented: **Vampire**, **Beast**, **BeastHunter**, **Angel**, **Ironclad**, **Survivor**, **Executioner**, **Bodyguard**, **Berserker**, **Ninja**, **Masochist**, **Troll**. Role mechanics are still being developed and may change.

Status effects (buffs/debuffs) are applied to players by roles or game events. Currently implemented: **Invulnerability**, **Shielded**, **Strengthened**, **Weakened**, **Excited**, **Toughened**.

Game modes define rule sets. Currently implemented: **ClassicMode** (pure survival, no roles), **RoleBasedMode** (roles + multi-round + points), and **DeathCountMode** (respawns, score by death count, supports teams).

### Teams System

Teams are supported in certain game modes (DeathCountMode). The admin enables teams in settings, enters a team selection phase, and players can switch teams by tapping. Teams are managed by `TeamManager` on the server. Team scores are aggregated from individual player scores and shown on the round-end/game-end leaderboard.

### Game Events System

Game events are temporary, game-wide effects that alter gameplay for all players (distinct from the `GameEvents` event bus). Currently implemented: **SpeedShift** (alternates between slow/fast phases). Events are auto-discovered from `server/src/gameEvents/` and managed by `GameEventManager` per mode. They communicate to clients via the `mode:event` socket event.

### Ready State System

The ready state system handles two phases:
- **Pre-game**: After the admin launches the game, players shake (or click in dev mode) to indicate they're ready. The game auto-starts when all are ready, or the admin can force-start via `POST /api/game/proceed`. Ready events are ignored in the lobby (`waiting` state).
- **Between rounds**: Players shake to ready up for the next round. Once all are ready, the next round starts automatically.

Dev mode is controlled by a URL parameter, not the Node environment.

## Socket.IO Events (Quick Reference)

**Client → Server:** `player:join`, `player:reconnect`, `player:move`, `player:ready`, `player:tap`, `team:switch`, `ping`

**Server → Client:** `player:joined`, `player:reconnected`, `game:start`, `game:tick`, `player:death`, `player:respawn`, `player:respawn-pending`, `round:start`, `round:end`, `game:end`, `game:countdown`, `game:stopped`, `vampire:bloodlust`, `role:assigned`, `lobby:update`, `player:ready`, `ready:update`, `player:tap:result`, `player:kicked`, `team:update`, `team:selection`, `mode:event`, `pong`, `error`

Full payloads and details: see `docs/communication.md`.

## REST API (Quick Reference)

**Primary endpoints:**
- `POST /api/game/launch` — Create and start a game (primary way to start games)
- `POST /api/game/proceed` — Force-start from pre-game phase (bypasses all-ready requirement)
- `POST /api/game/next-round` — Start next round
- `POST /api/game/team-selection` — Enter team selection phase (teams enabled only)
- `POST /api/game/kick/:playerId` — Kick a player from the lobby
- `POST /api/game/stop` — Stop current game
- `GET /api/game/state` — Current game snapshot
- `GET /api/game/lobby` — Connected players in lobby
- `GET /api/game/config` — Dev mode status
- `GET /api/game/modes` — Available game modes
- `GET /api/game/settings` — Get current settings (sensitivity, mode, theme)
- `POST /api/game/settings` — Update settings (persisted to disk)

**Deprecated:** `POST /api/game/create` and `POST /api/game/start` (use `/api/game/launch` instead)

Full API reference: see `docs/communication.md`.

## Debug Endpoints (Development Only)

```
GET  /api/debug/state             # Full game snapshot with debug metadata
POST /api/debug/test/create       # Create test game with bots
POST /api/debug/bot/:id/command   # Control bot (shake, still, die, damage)
POST /api/debug/fastforward       # Fast-forward game time
POST /api/debug/reset             # Reset all state (used by e2e tests)
GET  /api/debug/logs              # Query logs by level/category
POST /api/debug/logs/export       # Export logs to file
POST /api/debug/logs/clear        # Clear logs
GET  /api/debug/logs/summary      # Log statistics
```

## Mobile Considerations

- iOS requires HTTPS for DeviceMotionEvent (use ngrok or `npm run dev:https`)
- iOS has no Wake Lock API (NoSleep.js polyfill needed)
- iOS has no Fullscreen API support
- Accelerometer data throttled to 10Hz to save battery

## Documentation Index

All docs live in the top-level `docs/` folder.

| Topic | File | What it covers |
|-------|------|----------------|
| **Architecture and design** | `docs/architecture.md` | System architecture, network topology, tech stack, game phases, reconnection, design principles, browser compatibility |
| **Audio system** | `docs/audio.md` | 3 audio layers (music, TTS, SFX), transition tables, role reveal sequence, mobile audio gotchas, audio manager API |
| **UI specs and views** | `docs/ui-specs.md` | Join view, Player view (lobby/active/dead states), Dashboard view (admin controls, player grid, leaderboard), design tokens |
| **Socket.IO events and REST API** | `docs/communication.md` | All socket event payloads (both directions), all HTTP endpoints with request/response schemas, reconnection protocol, error codes |
| **Client project structure** | `docs/client-structure.md` | Frontend directory tree, config files, implementation phases, mobile permissions, battery optimization, dependencies |
| **Type system and core abstractions** | `docs/type-system.md` | BasePlayer, StatusEffect, GameMode, factories, GameEngine, priority system, event system, movement pipeline — deep dive into how the server works |
| **Testing guide** | `docs/testing.md` | Server unit tests, client unit tests, e2e tests, how to write new tests, assertion helpers, test patterns |
| **Server directory structure** | `docs/server-structure.txt` | Annotated tree of every file in `server/src/` with purpose descriptions |
| **Extending the game (code examples)** | `docs/extending-the-game.ts` | How to add new roles, status effects, and game modes with full code examples |
| **Settings persistence** | `docs/settings.md` | How settings are stored, settings.json format, API endpoints, presets, backwards compatibility |
| **Client README** | `client/README.md` | Quick start, mobile access (ngrok), troubleshooting |
| **Pending work** | `TODO.md` | Priority-ordered list of missing features |
