import { Page, expect, BrowserContext } from '@playwright/test';

/**
 * E2E Test Helpers for Extended Joust
 *
 * These helpers make tests more readable and provide
 * reusable utilities for common operations.
 */

// API Base URL (server)
export const API_URL = 'http://localhost:4000';
export const CLIENT_URL = 'http://localhost:5173';

/**
 * Reset server state before tests
 * Clears all connections and stops any running game
 */
export async function resetServerState(): Promise<void> {
  try {
    // Stop any running game
    await fetch(`${API_URL}/api/game/stop`, { method: 'POST' });
  } catch (e) {
    // Ignore errors - server might not have a game running
  }

  // Clear connections via debug endpoint (if available)
  try {
    await fetch(`${API_URL}/api/debug/reset`, { method: 'POST' });
  } catch (e) {
    // Debug endpoint might not exist
  }
}

/**
 * Wait for socket connection to be established
 */
export async function waitForSocketConnection(page: Page): Promise<void> {
  await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10000 });
}

/**
 * Join game as a player
 * Returns the player page for further interactions
 */
export async function joinAsPlayer(
  page: Page,
  playerName: string
): Promise<{ playerId: string; playerNumber: number }> {
  // Go to join page
  await page.goto('/join');

  // Wait for connection
  await waitForSocketConnection(page);

  // Enter name
  await page.fill('input[id="name"]', playerName);

  // Click join
  await page.click('button:has-text("JOIN GAME")');

  // Wait for navigation to player view
  await page.waitForURL('/player');

  // Extract player info from localStorage
  const playerId = await page.evaluate(() => localStorage.getItem('playerId'));
  const playerNumber = await page.evaluate(() =>
    parseInt(localStorage.getItem('playerNumber') || '0')
  );

  return {
    playerId: playerId || '',
    playerNumber,
  };
}

/**
 * Open dashboard in a new page
 */
export async function openDashboard(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/dashboard');
  return page;
}

/**
 * Open player join page in a new page
 */
export async function openPlayerJoin(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/join');
  await waitForSocketConnection(page);
  return page;
}

/**
 * Start game from dashboard (full countdown)
 * Assumes players are already connected
 */
export async function startGameFromDashboard(dashboardPage: Page): Promise<void> {
  // Click start game button
  await dashboardPage.click('button:has-text("Start Game")');

  // Wait for countdown overlay to appear (fixed overlay with countdown number)
  // The countdown display has "Get ready..." text or large numbers
  await expect(dashboardPage.locator('text=Get ready')).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Start game via API with configurable countdown (for fast tests)
 * @param countdownDuration Countdown in seconds (0 to skip)
 * @param mode Game mode ('classic' or 'role-based')
 */
export async function launchGameFast(
  countdownDuration: number = 0,
  mode: string = 'classic'
): Promise<void> {
  const response = await fetch(`${API_URL}/api/game/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, countdownDuration }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Failed to launch game: ${data.error}`);
  }

  // Small delay to allow game state to propagate
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * Wait for countdown to complete (full countdown)
 */
export async function waitForCountdownComplete(page: Page): Promise<void> {
  // Wait for either "GO!" or the game to become active (showing "remaining" timer)
  // The GO! phase is very brief, so we also check for game active state
  await expect(
    page.locator('text=/GO!|remaining/i')
  ).toBeVisible({ timeout: 15000 });

  // Wait a bit for the game to be fully active
  await page.waitForTimeout(500);
}

/**
 * Wait for game to become active (for fast tests without countdown)
 */
export async function waitForGameActive(page: Page): Promise<void> {
  // Wait for the game to become active (showing "remaining" timer or Round info)
  await expect(
    page.locator('text=/remaining|Round \\d+/i')
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Get current game state from API
 */
export async function getGameState(): Promise<any> {
  const response = await fetch(`${API_URL}/api/game/state`);
  return response.json();
}

/**
 * Get lobby players from API
 */
export async function getLobbyPlayers(): Promise<any> {
  const response = await fetch(`${API_URL}/api/game/lobby`);
  return response.json();
}

/**
 * Verify player is in waiting state (not dead)
 */
export async function expectPlayerWaiting(playerPage: Page): Promise<void> {
  // Should see "WAITING FOR GAME START" text
  await expect(
    playerPage.locator('text=/WAITING FOR GAME|Waiting for players/i')
  ).toBeVisible();

  // Should NOT see skull emoji or "ELIMINATED"
  await expect(playerPage.locator('text=ELIMINATED')).not.toBeVisible();
  await expect(playerPage.locator('text=💀')).not.toBeVisible();
}

/**
 * Verify player is alive during game (not dead)
 */
export async function expectPlayerAlive(playerPage: Page): Promise<void> {
  // Should NOT see skull or eliminated
  await expect(playerPage.locator('text=ELIMINATED')).not.toBeVisible();
  await expect(playerPage.locator('text=💀')).not.toBeVisible();
}

/**
 * Verify player is dead
 */
export async function expectPlayerDead(playerPage: Page): Promise<void> {
  // Should see skull and eliminated
  await expect(playerPage.locator('text=ELIMINATED')).toBeVisible();
  await expect(playerPage.locator('text=💀')).toBeVisible();
}

/**
 * Verify dashboard shows correct player count
 */
export async function expectDashboardPlayerCount(
  dashboardPage: Page,
  count: number
): Promise<void> {
  await expect(
    dashboardPage.locator(`text=Connected Players: ${count}`)
  ).toBeVisible();
}

/**
 * Verify dashboard shows player by name
 */
export async function expectDashboardHasPlayer(
  dashboardPage: Page,
  playerName: string
): Promise<void> {
  // Look for player name in the lobby list specifically (has #number prefix)
  await expect(dashboardPage.locator(`text=/#\\d+ ${playerName}/`)).toBeVisible();
}

/**
 * Debug helper: Log current page state
 * Useful when tests fail - call this to see what's on the page
 */
export async function debugPageState(page: Page, label: string): Promise<void> {
  console.log(`\n=== DEBUG: ${label} ===`);
  console.log(`URL: ${page.url()}`);

  // Get visible text content
  const bodyText = await page.locator('body').innerText();
  console.log(`Visible text (first 500 chars):\n${bodyText.slice(0, 500)}`);

  // Get localStorage state
  const localStorage = await page.evaluate(() => {
    const items: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) items[key] = window.localStorage.getItem(key) || '';
    }
    return items;
  });
  console.log(`LocalStorage:`, localStorage);
  console.log(`=== END DEBUG ===\n`);
}
