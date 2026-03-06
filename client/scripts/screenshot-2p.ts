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
 * To capture a specific mode: MODE=long-live-the-king npm run screenshot:2p
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

// Detect HTTPS: check if SSL certs exist (same logic as vite.config.js)
const certsDir = path.resolve(__dirname, "../../certs");
const certsExist =
  (fs.existsSync(path.join(certsDir, "server.crt")) &&
    fs.existsSync(path.join(certsDir, "server.key"))) ||
  (fs.existsSync(path.join(certsDir, "cert.pem")) &&
    fs.existsSync(path.join(certsDir, "key.pem")));
const protocol = certsExist ? "https" : "http";

// Allow self-signed certs for fetch() calls
if (certsExist) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BACKEND = `${protocol}://localhost:${process.env.VITE_BACKEND_PORT || 4000}`;
const CLIENT = `${protocol}://localhost:${process.env.VITE_PORT || 5173}`;
const MODE = process.env.MODE || "classic";
// Use a mode-specific subdirectory so multi-mode runs don't overwrite each other
const OUT = path.resolve(__dirname, `../e2e/screenshots/${MODE}`);

// Map MODE env values to combined dropdown keys
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
  return res?.state?.state ?? res?.phase ?? "unknown";
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

/** Check if the mode uses time-based round end (needs fast-forward). */
function isTimedMode(mode: string): boolean {
  return ["death-count", "death-count-team"].includes(mode);
}

/** Trigger round end based on mode type. */
async function triggerRoundEnd(mode: string, botCount: number) {
  if (isTimedMode(mode) || mode === "domination") {
    console.log("  [flow] Fast-forwarding to end round...");
    await api("/debug/fastforward", "POST", { milliseconds: 120_000 });
    await sleep(500);
  } else {
    // Kill-based: kill all bots to end the round
    for (let i = 0; i < botCount; i++) {
      await api(`/debug/bot/bot-${i}/command`, "POST", { action: "die" });
      await sleep(150);
    }
    await sleep(500);
  }
}

