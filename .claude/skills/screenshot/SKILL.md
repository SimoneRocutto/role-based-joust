---
name: screenshot
description: Capture screenshots of the game UI across all states (lobby, active, dead, round-end, game-over). The phone player(s) join a real bot game so all state is socket-driven. Supports multi-phone mode for features with distinct per-player experiences (e.g. king vs non-king). Run whenever verifying UI changes or designing new screens.
allowed-tools: Read, Write, Bash
---

Capture screenshots of the live game UI using a Playwright script.

## Current worktree ports
- Backend port: !`grep VITE_BACKEND_PORT client/.env.local 2>/dev/null | cut -d= -f2 || echo "4000"`
- Client port: !`grep VITE_PORT client/.env.local 2>/dev/null | cut -d= -f2 || echo "5173"`

## How many phones to open

Before writing the script, decide how many phone tabs you need:

| Scenario | Phones |
|---|---|
| Layout change, new screen, anything that looks the same for all players | 1 |
| Feature with 2 distinct player experiences (king/non-king, role A/B, team colors) | 2 |
| Feature with N distinct experiences (6 different roles showing different cards) | 1 + store injection to cycle variants |

The dashboard is always open alongside phones. It shows all player cards simultaneously and is often sufficient to verify multi-player state (HP, alive/dead, team color, crown badge). Only open extra phone tabs if you need to see something that is only visible on a player's own screen.

## Steps

### 1. Check servers are running

```bash
curl -s http://localhost:BACKEND_PORT/api/game/state > /dev/null 2>&1 && echo "server OK" || echo "SERVER DOWN"
curl -s http://localhost:CLIENT_PORT/ > /dev/null 2>&1 && echo "client OK" || echo "CLIENT DOWN"
```

Replace `BACKEND_PORT` and `CLIENT_PORT` with the actual port values above.

If server is down:
```bash
cd server && NODE_ENV=development npm run dev &
sleep 4
```

If client is down (pass ports explicitly — `.env.local` is NOT read by vite.config.js at runtime):
```bash
cd client && VITE_BACKEND_PORT=BACKEND_PORT VITE_PORT=CLIENT_PORT npm run dev &
sleep 5
```

> **Critical**: Always start the server with `NODE_ENV=development`. Without it, all `/api/debug/*` endpoints return 404.

### 2. Create output directory

```bash
mkdir -p client/e2e/screenshots
```

### 3. Write and run the Playwright script

Choose the template that fits your scenario. Substitute `BACKEND_PORT` and `CLIENT_PORT` with actual values.

---

## Template A — 1 phone (default)

Use for: layout changes, new screens, anything the same for all players.

