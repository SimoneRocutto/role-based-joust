# Testing Guide

This project has three testing layers. Server and client unit tests are fast and should run after every change. E2e tests are slower and should run when changes affect game flow, socket events, or UI.

## Quick Reference

| Layer | Command | What it tests |
|-------|---------|---------------|
| Server unit (all) | `cd server && npm test` | Engine, roles, effects, ready state |
| Server unit (core) | `cd server && npm run test:core` | Engine, game flow, movement, damage |
| Server unit (roles) | `cd server && npm run test:roles` | Role-specific mechanics |
| Server unit (effects) | `cd server && npm run test:effects` | Status effect lifecycle and priority |
| Client unit | `cd client && npm run test:run` | Client-side logic (Vitest) |
| Client unit (watch) | `cd client && npm run test` | Watch mode for development |
| E2e (all) | `cd client && npm run test:e2e` | Full game flow through browser |
| E2e (fast) | `cd client && npm run test:e2e:fast` | Excludes slow countdown tests |
| E2e (UI) | `cd client && npm run test:e2e:ui` | Interactive Playwright UI |
| E2e (debug) | `cd client && npm run test:e2e:debug` | Step-through debugging |
| E2e (headed) | `cd client && npm run test:e2e:headed` | Visible browser window |

---

## Server Unit Tests

### Framework

Custom test runner (no Jest/Mocha) located at `server/src/tests/testRunner.ts`. Each test gets a fresh `GameEngine` instance in test mode. Tests are in `server/src/tests/scenarios/`.

### Test Files

- `core.test.ts` — Engine initialization, classic/role-based game flow, player count validation, movement and damage system, toughness mechanics, bot functionality
- `roles.test.ts` — Vampire bloodlust, Beast toughness, BeastHunter bonus points, Angel divine protection, role assignment from pool
- `statusEffects.test.ts` — Invulnerability damage blocking, Shield absorption, Strengthened/Weakened toughness modification, Excited movement requirement, priority execution order, effect refresh
- `readyState.test.ts` — Ready state tracking in lobby and between rounds

The entry point `server/src/tests/index.test.ts` runs all suites together.

### Writing New Tests

```typescript
// server/src/tests/scenarios/mytest.test.ts
import { TestRunner, assert, assertEqual } from "../testRunner";

const runner = new TestRunner();

runner.test("My test description", (engine, logger) => {
  engine.createTestGame(["vampire", "beast"]);

  const vampire = engine.players.find((p) => p.constructor.name === "Vampire");
  assert(vampire !== undefined, "Should have vampire");
  assertEqual(vampire.points, 0, "Should start with 0 points");
});

export async function runMyTests() {
  return runner.run();
}

if (require.main === module) {
  runMyTests();
}
```

### Assertion Helpers

- `assert(condition, message)` — Throws if condition is false
- `assertEqual(actual, expected, message?)` — Throws if values are not equal
- `assertContains(array, value, message?)` — Throws if array doesn't contain value

### Key Patterns

```typescript
// Create test game with specific roles (all players are bots)
engine.createTestGame(["vampire", "beast", "beasthunter", "angel"]);

// Command bots
const bot = engine.getPlayerById("bot-0");
bot.triggerAction("shake", engine.gameTime);  // Move intensely
bot.triggerAction("still", engine.gameTime);   // Stop moving
bot.triggerAction("die", engine.gameTime);     // Kill bot
bot.triggerAction("damage", engine.gameTime, 50); // Apply damage

// Fast-forward time (for time-based mechanics like bloodlust)
engine.fastForward(30000); // 30 seconds

// Check roles
import { Vampire } from "@/models/roles/Vampire";
const vampire = engine.players.find((p) => p instanceof Vampire);
```

---

## Client Unit Tests

### Framework

Vitest. Tests are co-located with source files in `client/src/`.

### Commands

```bash
cd client
npm run test:run       # Single run
npm run test           # Watch mode
npm run test:coverage  # With coverage report
npm run test:ui        # Interactive Vitest UI
```

---

## End-to-End Tests

### Framework

Playwright (Chromium). Tests are in `client/e2e/`.

### Setup

E2e tests auto-start both the server (port 3000) and client dev server (port 5173) before running. No manual setup needed.

### Test Files

- `game-start.spec.ts` — Game initialization
- `game-mechanics.spec.ts` — Core gameplay mechanics
- `reconnection.spec.ts` — Player reconnection scenarios
- `socket-events.spec.ts` — Socket.IO event handling
- `player-join.spec.ts` — Player joining flow
- `dashboard-lobby.spec.ts` — Dashboard and lobby UI
- `api.spec.ts` — API endpoint testing
- `edge-cases.spec.ts` — Edge case scenarios

### Configuration

- Sequential execution (not parallel) for game state consistency
- Single worker
- Test timeout: 30s, expect timeout: 5s, action timeout: 10s
- Retries: 2 on CI, 0 locally
- Collects traces, screenshots, and videos on failure

### Running

```bash
cd client
npm run test:e2e           # Run all e2e tests
npm run test:e2e:fast      # Skip slow countdown tests
npm run test:e2e:ui        # Interactive Playwright UI
npm run test:e2e:debug     # Step-through debugging
npm run test:e2e:headed    # Visible browser
```

### Debug Reset Endpoint

E2e tests use `POST /api/debug/reset` to clear all server state between tests. This stops any active game and clears all connections.

---

## Debugging Failed Tests

If a test fails:

1. Check the error message and stack trace
2. Add `console.log()` to inspect values
3. For server tests, use `logger.getLogs()` to see game events
4. Run a specific test suite to isolate the issue
5. For e2e tests, check the HTML report and failure screenshots/videos
