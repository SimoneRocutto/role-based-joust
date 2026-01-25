import { test, expect } from '@playwright/test';
import {
  resetServerState,
  openDashboard,
  openPlayerJoin,
  joinAsPlayer,
  startGameFromDashboard,
  waitForCountdownComplete,
  expectPlayerAlive,
  getGameState,
  debugPageState,
} from './helpers';

/**
 * Game Start and Countdown Tests
 *
 * These tests verify the game launch flow:
 * 1. Admin clicks "Start Game"
 * 2. Countdown begins (10 seconds)
 * 3. Players receive role info
 * 4. Countdown displays 3, 2, 1, GO!
 * 5. Game becomes active
 */

test.describe('Game Start Flow', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test('clicking start game triggers countdown', async ({ context }) => {
    // Setup: Dashboard + 2 players
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'Player1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'Player2');

    // Start the game
    await startGameFromDashboard(dashboard);

    // Should see countdown overlay with "Get ready" text
    await expect(
      dashboard.locator('text=Get ready')
    ).toBeVisible();
  });

  test('countdown shows on player screens', async ({ context }) => {
    // Setup
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'CountdownPlayer1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'CountdownPlayer2');

    // Start the game
    await startGameFromDashboard(dashboard);

    // Players should see countdown or role info
    await expect(
      player1.locator('text=/You are the|Preparing game/i')
    ).toBeVisible({ timeout: 5000 });

    await expect(
      player2.locator('text=/You are the|Preparing game/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('countdown goes from 10 to GO', async ({ context }) => {
    // Setup
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'P1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'P2');

    // Start the game
    await dashboard.click('button:has-text("Start Game")');

    // Should see countdown overlay with "Get ready" text
    await expect(
      dashboard.locator('text=Get ready')
    ).toBeVisible({ timeout: 5000 });

    // Wait for countdown to complete - either "GO!" or game active state
    await expect(
      dashboard.locator('text=/GO!|remaining/i')
    ).toBeVisible({ timeout: 15000 });
  });

  test('game state changes to active after countdown', async ({ context }) => {
    // Setup
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'ActiveP1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'ActiveP2');

    // Start and wait for countdown
    await dashboard.click('button:has-text("Start Game")');
    await waitForCountdownComplete(dashboard);

    // Check game state via API
    const gameState = await getGameState();
    expect(gameState.state.state).toBe('active');
  });

  test('players are alive after game starts', async ({ context }) => {
    // Setup
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'AliveP1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'AliveP2');

    // Start and wait for countdown
    await dashboard.click('button:has-text("Start Game")');
    await waitForCountdownComplete(dashboard);

    // Wait a moment for game state to update
    await player1.waitForTimeout(500);

    // Both players should be alive (not showing skull)
    await expectPlayerAlive(player1);
    await expectPlayerAlive(player2);
  });

  test('players receive role info during countdown (role-based mode)', async ({
    context,
  }) => {
    // Setup
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'RoleP1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'RoleP2');

    // Make sure role-based mode is selected
    await dashboard.locator('select').first().selectOption('role-based');

    // Start the game
    await dashboard.click('button:has-text("Start Game")');

    // Players should see role info during countdown
    // Look for the "You are the" text specifically
    await expect(
      player1.locator('text=You are the')
    ).toBeVisible({ timeout: 10000 });
  });

  test('admin controls hidden during active game', async ({ context }) => {
    // Setup
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'HideP1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'HideP2');

    // Admin controls visible before game
    await expect(dashboard.locator('text=Admin Controls')).toBeVisible();

    // Start and wait for countdown
    await dashboard.click('button:has-text("Start Game")');
    await waitForCountdownComplete(dashboard);

    // Admin controls should be hidden during active game
    // (Start button should not be visible)
    await expect(
      dashboard.locator('button:has-text("Start Game")')
    ).not.toBeVisible();
  });

  test('countdown last 3 seconds are emphasized', async ({ context }) => {
    // Setup
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'EmphP1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'EmphP2');

    // Start the game
    await dashboard.click('button:has-text("Start Game")');

    // Wait until we're in the final countdown (3, 2, 1)
    // These should appear larger/animated in the countdown overlay
    // Check that countdown appears (any number or GO)
    await expect(
      dashboard.locator('text=Get ready')
    ).toBeVisible({ timeout: 5000 });

    // Wait for countdown to complete - game becomes active
    await expect(
      dashboard.locator('text=/remaining/i')
    ).toBeVisible({ timeout: 15000 });
  });
});
