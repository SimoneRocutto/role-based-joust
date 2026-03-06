/**
 * screenshot-2p.ts — Template B: two phones + dashboard
 *
 * Use for features with 2 distinct per-player experiences
 * (e.g. king vs non-king, role A vs role B, different team colors).
 *
 * After game start, reads GET /api/debug/state to identify which player
 * ended up in which state and labels screenshots accordingly.
 *
 * Usage: npm run screenshot:2p
 *
 * To capture a specific mode: MODE=king npm run screenshot:2p
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
const MODE = process.env.MODE || "classic";
// Use a mode-specific subdirectory so multi-mode runs don't overwrite each other
const OUT = path.resolve(__dirname, `../e2e/screenshots/${MODE}`);

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

async function getPlayerId(page: Page): Promise<string | null> {
  return page.evaluate(() => (window as any).__gameStore?.getState().myPlayerId ?? null);
}

/** Build a human-readable label from server-side player state. */
function labelFor(p: { isKing?: boolean; role?: string; teamId?: number | null } | undefined): string {
  if (!p) return "unknown";
  const parts: string[] = [];
  if (p.isKing) parts.push("KING");
  if (p.role) parts.push(`role:${p.role}`);
  if (p.teamId != null) parts.push(`team:${p.teamId}`);
  return parts.length ? parts.join(", ") : "regular";
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

(async () => {
  await checkServer();
  fs.mkdirSync(OUT, { recursive: true });

  const log: { file: string; state: string; viewport: string; note?: string }[] = [];
  const browser = await chromium.launch();

  const shot = async (
    page: Page,
    file: string,
    state: string,
    viewport: string,
    note?: string
  ) => {
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    log.push({ file, state, viewport, ...(note ? { note } : {}) });
    console.log(`  ${file}  —  ${state}${note ? ` (${note})` : ""}`);
  };

  try {
    await api("/debug/reset", "POST");
    await sleep(400);

    const dash = await browser.newPage();
    dash.setViewportSize({ width: 1280, height: 800 });

    const phones: { page: Page; name: string }[] = [
      { page: await browser.newPage(), name: "PlayerA" },
      { page: await browser.newPage(), name: "PlayerB" },
    ];
    for (const { page } of phones) page.setViewportSize({ width: 390, height: 844 });

    // ── JOIN FORM (first phone only) ──────────────────────────────────────────
    await phones[0].page.goto(`${CLIENT}/player?dev=true`);
    await sleep(1500);
    await shot(phones[0].page, "01_phone_join.png", "Join form", "phone 390x844");

    // ── JOIN BOTH PLAYERS ────────────────────────────────────────────────────
    for (const { page, name } of phones) {
      if (page !== phones[0].page) {
        await page.goto(`${CLIENT}/player?dev=true`);
        await sleep(800);
      }
      await page.fill('input[id="name"]', name);
      await page.click('button:has-text("JOIN GAME")');
      await sleep(600);
    }

    await shot(phones[0].page, "02_phoneA_lobby.png", "Lobby — PlayerA", "phone 390x844");
    await shot(phones[1].page, "03_phoneB_lobby.png", "Lobby — PlayerB", "phone 390x844");

    await dash.goto(`${CLIENT}/dashboard`);
    await sleep(800);
    await shot(dash, "04_dash_lobby.png", "Lobby — 2 real players", "dashboard 1280x800");

    // ── BOT GAME — both real players included ─────────────────────────────────
    const createRes = await api("/debug/test/create", "POST", {
      botCount: 2,
      botBehavior: "still",
      mode: MODE,
      includeConnected: true,
    });
    const allPlayers: { id: string; isBot: boolean }[] =
      createRes.snapshot?.players ?? [];
    const botIds = allPlayers.filter((p) => p.isBot).map((p) => p.id);

    await api("/debug/fastforward", "POST");
    await sleep(1000);

    // ── READ SERVER STATE to identify which player has which experience ────────
    const debugState = await api("/debug/state");
    const serverPlayers: { id: string; isKing?: boolean; role?: string; teamId?: number | null; name?: string }[] =
      debugState.snapshot?.players ?? [];

    const idA = await getPlayerId(phones[0].page);
    const idB = await getPlayerId(phones[1].page);
    const stateA = serverPlayers.find((p) => p.id === idA);
    const stateB = serverPlayers.find((p) => p.id === idB);
    const labelA = labelFor(stateA);
    const labelB = labelFor(stateB);

    console.log(`\n  Player labels: PlayerA=${labelA}, PlayerB=${labelB}\n`);

    // ── ACTIVE GAME ───────────────────────────────────────────────────────────
    await shot(dash, "05_dash_active.png", "Active game — dashboard", "dashboard 1280x800");
    await shot(phones[0].page, "06_phoneA_active.png", "Active — PlayerA", "phone 390x844", labelA);
    await shot(phones[1].page, "07_phoneB_active.png", "Active — PlayerB", "phone 390x844", labelB);

    // ── DEAD SCREENS ─────────────────────────────────────────────────────────
    if (idA) { await api(`/debug/player/${idA}/kill`, "POST"); await sleep(500); }
    await shot(phones[0].page, "08_phoneA_dead.png", "Dead — PlayerA", "phone 390x844", labelA);
    if (idB) { await api(`/debug/player/${idB}/kill`, "POST"); await sleep(500); }
    await shot(phones[1].page, "09_phoneB_dead.png", "Dead — PlayerB", "phone 390x844", labelB);

    // ── ROUND END ─────────────────────────────────────────────────────────────
    for (const id of botIds) {
      await api(`/debug/bot/${id}/command`, "POST", { command: "die" });
      await sleep(150);
    }
    await sleep(1000);
    await shot(dash, "10_dash_round_end.png", "Round ended — dashboard", "dashboard 1280x800");
    await shot(phones[0].page, "11_phoneA_round_end.png", "Round ended — PlayerA", "phone 390x844");
    await shot(phones[1].page, "12_phoneB_round_end.png", "Round ended — PlayerB", "phone 390x844");

    // ── GAME OVER ─────────────────────────────────────────────────────────────
    const gameState = await api("/game/state");
    if (gameState.phase === "finished") {
      await shot(dash, "13_dash_game_over.png", "Game over — dashboard", "dashboard 1280x800");
      await shot(phones[0].page, "14_phoneA_game_over.png", "Game over — PlayerA", "phone 390x844");
      await shot(phones[1].page, "15_phoneB_game_over.png", "Game over — PlayerB", "phone 390x844");
    }

    fs.writeFileSync(
      path.join(OUT, "manifest.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          template: "2p",
          mode: MODE,
          backend: BACKEND,
          client: CLIENT,
          playerLabels: { PlayerA: labelA, PlayerB: labelB },
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
