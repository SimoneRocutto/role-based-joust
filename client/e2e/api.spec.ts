import { expect } from '@playwright/test';
import {
  test,
  resetServerState,
  openPlayerJoin,
  joinAsPlayer,
  getGameState,
  getLobbyPlayers,
  API_URL,
} from './helpers';

/**
 * API Endpoint Tests
 *
 * These tests verify the REST API endpoints work correctly.
 * Useful for debugging server-side issues.
 */

test.describe('API Endpoints', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test.describe('GET /api/game/state', () => {
    test('returns game state with correct structure', async () => {
      const response = await fetch(`${API_URL}/api/game/state`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.state).toBeDefined();
      expect(data.state.state).toBeDefined();
      expect(data.state.gameTime).toBeDefined();
      expect(data.state.playerCount).toBeDefined();
      expect(data.state.alivePlayers).toBeDefined();
    });

    test('returns "waiting" state when no game running', async () => {
      const data = await getGameState();

      expect(data.state.state).toBe('waiting');
      expect(data.state.playerCount).toBe(0);
    });

    test('returns player list in game state', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'APIPlayer1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'APIPlayer2');

      // Launch game with no countdown
      await fetch(`${API_URL}/api/game/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'classic', countdownDuration: 0 }),
      });

      // Small delay for game to start
      await new Promise((r) => setTimeout(r, 500));

      const data = await getGameState();

      expect(data.state.state).toBe('active');
      expect(data.state.playerCount).toBe(2);
      expect(data.state.players).toHaveLength(2);
    });
  });

  test.describe('GET /api/game/lobby', () => {
    test('returns empty lobby initially', async () => {
      const data = await getLobbyPlayers();

      expect(data.success).toBe(true);
      expect(data.players).toHaveLength(0);
    });

    test('returns players after they join', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'LobbyAPI1');

      const data = await getLobbyPlayers();

      expect(data.success).toBe(true);
      expect(data.players).toHaveLength(1);
      expect(data.players[0].name).toBe('LobbyAPI1');
    });

    test('returns player numbers in lobby', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      const { playerNumber } = await joinAsPlayer(player1, 'NumAPI1');

      const data = await getLobbyPlayers();

      expect(data.players[0].number).toBe(playerNumber);
    });

    test('returns multiple players in order', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Order1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'Order2');

      const player3 = await openPlayerJoin(context);
      await joinAsPlayer(player3, 'Order3');

      const data = await getLobbyPlayers();

      expect(data.players).toHaveLength(3);
      // Players should be ordered by number
      expect(data.players[0].number).toBeLessThan(data.players[1].number);
      expect(data.players[1].number).toBeLessThan(data.players[2].number);
    });
  });

  test.describe('POST /api/game/launch', () => {
    test('fails with less than 2 players', async () => {
      const response = await fetch(`${API_URL}/api/game/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'classic' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toContain('2 players');
    });

    test('succeeds with 2+ players', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Launch1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'Launch2');

      const response = await fetch(`${API_URL}/api/game/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'classic' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.playerCount).toBe(2);
    });

    test('accepts mode parameter', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Mode1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'Mode2');

      const response = await fetch(`${API_URL}/api/game/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'role-based' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.mode).toBeDefined();
    });
  });

  test.describe('POST /api/game/stop', () => {
    test('stops running game', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Stop1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'Stop2');

      // Start game with no countdown
      await fetch(`${API_URL}/api/game/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'classic', countdownDuration: 0 }),
      });

      // Small delay for game to start
      await new Promise((r) => setTimeout(r, 500));

      // Verify game is active
      let state = await getGameState();
      expect(state.state.state).toBe('active');

      // Stop game
      const response = await fetch(`${API_URL}/api/game/stop`, {
        method: 'POST',
      });

      expect(response.ok).toBe(true);

      // Game should be stopped
      state = await getGameState();
      expect(state.state.state).toBe('waiting');
    });
  });

  test.describe('POST /api/debug/reset', () => {
    test('clears all connections', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'Reset1');

      // Verify player in lobby
      let lobby = await getLobbyPlayers();
      expect(lobby.players).toHaveLength(1);

      // Reset
      await fetch(`${API_URL}/api/debug/reset`, { method: 'POST' });

      // Lobby should be empty
      lobby = await getLobbyPlayers();
      expect(lobby.players).toHaveLength(0);
    });

    test('stops running game', async ({ context }) => {
      const player1 = await openPlayerJoin(context);
      await joinAsPlayer(player1, 'ResetGame1');

      const player2 = await openPlayerJoin(context);
      await joinAsPlayer(player2, 'ResetGame2');

      // Start game with no countdown
      await fetch(`${API_URL}/api/game/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'classic', countdownDuration: 0 }),
      });

      // Small delay for game to start
      await new Promise((r) => setTimeout(r, 500));

      // Reset
      await fetch(`${API_URL}/api/debug/reset`, { method: 'POST' });

      // Game should be stopped
      const state = await getGameState();
      expect(state.state.state).toBe('waiting');
    });
  });
});

test.describe('API Error Handling', () => {
  test('invalid endpoint returns 404', async () => {
    const response = await fetch(`${API_URL}/api/invalid/endpoint`);
    expect(response.status).toBe(404);
  });

  test('game state endpoint handles missing engine gracefully', async () => {
    // This test verifies the API doesn't crash on edge cases
    const response = await fetch(`${API_URL}/api/game/state`);
    expect(response.ok).toBe(true);
  });
});
