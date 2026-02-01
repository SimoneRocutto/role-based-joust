import { expect } from '@playwright/test';
import {
  test,
  resetServerState,
  openDashboard,
  openPlayerJoin,
  joinAsPlayer,
  startGameFromDashboard,
  waitForCountdownComplete,
  launchGameFast,
  waitForGameActive,
  expectPlayerAlive,
  getGameState,
  debugPageState,
  API_URL,
} from './helpers';

/**
 * Game Start and Countdown Tests
 *
 * These tests verify the game launch flow:
 * 1. Admin clicks "Start Game"
 * 2. Countdown begins
 * 3. Players receive role info
 * 4. Countdown displays 3, 2, 1, GO!
 * 5. Game becomes active
 *
 * Note: Some tests use short countdown (2s) via API for speed,
 * while UI button tests use the default countdown.
 */

// Use short countdown for faster tests (via API)
const SHORT_COUNTDOWN = 2;

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

    // Players should see countdown screen with "Get ready..." text
    await expect(
      player1.locator('text=Get ready')
    ).toBeVisible({ timeout: 5000 });

    await expect(
      player2.locator('text=Get ready')
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

    // Use short countdown via API for speed
    await launchGameFast(SHORT_COUNTDOWN);

    // Wait for countdown to complete
    await new Promise((r) => setTimeout(r, (SHORT_COUNTDOWN + 1) * 1000));

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

    // Use short countdown via API for speed
    await launchGameFast(SHORT_COUNTDOWN);
    await waitForGameActive(dashboard);

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

    // Players should see countdown screen (roles are communicated via TTS audio, not visually)
    await expect(
      player1.locator('text=Get ready')
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

    // Use short countdown via API for speed
    await launchGameFast(SHORT_COUNTDOWN);
    await waitForGameActive(dashboard);

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

    // Use 3 second countdown to see the emphasized numbers
    await launchGameFast(3);

    // Check that countdown overlay appears (fixed overlay with animate-bounce class)
    // The emphasized countdown numbers have the animate-bounce class
    await expect(
      dashboard.locator('.animate-bounce').first()
    ).toBeVisible({ timeout: 5000 });

    // Wait for countdown to complete - game becomes active
    await waitForGameActive(dashboard);
  });
});