```typescript
import { chromium } from "@playwright/test";
import fs from "fs";

const BACKEND = "http://localhost:BACKEND_PORT";
const CLIENT = "http://localhost:CLIENT_PORT";
const OUT = "client/e2e/screenshots";

async function api(path: string, method = "GET", body?: object) {
  const res = await fetch(`${BACKEND}/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const log: { file: string; state: string; viewport: string }[] = [];
  const shot = async (page: any, file: string, state: string, viewport: string) => {
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    log.push({ file, state, viewport });
    console.log(`  ${file}`);
  };

  const browser = await chromium.launch();
  try {
    await api("/debug/reset", "POST");
    await sleep(500);

    const dash = await browser.newPage();
    dash.setViewportSize({ width: 1280, height: 800 });
    const phone = await browser.newPage();
    phone.setViewportSize({ width: 390, height: 844 });

    // Join form
    await phone.goto(`${CLIENT}/player?dev=true`);
    await sleep(1500);
    await shot(phone, "01_phone_join.png", "Join form", "phone 390x844");

    // Join lobby
    await phone.fill('input[id="name"]', "TestPlayer");
    await phone.click('button:has-text("JOIN GAME")');
    await sleep(800);
    await shot(phone, "02_phone_lobby.png", "Lobby — waiting", "phone 390x844");

    await dash.goto(`${CLIENT}/dashboard`);
    await sleep(800);
    await shot(dash, "03_dash_lobby.png", "Lobby — dashboard", "dashboard 1280x800");

    // Start mixed game: TestPlayer + 3 bots
    const createRes = await api("/debug/test/create", "POST", {
      roles: ["", "", ""],
      includeConnected: true,
    });
    const players: { id: string; isBot: boolean }[] = createRes.snapshot?.players ?? [];
    const botIds = players.filter((p) => p.isBot).map((p) => p.id);

    // Parallel-still: prevent bots dying in first 100ms tick
    await Promise.all(botIds.map((id) =>
      api(`/debug/bot/${id}/command`, "POST", { command: "still" })
    ));
    await api("/debug/fastforward", "POST");
    await sleep(1000);

    // Active game
    await shot(dash, "04_dash_active.png", "Active game", "dashboard 1280x800");
    await shot(phone, "05_phone_active.png", "Active game — real socket state", "phone 390x844");

    // Kill player → dead screen
    const myId = await phone.evaluate(() => (window as any).__gameStore?.getState().myPlayerId);
    if (myId) {
      await api(`/debug/player/${myId}/kill`, "POST");
      await sleep(600);
    }
    await shot(phone, "06_phone_dead.png", "Dead screen", "phone 390x844");

    // Kill bots → round ends
    for (const id of botIds) {
      await api(`/debug/bot/${id}/command`, "POST", { command: "die" });
      await sleep(150);
    }
    await sleep(1000);
    await shot(dash, "07_dash_round_end.png", "Round ended", "dashboard 1280x800");
    await shot(phone, "08_phone_round_end.png", "Round ended — phone", "phone 390x844");

    // Game over (if single-round mode)
    const state = await api("/game/state");
    if (state.phase === "finished") {
      await shot(dash, "09_dash_game_over.png", "Game over", "dashboard 1280x800");
      await shot(phone, "10_phone_game_over.png", "Game over — phone", "phone 390x844");
    }

    fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      screenshots: log,
    }, null, 2));
    console.log(`\nDone. ${log.length} screenshots in ${OUT}/`);
  } finally {
    await browser.close();
  }
})();
```

---

## Template B — 2 phones (for features with distinct per-player states)

Use for: king mode (crown vs no crown), role reveals, anything where two players see different things.

**How it works:** Both players join the lobby, the mixed game starts, then the script reads `/api/debug/state` to identify which player ended up in each distinct state (e.g. who is king). Screenshots are labeled accordingly.

```typescript
import { chromium } from "@playwright/test";
import fs from "fs";

const BACKEND = "http://localhost:BACKEND_PORT";
const CLIENT = "http://localhost:CLIENT_PORT";
const OUT = "client/e2e/screenshots";

