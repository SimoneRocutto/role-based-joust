# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Extended Joust is a motion-based multiplayer party game where players use smartphones as accelerometer controllers. It combines physical gameplay (excessive movement = damage) with role-based mechanics (Vampire, Beast, Angel, etc.). A central dashboard displays game state on a projected screen while 2-20 players hold their phones chest-mounted.

## Repository Structure

```
extended-joust/
├── server/          # Express + Socket.IO backend (port 3000)
│   └── src/
│       ├── models/        # BasePlayer, StatusEffect, roles/, statusEffects/
│       ├── managers/      # GameEngine (100ms tick loop), GameState, ConnectionManager
│       ├── gameModes/     # ClassicMode, RoleBasedMode, etc. (auto-discovered)
│       ├── factories/     # RoleFactory, GameModeFactory (auto-discovery pattern)
│       ├── routes/        # game.routes.ts, player.routes.ts, debug.routes.ts
│       ├── config/        # gameConfig.ts, roleThemes.ts
│       └── server.ts      # Entry point
├── client/          # React/Vite frontend (port 5173 in dev)
│   └── src/
│       ├── pages/         # JoinView, PlayerView, DashboardView
│       ├── services/      # socket.ts, api.ts, accelerometer.ts, audio.ts
│       ├── store/         # Zustand gameStore.ts
│       └── hooks/         # useSocket, useAccelerometer, useReconnect, etc.
└── CLAUDE.md
```

## Build and Development Commands

### Server (`cd server`)
```bash
npm run dev          # Development with hot reload (ts-node-dev)
npm run build        # Compile TypeScript to dist/
npm run start        # Run production build
npm test             # Run all tests
npm run test:core    # Core functionality tests
npm run test:roles   # Role-specific tests
npm run test:effects # Status effect tests
npm run lint         # ESLint
```

### Client (`cd client`)
```bash
npm run dev          # Vite dev server with proxy to :3000
npm run build        # Production build to dist/
npm run lint         # ESLint
```

## Architecture Patterns

### Server Authority
Phones are "dumb terminals" - they only send raw accelerometer data. All game logic (damage calculation, role abilities, win conditions) runs on the server.

### Tick-Based Timing
Game loop ticks every 100ms. All timing is relative to `gameTime` (milliseconds since start). No `setTimeout` in game logic.

### Auto-Discovery Pattern
New roles, status effects, and game modes are automatically discovered:
- Add `src/models/roles/MyRole.ts` extending `BasePlayer` → auto-loaded by RoleFactory
- Add `src/models/statusEffects/MyEffect.ts` extending `StatusEffect` → auto-loaded
- Add `src/gameModes/MyMode.ts` extending `GameMode` → auto-loaded by GameModeFactory

### Priority-Based Execution
Status effects and roles execute in priority order (higher = earlier):
- Critical (100): Invulnerability blocks damage first
- High (50): Angel prevents death
- Medium (20): Vampire abilities
- Low (5-10): BeastHunter bonuses

### Event-Driven Communication
GameEvents singleton is the central event bus. Roles/effects communicate via events (`game:tick`, `player:death`, `vampire:bloodlust`, etc.) rather than direct calls.

## Socket.IO Events

**Client → Server:** `player:join`, `player:reconnect`, `player:move`, `ping`

**Server → Client:** `player:joined`, `player:reconnected`, `game:tick`, `player:death`, `round:start`, `round:end`, `game:end`, `vampire:bloodlust`, `error`

## Testing

Custom test runner using ts-node (no Jest/Mocha). Tests in `server/src/tests/scenarios/`:
- `core.test.ts` - Engine, game flow, movement, damage
- `roles.test.ts` - Role-specific mechanics
- `statusEffects.test.ts` - Effect lifecycle and priority

## Debug Endpoints (Development Only)

```
GET  /api/debug/state           # Full game snapshot
POST /api/debug/test/create     # Create test game with bots
POST /api/debug/bot/:id/command # Control bot (shake, still, die, damage)
GET  /api/debug/logs            # Query logs by level/category
```

## Mobile Considerations

- iOS requires HTTPS for DeviceMotionEvent (use ngrok for development)
- iOS has no Wake Lock API (NoSleep.js polyfill needed)
- iOS has no Fullscreen API support
- Accelerometer data throttled to 10Hz to save battery

## Documentation

Detailed docs exist in:
- `/server/docs/` - API reference, testing guide, type system explanations, code examples
- `/client/docs/` - Architecture overview, audio system, UI design, communication patterns
