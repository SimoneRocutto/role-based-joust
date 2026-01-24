# 🧪 Testing Guide

## Running Tests

### Run All Tests

```bash
npm test
# or
npm run test
```

### Run Specific Test Suite

```bash
# Core functionality tests
npm run test:core

# Role-specific tests
npm run test:roles

# Status effect tests
npm run test:effects
```

## Adding to package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "ts-node src/tests/index.test.ts",
    "test:core": "ts-node src/tests/scenarios/core.test.ts",
    "test:roles": "ts-node src/tests/scenarios/roles.test.ts",
    "test:effects": "ts-node src/tests/scenarios/statusEffects.test.ts"
  }
}
```

## Test Coverage

### ✅ Core Tests (core.test.ts)

- ✅ Game engine initialization
- ✅ Classic mode game flow
- ✅ Role-based mode setup
- ✅ Player count validation
- ✅ Movement and damage system
- ✅ Toughness mechanics
- ✅ Bot functionality
- ✅ Bot command system

### ✅ Role Tests (roles.test.ts)

- ✅ **Bot Vampire creation** ← Fixes the bug!
- ✅ **Bot role command system** ← Verifies the fix!
- ✅ Vampire bloodlust mechanic
- ✅ Beast toughness
- ✅ BeastHunter bonus points
- ✅ Angel divine protection
- ✅ Role assignment from pool

### ✅ Status Effect Tests (statusEffects.test.ts)

- ✅ Invulnerability damage blocking
- ✅ Shield partial damage absorption
- ✅ Strengthened/Weakened toughness modification
- ✅ Excited movement requirement
- ✅ Priority execution order
- ✅ Effect refresh mechanism

## Expected Output

When all tests pass, you should see:

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║          Johann Sebastian Joust - Test Suite                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝


📦 Running Core Tests...

▶️  Game engine initializes correctly
✅ PASS: Game engine initializes correctly

▶️  Classic mode: Game starts with 2 players
✅ PASS: Classic mode: Game starts with 2 players

... (more tests) ...

╔═══════════════════════════════════════════════════════════════╗
║                      OVERALL SUMMARY                          ║
╚═══════════════════════════════════════════════════════════════╝

Core Tests:          10/10 passed
Role Tests:          12/12 passed
Status Effect Tests: 11/11 passed

─────────────────────────────────────────────────────────────────

TOTAL:               33/33 passed

🎉 ALL TESTS PASSED! 🎉

═════════════════════════════════════════════════════════════════
```

## Writing New Tests

```typescript
// src/tests/scenarios/mytest.test.ts
import { TestRunner, assert, assertEqual } from "../testRunner";

const runner = new TestRunner();

runner.test("My test description", (engine, logger) => {
  // Setup
  engine.createTestGame(["vampire", "beast"]);

  // Test something
  const vampire = engine.players.find((p) => p.constructor.name === "Vampire");
  assert(vampire !== undefined, "Should have vampire");

  // Make assertions
  assertEqual(vampire.points, 0, "Should start with 0 points");
});

// Export and run
export async function runMyTests() {
  return runner.run();
}

if (require.main === module) {
  runMyTests();
}
```

## Assertion Helpers

### `assert(condition, message)`

Throws if condition is false.

```typescript
assert(player.isAlive, "Player should be alive");
```

### `assertEqual(actual, expected, message?)`

Throws if values are not equal.

```typescript
assertEqual(player.points, 5, "Should have 5 points");
```

### `assertContains(array, value, message?)`

Throws if array doesn't contain value.

```typescript
const roles = engine.players.map((p) => p.constructor.name);
assertContains(roles, "Vampire", "Should have a vampire");
```

## Key Test Patterns

### Creating Test Games

```typescript
// With specific roles
engine.createTestGame(["vampire", "beast", "beasthunter", "angel"]);

// All players will be bots with isBot: true
const bots = engine.players.filter((p) => p.isBot);
// All 4 should be bots
```

### Commanding Bots

```typescript
const bot = engine.getPlayerById("bot-0");

// Trigger actions
bot.triggerAction("shake", engine.gameTime);
bot.triggerAction("still", engine.gameTime);
bot.triggerAction("die", engine.gameTime);
bot.triggerAction("damage", engine.gameTime, 50);

// Get bot state
const state = bot.getBotState();
console.log(state.isBot); // true
console.log(state.behavior); // "random"
```

### Fast-Forward Time

```typescript
// Skip ahead in game time
engine.fastForward(30000); // 30 seconds

// Useful for testing time-based mechanics
// like Vampire bloodlust or status effect expiration
```

### Checking Roles

```typescript
import { Vampire } from "@/models/roles/Vampire";

const vampire = engine.players.find((p) => p instanceof Vampire);
assert(vampire !== undefined, "Should have vampire");

// Type-safe access to Vampire-specific properties
// (vampire is typed as Vampire here)
```

## Debugging Failed Tests

If a test fails, you'll see:

```
❌ FAIL: Test name
   Error: Assertion failed: Player should be alive
   Stack: ...
```

Tips:

1. Check the error message
2. Look at the stack trace
3. Add `console.log()` to inspect values
4. Use `logger.getLogs()` to see game events
5. Run specific test suite to isolate issue

## Continuous Integration

These tests are designed to run in CI/CD:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

## Next Steps

1. ✅ Run `npm test` to verify everything works
2. ✅ Confirm the bot role bug is fixed
3. ✅ Add more tests as you develop new features
4. ✅ Use tests to catch regressions

---

**Pro Tip**: Run tests frequently during development to catch issues early! 🚀
