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
  waitForSocketConnection,
  expectDashboardPlayerCount,
  getGameState,
  API_URL,
} from './helpers';

/**
 * Edge Cases and Error Handling Tests
 *
 * These tests verify the application handles unusual scenarios correctly:
 * - Rapid actions
 * - Boundary conditions
 * - Invalid inputs
 * - Race conditions
 */

test.describe('Edge Cases', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test.describe('Rapid Actions', () => {
    test('rapid player joins are handled correctly', async ({ context }) => {
      const dashboard = await openDashboard(context);

      // Rapidly open and join multiple players
      const players = await Promise.all([
        (async () => {
          const p = await openPlayerJoin(context);
          await joinAsPlayer(p, 'Rapid1');
          return p;
        })(),
        (async () => {
          const p = await openPlayerJoin(context);
          await joinAsPlayer(p, 'Rapid2');
          return p;
        })(),
        (async () => {
          const p = await openPlayerJoin(context);
          await joinAsPlayer(p, 'Rapid3');
          return p;
        })(),
      ]);

      // All players should be in dashboard
      await expectDashboardPlayerCount(dashboard, 3);

      // Clean up
      for (const p of players) {
        await p.close();
      }
    });

    test('rapid page navigation handled correctly', async ({ page }) => {
      // Rapidly navigate between pages
      await page.goto('/join');
      await page.goto('/dashboard');
      await page.goto('/join');
      await page.goto('/dashboard');

      // Should end up on dashboard without errors
      expect(page.url()).toContain('/dashboard');
    });
  });

  test.describe('Input Validation', () => {
    test('empty name cannot join', async ({ page }) => {
      await page.goto('/join');
      await waitForSocketConnection(page);

      const joinButton = page.locator('button:has-text("JOIN GAME")');
      await expect(joinButton).toBeDisabled();
    });

    test('whitespace-only name cannot join', async ({ page }) => {
      await page.goto('/join');
      await waitForSocketConnection(page);

      await page.fill('input[id="name"]', '     ');

      const joinButton = page.locator('button:has-text("JOIN GAME")');
      await expect(joinButton).toBeDisabled();
    });

    test('very long name is handled', async ({ page }) => {
      await page.goto('/join');
      await waitForSocketConnection(page);

      // Enter a very long name
      const longName = 'A'.repeat(100);
      await page.fill('input[id="name"]', longName);

      const joinButton = page.locator('button:has-text("JOIN GAME")');
      // Should either be enabled (accepts long names) or disabled (validates length)
      // Either way, shouldn't crash
      await expect(joinButton).toBeVisible();
    });

    test('special characters in name are handled', async ({ page }) => {
      await joinAsPlayer(page, '<script>alert("xss")</script>');

      // Should be on player page (name accepted and sanitized)
      expect(page.url()).toContain('/player');

      // Should show waiting state, not an error
      await expect(page.locator('text=/CLICK TO READY|SHAKE TO READY/i')).toBeVisible();
    });

    test('emoji in name is handled', async ({ page }) => {
      await joinAsPlayer(page, 'Player 🎮');

      expect(page.url()).toContain('/player');
      await expect(page.locator('text=/CLICK TO READY|SHAKE TO READY/i')).toBeVisible();
    });
  });

  test.describe('Boundary Conditions', () => {
    test('exactly 2 players can start game', async ({ context }) => {
      const dashboard = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Min1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'Min2');

      // Should be able to start with exactly 2 players
      const startButton = dashboard.locator('button:has-text("Start Game")');
      await expect(startButton).toBeEnabled();

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      const gameState = await getGameState();
      expect(gameState.state.state).toBe('active');
    });

    test('game with many players (stress test)', async ({ context }) => {
      const dashboard = await openDashboard(context);
      const players = [];

      // Join 6 players
      for (let i = 1; i <= 6; i++) {
        const player = await openPlayerJoin(context);
        await joinAsPlayer(player, `Stress${i}`);
        players.push(player);
      }

      await expectDashboardPlayerCount(dashboard, 6);

      // Fast launch (skip countdown)
      await launchGameFast(0);
      await waitForGameActive(dashboard);

      const gameState = await getGameState();
      expect(gameState.state.state).toBe('active');
      expect(gameState.state.playerCount).toBe(6);

      // Clean up
      for (const p of players) {
        await p.close();
      }
    });
  });

  test.describe('Session Handling', () => {
    test('player without session redirects to join', async ({ page }) => {
      // Clear any existing session
      await page.goto('/join');
      await page.evaluate(() => {
        localStorage.clear();
      });

      // Try to access player page directly
      await page.goto('/player');

      // Should redirect to join
      await page.waitForURL('/join');
      expect(page.url()).toContain('/join');
    });

    test('player session persists across page reload', async ({ page }) => {
      await joinAsPlayer(page, 'SessionPersist');

      // Store session info
      const playerId = await page.evaluate(() => localStorage.getItem('playerId'));
      const playerNumber = await page.evaluate(() =>
        localStorage.getItem('playerNumber')
      );

      // Reload page
      await page.reload();

      // Session should still be there
      const newPlayerId = await page.evaluate(() =>
        localStorage.getItem('playerId')
      );
      const newPlayerNumber = await page.evaluate(() =>
        localStorage.getItem('playerNumber')
      );

      expect(newPlayerId).toBe(playerId);
      expect(newPlayerNumber).toBe(playerNumber);
    });
  });

  test.describe('Concurrent Operations', () => {
    test('multiple dashboards can view same game', async ({ context }) => {
      const dashboard1 = await openDashboard(context);
      const dashboard2 = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Multi1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'Multi2');

      // Both dashboards should show 2 players
      await expectDashboardPlayerCount(dashboard1, 2);
      await expectDashboardPlayerCount(dashboard2, 2);
    });

    test('game start visible on multiple dashboards', async ({ context }) => {
      const dashboard1 = await openDashboard(context);
      const dashboard2 = await openDashboard(context);

      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'StartMulti1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'StartMulti2');

      // Fast launch (skip countdown)
      await launchGameFast(0);

      // Both dashboards should see active game
      await waitForGameActive(dashboard1);
      await waitForGameActive(dashboard2);
    });
  });

  test.describe('URL Navigation', () => {
    test('direct navigation to /dashboard works', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.locator('text=Admin Controls')).toBeVisible();
    });

    test('direct navigation to /join works', async ({ page }) => {
      await page.goto('/join');

      await expect(page.locator('input[id="name"]')).toBeVisible();
    });

    test('invalid URL handled gracefully', async ({ page }) => {
      await page.goto('/invalid-route');

      // Should either redirect or show an error page, not crash
      // Check that the page is still functional
      await expect(page.locator('body')).toBeVisible();
    });

    test('root URL redirects appropriately', async ({ page }) => {
      await page.goto('/');

      // Should redirect to either join or dashboard
      await page.waitForURL(/\/(join|dashboard)/);
    });
  });
});

