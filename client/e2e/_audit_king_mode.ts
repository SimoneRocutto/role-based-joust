/**
 * King Mode audit script — "Long live the king"
 *
 * Flow (click-through, matching real admin workflow):
 *   1. Reset + settings (gameMode=long-live-the-king, teamsEnabled=true, countdown=2s)
 *   2. Real phones join + spawn fake players → lobby screenshots
 *   3. Click "Start Game" → enters pre-game (team assignment visible)
 *   4. Screenshot pre-game (team setup)
 *   5. POST /game/proceed → 2s countdown
 *   6. Active game screenshots — label king vs non-king per player
 *   7. Kill king on one team → cascade death screenshots
 *   8. Kill remaining team → round end screenshots
 *
 * Usage: npx tsx e2e/_audit_king_mode.ts
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
const OUT = path.resolve(__dirname, "../e2e/screenshots/long-live-the-king");

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
      gameMode: "long-live-the-king",
      teamsEnabled: true,
      teamCount: 2,
    });

    // Short countdown so we don't wait long, but enough for pre-game screenshots
    await api("/debug/set-countdown", "POST", { seconds: 2 });

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

    // ── SPAWN 2 FAKE LOBBY PLAYERS (4 total = 2 per team) ───────────────────
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

    // ── FORCE PROCEED → 2s COUNTDOWN ────────────────────────────────────────
    await api("/game/proceed", "POST");
    // Wait for 2s real-time countdown + GO! animation to clear
    await sleep(4000);

    // ── READ SERVER STATE to identify kings ──────────────────────────────────
    const debugState = await api("/debug/state");
    const serverPlayers: {
      id: string;
      teamId?: number | null;
      name?: string;
      isKing?: boolean;
      isAlive?: boolean;
    }[] = debugState.snapshot?.players ?? [];

    const idA = await getPlayerId(phones[0].page);
    const idB = await getPlayerId(phones[1].page);
    const stateA = serverPlayers.find((p) => p.id === idA);
    const stateB = serverPlayers.find((p) => p.id === idB);

    const labelFor = (s: typeof stateA) => {
      if (!s) return "unknown";
      const parts: string[] = [];
      if (s.isKing) parts.push("KING");
      if (s.teamId != null) parts.push(`team:${s.teamId}`);
      return parts.length ? parts.join(", ") : "regular";
    };
    const labelA = labelFor(stateA);
    const labelB = labelFor(stateB);
    console.log(`\n  Player labels: PlayerA=${labelA}, PlayerB=${labelB}`);
    console.log(`  Game phase: ${debugState.snapshot?.state}`);

    // ── ACTIVE GAME ─────────────────────────────────────────────────────────
    await shot(dash, "08_dash_active.png", "Active game — dashboard", "dashboard 1280x800");
    await shot(phones[0].page, "09_phoneA_active.png", "Active — PlayerA", "phone 390x844", labelA);
    await shot(phones[1].page, "10_phoneB_active.png", "Active — PlayerB", "phone 390x844", labelB);

    // ── KILL A KING to trigger cascade ──────────────────────────────────────
    // Find a king (preferring a non-real-player king if possible, but any king works)
    const kings = serverPlayers.filter((p) => p.isKing);
    const kingToKill = kings.find((k) => k.id !== idA && k.id !== idB) ?? kings[0];

    if (kingToKill) {
      console.log(`\n  Killing king: ${kingToKill.name} (team ${kingToKill.teamId})`);
      await api(`/debug/player/${kingToKill.id}/kill`, "POST");
      await sleep(800);

      await shot(dash, "11_dash_king_died.png", "King died — cascade death", "dashboard 1280x800");

      // If one of our real players was on the same team, they're dead now
      if (stateA?.teamId === kingToKill.teamId) {
        await shot(phones[0].page, "12_phoneA_cascade_dead.png", "Cascade dead — PlayerA", "phone 390x844", labelA);
      }
      if (stateB?.teamId === kingToKill.teamId) {
        await shot(phones[1].page, "12_phoneB_cascade_dead.png", "Cascade dead — PlayerB", "phone 390x844", labelB);
      }
    }

    // ── KILL REMAINING PLAYERS to end round ─────────────────────────────────
    // Re-fetch state since cascade may have killed more players
    const freshState = await api("/debug/state");
    const freshPlayers: { id: string; isAlive?: boolean }[] = freshState.snapshot?.players ?? [];
    for (const p of freshPlayers) {
      if (p.isAlive) {
        await api(`/debug/player/${p.id}/kill`, "POST");
        await sleep(150);
      }
    }
    await sleep(1000);

    // ── DEAD SCREENS (both players should be dead now) ──────────────────────
    await shot(phones[0].page, "13_phoneA_dead.png", "Dead — PlayerA", "phone 390x844", labelA);
    await shot(phones[1].page, "14_phoneB_dead.png", "Dead — PlayerB", "phone 390x844", labelB);

    // ── ROUND END ───────────────────────────────────────────────────────────
    await shot(dash, "15_dash_round_end.png", "Round ended — dashboard", "dashboard 1280x800");
    await shot(phones[0].page, "16_phoneA_round_end.png", "Round ended — PlayerA", "phone 390x844");
    await shot(phones[1].page, "17_phoneB_round_end.png", "Round ended — PlayerB", "phone 390x844");

    // ── GAME OVER (check if game finished) ──────────────────────────────────
    const gameState = await api("/game/state");
    if (gameState.phase === "finished") {
      await shot(dash, "18_dash_game_over.png", "Game over — dashboard", "dashboard 1280x800");
      await shot(phones[0].page, "19_phoneA_game_over.png", "Game over — PlayerA", "phone 390x844");
      await shot(phones[1].page, "20_phoneB_game_over.png", "Game over — PlayerB", "phone 390x844");
    }

    fs.writeFileSync(
      path.join(OUT, "manifest.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          template: "click-through-2p",
          mode: "long-live-the-king",
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
