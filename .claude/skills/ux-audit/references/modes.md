# Game Modes Reference for UX Audit

Use this file to know how to screenshot and what to look for in each game mode.

## Mode Registry

| Mode key | Display name | Screenshot template | Distinct per-player states | Status |
|----------|--------------|--------------------|-----------------------------|--------|
| `classic` | Classic | 1p | None — all players identical | Stable |
| `role-based` | Role Based | 2p | Different roles (Vampire, Angel, Beast, etc.) | Stable |
| `long-live-the-king` | Long live the king | 2p | KING vs non-king | Active dev |
| `death-count` | Death Count | 2p | Can be team mode (team:0 vs team:1) | Stable |
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
- Teams optional.
- Watch for: respawn countdown not visible on phone, score direction confusing ("0 deaths" is winning — is that obvious?), dead screen should say "respawning" not just "dead"

### domination
- Players capture bases. Team scoring, not individual.
- Watch for: individual scores shown alongside team scores (R-D06, R-D10), base capture feedback not visible, team assignment unclear, which base your team controls vs enemy's
- This is the most complex mode visually — pay extra attention to score hierarchy

## Per-Mode labelFor Extension

When using Template B (2p screenshots), the `labelFor` function in the script reads:
- `isKing` → "KING"
- `role` → "role:VampireName"
- `teamId` → "team:0" / "team:1"

These labels appear in `manifest.json` as `playerLabels` and in screenshot file names as notes.
To extend for new fields: update `labelFor` in `screenshot-2p.ts`.
