/**
 * screenshot-1p.ts — Template A: single phone + dashboard
 *
 * Use for features that look the same for all players (layout changes,
 * new screens, anything uniform across players).
 *
 * Usage: npm run screenshot
 *
 * Ports: read from .env.local (VITE_BACKEND_PORT, VITE_PORT) or defaults.
 */
import { chromium } from "@playwright/test";
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

async function api(p: string, method = "GET", body?: object) {
  const res = await fetch(`${BACKEND}/api${p}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Verify server is running and in debug mode
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

(async () => {
  await checkServer();
  fs.mkdirSync(OUT, { recursive: true });

  const log: { file: string; state: string; viewport: string }[] = [];
  const browser = await chromium.launch();

  const shot = async (page: any, file: string, state: string, viewport: string) => {
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    log.push({ file, state, viewport });
    console.log(`  ${file}  —  ${state}`);
  };

  try {
    await api("/debug/reset", "POST");
    await sleep(400);

    // Sync persisted settings so dashboard lobby shows the correct mode badge
    if (MODE) {
      await api("/game/settings", "POST", { gameMode: MODE });
    }

    const dash = await browser.newPage();
    dash.setViewportSize({ width: 1280, height: 800 });
    const phone = await browser.newPage();
    phone.setViewportSize({ width: 390, height: 844 });

    // ── JOIN FORM ──────────────────────────────────────────────────────────────
    await phone.goto(`${CLIENT}/player?dev=true`);
    await sleep(1500);
    await shot(phone, "01_phone_join.png", "Join form", "phone 390x844");

    // ── LOBBY ─────────────────────────────────────────────────────────────────
    await phone.fill('input[id="name"]', "TestPlayer");
    await phone.click('button:has-text("JOIN GAME")');
    await sleep(800);
    await shot(phone, "02_phone_lobby.png", "Lobby — waiting", "phone 390x844");

    await dash.goto(`${CLIENT}/dashboard`);
    await sleep(800);
    await shot(dash, "03_dash_lobby.png", "Lobby — dashboard", "dashboard 1280x800");

    // ── BOT GAME — botBehavior:"still" so no parallel-still trick needed ───────
    const createRes = await api("/debug/test/create", "POST", {
      botCount: 3,
      botBehavior: "still",
      ...(MODE ? { mode: MODE } : {}),
      includeConnected: true,
    });
    const allPlayers: { id: string; isBot: boolean }[] =
      createRes.snapshot?.players ?? [];
    const botIds = allPlayers.filter((p) => p.isBot).map((p) => p.id);

    // Test mode skips countdown — game is already active after test/create.
    // Wait for socket events to propagate to the browser.
    await sleep(1000);

    // ── ACTIVE GAME ───────────────────────────────────────────────────────────
    await shot(dash, "04_dash_active.png", "Active game — dashboard", "dashboard 1280x800");
    await shot(phone, "05_phone_active.png", "Active game — real socket state", "phone 390x844");

    // ── DEAD SCREEN ───────────────────────────────────────────────────────────
    const myId: string | null = await phone.evaluate(
      () => (window as any).__gameStore?.getState().myPlayerId
    );
    if (myId) {
      await api(`/debug/player/${myId}/kill`, "POST");
      await sleep(600);
    }
    await shot(phone, "06_phone_dead.png", "Dead screen", "phone 390x844");

    // ── ROUND END ─────────────────────────────────────────────────────────────
    for (const id of botIds) {
      await api(`/debug/bot/${id}/command`, "POST", { command: "die" });
      await sleep(150);
    }
    await sleep(1000);
    await shot(dash, "07_dash_round_end.png", "Round ended — dashboard", "dashboard 1280x800");
    await shot(phone, "08_phone_round_end.png", "Round ended — phone", "phone 390x844");

    // ── GAME OVER (if single-round mode) ─────────────────────────────────────
    const state = await api("/game/state");
    if (state.phase === "finished") {
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
