# Codebase Quality Analysis

> Generated: 2026-02-12. This document captures the current state of the codebase and identifies areas for improvement.

## Table of Contents

- [1. Major Pain Points](#1-major-pain-points)
- [2. Moderate Issues](#2-moderate-issues)
- [3. Documentation Gaps](#3-documentation-gaps)
- [4. Minor Issues](#4-minor-issues)
- [5. Prioritized Recommendations](#5-prioritized-recommendations)

---

## 1. Major Pain Points

### 1.1 God Objects / Oversized Files (Server)

The three biggest server files carry too many responsibilities:

| File | Lines | Problem |
|------|-------|---------|
| `server/src/managers/GameEngine.ts` | ~936 | Player creation, state machine, tick loop, ready state, countdown, role assignment, connection handling |
| `server/src/server.ts` | ~860 | HTTP setup, socket handlers, event broadcasting, team logic, lobby enrichment |
| `server/src/routes/game.routes.ts` | ~815 | Game routes, settings, teams, debug — all in one file |

**GameEngine** especially needs splitting into focused services (StateMachine, PlayerManager, ReadyStateManager, etc.).

### 1.2 God Objects / Oversized Files (Client)

| File | Lines | Problem |
|------|-------|---------|
| `client/src/pages/PlayerView.tsx` | ~696 | Game logic, permissions, state transitions, 10+ useEffects |
| `client/src/components/dashboard/AdminControls.tsx` | ~618 | Settings, team selection, game launch, QR codes, kicking |
| `client/src/hooks/useSocket.ts` | ~377 | 15+ socket event handlers in one hook |
| `client/src/store/gameStore.ts` | ~270 | 50+ state concerns in a single Zustand store |

### 1.3 Global State Pollution (Server)

`server.ts` exposes `gameEngine` and `io` to the global scope via `global.*`. All routes and managers access them this way, making dependency injection impossible and testing difficult.

### 1.4 Type Safety Gaps

- **84 uses of `any`** across the server codebase.
- ~~**Server `PlayerState`** type doesn't match the actual runtime data sent via sockets — missing `accumulatedDamage`, `deathCount`, `number`, etc.~~ → Fixed: shared types in `shared/types/`.
- ~~**`ScoreEntry`** has `player: BasePlayer` on the server but is flattened to `playerId`/`playerName` before socket emission — types don't reflect this transformation.~~ → Fixed: `ClientScoreEntry` in shared types; server's internal `ScoreEntry` kept separate.
- `useSocket.ts` uses `callback as any` in places.

### 1.5 ConnectionManager Complexity

8 interrelated `Map` objects (`playerSockets`, `socketPlayers`, `playerNumbers`, `playerNames`, `playerReadyState`, `disconnectedLobbyPlayers`, `sessionTokens`, `lastActivity`) that must be kept in sync manually. One missed cleanup means inconsistent state.

### 1.6 Failing Server Tests (WIP Roles)

9 server tests fail due to roles/effects still being in development:
- Toughness (core), Bot Vampire, Vampire bloodlust points, Angel invulnerability expiry, Invulnerability blocking, Invulnerability expiry, Strengthened increase, Strengthened removal, Excited idle-death.
- These are commented out with `// WIP` markers until the role system stabilizes.

---

## 2. Moderate Issues

### 2.1 Code Duplication

- Lobby player enrichment with team info appears 4+ times in `server.ts`.
- Team broadcast pattern (`io.emit("lobby:update", ...)` + `io.emit("team:update", ...)`) repeated across route handlers.
- Dev mode button sections repeated 3+ times in `PlayerView`.
- Player state initialization duplicated across socket event handlers.

### 2.2 Inconsistent Patterns

- **Validation**: Some routes use `validate()` middleware, others do manual checks.
- **Event handling**: Some events use typed methods (`gameEvents.onGameTick()`), others use raw `.on()`.
- **TypeScript strictness**: Server allows unused variables/parameters (`noUnusedLocals: false`), client enforces them.

### 2.3 Magic Numbers

Scattered throughout instead of centralized in config:
- `17.32` — movement max magnitude in `BasePlayer`
- `300000` — session timeout, `60000` — lobby disconnect, `10000` — grace period (all in `ConnectionManager`)
- `60000` / `25000` — Socket.IO ping timeout/interval (in `server.ts`)

### 2.4 Audio Service Architecture

`audio.ts` imports React hooks (`useGameStore`, `useAudioStore`) inside a service class, violating service layer principles and making it untestable outside React context.

### 2.5 Known Bug in useReconnect

The `isReconnecting` state in the dependency array causes effect re-runs that clear intervals before they fire. Only timeout-based retry works; interval-based reconnection is silently broken. The bug is documented in tests but not fixed.

### 2.6 Accessibility Gaps

- No ARIA labels on clickable areas in `PlayerView`.
- Color-only health indicators (no alternative for colorblind users).
- Non-standard toggle switches without keyboard support in `AdminControls`.
- Form inputs lacking proper labels.

### 2.7 Server/Client Type Divergence

- ~~**`GameState`** means different things: union string on server vs. object interface on client.~~ → Fixed: `GameStateType` in shared types.
- ~~**`ScoreEntry`** server type has `player: BasePlayer`, client expects `playerId`/`playerName` flat fields.~~ → Fixed: shared `ClientScoreEntry`.
- ~~No shared types package or validation that emitted payloads match client expectations.~~ → Fixed: `shared/types/` with all socket payload types; server `broadcasters.ts` type-checked.

### 2.8 TypeScript Strictness Inconsistency

Server `tsconfig.app.json` has `noUnusedLocals: false` and `noUnusedParameters: false` despite `strict: true`. Client enforces both. This hides dead code on the server.

---

## 3. Documentation Gaps

### 3.1 Undocumented Features

These features exist in code but were missing or incomplete in documentation:

| Feature | Implemented In | Was Documented? |
|---------|---------------|-----------------|
| Ironclad role | `server/src/models/roles/Ironclad.ts` | Only in type-system.md table |
| Toughened effect | `server/src/models/statusEffects/Toughened.ts` | Nowhere |
| DeathCountMode | `server/src/gameModes/DeathCountMode.ts` | Only TODO.md |
| Teams system | `TeamManager.ts`, team routes/events | Partially in communication.md |
| `mode:event` socket | `GameEvents.ts`, SpeedShift | Nowhere |
| `useShakeDetection` hook | `client/src/hooks/useShakeDetection.ts` | Nowhere |
| `useModeEvents` hook | `client/src/hooks/useModeEvents.ts` | Nowhere |
| Game events system | `server/src/gameEvents/SpeedShift.ts` | Brief mention only |

### 3.2 Contradictions Found (Now Fixed)

- **Session token expiry**: architecture.md said "10 seconds", communication.md said "1 minute", code is 5 minutes with 30s heartbeat.
- **Role list**: CLAUDE.md listed 4 roles but Ironclad was also implemented.
- **Port**: Comments said 3000, `.env` and code use 4000.

---

## 4. Minor Issues

- **`.env` committed to git** — contains local network IP. Should use `.env.example` only.
- **Factories use `require()`** — prevents future ESM migration. `Object.values(module)[0]` is fragile.
- **No coverage metrics** — custom server test runner has no coverage reporting.
- **E2E tests have hardcoded waits** — `waitForTimeout(1500)` instead of condition-based waits, potentially flaky.
- **`BasePlayer` mixes bot logic** — `isBot`, `behavior`, `autoPlayEnabled` should be a separate subclass.
- **Graceful shutdown incomplete** — doesn't stop game timers or notify connected players.
- **`@typescript-eslint` version skew** — server `6.13.0` vs client `6.14.0`.

---

## 5. Prioritized Recommendations

### Fix Now (Bugs / Correctness)

1. ~~Fix the 9 failing server tests~~ → Commented out as WIP since roles are still in development.
2. Fix the `useReconnect` interval bug (only timeout-based retry currently works).

### Fix Soon (Maintainability)

3. ~~Split `GameEngine` into focused services (StateMachine, PlayerManager, ReadyStateManager)~~
4. ~~Split `PlayerView` and `AdminControls` into smaller, focused components.~~
5. ~~Remove global scope usage for `gameEngine`/`io` — introduce dependency injection.~~
6. ~~Sync server/client type definitions (`PlayerState`, `ScoreEntry`).~~ → Done: `shared/types/` directory.

### Fix When Convenient (Quality / Polish)

7. Centralize magic numbers into config files.
8. Enable stricter TypeScript settings on server (`noUnusedLocals`, `noUnusedParameters`).
9. Extract duplicated code (team enrichment, dev mode buttons, player state init).
10. Move audio logic out of React hooks into a standalone service.
11. Add accessibility improvements (ARIA labels, keyboard navigation, color-blind support).
12. Remove `.env` from git, keep only `.env.example`.
