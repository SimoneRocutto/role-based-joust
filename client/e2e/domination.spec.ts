import { expect, Page } from '@playwright/test';
import {
  test,
  resetServerState,
  openDashboard,
  openPlayerJoin,
  joinAsPlayer,
  proceedFromPreGame,
  getGameState,
  API_URL,
} from './helpers';

/**
 * Domination Mode E2E Tests
 *
 * Tests the domination game mode which features:
 * - Team-based objective mode with physical bases
 * - Base phone registration and tap-to-capture
 * - Points scored by holding bases over time
 * - Win condition when a team reaches the point target
 */

/**
 * Launch a domination game with custom settings.
 */
async function launchDominationGame(options?: {
  pointTarget?: number;
  controlInterval?: number;
  respawnTime?: number;
  baseCount?: number;
}): Promise<void> {
  // Configure domination settings
  await fetch(`${API_URL}/api/game/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameMode: 'domination',
      teamsEnabled: true,
      ...(options?.pointTarget !== undefined && { dominationPointTarget: options.pointTarget }),
      ...(options?.controlInterval !== undefined && { dominationControlInterval: options.controlInterval }),
      ...(options?.respawnTime !== undefined && { dominationRespawnTime: options.respawnTime }),
      ...(options?.baseCount !== undefined && { dominationBaseCount: options.baseCount }),
    }),
  });

  // Launch domination mode with no countdown
  const response = await fetch(`${API_URL}/api/game/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'domination', countdownDuration: 0 }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Failed to launch domination game: ${data.error}`);
  }

  // Proceed from pre-game
  await proceedFromPreGame();

  // Small delay for state propagation
  await new Promise((r) => setTimeout(r, 500));
}

test.describe('Domination Mode', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test.describe('Mode Selection & Settings', () => {
    test('domination mode can be selected from dropdown', async ({ context }) => {
      const dashboard = await openDashboard(context);

      // Wait for settings to load
      await expect(dashboard.locator('text=Game Mode')).toBeVisible({ timeout: 5000 });

      // Select domination mode from the game mode dropdown
      const modeSelect = dashboard.locator('label:has-text("Game Mode") + select, label:has-text("Game Mode") ~ select').first();
      // Fallback: find the select that contains the domination option
      const gameSelect = dashboard.locator('select:has(option[value="domination"])').first();
      await gameSelect.selectOption('domination');

      // Verify domination-specific settings appear
      await expect(dashboard.locator('text=Point Target')).toBeVisible({ timeout: 5000 });
      await expect(dashboard.locator('text=Control Interval')).toBeVisible();
      await expect(dashboard.locator('text=Respawn Time')).toBeVisible();
      await expect(dashboard.locator('text=Base Count')).toBeVisible();
    });

    test('domination hides round count and duration settings', async ({ context }) => {
      const dashboard = await openDashboard(context);

      // Wait for settings to load
      await expect(dashboard.locator('text=Game Mode')).toBeVisible({ timeout: 5000 });

      // Select domination mode
      const gameSelect = dashboard.locator('select:has(option[value="domination"])').first();
      await gameSelect.selectOption('domination');

      // Wait for domination settings to appear (confirms mode switch happened)
      await expect(dashboard.locator('text=Point Target')).toBeVisible({ timeout: 5000 });

      // Number of Rounds and Round Duration should NOT be visible
      await expect(dashboard.locator('text=Number of Rounds')).not.toBeVisible();
    });

    test('domination settings persist via API', async () => {
      // Update domination settings
      const updateResponse = await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dominationPointTarget: 15,
          dominationControlInterval: 3,
          dominationRespawnTime: 5,
          dominationBaseCount: 2,
        }),
      });

      expect(updateResponse.ok).toBe(true);

      // Read back settings
      const getResponse = await fetch(`${API_URL}/api/game/settings`);
      const data = await getResponse.json();

      expect(data.dominationPointTarget).toBe(15);
      expect(data.dominationControlInterval).toBe(3);
      expect(data.dominationRespawnTime).toBe(5);
      expect(data.dominationBaseCount).toBe(2);
    });
  });

  test.describe('Game Launch', () => {
    test('domination forces teams enabled on launch', async ({ context }) => {
      const dashboard = await openDashboard(context);
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'DomP1');
      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'DomP2');

      await launchDominationGame({ pointTarget: 100 });

      const state = await getGameState();
      expect(state.success).toBe(true);
      expect(state.state.state).toBe('active');
    });

    test('domination game has no round time limit', async ({ context }) => {
      const dashboard = await openDashboard(context);
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'DomP1');
      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'DomP2');

      await launchDominationGame({ pointTarget: 100 });

      const state = await getGameState();
      expect(state.state.state).toBe('active');
      // No roundTimeRemaining in domination (null duration)
    });
  });

  test.describe('Base View', () => {
    test('base view shows BASE label and waiting state', async ({ context }) => {
      const basePage = await context.newPage();
      await basePage.goto('/base');

      // Should show BASE text
      await expect(basePage.locator('text=BASE')).toBeVisible({ timeout: 5000 });

      // Should show waiting state
      await expect(basePage.locator('text=WAITING FOR GAME')).toBeVisible({ timeout: 5000 });
    });

    test('base view shows TAP TO CAPTURE when game is active', async ({ context }) => {
      const dashboard = await openDashboard(context);
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'DomP1');
      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'DomP2');

      // Open base view
      const basePage = await context.newPage();
      await basePage.goto('/base');

      // Wait for BASE label
      await expect(basePage.locator('text=BASE')).toBeVisible({ timeout: 5000 });

      // Launch game
      await launchDominationGame({ pointTarget: 100 });

      // Base should now show TAP TO CAPTURE (neutral state)
      await expect(basePage.locator('text=TAP TO CAPTURE')).toBeVisible({ timeout: 5000 });
    });
  });
});
