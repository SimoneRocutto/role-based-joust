/**
 * Dashboard scoreboard screenshots.
 *
 * Note: In test mode (debug bot games), GameEngine auto-advances to the next
 * round immediately after round-end, so the "round-ended" state is never
 * stable enough to screenshot in a live bot game.
 *
 * Workaround for round-end screenshots: we inject mock state directly into
 * the Zustand store via page.evaluate(), which lets us render any state.
 * Game-end screenshots use actual bot games (test mode stops at finished state).
 */
import { test, chromium, Page } from "@playwright/test";
import { API_URL, CLIENT_URL } from "./helpers";

async function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`${API_URL}${path}`, opts);
}

async function reset() {
  await apiFetch("/api/debug/reset", { method: "POST" });
  await new Promise((r) => setTimeout(r, 400));
}

async function createGame(opts: {
  mode: string;
  bots: number;
  teams?: boolean;
  teamCount?: number;
}) {
  const body: Record<string, unknown> = {
    mode: opts.mode,
    roles: Array(opts.bots).fill("Survivor"),
  };
  if (opts.teams) {
    body.teams = true;
    body.teamCount = opts.teamCount ?? 2;
  }
  await apiFetch("/api/debug/test/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function killBots(count: number, skip = 0) {
  for (let i = skip; i < count + skip; i++) {
    await apiFetch(`/api/debug/bot/bot-${i}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "die" }),
    });
    await new Promise((r) => setTimeout(r, 80));
  }
}

async function readyAllBots(bots: number) {
  for (let i = 0; i < bots; i++) {
    await apiFetch(`/api/debug/bot/bot-${i}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "shake" }),
    });
  }
}

async function fastForward(ms: number) {
  await apiFetch("/api/debug/fastforward", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ milliseconds: ms }),
  });
}