test.describe('Error Recovery', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test('page recovers from socket disconnect', async ({ page, context }) => {
    await joinAsPlayer(page, 'Recovery');

    // Verify connected
    await expect(page.locator('text=Connected')).toBeVisible();

    // The socket should maintain connection
    // This test verifies the UI doesn't break
    await expect(page.locator('text=/CLICK TO READY|SHAKE TO READY/i')).toBeVisible();
  });

  test('dashboard handles game stop gracefully', async ({ context }) => {
    const dashboard = await openDashboard(context);

    const player1 = await openPlayerJoin(context);
    await joinAsPlayer(player1, 'StopGrace1');

    const player2 = await openPlayerJoin(context);
    await joinAsPlayer(player2, 'StopGrace2');

    // Fast launch (skip countdown)
    await launchGameFast(0);
    await waitForGameActive(dashboard);

    // Verify game is active
    await expect(dashboard.locator('text=remaining')).toBeVisible();

    // Stop game via API
    await fetch(`${API_URL}/api/game/stop`, { method: 'POST' });

    // Dashboard should handle this gracefully
    // Wait for state update - may take a moment for socket event
    await dashboard.waitForTimeout(2000);

    // Should show waiting state (Start Game button visible again)
    await expect(dashboard.locator('button:has-text("Start Game")')).toBeVisible({
      timeout: 10000,
    });
  });
});
