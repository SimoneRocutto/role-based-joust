---
name: ux-audit
description: This skill should be used when the user asks to "run a ux audit", "check the UI for issues", "review the screens", "audit the game UI", "check if the dashboard is readable", "test how the game looks to a player", or wants to find UX problems, visual clarity issues, or confusing game behavior visible in screenshots.
allowed-tools: Read, Write, Bash
---

Audit the game UI by reading existing screenshots and evaluating each one against the UX rules in `docs/ux-rules.md`. No external API calls — Claude reads and reasons directly.

## Current worktree paths
- Screenshots: `client/e2e/screenshots/`
- Rules: `docs/ux-rules.md`
- Report output: `client/e2e/screenshots/ux-report.md`

## Steps

### 1. Check screenshots exist

Read `client/e2e/screenshots/manifest.json`. If missing, stop and tell the user to run screenshots first:

```
Screenshots not found. Run first:
  ./scripts/dev.sh          # start servers (if not running)
  cd client && npm run screenshot      # uniform UI
  cd client && npm run screenshot:2p   # per-player differences (king/non-king, etc.)
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
- Placeholder text in dev-mode screenshots that wouldn't appear in production
- TypeScript type issues (not your job here)
- Test coverage gaps

**Severity guide:**
- **CONCERN**: A real player or spectator would be confused, miss important information, or misunderstand the game state. Addresses readability at distance, dead-screen ambiguity, phantom metrics, mode-inappropriate info.
- **MINOR**: A cosmetic improvement that would make the experience better but wouldn't cause confusion. Addresses polish, hierarchy refinements, nice-to-have labels.
- **PASS**: Nothing worth flagging.
