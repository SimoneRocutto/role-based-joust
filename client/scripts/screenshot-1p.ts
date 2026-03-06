/**
 * screenshot-1p.ts — Template A: single phone + dashboard
 *
 * Use for features that look the same for all players (layout changes,
 * new screens, anything uniform across players).
 *
 * Usage: npm run screenshot
 *
 * Ports: read from .env.local (VITE_BACKEND_PORT, VITE_PORT) or defaults.
 *
 * Principle: use real UI clicks for everything the admin/player would do.
 * Use debug APIs only for things with no UI equivalent (spawning bots,
 * dealing damage, killing players, reading server state).
 */
import { chromium, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BACKEND = `http://localhost:${process.env.VITE_BACKEND_PORT || 4000}`;
const CLIENT = `http://localhost:${process.env.VITE_PORT || 5173}`;
const MODE = process.env.MODE;
// When MODE is set, save into a mode-specific subdirectory so multi-mode runs don't overwrite each other
const OUT = MODE
  ? path.resolve(__dirname, `../e2e/screenshots/${MODE}`)
  : path.resolve(__dirname, "../e2e/screenshots");

// Map MODE env values to combined dropdown keys (for modes in the UI dropdown)
const MODE_TO_COMBINED_KEY: Record<string, string> = {
  classic: "classic",
  "death-count": "death-count",
  "role-based": "role-based",
  "classic-team": "classic-team",
  "death-count-team": "death-count-team",
  "role-based-team": "role-based-team",
  domination: "domination",
  "long-live-the-king": "long-live-the-king",
};

async function api(p: string, method = "GET", body?: object) {
  const res = await fetch(`${BACKEND}/api${p}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Get current game phase from server. */
async function getPhase(): Promise<string> {
  const res = await api("/game/state");
  // Game state endpoint nests phase as state.state.state
  return res?.state?.state ?? res?.phase ?? "unknown";
}

/** Wait until game reaches a target phase (with timeout). */
async function waitForPhase(target: string | string[], timeoutMs = 15000): Promise<string> {
  const targets = Array.isArray(target) ? target : [target];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const phase = await getPhase();
    if (targets.includes(phase)) return phase;
    await sleep(500);
  }
  return await getPhase();
}

async function checkServer() {
  try {
    const health = await fetch(`${BACKEND}/health`).then((r) => r.json());
    if (!health.debug) {
      console.error(
        "ERROR: Server is running but NOT in debug mode.\n" +
          "Restart with: cd server && NODE_ENV=development npm run dev"
      );
      process.exit(1);
    }
  } catch {
    console.error(
      `ERROR: Cannot reach server at ${BACKEND}.\n` +
        "Start with: cd server && NODE_ENV=development npm run dev"
    );
    process.exit(1);
  }
}

/** Check if the current mode uses teams. */
function isTeamMode(mode: string | undefined): boolean {
  if (!mode) return false;
  return [
    "classic-team",
    "death-count-team",
    "role-based-team",
    "domination",
    "long-live-the-king",
  ].includes(mode);
}

(async () => {
  await checkServer();
  fs.mkdirSync(OUT, { recursive: true });

  const log: { file: string; state: string; viewport: string }[] = [];
  const browser = await chromium.launch();

  const shot = async (page: Page, file: string, state: string, viewport: string) => {
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    log.push({ file, state, viewport });
    console.log(`  ${file}  —  ${state}`);
  };

  try {
    // ── RESET ────────────────────────────────────────────────────────────────
    await api("/debug/reset", "POST");
    await sleep(400);

    const dash = await browser.newPage();
    dash.setViewportSize({ width: 1280, height: 800 });
    const phone = await browser.newPage();
    phone.setViewportSize({ width: 390, height: 844 });

    // ── JOIN FORM ────────────────────────────────────────────────────────────
    await phone.goto(`${CLIENT}/player?dev=true`);
    await sleep(1500);
    await shot(phone, "01_phone_join.png", "Join form", "phone 390x844");

    // ── LOBBY (player joins via real UI) ─────────────────────────────────────
    await phone.fill('input[id="name"]', "TestPlayer");
    await phone.click('button:has-text("JOIN GAME")');
    await sleep(800);
    await shot(phone, "02_phone_lobby.png", "Lobby — waiting", "phone 390x844");

    // ── SPAWN BOTS into lobby (API — no UI equivalent) ───────────────────────
    await api("/debug/spawn-bots", "POST", { count: 3, behavior: "still" });
    await sleep(400);

    // ── DASHBOARD — open and select mode via real UI ─────────────────────────
    await dash.goto(`${CLIENT}/dashboard`);
    await sleep(800);

    if (MODE) {
      const combinedKey = MODE_TO_COMBINED_KEY[MODE];
      if (combinedKey) {
        // Select mode from the dropdown (real UI click)
        await dash.selectOption("select", combinedKey);
        await sleep(400);
      } else {
        // Mode not in dropdown (e.g. long-live-the-king) — fall back to API
        await api("/game/settings", "POST", { gameMode: MODE });
        await sleep(400);
        // Reload dashboard to reflect the setting
        await dash.reload();
        await sleep(800);
      }
    }

    await shot(dash, "03_dash_lobby.png", "Lobby — dashboard", "dashboard 1280x800");

    // ── SET COUNTDOWN to 1s (avoid long wait in screenshot scripts) ─────────
    await api("/debug/set-countdown", "POST", { seconds: 1 });

    // ── START GAME via dashboard button (real UI click) ──────────────────────
    // The lobby button contains the player count, e.g. "Start Game (4 players)"
    const lobbyBtn = dash.getByRole("button", { name: /Start Game \(/ });
    await lobbyBtn.click();
    console.log("  [flow] Clicked lobby Start Game");

    // ── PRE-GAME (shake to ready / force start) ─────────────────────────────
    // /api/game/launch goes straight to pre-game for all modes (including team modes).
    // For team modes, pre-game shows SHUFFLE TEAMS alongside START GAME.
    // There is no separate "team selection" UI phase.
    await waitForPhase("pre-game");
    await sleep(300);
    const preGamePhase = await getPhase();
    console.log(`  [flow] Phase after start: ${preGamePhase}`);
    if (preGamePhase === "pre-game") {
      await shot(dash, "03b_dash_pregame.png", "Pre-game — dashboard", "dashboard 1280x800");
      await shot(phone, "03c_phone_pregame.png", "Pre-game — phone", "phone 390x844");

      // Force start via dashboard button (real UI click)
      const forceBtn = dash.getByRole("button", { name: "START GAME", exact: true });
      await forceBtn.waitFor({ timeout: 3000 });
      await forceBtn.click();
      console.log("  [flow] Clicked pre-game START GAME");
    }

    // ── COUNTDOWN → ACTIVE ───────────────────────────────────────────────────
    // Countdown is set to 1s, just wait for it to finish
    await waitForPhase("active");
    await sleep(500);

    // ── ACTIVE GAME (full HP) ────────────────────────────────────────────────
    await shot(dash, "04_dash_active.png", "Active game — dashboard (full HP)", "dashboard 1280x800");
    await shot(phone, "05_phone_active.png", "Active game — phone (full HP)", "phone 390x844");

    // ── ACTIVE GAME (damaged) — HP gradient on phone + dashboard cards ───────
    const myId: string | null = await phone.evaluate(
      () => (window as any).__gameStore?.getState().myPlayerId
    );
    if (myId) {
      await api(`/debug/player/${myId}/damage`, "POST", { amount: 50 });
    }
    // Damage a bot too to show range
    await api("/debug/bot/bot-0/command", "POST", { action: "damage", args: [75] });
    await sleep(600);
    await shot(dash, "04b_dash_active_damaged.png", "Active game — dashboard (damaged)", "dashboard 1280x800");
    await shot(phone, "05b_phone_active_damaged.png", "Active game — phone (~50% HP)", "phone 390x844");

    // ── DEAD SCREEN ──────────────────────────────────────────────────────────
    if (myId) {
      await api(`/debug/player/${myId}/kill`, "POST");
      await sleep(600);
    }
    await shot(phone, "06_phone_dead.png", "Dead screen", "phone 390x844");

    // ── ROUND END ────────────────────────────────────────────────────────────
    // Kill all bots to end the round
    for (let i = 0; i < 3; i++) {
      await api(`/debug/bot/bot-${i}/command`, "POST", { command: "die" });
      await sleep(150);
    }
    await sleep(1000);
    await shot(dash, "07_dash_round_end.png", "Round ended — dashboard", "dashboard 1280x800");
    await shot(phone, "08_phone_round_end.png", "Round ended — phone", "phone 390x844");

    // ── GAME OVER (if single-round mode) ─────────────────────────────────────
    const finalPhase = await getPhase();
    if (finalPhase === "finished") {
      await shot(dash, "09_dash_game_over.png", "Game over — dashboard", "dashboard 1280x800");
      await shot(phone, "10_phone_game_over.png", "Game over — phone", "phone 390x844");
    }

    fs.writeFileSync(
      path.join(OUT, "manifest.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          template: "1p",
          mode: MODE ?? "classic",
          backend: BACKEND,
          client: CLIENT,
          screenshots: log,
        },
        null,
        2
      )
    );

    console.log(`\nDone. ${log.length} screenshots → ${OUT}/`);
  } finally {
    await browser.close();
  }
})();
