import { expect } from '@playwright/test';
import {
  test,
  resetServerState,
  openPlayerJoin,
  joinAsPlayer,
  openDashboard,
  API_URL,
  getLobbyPlayers,
} from './helpers';

/**
 * Team Mode E2E Tests
 *
 * Tests for team settings, team assignment, team switching,
 * and team lobby display.
 */

test.describe('Team Mode', () => {
  test.beforeEach(async () => {
    await resetServerState();
  });

  test.describe('Team Settings API', () => {
    test('GET /api/game/settings includes team fields', async () => {
      const response = await fetch(`${API_URL}/api/game/settings`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.teamsEnabled).toBeDefined();
      expect(data.teamCount).toBeDefined();
      expect(typeof data.teamsEnabled).toBe('boolean');
      expect(typeof data.teamCount).toBe('number');
    });

    test('POST /api/game/settings can enable teams', async () => {
      const response = await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 3 }),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.teamsEnabled).toBe(true);
      expect(data.teamCount).toBe(3);
    });

    test('POST /api/game/settings can disable teams', async () => {
      // Enable first
      await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true }),
      });

      // Then disable
      const response = await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: false }),
      });
      const data = await response.json();

      expect(data.teamsEnabled).toBe(false);
    });

    test('team count rejects invalid values', async () => {
      // Try setting too low — server rejects with 400
      let response = await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 1 }),
      });
      expect(response.ok).toBe(false);
      let data = await response.json();
      expect(data.error).toBeDefined();

      // Try setting too high — server rejects with 400
      response = await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCount: 10 }),
      });
      expect(response.ok).toBe(false);
      data = await response.json();
      expect(data.error).toBeDefined();

      // Valid value works
      response = await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 3 }),
      });
      data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.teamCount).toBe(3);
    });
  });

  test.describe('Team Assignment', () => {
    test('players get teamId in lobby when teams enabled', async ({ context }) => {
      // Enable teams
      await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 2 }),
      });

      // Join 2 players
      const p1 = await openPlayerJoin(context);
      await joinAsPlayer(p1, 'TeamPlayer1');

      const p2 = await openPlayerJoin(context);
      await joinAsPlayer(p2, 'TeamPlayer2');

      // Check lobby has team assignments
      const lobbyData = await getLobbyPlayers();
      expect(lobbyData.success).toBe(true);
      expect(lobbyData.players).toHaveLength(2);

      // Both players should have teamId
      for (const player of lobbyData.players) {
        expect(player.teamId).toBeDefined();
        expect(typeof player.teamId).toBe('number');
        expect(player.teamId).toBeGreaterThanOrEqual(0);
        expect(player.teamId).toBeLessThan(2);
      }
    });

    test('players are distributed across teams sequentially', async ({ context }) => {
      // Enable 2 teams
      await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 2 }),
      });

      // Join 4 players
      const players = [];
      for (let i = 0; i < 4; i++) {
        const p = await openPlayerJoin(context);
        await joinAsPlayer(p, `SeqPlayer${i + 1}`);
        players.push(p);
      }

      const lobbyData = await getLobbyPlayers();
      const sorted = [...lobbyData.players].sort((a: any, b: any) => a.number - b.number);

      // Sequential: 0→team0, 1→team1, 2→team0, 3→team1
      expect(sorted[0].teamId).toBe(0);
      expect(sorted[1].teamId).toBe(1);
      expect(sorted[2].teamId).toBe(0);
      expect(sorted[3].teamId).toBe(1);
    });

    test('no teamId when teams disabled', async ({ context }) => {
      // Disable teams
      await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: false }),
      });

      const p1 = await openPlayerJoin(context);
      await joinAsPlayer(p1, 'NoTeamPlayer');

      const lobbyData = await getLobbyPlayers();
      // teamId should be null or undefined
      expect(lobbyData.players[0].teamId == null).toBe(true);
    });
  });

  test.describe('Team API Endpoints', () => {
    test('GET /api/game/teams returns team data', async ({ context }) => {
      // Enable teams
      await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 2 }),
      });

      // Join players
      const p1 = await openPlayerJoin(context);
      await joinAsPlayer(p1, 'TeamAPI1');
      const p2 = await openPlayerJoin(context);
      await joinAsPlayer(p2, 'TeamAPI2');

      const response = await fetch(`${API_URL}/api/game/teams`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.enabled).toBe(true);
      expect(data.teamCount).toBe(2);
      expect(data.teams).toBeDefined();
    });

    test('POST /api/game/teams/shuffle redistributes players', async ({ context }) => {
      // Enable teams
      await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 2 }),
      });

      // Join 4 players
      for (let i = 0; i < 4; i++) {
        const p = await openPlayerJoin(context);
        await joinAsPlayer(p, `ShuffleP${i + 1}`);
      }

      // Shuffle
      const response = await fetch(`${API_URL}/api/game/teams/shuffle`, {
        method: 'POST',
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.teams).toBeDefined();

      // All players should still be assigned
      const allPlayers = Object.values(data.teams).flat();
      expect(allPlayers).toHaveLength(4);
    });
  });

  test.describe('Team Lobby Dashboard', () => {
    test('dashboard shows team sections when teams enabled', async ({ context }) => {
      // Enable teams
      await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 2 }),
      });

      // Open dashboard
      const dashboard = await openDashboard(context);

      // Join 2 players
      const p1 = await openPlayerJoin(context);
      await joinAsPlayer(p1, 'DashTeam1');
      const p2 = await openPlayerJoin(context);
      await joinAsPlayer(p2, 'DashTeam2');

      // Wait for lobby to update
      await dashboard.waitForTimeout(1000);

      // Should see team names
      await expect(dashboard.locator('text=Red Team')).toBeVisible({ timeout: 5000 });
      await expect(dashboard.locator('text=Blue Team')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Game Launch with Teams', () => {
    test('launch fails when a team is empty', async ({ context }) => {
      // Enable 3 teams but only join 2 players (one team will be empty)
      await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 3 }),
      });

      const p1 = await openPlayerJoin(context);
      await joinAsPlayer(p1, 'EmptyTeam1');
      const p2 = await openPlayerJoin(context);
      await joinAsPlayer(p2, 'EmptyTeam2');

      // Try to launch — should fail because 3rd team is empty
      const response = await fetch(`${API_URL}/api/game/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'classic', countdownDuration: 0 }),
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('no players');
    });

    test('launch succeeds when all teams have players', async ({ context }) => {
      // Enable 2 teams and join 2 players
      await fetch(`${API_URL}/api/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamsEnabled: true, teamCount: 2 }),
      });

      const p1 = await openPlayerJoin(context);
      await joinAsPlayer(p1, 'LaunchTeam1');
      const p2 = await openPlayerJoin(context);
      await joinAsPlayer(p2, 'LaunchTeam2');

      const response = await fetch(`${API_URL}/api/game/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'classic', countdownDuration: 0 }),
      });

      expect(response.ok).toBe(true);
    });
  });
});