async function waitForState(state: string, maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const res = await apiFetch("/api/game/state");
    const data = await res.json();
    if (data.state?.state === state) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function waitForText(page: Page, text: string, timeout = 12000) {
  await page.waitForFunction(
    (t) => document.body.innerText.includes(t),
    text,
    { timeout }
  );
  await page.waitForTimeout(500);
}

/**
 * Inject mock round-end state into Zustand store (bypasses test-mode auto-advance).
 */
async function injectRoundEndState(
  page: Page,
  opts: {
    modeName: string;
    modeKey: string;
    currentRound: number;
    totalRounds: number;
    scores: Array<{ playerId: string; playerName: string; playerNumber: number; score: number; roundPoints: number; rank: number }>;
    teamScores?: Array<{
      teamId: number; teamName: string; teamColor: string;
      score: number; roundPoints: number; rank: number;
      players: Array<{ playerId: string; playerName: string; playerNumber: number; score: number; roundPoints: number; rank: number }>;
    }>;
    players?: Array<{ id: string; name: string; number: number; deathCount: number }>;
  }
) {
  await page.evaluate((o) => {
    // Access Zustand store exposed by the app
    const store = (window as any).__gameStore;
    if (!store) return;
    const state = store.getState();
    state.setGameState("round-ended");
    state.setMode(o.modeKey);
    state.setRound(o.currentRound, o.totalRounds);
    state.setScores(o.scores);
    if (o.teamScores) state.setTeamScores(o.teamScores);
    if (o.players) {
      state.updatePlayers(o.players.map((p: any) => ({
        id: p.id, name: p.name, number: p.number,
        role: "", isAlive: true, points: 0, totalPoints: 0,
        toughness: 1, accumulatedDamage: 0, statusEffects: [],
        deathCount: p.deathCount,
      })));
    }
  }, opts);
  await page.waitForTimeout(300);
}

test("screenshot all end screens", async () => {
  const BOTS = 4;
  const browser = await chromium.launch({ headless: true });
  const VIEWPORT = { width: 1400, height: 900 };

  // ─── Setup: expose Zustand store on window for state injection ──────────
  // We create a blank page that navigates to dashboard; the app exposes
  // __gameStore when devMode is active. We also set it in a beforeEach-like step.

  async function openDashboard() {
    const ctx = await browser.newContext({ viewport: VIEWPORT, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    // Expose the store via window after navigation
    await page.goto(`${CLIENT_URL}/dashboard`);
    await page.waitForTimeout(2000);
    // __gameStore is exposed by gameStore.ts in DEV mode
    return { ctx, page };
  }

  // ─── 1. Death Count non-team: round end (injected state) ──────────────
  await reset();
  const { ctx: ctx1, page: page1 } = await openDashboard();
  await injectRoundEndState(page1, {
    modeName: "Death Count",
    modeKey: "death-count",
    currentRound: 1,
    totalRounds: 3,
    scores: [
      { playerId: "p1", playerName: "Alice", playerNumber: 3, score: 3, roundPoints: 3, rank: 1 },
      { playerId: "p2", playerName: "Bob", playerNumber: 1, score: 2, roundPoints: 2, rank: 2 },
      { playerId: "p3", playerName: "Carol", playerNumber: 4, score: 1, roundPoints: 1, rank: 3 },
      { playerId: "p4", playerName: "Dave", playerNumber: 2, score: 0, roundPoints: 0, rank: 4 },
    ],
    players: [
      { id: "p1", name: "Alice", number: 3, deathCount: 0 },
      { id: "p2", name: "Bob", number: 1, deathCount: 1 },
      { id: "p3", name: "Carol", number: 4, deathCount: 2 },
      { id: "p4", name: "Dave", number: 2, deathCount: 3 },
    ],
  });
  await page1.waitForFunction(() => document.body.innerText.includes("ROUND 1 COMPLETE"), { timeout: 5000 }).catch(() => {});
  await page1.waitForTimeout(300);
  await page1.screenshot({ path: "/tmp/score_dc_round_end.png" });
  await ctx1.close();

  // ─── 2. Death Count non-team: game end ──────────────────────────────────
  await reset();
  const { ctx: ctx2, page: page2 } = await openDashboard();
  await createGame({ mode: "death-count", bots: BOTS });
  await waitForState("active");
  // Complete 3 rounds
  for (let r = 0; r < 3; r++) {
    if (r > 0) {
      await readyAllBots(BOTS);
      await waitForState("active", 12000);
    }
    await killBots(BOTS);
    await new Promise((r2) => setTimeout(r2, 300));
    await fastForward(95000);
    if (r < 2) await waitForState("round-ended", 3000).catch(() => {});
  }
  await waitForState("finished", 5000);
  await waitForText(page2, "GAME OVER");
  await page2.screenshot({ path: "/tmp/score_dc_game_end.png" });
  await ctx2.close();

  // ─── 3. Team Classic: round end (injected state) ────────────────────────
  await reset();
  const { ctx: ctx3, page: page3 } = await openDashboard();
  await injectRoundEndState(page3, {
    modeName: "Classic",
    modeKey: "classic",
    currentRound: 1,
    totalRounds: 3,
    scores: [
      { playerId: "p1", playerName: "Alice", playerNumber: 3, score: 5, roundPoints: 5, rank: 1 },
      { playerId: "p2", playerName: "Bob", playerNumber: 1, score: 3, roundPoints: 3, rank: 2 },
      { playerId: "p3", playerName: "Carol", playerNumber: 4, score: 1, roundPoints: 1, rank: 3 },
      { playerId: "p4", playerName: "Dave", playerNumber: 2, score: 0, roundPoints: 0, rank: 4 },
    ],
    teamScores: [
      {
        teamId: 0, teamName: "Red", teamColor: "#ef4444", score: 8, roundPoints: 8, rank: 1,
        players: [
          { playerId: "p1", playerName: "Alice", playerNumber: 3, score: 5, roundPoints: 5, rank: 1 },
          { playerId: "p3", playerName: "Carol", playerNumber: 4, score: 1, roundPoints: 1, rank: 3 },
        ],
      },
      {
        teamId: 1, teamName: "Blue", teamColor: "#3b82f6", score: 3, roundPoints: 3, rank: 2,
        players: [
          { playerId: "p2", playerName: "Bob", playerNumber: 1, score: 3, roundPoints: 3, rank: 2 },
          { playerId: "p4", playerName: "Dave", playerNumber: 2, score: 0, roundPoints: 0, rank: 4 },
        ],
      },
    ],
  });
  await page3.waitForFunction(() => document.body.innerText.includes("ROUND 1 COMPLETE"), { timeout: 5000 }).catch(() => {});
  await page3.waitForTimeout(300);
  await page3.screenshot({ path: "/tmp/score_team_classic_round_end.png" });
  await ctx3.close();

  // ─── 4. Team Classic: game end ──────────────────────────────────────────
  await reset();
  const { ctx: ctx4, page: page4 } = await openDashboard();
  await createGame({ mode: "classic", bots: BOTS, teams: true, teamCount: 2 });
  await waitForState("active");
  for (let r = 0; r < 3; r++) {
    if (r > 0) {
      await readyAllBots(BOTS);
      await waitForState("active", 12000);
    }
    await killBots(BOTS - 1);
    await waitForState(r < 2 ? "round-ended" : "finished", 8000).catch(() => {});
    await new Promise((r2) => setTimeout(r2, 300));
  }
  await waitForState("finished", 5000).catch(() => {});
  await waitForText(page4, "GAME OVER");
  await page4.screenshot({ path: "/tmp/score_team_classic_game_end.png" });
  await ctx4.close();

  // ─── 5. Team Death Count: round end (injected state) ───────────────────
  await reset();
  const { ctx: ctx5, page: page5 } = await openDashboard();
  await injectRoundEndState(page5, {
    modeName: "Death Count",
    modeKey: "death-count",
    currentRound: 1,
    totalRounds: 3,
    scores: [
      { playerId: "p1", playerName: "Alice", playerNumber: 3, score: 3, roundPoints: 3, rank: 1 },
      { playerId: "p2", playerName: "Bob", playerNumber: 1, score: 2, roundPoints: 2, rank: 2 },
      { playerId: "p3", playerName: "Carol", playerNumber: 4, score: 1, roundPoints: 1, rank: 3 },
      { playerId: "p4", playerName: "Dave", playerNumber: 2, score: 0, roundPoints: 0, rank: 4 },
    ],
    teamScores: [
      {
        teamId: 0, teamName: "Red", teamColor: "#ef4444", score: 3, roundPoints: 3, rank: 1,
        players: [
          { playerId: "p1", playerName: "Alice", playerNumber: 3, score: 3, roundPoints: 3, rank: 1 },
          { playerId: "p4", playerName: "Dave", playerNumber: 2, score: 0, roundPoints: 0, rank: 4 },
        ],
      },
      {
        teamId: 1, teamName: "Blue", teamColor: "#3b82f6", score: 3, roundPoints: 3, rank: 2,
        players: [
          { playerId: "p2", playerName: "Bob", playerNumber: 1, score: 2, roundPoints: 2, rank: 2 },
          { playerId: "p3", playerName: "Carol", playerNumber: 4, score: 1, roundPoints: 1, rank: 3 },
        ],
      },
    ],
    players: [
      { id: "p1", name: "Alice", number: 3, deathCount: 0 },
      { id: "p4", name: "Dave", number: 2, deathCount: 3 },
      { id: "p2", name: "Bob", number: 1, deathCount: 1 },
      { id: "p3", name: "Carol", number: 4, deathCount: 2 },
    ],
  });
  await page5.waitForFunction(() => document.body.innerText.includes("ROUND 1 COMPLETE"), { timeout: 5000 }).catch(() => {});
  await page5.waitForTimeout(300);
  await page5.screenshot({ path: "/tmp/score_team_dc_round_end.png" });
  await ctx5.close();

  // ─── 6. Team Death Count: game end ──────────────────────────────────────
  await reset();
  const { ctx: ctx6, page: page6 } = await openDashboard();
  await createGame({ mode: "death-count", bots: BOTS, teams: true, teamCount: 2 });
  await waitForState("active");
  for (let r = 0; r < 3; r++) {
    if (r > 0) {
      await readyAllBots(BOTS);
      await waitForState("active", 12000);
    }
    await killBots(BOTS);
    await new Promise((r2) => setTimeout(r2, 300));
    await fastForward(95000);
    if (r < 2) await waitForState("round-ended", 3000).catch(() => {});
  }
  await waitForState("finished", 5000);
  await waitForText(page6, "GAME OVER");
  await page6.screenshot({ path: "/tmp/score_team_dc_game_end.png" });
  await ctx6.close();

  await browser.close();
});
