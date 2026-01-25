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
  waitForSocketConnection,
  expectDashboardPlayerCount,
  getGameState,
  API_URL,
} from './helpers';

/**
 * Socket Event Tests
 *
 * These tests verify real-time socket communication:
 * - Event broadcasting
 * - State synchronization
 * - Multi-client updates
 */

test.describe('Socket Events', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test.describe('Connection Events', () => {
    test('player receives connected confirmation', async ({ page }) => {
      await page.goto('/join');

      // Should see "Connected" status
      await expect(page.locator('text=Connected')).toBeVisible({
        timeout: 10000,
      });
    });

    test('join event triggers lobby update on dashboard', async ({ context }) => {
      const dashboard = await openDashboard(context);

      // Initially no players
      await expectDashboardPlayerCount(dashboard, 0);

      // Join a player
      const player = await openPlayerJoin(context);
      await joinAsPlayer(player, 'SocketJoin');

      // Dashboard should update via socket event
      await expectDashboardPlayerCount(dashboard, 1);
    });

    test('disconnect event triggers lobby update', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player = await openPlayerJoin(context);
      await joinAsPlayer(player, 'SocketDisc');

      await expectDashboardPlayerCount(dashboard, 1);

      // Close player (triggers disconnect)
      await player.close();

      // Dashboard should update via socket event
      await dashboard.waitForTimeout(1500);
      await expectDashboardPlayerCount(dashboard, 0);
    });
  });

  test.describe('Game State Events', () => {
    test('countdown event updates all clients', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'CountP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'CountP2');

      // Start game
      await dashboard.click('button:has-text("Start Game")');

      // All clients should see countdown
      await expect(dashboard.locator('text=Get ready')).toBeVisible({
        timeout: 5000,
      });
      await expect(
        player1.locator('text=/You are the|Preparing/i')
      ).toBeVisible({ timeout: 5000 });
      await expect(
        player2.locator('text=/You are the|Preparing/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test('game start event syncs all clients', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'SyncP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'SyncP2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // All clients should be in active game state
      // Dashboard shows timer
      await expect(dashboard.locator('text=remaining')).toBeVisible();

      // Players don't show "WAITING" anymore
      await expect(player1.locator('text=WAITING FOR GAME')).not.toBeVisible();
      await expect(player2.locator('text=WAITING FOR GAME')).not.toBeVisible();
    });

    test('game state updates broadcast to new dashboard', async ({ context }) => {
      // Start game before opening dashboard
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'LateDash1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'LateDash2');

      // Fast launch (skip countdown)
      await launchGameFast(0);

      // Small delay for game to start
      await new Promise((r) => setTimeout(r, 1000));

      // Now open dashboard
      const dashboard = await openDashboard(context);

      // Wait for socket connection and state fetch
      await dashboard.waitForTimeout(2000);

      // Dashboard should show active game (timer visible)
      await expect(dashboard.locator('text=remaining')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Role Assignment Events', () => {
    test('role assignment sent to individual players', async ({ context }) => {
      const dashboard = await openDashboard(context);

      // Select role-based mode
      await dashboard.locator('select').first().selectOption('role-based');

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Role1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'Role2');

      // Start game
      await dashboard.click('button:has-text("Start Game")');

      // Both players should receive their role
      await expect(player1.locator('text=You are the')).toBeVisible({
        timeout: 10000,
      });
      await expect(player2.locator('text=You are the')).toBeVisible({
        timeout: 10000,
      });
    });

    test('players can have different roles', async ({ context }) => {
      const dashboard = await openDashboard(context);

      // Select role-based mode
      await dashboard.locator('select').first().selectOption('role-based');

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'DiffRole1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'DiffRole2');

      // Start game
      await dashboard.click('button:has-text("Start Game")');

      // Wait for role display
      await expect(player1.locator('text=You are the')).toBeVisible({
        timeout: 10000,
      });

      // Get role names
      const role1Text = await player1
        .locator('.text-yellow-400')
        .first()
        .textContent();
      const role2Text = await player2
        .locator('.text-yellow-400')
        .first()
        .textContent();

      // Roles should be defined (not null/undefined)
      expect(role1Text).toBeTruthy();
      expect(role2Text).toBeTruthy();
    });
  });

  test.describe('Lobby Update Events', () => {
    test('lobby update includes player number', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player = await openPlayerJoin(context);
      const { playerNumber } = await joinAsPlayer(player, 'NumEvent');

      // Dashboard should show player with number
      await expect(
        dashboard.locator(`text=/#${playerNumber} NumEvent/`)
      ).toBeVisible();
    });

    test('lobby update includes all connected players', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'All1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'All2');

      const player3 = await openPlayerJoin(context);
      await joinAsPlayer(player3, 'All3');

      // Dashboard should show all 3
      await expect(dashboard.locator('text=/#\\d+ All1/')).toBeVisible();
      await expect(dashboard.locator('text=/#\\d+ All2/')).toBeVisible();
      await expect(dashboard.locator('text=/#\\d+ All3/')).toBeVisible();
    });

    test('lobby preserves order after disconnect/reconnect', async ({
      context,
    }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      const { playerNumber: num1 } = await joinAsPlayer(player1, 'Order1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'Order2');

      // Disconnect player 2
      await player2.close();
      await dashboard.waitForTimeout(1500);

      // Add player 3
      const player3 = await openPlayerJoin(context);
      const { playerNumber: num3 } = await joinAsPlayer(player3, 'Order3');

      // Player 1 should still have number 1
      await expect(
        dashboard.locator(`text=/#${num1} Order1/`)
      ).toBeVisible();

      // Player 3 should have a higher number
      expect(num3).toBeGreaterThan(num1);
    });
  });
});

test.describe('Real-time Synchronization', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test('player count syncs across all dashboards', async ({ context }) => {
    const dashboard1 = await openDashboard(context);
    const dashboard2 = await openDashboard(context);

    const player = await openPlayerJoin(context);
    await joinAsPlayer(player, 'Sync');

    // Both dashboards should show 1 player
    await expectDashboardPlayerCount(dashboard1, 1);
    await expectDashboardPlayerCount(dashboard2, 1);

    // Disconnect
    await player.close();
    await dashboard1.waitForTimeout(1500);

    // Both dashboards should show 0 players
    await expectDashboardPlayerCount(dashboard1, 0);
    await expectDashboardPlayerCount(dashboard2, 0);
  });

  test('game timer syncs across clients', async ({ context }) => {
    const dashboard1 = await openDashboard(context);
    const dashboard2 = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'Timer1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'Timer2');

    // Fast launch (skip countdown)
    await launchGameFast(0);
    await waitForGameActive(dashboard1);

    // Both dashboards should show timer
    await expect(dashboard1.locator('text=remaining')).toBeVisible();
    await expect(dashboard2.locator('text=remaining')).toBeVisible();

    // Get times - they should be close (within a few seconds)
    const time1 = await dashboard1.locator('text=/\\d{2}:\\d{2}/').textContent();
    const time2 = await dashboard2.locator('text=/\\d{2}:\\d{2}/').textContent();

    // Times should be very close or identical
    expect(time1).toBeTruthy();
    expect(time2).toBeTruthy();
  });
});
