import { test, expect } from '@playwright/test';
import {
  resetServerState,
  openDashboard,
  openPlayerJoin,
  joinAsPlayer,
  expectDashboardPlayerCount,
  expectDashboardHasPlayer,
  debugPageState,
  getLobbyPlayers,
} from './helpers';

/**
 * Dashboard Lobby Tests
 *
 * These tests verify that the dashboard correctly displays
 * connected players and updates in real-time.
 *
 * Bug this catches: Dashboard not showing players after refresh,
 * or not updating when players join/leave
 */

test.describe('Dashboard Lobby', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test('dashboard loads with no players initially', async ({ context }) => {
    const dashboard = await openDashboard(context);

    // Should show admin controls
    await expect(dashboard.locator('text=Admin Controls')).toBeVisible();

    // Should show 0 connected players
    await expectDashboardPlayerCount(dashboard, 0);

    // Should show "No players connected" message
    await expect(
      dashboard.locator('text=/No players connected/i')
    ).toBeVisible();
  });

  test('dashboard updates when player joins', async ({ context }) => {
    const dashboard = await openDashboard(context);

    // Initially 0 players
    await expectDashboardPlayerCount(dashboard, 0);

    // Open player page and join
    const playerPage = await openPlayerJoin(context);
    await joinAsPlayer(playerPage, 'JoiningPlayer');

    // Dashboard should now show 1 player
    await expectDashboardPlayerCount(dashboard, 1);
    await expectDashboardHasPlayer(dashboard, 'JoiningPlayer');
  });

  test('dashboard updates when multiple players join', async ({ context }) => {
    const dashboard = await openDashboard(context);

    // Join 3 players
    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'Alice');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'Bob');

    const player3 = await openPlayerJoin(context);
    await joinAsPlayer(player3, 'Charlie');

    // Dashboard should show all 3 players
    await expectDashboardPlayerCount(dashboard, 3);
    await expectDashboardHasPlayer(dashboard, 'Alice');
    await expectDashboardHasPlayer(dashboard, 'Bob');
    await expectDashboardHasPlayer(dashboard, 'Charlie');
  });

  test('dashboard shows players after page refresh', async ({ context }) => {
    // First, have a player join
    const playerPage = await openPlayerJoin(context);
    await joinAsPlayer(playerPage, 'PersistentPlayer');

    // Verify player is in lobby via API
    const lobbyBefore = await getLobbyPlayers();
    expect(lobbyBefore.players).toHaveLength(1);

    // Open dashboard (simulates page refresh scenario)
    const dashboard = await openDashboard(context);

    // Dashboard should show the player that was already connected
    await expectDashboardPlayerCount(dashboard, 1);
    await expectDashboardHasPlayer(dashboard, 'PersistentPlayer');
  });

  test('dashboard updates when player disconnects', async ({ context }) => {
    const dashboard = await openDashboard(context);

    // Join a player
    const playerPage = await openPlayerJoin(context);
    await joinAsPlayer(playerPage, 'LeavingPlayer');
    await expectDashboardPlayerCount(dashboard, 1);

    // Close player page (simulates disconnect)
    await playerPage.close();

    // Wait for disconnect to register
    await dashboard.waitForTimeout(1000);

    // Dashboard should show 0 players now
    await expectDashboardPlayerCount(dashboard, 0);
  });

  test('start button disabled with less than 2 players', async ({ context }) => {
    const dashboard = await openDashboard(context);

    // With 0 players, start should be disabled
    const startButton = dashboard.locator('button:has-text("Start Game")');
    await expect(startButton).toBeDisabled();

    // Add 1 player
    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'OnlyOne');

    // Still disabled with 1 player
    await expect(startButton).toBeDisabled();

    // Add second player
    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'SecondPlayer');

    // Now should be enabled
    await expect(startButton).toBeEnabled();
  });

  test('dashboard shows player numbers correctly', async ({ context }) => {
    const dashboard = await openDashboard(context);

    // Join players - they should get sequential numbers
    const player1 = await openPlayerJoin(context);
    const { playerNumber: num1 } = await joinAsPlayer(player1, 'First');

    const player2 = await openPlayerJoin(context);
    const { playerNumber: num2 } = await joinAsPlayer(player2, 'Second');

    // Dashboard should show both with their numbers
    await expect(dashboard.locator(`text=#${num1} First`)).toBeVisible();
    await expect(dashboard.locator(`text=#${num2} Second`)).toBeVisible();

    // Numbers should be sequential
    expect(num2).toBe(num1 + 1);
  });

  test('dashboard can select game mode', async ({ context }) => {
    const dashboard = await openDashboard(context);

    // Should have mode selector
    const modeSelect = dashboard.locator('select').first();
    await expect(modeSelect).toBeVisible();

    // Should be able to select different modes
    await modeSelect.selectOption('classic');
    await expect(modeSelect).toHaveValue('classic');

    await modeSelect.selectOption('role-based');
    await expect(modeSelect).toHaveValue('role-based');
  });
});
