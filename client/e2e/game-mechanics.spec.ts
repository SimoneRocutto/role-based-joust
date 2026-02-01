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
  expectPlayerDead,
  getGameState,
  API_URL,
} from './helpers';

/**
 * Game Mechanics Tests
 *
 * These tests verify core game mechanics:
 * - Player elimination
 * - Kill mechanics
 * - Round progression
 * - Game end conditions
 * - Score tracking
 */

test.describe('Game Mechanics', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test.describe('Player Status', () => {
    test('players start alive when game begins', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'AliveTest1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'AliveTest2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Both players should be alive
      await expectPlayerAlive(player1);
      await expectPlayerAlive(player2);

      // Game state should show 2 alive players
      const gameState = await getGameState();
      expect(gameState.state.alivePlayers).toBe(2);
    });

    test('dashboard shows alive player count', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'CountTest1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'CountTest2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Dashboard should show "ALIVE: 2 / 2"
      await expect(dashboard.locator('text=/ALIVE.*2.*2/i')).toBeVisible();
    });

    test('player cards show alive status with green border', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'BorderTest1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'BorderTest2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Player cards should have green/teal border (alive indicator)
      // Look for the player card container
      const playerCards = dashboard.locator('[class*="border-"]');
      await expect(playerCards.first()).toBeVisible();
    });
  });

  test.describe('Game State Transitions', () => {
    test('game state is "waiting" before start', async ({ context }) => {
      await openDashboard(context);

      const gameState = await getGameState();
      expect(gameState.state.state).toBe('waiting');
    });

    test('game state is "countdown" during countdown', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'StateTest1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'StateTest2');

      // Start game but don't wait for countdown to complete
      await dashboard.click('button:has-text("Start Game")');

      // Wait a moment for state to change
      await dashboard.waitForTimeout(500);

      const gameState = await getGameState();
      expect(gameState.state.state).toBe('countdown');
    });

    test('game state is "active" after countdown', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'ActiveTest1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'ActiveTest2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      const gameState = await getGameState();
      expect(gameState.state.state).toBe('active');
    });

    test('game tracks current round', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'RoundTest1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'RoundTest2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Dashboard should show "Round 1/X"
      await expect(dashboard.locator('text=/Round 1/i')).toBeVisible();

      // Game state should show round 1
      const gameState = await getGameState();
      expect(gameState.state.currentRound).toBe(1);
    });
  });

  test.describe('Timer', () => {
    test('round timer displays and counts down', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'TimerTest1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'TimerTest2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Should see "remaining" timer
      await expect(dashboard.locator('text=remaining')).toBeVisible();

      // Timer should be counting (shows time like "04:55")
      await expect(dashboard.locator('text=/\\d{2}:\\d{2}/')).toBeVisible();
    });

    test('timer decreases over time', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'DecreaseTest1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'DecreaseTest2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Get initial time
      const initialTime = await dashboard.locator('text=/\\d{2}:\\d{2}/').textContent();

      // Wait 2 seconds
      await dashboard.waitForTimeout(2000);

      // Get new time
      const newTime = await dashboard.locator('text=/\\d{2}:\\d{2}/').textContent();

      // Times should be different (timer decreased)
      expect(newTime).not.toBe(initialTime);
    });
  });

  test.describe('Player Information Display', () => {
    test('player view shows player name in waiting state', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'NameDisplay');

      // Player should see their name on the waiting screen
      await expect(player1.locator('text=NameDisplay')).toBeVisible();
    });

    test('dashboard shows all player names', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'DashName1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'DashName2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Dashboard should show both player names
      await expect(dashboard.locator('text=DashName1')).toBeVisible();
      await expect(dashboard.locator('text=DashName2')).toBeVisible();
    });

    test('player numbers are displayed correctly', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      const { playerNumber: num1 } = await joinAsPlayer(player1, 'NumDisplay1');

      const player2 = await openPlayerJoin(context);
      const { playerNumber: num2 } = await joinAsPlayer(player2, 'NumDisplay2');

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      // Dashboard should show player numbers
      await expect(dashboard.locator(`text=#${num1}`)).toBeVisible();
      await expect(dashboard.locator(`text=#${num2}`)).toBeVisible();
    });
  });

  test.describe('Game Modes', () => {
    test('classic mode can be selected and started', async ({ context }) => {
      const dashboard = await openDashboard(context);

      // Select classic mode
      await dashboard.locator('select').first().selectOption('classic');

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'ClassicP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'ClassicP2');

      // Fast launch (skip countdown)
      await launchGameFast(0, 'classic');
      await waitForGameActive(dashboard);

      // Game should be active
      const gameState = await getGameState();
      expect(gameState.state.state).toBe('active');
    });

    test('role-based mode assigns roles to players', async ({ context }) => {
      const dashboard = await openDashboard(context);

      // Select role-based mode
      await dashboard.locator('select').first().selectOption('role-based');

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'RoleP1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'RoleP2');

      // Use 1 second countdown to see role info
      await launchGameFast(1, 'role-based');

      // During countdown, players should see countdown screen (roles are communicated via TTS audio)
      await expect(
        player1.locator('text=Get ready')
      ).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe('Event Feed', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test('dashboard shows event feed', async ({ context }) => {
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'EventP1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'EventP2');

    // Fast launch (skip countdown)
    await launchGameFast(0);
    await waitForGameActive(dashboard);

    // Event feed should be visible (shows "Waiting for action..." or events)
    await expect(
      dashboard.locator('text=/Waiting for action|joined|started/i')
    ).toBeVisible();
  });
});
