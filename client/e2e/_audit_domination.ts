/**
 * Domination mode audit script — team-based base capture
 *
 * Flow (click-through, matching real admin workflow):
 *   1. Reset + settings (gameMode=domination, teamsEnabled=true, countdown=2s)
 *   2. Real phones join + spawn fake players → lobby screenshots
 *   3. Click "Start Game" → enters pre-game (team assignment visible)
 *   4. Screenshot pre-game (team setup)
 *   5. POST /game/proceed → 2s countdown
 *   6. Spawn simulated bases (owned by alternating teams)
 *   7. Active game screenshots — show team scores + base ownership
 *   8. Kill players, capture mid-game state
 *
 * Usage: npx tsx e2e/_audit_domination.ts
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
const OUT = path.resolve(__dirname, "../e2e/screenshots/domination");

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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const log: { file: string; state: string; viewport: string; note?: string }[] = [];
  const browser = await chromium.launch();

  const shot = async (page: Page, file: string, state: string, viewport: string, note?: string) => {
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    log.push({ file, state, viewport, ...(note ? { note } : {}) });
    console.log(`  ${file}  —  ${state}${note ? ` (${note})` : ""}`);
  };

  try {
    // ── RESET + SETTINGS ──────────────────────────────────────────────────────
    await api("/debug/reset", "POST");
    await sleep(400);

    await api("/game/settings", "POST", {
      gameMode: "domination",
      teamsEnabled: true,
      teamCount: 2,
    });

    const dash = await browser.newPage();
    dash.setViewportSize({ width: 1280, height: 800 });

    const phones: { page: Page; name: string }[] = [
      { page: await browser.newPage(), name: "PlayerA" },
      { page: await browser.newPage(), name: "PlayerB" },
    ];
    for (const { page } of phones) page.setViewportSize({ width: 390, height: 844 });

    // ── JOIN FORM ─────────────────────────────────────────────────────────────
    await phones[0].page.goto(`${CLIENT}/player?dev=true`);
    await sleep(1500);
    await shot(phones[0].page, "01_phone_join.png", "Join form", "phone 390x844");

    // ── BOTH REAL PLAYERS JOIN ────────────────────────────────────────────────
    for (const { page, name } of phones) {
      if (page !== phones[0].page) {
        await page.goto(`${CLIENT}/player?dev=true`);
        await sleep(800);
      }
      await page.fill('input[id="name"]', name);
      await page.click('button:has-text("JOIN GAME")');
      await sleep(600);
    }

    // ── SPAWN 2 FAKE LOBBY PLAYERS ──────────────────────────────────────────
    await api("/debug/spawn-lobby-players", "POST", {
      count: 2,
      names: ["FakeBot1", "FakeBot2"],
    });

    // ── LOBBY SCREENSHOTS ───────────────────────────────────────────────────
    await shot(phones[0].page, "02_phoneA_lobby.png", "Lobby — PlayerA", "phone 390x844");
    await shot(phones[1].page, "03_phoneB_lobby.png", "Lobby — PlayerB", "phone 390x844");

    await dash.goto(`${CLIENT}/dashboard`);
    await sleep(1000);
    await shot(dash, "04_dash_lobby.png", "Lobby — 4 players (2 real, 2 fake)", "dashboard 1280x800");

    // ── CLICK START GAME → enters pre-game (team assignment visible) ─────────
    await dash.click('button:has-text("Start Game")');
    await sleep(1000);

    // ── PRE-GAME SCREENSHOTS (team assignment visible on dashboard) ──────────
    await shot(dash, "05_dash_pregame_teams.png", "Pre-game — team setup dashboard", "dashboard 1280x800");
    await shot(phones[0].page, "06_phoneA_pregame.png", "Pre-game — PlayerA", "phone 390x844");
    await shot(phones[1].page, "07_phoneB_pregame.png", "Pre-game — PlayerB", "phone 390x844");

    // ── OPEN BASE PHONE (registers via socket as a real base) ─────────────
    const basePage = await browser.newPage();
    basePage.setViewportSize({ width: 390, height: 844 });
    await basePage.goto(`${CLIENT}/base`);
    await sleep(1000);

    // ── FORCE PROCEED → COUNTDOWN ──────────────────────────────────────────
    // Set short countdown AFTER game launch (onModeSelected overrides earlier calls)
    await api("/debug/set-countdown", "POST", { seconds: 2 });
    await api("/game/proceed", "POST");
    // Wait for 2s real-time countdown + GO! animation to clear
    await sleep(4000);

    // ── BASE NEUTRAL STATE ──────────────────────────────────────────────────
    await shot(basePage, "08_base_neutral.png", "Base — neutral (waiting for capture)", "phone 390x844");

    // ── READ SERVER STATE to label players ───────────────────────────────────
    const debugState = await api("/debug/state");
    const serverPlayers: { id: string; teamId?: number | null; name?: string }[] =
      debugState.snapshot?.players ?? [];

    const idA = await getPlayerId(phones[0].page);
    const idB = await getPlayerId(phones[1].page);
    const stateA = serverPlayers.find((p) => p.id === idA);
    const stateB = serverPlayers.find((p) => p.id === idB);

    const labelFor = (s: typeof stateA) => {
      if (!s) return "unknown";
      const parts: string[] = [];
      if (s.teamId != null) parts.push(`team:${s.teamId}`);
      return parts.length ? parts.join(", ") : "no-team";
    };
    const labelA = labelFor(stateA);
    const labelB = labelFor(stateB);
    console.log(`\n  Player labels: PlayerA=${labelA}, PlayerB=${labelB}`);
    console.log(`  Game phase: ${debugState.snapshot?.state}`);

    // ── ACTIVE GAME ─────────────────────────────────────────────────────────
    await shot(dash, "09_dash_active.png", "Active game — dashboard", "dashboard 1280x800");
    await shot(phones[0].page, "10_phoneA_active.png", "Active — PlayerA", "phone 390x844", labelA);
    await shot(phones[1].page, "11_phoneB_active.png", "Active — PlayerB", "phone 390x844", labelB);

    // ── CAPTURE BASE for Red team (tap the left/first section) ──────────────
    // The base page shows N colored sections side by side. Tap the left half for team 0 (Red).
    const baseBox = await basePage.locator("div.flex.flex-1 > div").first().boundingBox();
    if (baseBox) {
      await basePage.click(`div.flex.flex-1 > div >> nth=0`);
      await sleep(500);
    }
    await shot(basePage, "12_base_captured_red.png", "Base — captured by Red team", "phone 390x844");
    await shot(dash, "13_dash_base_captured.png", "Dashboard — base captured by Red", "dashboard 1280x800");

    // ── CAPTURE BASE for Blue team (tap the right section) ──────────────────
    await basePage.click(`div.flex.flex-1 > div >> nth=1`);
    await sleep(500);
    await shot(basePage, "14_base_captured_blue.png", "Base — captured by Blue team", "phone 390x844");

    // ── KILL PlayerA → should respawn (domination has respawns) ─────────────
    if (idA) { await api(`/debug/player/${idA}/kill`, "POST"); await sleep(500); }
    await shot(phones[0].page, "15_phoneA_dead.png", "Dead/respawning — PlayerA", "phone 390x844", labelA);

    // Wait for respawn
    await sleep(3000);
    await shot(phones[0].page, "16_phoneA_respawned.png", "Respawned — PlayerA", "phone 390x844", labelA);
    await shot(dash, "17_dash_after_respawn.png", "Active after respawn — dashboard", "dashboard 1280x800");

    // ── KILL PlayerB too ────────────────────────────────────────────────────
    if (idB) { await api(`/debug/player/${idB}/kill`, "POST"); await sleep(500); }
    await shot(phones[1].page, "18_phoneB_dead.png", "Dead/respawning — PlayerB", "phone 390x844", labelB);

    // ── MID-GAME STATE ──────────────────────────────────────────────────────
    await sleep(2000);
    const currentState = await api("/debug/state");
    console.log(`  Game phase after kills: ${currentState.snapshot?.state}`);

    if (currentState.snapshot?.state === "active") {
      await shot(dash, "19_dash_mid_game.png", "Mid-game scores — dashboard", "dashboard 1280x800");
    }

    if (currentState.snapshot?.state === "round-ended" || currentState.snapshot?.state === "finished") {
      await shot(dash, "19_dash_game_end.png", "Game ended — dashboard", "dashboard 1280x800");
      await shot(phones[0].page, "20_phoneA_game_end.png", "Game ended — PlayerA", "phone 390x844", labelA);
      await shot(phones[1].page, "21_phoneB_game_end.png", "Game ended — PlayerB", "phone 390x844", labelB);
    }

    fs.writeFileSync(
      path.join(OUT, "manifest.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          template: "click-through-2p",
          mode: "domination",
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