async function api(path: string, method = "GET", body?: object) {
  const res = await fetch(`${BACKEND}/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getPlayerId(page: any): Promise<string | null> {
  return page.evaluate(() => (window as any).__gameStore?.getState().myPlayerId);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const log: { file: string; state: string; viewport: string; note?: string }[] = [];
  const shot = async (page: any, file: string, state: string, viewport: string, note?: string) => {
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    log.push({ file, state, viewport, ...(note ? { note } : {}) });
    console.log(`  ${file}${note ? ` (${note})` : ""}`);
  };

  const browser = await chromium.launch();
  try {
    await api("/debug/reset", "POST");
    await sleep(500);

    const dash = await browser.newPage();
    dash.setViewportSize({ width: 1280, height: 800 });

    // Open two phone tabs and join
    const phones = [
      { page: await browser.newPage(), name: "PlayerA" },
      { page: await browser.newPage(), name: "PlayerB" },
    ];
    for (const { page } of phones) {
      page.setViewportSize({ width: 390, height: 844 });
    }

    // Lobby screenshots
    await phones[0].page.goto(`${CLIENT}/player?dev=true`);
    await sleep(1500);
    await shot(phones[0].page, "01_phone_join.png", "Join form", "phone 390x844");

    for (const { page, name } of phones) {
      if (page !== phones[0].page) await page.goto(`${CLIENT}/player?dev=true`);
      await page.waitForTimeout(500);
      await page.fill('input[id="name"]', name);
      await page.click('button:has-text("JOIN GAME")');
      await page.waitForTimeout(600);
    }
    await shot(phones[0].page, "02_phoneA_lobby.png", "Lobby — PlayerA", "phone 390x844");
    await shot(phones[1].page, "03_phoneB_lobby.png", "Lobby — PlayerB", "phone 390x844");

    await dash.goto(`${CLIENT}/dashboard`);
    await sleep(800);
    await shot(dash, "04_dash_lobby.png", "Lobby — 2 players", "dashboard 1280x800");

    // Mixed game: both real players + 2 bots
    const createRes = await api("/debug/test/create", "POST", {
      roles: ["", ""],
      includeConnected: true,
    });
    const allPlayers: { id: string; isBot: boolean; isKing?: boolean; role?: string }[] =
      createRes.snapshot?.players ?? [];
    const botIds = allPlayers.filter((p) => p.isBot).map((p) => p.id);

    await Promise.all(botIds.map((id) =>
      api(`/debug/bot/${id}/command`, "POST", { command: "still" })
    ));
    await api("/debug/fastforward", "POST");
    await sleep(1000);

    // Read server state to identify which player has which distinct experience.
    // This is the key: use /api/debug/state to label screenshots correctly
    // rather than guessing from store state.
    const debugState = await api("/debug/state");
    const serverPlayers: { id: string; isKing?: boolean; role?: string; name?: string }[] =
      debugState.snapshot?.players ?? [];

    const idA = await getPlayerId(phones[0].page);
    const idB = await getPlayerId(phones[1].page);
    const stateA = serverPlayers.find((p) => p.id === idA);
    const stateB = serverPlayers.find((p) => p.id === idB);

    // Build human-readable labels from server state.
    // Extend this as new features add per-player state (role, teamId, etc.).
    const labelFor = (s: typeof stateA) => {
      if (!s) return "unknown";
      const parts: string[] = [];
      if (s.isKing) parts.push("KING");
      if (s.role) parts.push(`role:${s.role}`);
      return parts.length ? parts.join(", ") : "non-king";
    };
    const labelA = labelFor(stateA);
    const labelB = labelFor(stateB);
    console.log(`  PlayerA (${idA}): ${labelA}`);
    console.log(`  PlayerB (${idB}): ${labelB}`);

    await shot(dash, "05_dash_active.png", "Active game — dashboard", "dashboard 1280x800");
    await shot(phones[0].page, "06_phoneA_active.png", "Active — PlayerA", "phone 390x844", labelA);
    await shot(phones[1].page, "07_phoneB_active.png", "Active — PlayerB", "phone 390x844", labelB);

    // Kill both real players → dead screens
    if (idA) { await api(`/debug/player/${idA}/kill`, "POST"); await sleep(400); }
    await shot(phones[0].page, "08_phoneA_dead.png", "Dead — PlayerA", "phone 390x844", labelA);
    if (idB) { await api(`/debug/player/${idB}/kill`, "POST"); await sleep(400); }
    await shot(phones[1].page, "09_phoneB_dead.png", "Dead — PlayerB", "phone 390x844", labelB);

    // Kill bots → round ends
    for (const id of botIds) {
      await api(`/debug/bot/${id}/command`, "POST", { command: "die" });
      await sleep(150);
    }
    await sleep(1000);
    await shot(dash, "10_dash_round_end.png", "Round ended", "dashboard 1280x800");
    await shot(phones[0].page, "11_phoneA_round_end.png", "Round ended — PlayerA", "phone 390x844");
    await shot(phones[1].page, "12_phoneB_round_end.png", "Round ended — PlayerB", "phone 390x844");

    fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      playerLabels: { PlayerA: labelA, PlayerB: labelB },
      screenshots: log,
    }, null, 2));
    console.log(`\nDone. ${log.length} screenshots in ${OUT}/`);
  } finally {
    await browser.close();
  }
})();
```

---

### 4. Run the script

```bash
cd client && npx tsx e2e/_screenshot.ts
```

### 5. Read and display screenshots

Read `client/e2e/screenshots/manifest.json` first — it tells you what each file shows and labels players by their game state (king, role, etc.). Then read each PNG in order.

### 6. Clean up

```bash
rm -f client/e2e/_screenshot.ts client/e2e/screenshots/*.png client/e2e/screenshots/manifest.json
rmdir client/e2e/screenshots 2>/dev/null || true
```

---

## Notes & Gotchas

### How the mixed game works
`POST /api/debug/test/create` with `includeConnected: true` pulls all currently-connected real players from `ConnectionManager` into the game alongside the bots. Join the lobby first to establish the socket connection, then call `test/create`.

### Reading server state to label players
`GET /api/debug/state` returns the full game snapshot including per-player `isKing`, `role`, `teamId`, etc. Use this after `fastforward` to identify which real player ended up in which distinct state, then annotate screenshots accordingly. This is always more reliable than reading the client store.

### Store injection — only for unreachable states
Use `window.__gameStore.getState().setIsKing(true)` etc. only when a state is hard to reach naturally (e.g. the crown is randomly assigned). The preferred approach is to read `/api/debug/state` and identify which player is already in the target state, then screenshot that player's tab.

### Preventing bots from dying in the first tick
Pass `botBehavior: "still"` in the `test/create` body — bots start frozen and won't accumulate damage. Preferred over the old parallel-still trick. Update the template body:
```
botBehavior: "still",
botCount: 3,
```
The parallel-still trick (`Promise.all(botIds.map(...))`) in the templates above is the fallback if you can't update the body — but `botBehavior: "still"` is cleaner.

### Click-through approach (preferred for auditing pre-game / team selection)

When auditing UI flows that involve admin-driven transitions (lobby → team selection → pre-game → active), use the click-through approach instead of calling `test/create` directly. This captures screens that the direct API path skips entirely (e.g. team selection UI, pre-game shake screen).

**Pattern:**

1. Call `POST /api/debug/spawn-lobby-players` to register fake lobby players without browser tabs:
   ```typescript
   await api("/debug/spawn-lobby-players", "POST", { count: 2, names: ["Bot A", "Bot B"] });
   ```
   These players appear in the dashboard lobby list and are included in the game when "Start Game" is clicked. They are cleaned up by `debug/reset`.

2. Open the dashboard tab and screenshot the lobby as normal.

3. Click "Start Game" on the dashboard to trigger the real pre-game flow:
   ```typescript
   await dash.click('button:has-text("Start Game")');
   await sleep(800);
   // Screenshot pre-game dashboard + phone pre-game screen
   ```

4. If teams are enabled, screenshot team selection UI before players ready up:
   ```typescript
   // Team selection phase screenshot
   await shot(dash, "team_selection_dash.png", "Team selection", "dashboard 1280x800");
   await shot(phones[0].page, "team_selection_phone.png", "Team selection — PlayerA", "phone 390x844");
   ```

5. Click "CLICK TO READY" on each phone tab (pre-game ready state in dev mode):
   ```typescript
   for (const { page } of phones) {
     await page.click('button:has-text("CLICK TO READY")');
     await sleep(300);
   }
   ```

6. Use `fastforward` only to skip the countdown timer itself:
   ```typescript
   await api("/debug/fastforward", "POST", { milliseconds: 11000 });
   await sleep(500);
   ```

This gives you screenshots of: lobby → team selection → pre-game screen → countdown → active game — the full real player journey.

**Note:** Spawned fake lobby players have no real socket, so emitting to them silently fails. They will appear in the dashboard lobby list but won't appear in phone screenshots. Use real phone tabs for the players you want to audit visually.

### Per-mode screenshot directories
The `npm run screenshot` and `npm run screenshot:2p` scripts save to `client/e2e/screenshots/<mode>/` when `MODE` is set, or `client/e2e/screenshots/` otherwise. For all-modes audits, always use `MODE=<key>` so runs don't overwrite each other. Mode keys: `classic`, `role-based`, `long-live-the-king`, `death-count`, `domination`.

### Debug endpoints require NODE_ENV=development
All `/api/debug/*` endpoints return 404 without this flag.

### VITE_BACKEND_PORT must be on the CLI
`vite.config.js` reads it from `process.env` at eval time, not from `.env.local`.

### Extending the label function
When you add a new feature with per-player state, update the `labelFor` function in Template B to include it. For example, for team colors: `if (s.teamId != null) parts.push(\`team:${s.teamId}\`)`.
