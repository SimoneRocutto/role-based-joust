import { expect } from '@playwright/test';
import {
  test,
  resetServerState,
  waitForSocketConnection,
  joinAsPlayer,
  expectPlayerWaiting,
  debugPageState,
  getLobbyPlayers,
} from './helpers';

/**
 * Player Join Flow Tests
 *
 * These tests verify that players can join the game correctly
 * and see the appropriate waiting state (NOT the death skull).
 *
 * Bug this catches: Player seeing skull immediately after joining
 * because myPlayer was null, making isMyPlayerDead = true
 */

test.describe('Player Join Flow', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test('player can navigate to join page', async ({ page }) => {
    await page.goto('/join');

    // Should see the join form
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('button:has-text("JOIN GAME")')).toBeVisible();

    // Should show connection status
    await waitForSocketConnection(page);
  });

  test('player can join with a name', async ({ page }) => {
    const { playerId, playerNumber } = await joinAsPlayer(page, 'TestPlayer');

    // Should have been assigned a player ID and number
    expect(playerId).toBeTruthy();
    expect(playerNumber).toBeGreaterThan(0);

    // Should be on the player page
    expect(page.url()).toContain('/player');
  });

  test('player sees waiting state after joining (NOT skull)', async ({ page }) => {
    await joinAsPlayer(page, 'WaitingPlayer');

    // CRITICAL: Player should see waiting state, not death skull
    await expectPlayerWaiting(page);

    // Should see their player number
    await expect(page.locator('text=/#\\d+/i')).toBeVisible();

    // Should see their name
    await expect(page.locator('text=WaitingPlayer')).toBeVisible();

    // Debug output if needed
    // await debugPageState(page, 'After joining');
  });

  test('player shows correct player number', async ({ page }) => {
    const { playerNumber } = await joinAsPlayer(page, 'NumberedPlayer');

    // Should display the player number on screen
    await expect(page.locator(`text=#${playerNumber}`)).toBeVisible();
  });

  test('player is added to server lobby', async ({ page }) => {
    await joinAsPlayer(page, 'LobbyPlayer');

    // Verify player is in server lobby
    const lobbyResponse = await getLobbyPlayers();
    expect(lobbyResponse.success).toBe(true);
    expect(lobbyResponse.players).toHaveLength(1);
    expect(lobbyResponse.players[0].name).toBe('LobbyPlayer');
  });

  test('multiple players can join', async ({ context }) => {
    // Open two player pages
    const player1Page = await context.newPage();
    const player2Page = await context.newPage();

    // Join with both players
    await joinAsPlayer(player1Page, 'Player1');
    await joinAsPlayer(player2Page, 'Player2');

    // Both should be in waiting state
    await expectPlayerWaiting(player1Page);
    await expectPlayerWaiting(player2Page);

    // Server should have both players
    const lobbyResponse = await getLobbyPlayers();
    expect(lobbyResponse.players).toHaveLength(2);
  });

  test('player redirected to join if no session', async ({ page }) => {
    // Try to go directly to player page without joining
    await page.goto('/player');

    // Should be redirected to join
    await page.waitForURL('/join');
    expect(page.url()).toContain('/join');
  });

  test('join button disabled without name', async ({ page }) => {
    await page.goto('/join');
    await waitForSocketConnection(page);

    // Button should be disabled when name is empty
    const joinButton = page.locator('button:has-text("JOIN GAME")');
    await expect(joinButton).toBeDisabled();

    // Enter a name
    await page.fill('input[id="name"]', 'TestName');

    // Button should now be enabled
    await expect(joinButton).toBeEnabled();
  });

  test('name is trimmed and validated', async ({ page }) => {
    await page.goto('/join');
    await waitForSocketConnection(page);

    // Enter only spaces - should still be disabled
    await page.fill('input[id="name"]', '   ');
    const joinButton = page.locator('button:has-text("JOIN GAME")');
    await expect(joinButton).toBeDisabled();

    // Enter a valid name
    await page.fill('input[id="name"]', '  ValidName  ');
    await expect(joinButton).toBeEnabled();
  });
});
