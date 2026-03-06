---
name: ux-audit
description: This skill should be used when the user asks to "run a ux audit", "check the UI for issues", "review the screens", "audit the game UI", "check if the dashboard is readable", "test how the game looks to a player", "run ux-audit for every game mode", "audit all modes", or wants to find UX problems, visual clarity issues, or confusing game behavior visible in screenshots.
allowed-tools: Read, Write, Bash
---

Audit the game UI by reading existing screenshots and evaluating each one against the UX rules in `docs/ux-rules.md`. No external API calls — Claude reads and reasons directly.

Read `references/modes.md` to understand per-mode screenshot strategies and known mode-specific concerns.

## Current worktree ports
- Backend port: !`grep VITE_BACKEND_PORT client/.env.local 2>/dev/null | cut -d= -f2 || echo "4000"`
- Client port: !`grep VITE_PORT client/.env.local 2>/dev/null | cut -d= -f2 || echo "5173"`

## Paths
- Screenshots: `client/e2e/screenshots/<mode>/` (or `client/e2e/screenshots/` for legacy single-mode runs)
- Rules: `docs/ux-rules.md`
- Report per mode: `client/e2e/screenshots/<mode>/ux-report.md`
- Summary report (all-modes): `client/e2e/screenshots/ux-report-summary.md`

---

## Single Mode Audit

## Steps

### 1. Locate the screenshots

The manifest can be in two places depending on whether MODE was set when screenshots were taken:
- `client/e2e/screenshots/<mode>/manifest.json` — mode-specific run (preferred)
- `client/e2e/screenshots/manifest.json` — legacy single-mode run

Check both. If the user said "audit classic teams" or named a specific scenario, look in the matching subdirectory. If no manifest exists anywhere, stop and tell the user to run screenshots first:

```
Screenshots not found. Run first:
  ./scripts/dev.sh                              # start servers (if not running)
  cd client && npm run screenshot               # uniform UI (saves to e2e/screenshots/)
  cd client && MODE=<key> npm run screenshot    # named mode (saves to e2e/screenshots/<key>/)
  cd client && MODE=<key> npm run screenshot:2p # 2-phone variant
```

For custom scenarios (e.g. classic+teams, death-count+3bots), write and run a bespoke Playwright script.
Always use ABSOLUTE paths based on `__dirname` in any custom script — relative paths will break depending on cwd.
Template for custom script OUT path:
```typescript
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../e2e/screenshots/my-scenario");
```

### 2. Load the UX rules

Read `docs/ux-rules.md` in full. The rules are organized into three sections:
- **Dashboard Rules** (R-D01–R-D10): apply to dashboard viewport screenshots
- **Phone Rules** (R-P01–R-P06): apply to phone viewport screenshots
- **Both Contexts** (R-B01–R-B06): apply to all screenshots

### 3. Evaluate each screenshot

For each entry in `manifest.json`:

1. Read the PNG file at `client/e2e/screenshots/<file>`
2. Determine which rule sections apply based on `viewport`:
   - viewport contains "dashboard" → Dashboard Rules + Both Contexts
   - viewport contains "phone" → Phone Rules + Both Contexts
3. Evaluate the screenshot against only those rules
4. Record findings using this structure:

```
FILE: <filename>
STATE: <state description from manifest>
VIEWPORT: <viewport>
PLAYER CONTEXT: <note or playerLabels if present>

VERDICT: PASS | MINOR | CONCERN

FINDINGS:
- [R-D02] CONCERN — <specific description of what you see>
- [R-P01] MINOR — <specific description>
(or "none" if verdict is PASS)

BEHAVIORAL NOTE:
<1–2 sentences: what would a first-time player think is happening on this screen? flag anything confusing.>
```

Be specific — reference actual visual elements. Do not invent problems.

### 4. Write the report

Write `client/e2e/screenshots/ux-report.md` with this structure:

```markdown
# UX Audit Report

Generated: <timestamp>
Mode: <from manifest> | Template: <1p or 2p>
Screenshots audited: <N>

## Summary

| Verdict | Count |
|---------|-------|
| CONCERN | N     |
| MINOR   | N     |
| PASS    | N     |

## Concerns (address before closing)

### <state> — `<file>`
[full finding block]

---

## Minor issues (consider addressing)

### <state> — `<file>`
[full finding block]

---

## Passing screenshots

- <state> (`<file>`)
```

### 5. Report results

