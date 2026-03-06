# Game Modes Reference for UX Audit

Use this file to know how to screenshot and what to look for in each game mode.

## Mode Registry

| Mode key | Display name | Screenshot template | Distinct per-player states | Status |
|----------|--------------|--------------------|-----------------------------|--------|
| `classic` | Classic | 1p | None — all players identical | Stable |
| `classic-teams` | Classic (Teams) | click-through 2p | team:0 vs team:1 (no roles) | Stable |
| `role-based` | Role Based | 2p | Different roles (Vampire, Angel, Beast, etc.) | Stable |
| `long-live-the-king` | Long live the king | 2p | KING vs non-king | Active dev |
| `death-count` | Death Count | 2p | No teams, individual respawn scoring | Stable |
| `death-count-teams` | Death Count (Teams) | click-through 2p | team:0 vs team:1 + respawns | Stable |
| `domination` | Domination | 2p | team:0 vs team:1, base capture UI | Active dev |

## Mode-Specific Screenshot Commands

```bash
# Default (classic, 1 phone)
cd client && npm run screenshot

# Specific mode, 2 phones
cd client && MODE=classic npm run screenshot
cd client && MODE=role-based npm run screenshot:2p
cd client && MODE=long-live-the-king npm run screenshot:2p
cd client && MODE=death-count npm run screenshot:2p
cd client && MODE=domination npm run screenshot:2p
```

Screenshots are saved to `client/e2e/screenshots/<mode>/`.

## Mode-Specific UX Concerns

### classic
- No roles, no teams. Pure survival.
- Watch for: phantom role badges, phantom team colors, misleading score counters
- Round-end: should show who survived, not a leaderboard (single-round by default)

### classic-teams
- Classic mode with teams enabled. No roles. Pure survival + team scoring.
- Uses click-through approach (not `test/create`) to ensure real team assignments.
- Watch for: team identity missing from phone screens, individual rank shown instead of team rank, phantom role badges, mode name should say "Classic" not "Roles Team"
- Round-end: team leaderboard should dominate (R-D10), phone should show team result (R-P06)

### role-based
- Each player gets a secret role. Role reveal is a key moment.
- Watch for: role name too small on phone, role description truncated, role badge on dashboard too subtle
- Round-end: role-based scoring (last alive = 5pts)

### long-live-the-king
- One player is the king. Crown badge must be visually dominant on dashboard.
- Phone: king player sees different objective text than non-king players.
- Watch for: crown icon too small to see from 3m, non-king players not knowing their objective, unclear who the king is when king dies

### death-count
- Players respawn. Scoring = number of deaths (lower is better, or configured otherwise).
- No teams in this variant — individual scoring only.
- Watch for: respawn countdown not visible on phone, score direction confusing ("0 deaths" is winning — is that obvious?), dead screen should say "respawning" not just "dead"

### death-count-teams
- Death count mode with teams enabled. Players respawn, team scores aggregated.
- Uses click-through approach to ensure real team assignments.
- Watch for: same as death-count plus team identity missing from phone, individual death count shown instead of team aggregate, phantom "Unassigned" group

### domination
- Players capture bases. Team scoring, not individual.
- Watch for: individual scores shown alongside team scores (R-D06, R-D10), base capture feedback not visible, team assignment unclear, which base your team controls vs enemy's
- This is the most complex mode visually — pay extra attention to score hierarchy

## Team Mode Setup Warning

**The `test/create` API only assigns bots to teams, not real players.**

When testing any mode with `teams: true`, real players will have `teamId: null` unless you manually handle team assignment. This causes:
- Real players invisible in the team leaderboard
- Status bar "X is the champion!" contradicting the team winner shown in the main display
- Phone game-over showing individual rank in a team context

To test team modes properly with real players you have two options:
1. **Click-through approach (preferred)**: Use `spawn-lobby-players` to register fake players in the lobby, then click "Start Game" on the dashboard to trigger the real game launch flow. The server's launch flow assigns teams via the settings and `TeamManager`, so players get proper `teamId` assignments. See the click-through section in the screenshot skill for the full pattern.
2. **Bot-only test**: use `includeConnected: false` so all players are bots — all will be assigned to teams

Always verify `playerLabels` in manifest.json shows `team:0` or `team:1`, not `no-team`, before trusting the team leaderboard screenshots.

## Per-Mode labelFor Extension

When using Template B (2p screenshots), the `labelFor` function in the script reads:
- `isKing` → "KING"
- `role` → "role:VampireName"
- `teamId` → "team:0" / "team:1"

These labels appear in `manifest.json` as `playerLabels` and in screenshot file names as notes.
To extend for new fields: update `labelFor` in `screenshot-2p.ts`.
