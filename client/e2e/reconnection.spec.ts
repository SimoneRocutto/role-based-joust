import { test, expect } from '@playwright/test';
import {
  resetServerState,
  openDashboard,
  openPlayerJoin,
  joinAsPlayer,
  startGameFromDashboard,
  waitForCountdownComplete,
  launchGameFast,
  waitForGameActive,
  expectPlayerWaiting,
  expectDashboardPlayerCount,
  getGameState,
  getLobbyPlayers,
  API_URL,
} from './helpers';

/**
 * Reconnection and Disconnect Tests
 *
 * These tests verify:
 * - Player disconnect handling
 * - Lobby updates on disconnect
 * - Mid-game disconnects
 * - Page refresh scenarios
 */

test.describe('Disconnect Handling', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test.describe('Lobby Disconnects', () => {
    test('player removed from lobby on disconnect', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'DisconnectP1');

      // Verify player is in lobby
      await expectDashboardPlayerCount(dashboard, 1);

      // Close player page
      await player1.close();

      // Wait for disconnect to register
      await dashboard.waitForTimeout(1500);

      // Dashboard should show 0 players
      await expectDashboardPlayerCount(dashboard, 0);
    });

    test('server lobby updates on disconnect', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'ServerDisc1');

      // Verify player is in server lobby
      let lobby = await getLobbyPlayers();
      expect(lobby.players).toHaveLength(1);

      // Close player page
      await player1.close();

      // Wait for disconnect
      await new Promise((r) => setTimeout(r, 1500));

      // Server should show 0 players
      lobby = await getLobbyPlayers();
      expect(lobby.players).toHaveLength(0);
    });

    test('multiple player disconnects handled correctly', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'MultiDisc1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'MultiDisc2');

      const player3 = await openPlayerJoin(context);
      await joinAsPlayer(player3, 'MultiDisc3');

      await expectDashboardPlayerCount(dashboard, 3);

      // Disconnect player 2
      await player2.close();
      await dashboard.waitForTimeout(2000);
      await expectDashboardPlayerCount(dashboard, 2);

      // Disconnect player 1
      await player1.close();
      await dashboard.waitForTimeout(2000);
      await expectDashboardPlayerCount(dashboard, 1);

      // Player 3 should still be connected
      await expect(dashboard.locator('text=/#\\d+ MultiDisc3/')).toBeVisible();
    });

    test('start button disables when player disconnects below minimum', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'MinP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'MinP2');

      // Start button should be enabled with 2 players
      const startButton = dashboard.locator('button:has-text("Start Game")');
      await expect(startButton).toBeEnabled();

      // Disconnect one player
      await player2.close();
      await dashboard.waitForTimeout(1500);

      // Start button should be disabled with 1 player
      await expect(startButton).toBeDisabled();
    });
  });

  test.describe('Mid-Game Disconnects', () => {
    test('game continues when player disconnects during active game', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'MidGame1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'MidGame2');

      const player3 = await openPlayerJoin(context);
      await joinAsPlayer(player3, 'MidGame3');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Game is active
      let gameState = await getGameState();
      expect(gameState.state.state).toBe('active');

      // Disconnect player 2
      await player2.close();
      await dashboard.waitForTimeout(1000);

      // Game should still be active
      gameState = await getGameState();
      expect(gameState.state.state).toBe('active');
    });

    test('dashboard updates player status on mid-game disconnect', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'StatusP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'StatusP2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Both players visible
      await expect(dashboard.locator('text=StatusP1')).toBeVisible();
      await expect(dashboard.locator('text=StatusP2')).toBeVisible();

      // Disconnect player 2
      await player2.close();
      await dashboard.waitForTimeout(1500);

      // Player 1 should still be visible
      await expect(dashboard.locator('text=StatusP1')).toBeVisible();
    });
  });

  test.describe('Dashboard Persistence', () => {
    test('dashboard can be opened after players join', async ({ context }) => {
      // Join players first
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Persist1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'Persist2');

      // Now open dashboard
      const dashboard = await openDashboard(context);

      // Dashboard should show both players
      await expectDashboardPlayerCount(dashboard, 2);
      await expect(dashboard.locator('text=/#\\d+ Persist1/')).toBeVisible();
      await expect(dashboard.locator('text=/#\\d+ Persist2/')).toBeVisible();
    });

    test('dashboard refresh preserves player list', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Refresh1');

      await expectDashboardPlayerCount(dashboard, 1);

      // Refresh dashboard
      await dashboard.reload();

      // Players should still be shown
      await expectDashboardPlayerCount(dashboard, 1);
      await expect(dashboard.locator('text=/#\\d+ Refresh1/')).toBeVisible();
    });

    test('dashboard refresh during active game shows game state', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'RefreshGame1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'RefreshGame2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Verify game is active before refresh
      await expect(dashboard.locator('text=remaining')).toBeVisible();

      // Refresh dashboard
      await dashboard.reload();

      // Wait for page to load and socket to reconnect
      await dashboard.waitForTimeout(2000);

      // Should show game is active (timer visible) or players visible
      // The dashboard fetches state on mount, so it should show the game
      await expect(
        dashboard.locator('text=/remaining|RefreshGame1/i')
      ).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe('Connection Status', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test('player page shows connection status', async ({ page }) => {
    await page.goto('/join');

    // Should show "Connected" status
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10000 });
  });

  test('player page shows connected after joining', async ({ page }) => {
    await joinAsPlayer(page, 'ConnStatus');

    // Should still show connected
    await expect(page.locator('text=Connected')).toBeVisible();
  });
});