After writing the report:
- State how many CONCERN and MINOR findings were found
- For each CONCERN, summarize the issue in one sentence
- If CONCERN-level findings exist, note that they should be addressed before closing the task (per workflow rule 10 in CLAUDE.md)

## Evaluation guidance

**For dashboard screenshots:**
Think like a spectator standing 3–5 meters from a projected screen. Can you immediately tell who is alive, what the score is, and what game phase it is? If you need to lean in or squint, that's a failure.

**For phone screenshots:**
Think like a player glancing at their phone for one second mid-game. Is the most critical information (alive/dead, HP, available action) the largest thing on screen? Is anything buried, ambiguous, or missing?

**For behavioral issues (R-B rules):**
Think like someone who has never played the game before. Could they understand what is expected of them from this screen alone? Would they know the round ended? Would they know they can tap to use an ability?

**What NOT to flag:**
- Minor color choices or aesthetic preferences
- Dev-mode-only UI elements that won't appear in production (e.g. "CLICK TO TAKE DAMAGE", "CLICK TO READY" buttons — these are debug helpers, not gameplay UI)
- Placeholder text in dev-mode screenshots that wouldn't appear in production
- TypeScript type issues (not your job here)
- Test coverage gaps

**Severity guide:**
- **CONCERN**: A real player or spectator would be confused, miss important information, or misunderstand the game state. Addresses readability at distance, dead-screen ambiguity, phantom metrics, mode-inappropriate info.
- **MINOR**: A cosmetic improvement that would make the experience better but wouldn't cause confusion. Addresses polish, hierarchy refinements, nice-to-have labels.
- **PASS**: Nothing worth flagging.

---

## All-Modes Audit

When the user asks to "run ux-audit for every game mode" or "audit all modes":

### 1. Check servers are running

```bash
curl -s http://localhost:BACKEND_PORT/health | grep -q '"debug":true' && echo "OK" || echo "SERVER DOWN — run ./scripts/dev.sh"
```

If down, start servers:
```bash
./scripts/dev.sh &
sleep 5
```

### 2. Screenshot each mode

Read `references/modes.md` for the full mode list and which template each requires.
Run screenshots for each mode in sequence:

```bash
# 1-phone modes
cd client && MODE=classic npm run screenshot

# 2-phone modes
cd client && MODE=role-based npm run screenshot:2p
cd client && MODE=long-live-the-king npm run screenshot:2p
cd client && MODE=death-count npm run screenshot:2p
cd client && MODE=domination npm run screenshot:2p

# Click-through modes (require custom audit script)
# classic-teams: uses _audit_classic_teams_v2.ts
cd client && npx tsx e2e/_audit_classic_teams_v2.ts
```

Each run saves to its own directory: `client/e2e/screenshots/<mode>/`.

Wait for each command to complete before starting the next (they reset server state).

**Note:** `classic` and `classic-teams` (classic with teams enabled) are treated as separate modes because teams fundamentally change the leaderboard, pre-game flow, and scoring UI.

### 3. Audit each mode

For each mode directory that now contains a `manifest.json`, run the Single Mode Audit (steps 1–4 above), reading from `client/e2e/screenshots/<mode>/` and writing the report to `client/e2e/screenshots/<mode>/ux-report.md`.

Also consult `references/modes.md` for mode-specific concerns to watch for while evaluating.

### 4. Write a summary report

Write `client/e2e/screenshots/ux-report-summary.md`:

```markdown
# UX Audit — All Modes Summary

Generated: <timestamp>

| Mode | CONCERN | MINOR | PASS | Report |
|------|---------|-------|------|--------|
| classic | N | N | N | [ux-report.md](classic/ux-report.md) |
| classic-teams | N | N | N | [ux-report.md](classic-teams/ux-report.md) |
| role-based | N | N | N | [ux-report.md](role-based/ux-report.md) |
| long-live-the-king | N | N | N | [ux-report.md](long-live-the-king/ux-report.md) |
| death-count | N | N | N | [ux-report.md](death-count/ux-report.md) |
| domination | N | N | N | [ux-report.md](domination/ux-report.md) |

## Cross-mode concerns

<list any issues that appear in multiple modes — these are likely systemic>

## Top priority fixes

<ordered list of the most impactful CONCERN findings across all modes>
```

### 5. Report to user

State the total concerns across all modes, name the top 3 most impactful, and suggest which to fix first.

## Additional Resources

- `references/modes.md` — mode keys, screenshot templates, mode-specific UX concerns
