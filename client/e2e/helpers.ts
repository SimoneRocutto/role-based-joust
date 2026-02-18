import { test as base, Page, expect, BrowserContext } from '@playwright/test';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E Test Helpers for Extended Joust
 *
 * These helpers make tests more readable and provide
 * reusable utilities for common operations.
 */

// Check if SSL certificates exist (same logic as vite.config.js and server.ts)
const certsDir = path.resolve(__dirname, '../../certs');
const certsExist =
  (fs.existsSync(path.join(certsDir, 'server.crt')) &&
    fs.existsSync(path.join(certsDir, 'server.key'))) ||
  (fs.existsSync(path.join(certsDir, 'cert.pem')) &&
    fs.existsSync(path.join(certsDir, 'key.pem')));

// Use HTTPS if certs exist, HTTP otherwise
const protocol = certsExist ? 'https' : 'http';

// API Base URL (server)
// Note: NODE_TLS_REJECT_UNAUTHORIZED=0 is set in test scripts to allow self-signed certs
export const API_URL = `${protocol}://localhost:4000`;
export const CLIENT_URL = `${protocol}://localhost:5173`;

/**
 * Gracefully disconnect Socket.IO on a page to avoid EPIPE errors
 * on the Vite WebSocket proxy when the page is closed.
 */
export async function disconnectSocket(page: Page): Promise<void> {
  try {
    if (!page.isClosed()) {
      await page.evaluate(() => {
        // Access the singleton socketService and disconnect gracefully
        const mod = (window as any).__socketService;
        if (mod && typeof mod.disconnect === 'function') {
          mod.disconnect();
        }
        // Also close any raw socket.io instances on the page
        if ((window as any).io?.sockets) {
          for (const s of (window as any).io.sockets) {
            s.disconnect();
          }
        }
      });
    }
  } catch {
    // Page may already be closed or navigating — ignore
  }
}

/**
 * Custom test fixture that gracefully disconnects all socket connections
 * before Playwright tears down contexts/pages, preventing Vite proxy
 * EPIPE errors.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await use(context);
    // After test: gracefully disconnect sockets on all open pages
    for (const page of context.pages()) {
      await disconnectSocket(page);
    }
  },
});

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
 * Assumes players are already connected.
 * Flow: Click "Start Game" (lobby) → pre-game → Click "START GAME" (proceed) → countdown
 */
export async function startGameFromDashboard(dashboardPage: Page): Promise<void> {
  // Click start game button in the lobby
  await dashboardPage.click('button:has-text("Start Game")');

  // Wait for pre-game phase — dashboard shows PreGameControls with "START GAME" button
  await expect(dashboardPage.locator('button:has-text("START GAME")')).toBeVisible({
    timeout: 5000,
  });

  // Proceed from pre-game to countdown
  await dashboardPage.click('button:has-text("START GAME")');

  // Wait for countdown overlay to appear (fixed overlay with countdown number)
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
  await new Promise((r) => setTimeout(r, 200));

  // Proceed from pre-game to countdown (game enters pre-game after launch)
  const proceedResponse = await fetch(`${API_URL}/api/game/proceed`, {
    method: 'POST',
  });

  if (!proceedResponse.ok) {
    const data = await proceedResponse.json();
    throw new Error(`Failed to proceed from pre-game: ${data.error}`);
  }

  // Small delay to allow state to propagate
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * Proceed from pre-game phase to countdown via API.
 * Call after launching a game directly via fetch (not launchGameFast, which does this automatically).
 */
export async function proceedFromPreGame(): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
  const response = await fetch(`${API_URL}/api/game/proceed`, {
    method: 'POST',
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Failed to proceed from pre-game: ${data.error}`);
  }
  await new Promise((r) => setTimeout(r, 300));
}

/**
 * Wait for countdown to complete (full countdown)
 */
export async function waitForCountdownComplete(page: Page): Promise<void> {
  // Wait for the game to become active (EventFeed shows "ALIVE:" counter during active game)
  // The GO! phase is very brief, so we check for the game active state
  await expect(
    page.locator('text=ALIVE:')
  ).toBeVisible({ timeout: 15000 });

  // Wait a bit for the game to be fully active
  await page.waitForTimeout(500);
}

/**
 * Wait for game to become active (for fast tests without countdown)
 */
export async function waitForGameActive(page: Page): Promise<void> {
  // Wait for the game to become active (EventFeed shows "ALIVE:" counter during active game)
  await expect(
    page.locator('text=ALIVE:')
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
  // Should see waiting message in lobby ("Waiting for game to start...") or ready UI in pre-game
  await expect(
    playerPage.locator('text=/CLICK TO READY|SHAKE TO READY|Waiting for other players|Waiting for game to start/i')
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
  // Look for player name in the lobby list (CompactPlayerCard renders name in a separate span)
  await expect(dashboardPage.locator(`text=${playerName}`)).toBeVisible();
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