/** Check if the current mode uses teams. */
function isTeamMode(mode: string): boolean {
  return [
    "classic-team",
    "death-count-team",
    "role-based-team",
    "domination",
    "long-live-the-king",
  ].includes(mode);
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

(async () => {
  await checkServer();
  // Rotate output dir: current → {dir}-prev (delete any older prev)
  const prev = `${OUT}-prev`;
  if (fs.existsSync(prev)) fs.rmSync(prev, { recursive: true });
  if (fs.existsSync(OUT)) fs.renameSync(OUT, prev);
  fs.mkdirSync(OUT, { recursive: true });

  const log: { file: string; state: string; viewport: string; note?: string }[] = [];
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });

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
    // ── RESET ────────────────────────────────────────────────────────────────
    await api("/debug/reset", "POST");
    await sleep(400);

    const dash = await context.newPage();
    dash.setViewportSize({ width: 1280, height: 800 });

    // Each phone needs its own context so they don't share localStorage
    // (otherwise PlayerB would see PlayerA's session and skip the join form)
    const phoneContextA = await browser.newContext({ ignoreHTTPSErrors: true });
    const phoneContextB = await browser.newContext({ ignoreHTTPSErrors: true });
    const phones: { page: Page; name: string }[] = [
      { page: await phoneContextA.newPage(), name: "PlayerA" },
      { page: await phoneContextB.newPage(), name: "PlayerB" },
    ];
    for (const { page } of phones) page.setViewportSize({ width: 390, height: 844 });

    // ── JOIN FORM (first phone only) ─────────────────────────────────────────
    await phones[0].page.goto(`${CLIENT}/player?dev=true`);
    await sleep(1500);
    await shot(phones[0].page, "01_phone_join.png", "Join form", "phone 390x844");

    // ── JOIN BOTH PLAYERS (real UI clicks) ───────────────────────────────────
    for (const { page, name } of phones) {
      if (page !== phones[0].page) {
        await page.goto(`${CLIENT}/player?dev=true`);
        await sleep(1500);
      }
      // Wait for join form to be visible before filling
      await page.waitForSelector('input[id="name"]', { timeout: 10000 });
      await page.fill('input[id="name"]', name);
      await page.click('button:has-text("JOIN GAME")');
      await sleep(600);
      console.log(`  [flow] ${name} joined`);
    }

    await shot(phones[0].page, "02_phoneA_lobby.png", "Lobby — PlayerA", "phone 390x844");
    await shot(phones[1].page, "03_phoneB_lobby.png", "Lobby — PlayerB", "phone 390x844");

    // ── SPAWN BOTS into lobby (API — no UI equivalent) ───────────────────────
    await api("/debug/spawn-bots", "POST", { count: 2, behavior: "still" });
    await sleep(400);

    // ── SPAWN BASES for domination mode ────────────────────────────────────
    if (MODE === "domination") {
      await api("/debug/spawn-bases", "POST", { count: 1, teamCount: 2 });
      await sleep(300);
    }

    // ── DASHBOARD — open and select mode via real UI ─────────────────────────
    await dash.goto(`${CLIENT}/dashboard`);
    await sleep(800);

    const combinedKey = MODE_TO_COMBINED_KEY[MODE];
    if (combinedKey) {
      await dash.selectOption("select", combinedKey);
      await sleep(400);
    }

    await shot(dash, "04_dash_lobby.png", "Lobby — 2 real players + 2 bots", "dashboard 1280x800");

    // ── CONFIGURE for fast screenshots ──────────────────────────────────────
    await api("/debug/set-countdown", "POST", { seconds: 1 });
    if (MODE === "domination") {
      // Domination is single-round; set a low point target so fast-forward finishes it
      await api("/game/settings", "POST", { dominationPointTarget: 5, dominationControlInterval: 3 });
    } else {
      // 2 rounds so we see both "round-ended" (after round 1) and "finished" (after round 2).
      await api("/game/settings", "POST", { roundCount: 2, targetScore: 10 });
    }
    // Short round duration for timed modes (death-count)
    if (isTimedMode(MODE)) {
      await api("/game/settings", "POST", { roundDuration: 30 });
    }

    // ── START GAME via dashboard button (real UI click) ──────────────────────
    await dash.getByRole("button", { name: /Start Game \(/ }).click();
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
      await shot(dash, "04b_dash_pregame.png", "Pre-game — dashboard", "dashboard 1280x800");
      await shot(phones[0].page, "04c_phoneA_pregame.png", "Pre-game — PlayerA", "phone 390x844");
      await shot(phones[1].page, "04d_phoneB_pregame.png", "Pre-game — PlayerB", "phone 390x844");

      const forceBtn = dash.getByRole("button", { name: "START GAME", exact: true });
      await forceBtn.waitFor({ timeout: 3000 });
      await forceBtn.click();
      console.log("  [flow] Clicked pre-game START GAME");
    }

    // ── COUNTDOWN → ACTIVE ───────────────────────────────────────────────────
    // Countdown is set to 1s, just wait for it to finish
    await waitForPhase("active");
    await sleep(500);

    // ── READ SERVER STATE to identify which player has which experience ───────
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

    // ── DOMINATION: capture a base so points start accumulating ───────────────
    if (MODE === "domination") {
      await api("/debug/base/base-1/capture", "POST", { teamId: 0 });
      await sleep(300);
      console.log("  [flow] Base captured by team 0 for domination scoring");
    }

    // ── ACTIVE GAME (full HP) ────────────────────────────────────────────────
    await shot(dash, "05_dash_active.png", "Active game — dashboard (full HP)", "dashboard 1280x800");
    await shot(phones[0].page, "06_phoneA_active.png", "Active — PlayerA (full HP)", "phone 390x844", labelA);
    await shot(phones[1].page, "07_phoneB_active.png", "Active — PlayerB (full HP)", "phone 390x844", labelB);

    // ── ACTIVE GAME (damaged) — HP gradient on phone + dashboard cards ───────
    if (idA) await api(`/debug/player/${idA}/damage`, "POST", { amount: 50 });
    if (idB) await api(`/debug/player/${idB}/damage`, "POST", { amount: 75 });
    await api("/debug/bot/bot-0/command", "POST", { action: "damage", args: [25] });
    await sleep(600);
    await shot(dash, "05b_dash_active_damaged.png", "Active game — dashboard (damaged)", "dashboard 1280x800");
    await shot(phones[0].page, "06b_phoneA_active_damaged.png", "Active — PlayerA (~50% HP)", "phone 390x844", labelA);
    await shot(phones[1].page, "07b_phoneB_active_damaged.png", "Active — PlayerB (~25% HP)", "phone 390x844", labelB);

    // ── DEAD SCREENS ─────────────────────────────────────────────────────────
    if (idA) { await api(`/debug/player/${idA}/kill`, "POST"); await sleep(500); }
    await shot(phones[0].page, "08_phoneA_dead.png", "Dead — PlayerA", "phone 390x844", labelA);
    if (idB) { await api(`/debug/player/${idB}/kill`, "POST"); await sleep(500); }
    await shot(phones[1].page, "09_phoneB_dead.png", "Dead — PlayerB", "phone 390x844", labelB);

    // ── ROUND / GAME END ───────────────────────────────────────────────────
    // Domination is single-round: game goes straight to "finished" when point target is reached.
    // Other modes: round 1 → round-ended → round 2 → finished.
    await triggerRoundEnd(MODE, 2);
    await waitForPhase(["round-ended", "finished"]);
    await sleep(500);
    const r1Phase = await getPhase();
    console.log(`  [flow] Phase after trigger: ${r1Phase}`);

    if (r1Phase === "finished") {
      // Single-round mode (domination): skip round-end, go straight to game over
      await shot(dash, "10_dash_game_over.png", "Game over — dashboard", "dashboard 1280x800");
      await shot(phones[0].page, "11_phoneA_game_over.png", "Game over — PlayerA", "phone 390x844");
      await shot(phones[1].page, "12_phoneB_game_over.png", "Game over — PlayerB", "phone 390x844");
    } else {
      // Multi-round mode: capture round-ended then advance to game over
      await shot(dash, "10_dash_round_end.png", "Round ended — dashboard", "dashboard 1280x800");
      await shot(phones[0].page, "11_phoneA_round_end.png", "Round ended — PlayerA", "phone 390x844");
      await shot(phones[1].page, "12_phoneB_round_end.png", "Round ended — PlayerB", "phone 390x844");

      await api("/game/next-round", "POST");
      await waitForPhase("active");
      await sleep(300);
      await triggerRoundEnd(MODE, 2);
      await waitForPhase("finished", 15000);
      await sleep(500);
      const gamePhase = await getPhase();
      if (gamePhase === "finished") {
        await shot(dash, "13_dash_game_over.png", "Game over — dashboard", "dashboard 1280x800");
        await shot(phones[0].page, "14_phoneA_game_over.png", "Game over — PlayerA", "phone 390x844");
        await shot(phones[1].page, "15_phoneB_game_over.png", "Game over — PlayerB", "phone 390x844");
      } else {
        console.log(`  [warn] Expected 'finished' but got '${gamePhase}'. Skipping game-over screenshots.`);
      }
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
