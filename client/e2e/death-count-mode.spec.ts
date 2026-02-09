import { expect, Page } from '@playwright/test';
import {
  test,
  resetServerState,
  openDashboard,
  openPlayerJoin,
  joinAsPlayer,
  getGameState,
  API_URL,
} from './helpers';

/**
 * Death Count Mode E2E Tests
 *
 * Tests the death-count game mode which features:
 * - Timed rounds (configurable duration)
 * - Player respawns after death (5 second delay)
 * - Death count tracking (fewest deaths wins)
 * - Points based on "players beaten" scoring
 */

/**
 * Wait for death-count game to become active by looking for the MM:SS timer.
 * Can't use waitForGameActive() since that looks for "remaining" text.
 */
async function waitForDeathCountGameActive(page: Page): Promise<void> {
  await expect(page.locator('text=/\\d{2}:\\d{2}/')).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Set round duration via settings API and launch a death-count game.
 */
async function launchDeathCountGame(
  roundDuration: number = 30
): Promise<void> {
  // Set round duration via settings API (in seconds)
  await fetch(`${API_URL}/api/game/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundDuration }),
  });

  // Launch death-count mode with no countdown
  const response = await fetch(`${API_URL}/api/game/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'death-count', countdownDuration: 0 }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Failed to launch death-count game: ${data.error}`);
  }

  // Small delay for state propagation
  await new Promise((r) => setTimeout(r, 500));
}

test.describe('Death Count Mode', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test.describe('Mode Selection & Launch', () => {
    test('death-count mode can be selected and started', async ({ context }) => {
      const dashboard = await openDashboard(context);

      // Select death-count mode from dropdown
      await dashboard.locator('select').first().selectOption('death-count');

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'DeathP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'DeathP2');

      // Launch death-count mode
      await launchDeathCountGame(30);
      await waitForDeathCountGameActive(dashboard);

      // Verify game state is active
      const gameState = await getGameState();
      expect(gameState.state.state).toBe('active');

      // Dashboard should show the timer in MM:SS format
      await expect(dashboard.locator('text=/\\d{2}:\\d{2}/')).toBeVisible();
    });

    test('round duration controls visible only for death-count mode', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      // Select classic mode → round duration controls should NOT be visible
      await dashboard.locator('select').first().selectOption('classic');
      await expect(
        dashboard.locator('text=Round Duration (seconds)')
      ).not.toBeVisible();

      // Select death-count mode → round duration controls should be visible
      await dashboard.locator('select').first().selectOption('death-count');
      await expect(
        dashboard.locator('text=Round Duration (seconds)')
      ).toBeVisible();

      // Verify duration preset buttons are shown
      await expect(dashboard.locator('button:has-text("60s")')).toBeVisible();
      await expect(dashboard.locator('button:has-text("90s")')).toBeVisible();
      await expect(dashboard.locator('button:has-text("120s")')).toBeVisible();
      await expect(dashboard.locator('button:has-text("180s")')).toBeVisible();
    });
  });

  test.describe('Dashboard Timer', () => {
    test('dashboard shows countdown timer for death-count mode', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'TimerP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'TimerP2');

      await launchDeathCountGame(30);
      await waitForDeathCountGameActive(dashboard);

      // Get initial timer text
      const timerLocator = dashboard.locator('text=/\\d{2}:\\d{2}/');
      const initialTime = await timerLocator.textContent();
      expect(initialTime).toBeTruthy();

      // Wait 2 seconds
      await dashboard.waitForTimeout(2000);

      // Timer should have decreased
      const newTime = await timerLocator.textContent();
      expect(newTime).not.toBe(initialTime);
    });
  });

  test.describe('Player Death & Respawn', () => {
    // These tests involve waiting for respawn (5s), so increase timeout
    test.setTimeout(45000);

    test('killed player respawns after 5 seconds', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      const { playerId: player1Id } = await joinAsPlayer(player1, 'RespawnP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'RespawnP2');

      await launchDeathCountGame(30);
      await waitForDeathCountGameActive(dashboard);

      // Kill player 1 via debug endpoint
      await fetch(`${API_URL}/api/debug/player/${player1Id}/kill`, {
        method: 'POST',
      });

      // Player should see "RESPAWNING..." and countdown number
      await expect(player1.locator('text=RESPAWNING...')).toBeVisible({
        timeout: 3000,
      });

      // Should NOT see permanent "ELIMINATED"
      await expect(player1.locator('text=ELIMINATED')).not.toBeVisible();

      // Wait for respawn (5s + buffer)
      await player1.waitForTimeout(6000);

      // Player should be alive again
      await expect(player1.locator('text=RESPAWNING...')).not.toBeVisible();
      await expect(player1.locator('text=ELIMINATED')).not.toBeVisible();
    });

    test('dead player sees respawn UI instead of permanent elimination', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      const { playerId: player1Id } = await joinAsPlayer(player1, 'DeadUI_P1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'DeadUI_P2');

      await launchDeathCountGame(30);
      await waitForDeathCountGameActive(dashboard);

      // Kill player 1
      await fetch(`${API_URL}/api/debug/player/${player1Id}/kill`, {
        method: 'POST',
      });

      // Should see respawn UI
      await expect(player1.locator('text=RESPAWNING...')).toBeVisible({
        timeout: 3000,
      });

      // Should NOT see permanent death UI
      await expect(player1.locator('text=ELIMINATED')).not.toBeVisible();
    });
  });

  test.describe('Death Count Display', () => {
    // These tests involve multiple kills + respawns
    test.setTimeout(45000);

    test('dashboard shows death count badge after player dies', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      const { playerId: player1Id } = await joinAsPlayer(player1, 'BadgeP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'BadgeP2');

      await launchDeathCountGame(60);
      await waitForDeathCountGameActive(dashboard);

      // Kill player 1
      await fetch(`${API_URL}/api/debug/player/${player1Id}/kill`, {
        method: 'POST',
      });

      // Dashboard should show death count badge 💀×1
      await expect(dashboard.locator('text=💀×1')).toBeVisible({
        timeout: 3000,
      });

      // Wait for respawn
      await dashboard.waitForTimeout(6000);

      // Kill again
      await fetch(`${API_URL}/api/debug/player/${player1Id}/kill`, {
        method: 'POST',
      });

      // Badge should update to 💀×2
      await expect(dashboard.locator('text=💀×2')).toBeVisible({
        timeout: 3000,
      });
    });

    test('player view shows death count during active game', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      const { playerId: player1Id } = await joinAsPlayer(
        player1,
        'CountViewP1'
      );

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'CountViewP2');

      await launchDeathCountGame(60);
      await waitForDeathCountGameActive(dashboard);

      // Kill player 1
      await fetch(`${API_URL}/api/debug/player/${player1Id}/kill`, {
        method: 'POST',
      });

      // While dead, player view should show death count
      await expect(player1.locator('text=/Deaths: 1/')).toBeVisible({
        timeout: 3000,
      });

      // Wait for respawn
      await player1.waitForTimeout(6000);

      // After respawn, death count should still be visible in the status bar
      // The active player view shows 💀N in the status bar
      await expect(player1.locator('text=/💀1/')).toBeVisible({
        timeout: 3000,
      });
    });

    test('death counts accumulate across multiple deaths', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      const { playerId: player1Id } = await joinAsPlayer(player1, 'AccumP1');

      const player2 = await openPlayerJoin(context);
      const { playerId: player2Id } = await joinAsPlayer(player2, 'AccumP2');

      await launchDeathCountGame(60);
      await waitForDeathCountGameActive(dashboard);

      // Kill player 1 first time
      await fetch(`${API_URL}/api/debug/player/${player1Id}/kill`, {
        method: 'POST',
      });

      // Wait for respawn
      await dashboard.waitForTimeout(6000);

      // Kill player 1 second time
      await fetch(`${API_URL}/api/debug/player/${player1Id}/kill`, {
        method: 'POST',
      });

      // Wait for state to propagate
      await dashboard.waitForTimeout(1000);

      // Dashboard should show 💀×2 for player 1
      await expect(dashboard.locator('text=💀×2')).toBeVisible({
        timeout: 3000,
      });

      // Player 2 should have no death count badge (0 deaths = no badge)
      // The badge only shows when deathCount > 0
      const player2Card = dashboard.locator(`text=AccumP2`).locator('..');
      await expect(player2Card.locator('text=/💀×/')).not.toBeVisible();
    });
  });
});
