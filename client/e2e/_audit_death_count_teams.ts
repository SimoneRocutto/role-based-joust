/**
 * Death Count + Teams audit script
 *
 * Same click-through approach as classic-teams but with gameMode: "death-count".
 * Death count mode has respawns, so we capture respawn + active states too.
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
const OUT = path.resolve(__dirname, "../e2e/screenshots/death-count-teams");

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
    // -- RESET + SETTINGS --
    await api("/debug/reset", "POST");
    await sleep(400);

    await api("/game/settings", "POST", {
      gameMode: "death-count",
      teamsEnabled: true,
      teamCount: 2,
    });

    await api("/debug/set-countdown", "POST", { seconds: 2 });

    const dash = await browser.newPage();
    dash.setViewportSize({ width: 1280, height: 800 });

    const phones: { page: Page; name: string }[] = [
      { page: await browser.newPage(), name: "PlayerA" },
      { page: await browser.newPage(), name: "PlayerB" },
    ];
    for (const { page } of phones) page.setViewportSize({ width: 390, height: 844 });

    // -- JOIN FORM --
    await phones[0].page.goto(`${CLIENT}/player?dev=true`);
    await sleep(1500);
    await shot(phones[0].page, "01_phone_join.png", "Join form", "phone 390x844");

    // -- BOTH REAL PLAYERS JOIN --
    for (const { page, name } of phones) {
      if (page !== phones[0].page) {
        await page.goto(`${CLIENT}/player?dev=true`);
        await sleep(800);
      }
      await page.fill('input[id="name"]', name);
      await page.click('button:has-text("JOIN GAME")');
      await sleep(600);
    }

    // -- SPAWN 2 FAKE LOBBY PLAYERS --
    await api("/debug/spawn-lobby-players", "POST", {
      count: 2,
      names: ["FakeBot1", "FakeBot2"],
    });

    // -- LOBBY SCREENSHOTS --
    await shot(phones[0].page, "02_phoneA_lobby.png", "Lobby — PlayerA", "phone 390x844");
    await shot(phones[1].page, "03_phoneB_lobby.png", "Lobby — PlayerB", "phone 390x844");

    await dash.goto(`${CLIENT}/dashboard`);
    await sleep(1000);
    await shot(dash, "04_dash_lobby.png", "Lobby — 4 players (2 real, 2 fake)", "dashboard 1280x800");

    // -- CLICK START GAME -> pre-game --
    await dash.click('button:has-text("Start Game")');
    await sleep(1000);

    // -- PRE-GAME SCREENSHOTS (team assignment visible) --
    await shot(dash, "05_dash_pregame_teams.png", "Pre-game — team setup dashboard", "dashboard 1280x800");
    await shot(phones[0].page, "06_phoneA_pregame.png", "Pre-game — PlayerA", "phone 390x844");
    await shot(phones[1].page, "07_phoneB_pregame.png", "Pre-game — PlayerB", "phone 390x844");

    // -- FORCE PROCEED -> 2s COUNTDOWN --
    await api("/game/proceed", "POST");
    await sleep(4000);

    // -- READ SERVER STATE to label players --
    const debugState = await api("/debug/state");
    const serverPlayers: { id: string; teamId?: number | null; name?: string; isKing?: boolean }[] =
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

    // -- ACTIVE GAME --
    await shot(dash, "08_dash_active.png", "Active game — dashboard", "dashboard 1280x800");
    await shot(phones[0].page, "09_phoneA_active.png", "Active — PlayerA", "phone 390x844", labelA);
    await shot(phones[1].page, "10_phoneB_active.png", "Active — PlayerB", "phone 390x844", labelB);

    // -- KILL PlayerA -> should respawn in death-count mode --
    if (idA) { await api(`/debug/player/${idA}/kill`, "POST"); await sleep(500); }
    await shot(phones[0].page, "11_phoneA_dead.png", "Dead/respawning — PlayerA", "phone 390x844", labelA);

    // Wait for respawn
    await sleep(3000);
    await shot(phones[0].page, "12_phoneA_respawned.png", "Respawned — PlayerA", "phone 390x844", labelA);
    await shot(dash, "13_dash_after_respawn.png", "Active after respawn — dashboard", "dashboard 1280x800");

    // -- KILL PlayerB too --
    if (idB) { await api(`/debug/player/${idB}/kill`, "POST"); await sleep(500); }
    await shot(phones[1].page, "14_phoneB_dead.png", "Dead/respawning — PlayerB", "phone 390x844", labelB);

    // -- End the game: kill all remaining players enough times to reach target score
    // Or just capture round-end if the game ends on its own
    // For now, stop the game to trigger game-end
    await sleep(2000);

    // Check current state
    const currentState = await api("/debug/state");
    console.log(`  Game phase after kills: ${currentState.snapshot?.state}`);

    if (currentState.snapshot?.state === "active") {
      // Death count mode plays to a target score, so game may still be active
      // Take active dashboard screenshot showing scores mid-game
      await shot(dash, "15_dash_mid_game.png", "Mid-game scores — dashboard", "dashboard 1280x800");
    }

    // If there's a round-end or game-end state, capture it
    if (currentState.snapshot?.state === "round-ended" || currentState.snapshot?.state === "finished") {
      await shot(dash, "15_dash_round_end.png", "Round/game ended — dashboard", "dashboard 1280x800");
      await shot(phones[0].page, "16_phoneA_round_end.png", "Round/game ended — PlayerA", "phone 390x844", labelA);
      await shot(phones[1].page, "17_phoneB_round_end.png", "Round/game ended — PlayerB", "phone 390x844", labelB);
    }

    fs.writeFileSync(
      path.join(OUT, "manifest.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          template: "click-through-2p",
          mode: "death-count-teams",
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
