/**
 * Take a screenshot of a running game page and print the output path.
 *
 * Usage (from client directory):
 *   node scripts/screenshot.mjs [url] [output]
 *
 * Defaults:
 *   url    = https://localhost:5173/dashboard?debug=true
 *   output = /tmp/game-<timestamp>.png
 *
 * Optional env vars:
 *   CREATE_GAME=1          Auto-create a test game after page load
 *   GAME_MODE=classic      Mode to use when CREATE_GAME=1 (default: classic)
 *   BOT_ROLES=V,V,V,V,V   Comma-separated role names (default: 5 Players)
 *   BASES=1                Number of simulated bases to register (domination mode)
 *   FASTFORWARD_MS=85000   Fast-forward game time by this many ms after the first
 *                          screenshot batch (test mode only, useful for timed modes)
 *   SCREENSHOTS=3          Number of screenshots to take (default: 1)
 *   INTERVAL_MS=400        Milliseconds between screenshots (default: 400)
 *   SCREENSHOTS2=3         Second batch of screenshots taken after FASTFORWARD_MS
 *   INTERVAL_MS2=400       Interval for second batch (default: same as INTERVAL_MS)
 *
 * Requires server + client to be running. Start them with:
 *   cd server && npm run dev   (port 4000)
 *   cd client && npm run dev   (port 5173)
 *
 * @playwright/test must be installed (it is, in client/node_modules).
 * Run from the client directory so node_modules are found:
 *   cd client && node scripts/screenshot.mjs
 */

import { chromium, request as playwrightRequest } from "@playwright/test";
import { existsSync, mkdirSync } from "fs";
import { dirname, extname } from "path";

const API = "https://localhost:4000";

const url = process.argv[2] ?? "https://localhost:5173/dashboard?debug=true";
const baseOut = process.argv[3] ?? `/tmp/game-${Date.now()}.png`;
const createGame = process.env.CREATE_GAME === "1";
const gameMode = process.env.GAME_MODE ?? "classic";
const botRoles = (process.env.BOT_ROLES ?? "Player,Player,Player,Player,Player")
  .split(",")
  .map((r) => r.trim());
const teamsEnabled = process.env.TEAMS === "1";
const teamCount = parseInt(process.env.TEAM_COUNT ?? "2", 10);
const bases = parseInt(process.env.BASES ?? "0", 10);
const fastForwardMs = process.env.FASTFORWARD_MS ? parseInt(process.env.FASTFORWARD_MS, 10) : null;
const screenshotCount = parseInt(process.env.SCREENSHOTS ?? "1", 10);
const intervalMs = parseInt(process.env.INTERVAL_MS ?? "400", 10);
const screenshotCount2 = parseInt(process.env.SCREENSHOTS2 ?? "0", 10);
const intervalMs2 = parseInt(process.env.INTERVAL_MS2 ?? String(intervalMs), 10);

function outPath(i) {
  if (screenshotCount === 1) return baseOut;
  const ext = extname(baseOut);
  const base = baseOut.slice(0, -ext.length);
  return `${base}-${i + 1}${ext}`;
}

const dir = dirname(baseOut);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

// Shared API request context (ignores TLS errors for self-signed certs)
const apiContext = await playwrightRequest.newContext({
  ignoreHTTPSErrors: true,
  baseURL: API,
});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();

try {
  await page.goto(url, { waitUntil: "load", timeout: 15000 });
} catch {
  // load can time out on socket-heavy apps — that's fine
}

// Let React mount and socket connect
await page.waitForTimeout(600);

if (createGame) {
  // Reset server state
  await apiContext.post("/api/debug/reset");

  // Brief pause so the dashboard sees the reset via socket
  await page.waitForTimeout(200);

  // Create the test game — browser is already connected and will receive socket events
  await apiContext.post("/api/debug/test/create", {
    data: {
      mode: gameMode,
      roles: botRoles,
      ...(teamsEnabled && { teams: true, teamCount }),
      ...(bases > 0 && { bases }),
    },
  });

  // Let initial game events (round:start, game:start) propagate to the browser
  await page.waitForTimeout(500);
}

// Helper: take a batch of screenshots
let screenshotIndex = 0;
async function takeBatch(count, interval) {
  for (let i = 0; i < count; i++) {
    if (screenshotIndex > 0) await page.waitForTimeout(interval);
    const p = outPath(screenshotIndex);
    await page.screenshot({ path: p, fullPage: false });
    paths.push(p);
    screenshotIndex++;
  }
}

// First batch
const paths = [];
await takeBatch(screenshotCount, intervalMs);

// Optional fast-forward + second batch
if (fastForwardMs !== null) {
  await apiContext.post("/api/debug/fastforward", { data: { milliseconds: fastForwardMs } });
  // Let the browser receive the resulting socket events (round:end, game:end, etc.)
  await page.waitForTimeout(600);
  if (screenshotCount2 > 0) {
    await takeBatch(screenshotCount2, intervalMs2);
  }
}

await apiContext.dispose();
await browser.close();

// Print paths so the caller (Claude) can read them
process.stdout.write(paths.join("\n") + "\n");
