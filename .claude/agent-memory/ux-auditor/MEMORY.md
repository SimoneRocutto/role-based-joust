# UX Auditor Agent Memory

## Recurring Issues Across Modes

### Active-round phone screen (systemic gap)
Most modes show a large number/color background on the active phone but NO HP bar.
R-P01 (HP scannable) fails almost every time. Always check this first.

### Pre-game vs active phase indistinguishability (systemic gap)
Pre-game and active-round phone views often look identical. R-B04 and R-P05 fail together.
Always compare the pre-game and active-round screenshots side-by-side.

### Dashboard during active round (systemic gap)
Dashboard often shows a static team/player list with no HP bars, no alive/dead status,
and no visual distinction from the team-selection/pre-game screen. R-D02, R-D03, R-D04
frequently fail together. Always check if the active dashboard is distinguishable from pre-game.

### King/special role designation (mode-specific)
In Long Live the King mode: kings are not highlighted on dashboard (R-D05) and not labeled
on phone (R-B01, R-B03). Crown emoji alone is insufficient — needs text label.

### Cascade/special death phone state
Dead states caused by game mechanics (cascade kill, cascade death) often look identical
to the alive state. R-P02 fails. Always check every dead screenshot type against the active one.

### Team mode phone game-end screen
Individual rank shown as primary element even in team modes. Player ranked #1 individually
whose team lost sees "#1" as the headline — misleading. R-P06, R-B05 risk.
Team result (won/lost, team score) must lead.

### Death Count Teams (audited 2026-03-06)
- R-D10 fires hard: no team scores or per-player death counts anywhere on any dashboard screenshot
- Active dashboard visually identical to pre-game team-selection screen (R-B04, R-D02)
- Player cards have no alive/dead visual treatment even with respawn logic active (R-D03)
- Phone active screen: large central number is player slot — unlabelled, opaque to first-timers (R-P01, R-B03)
- Respawn screen: dark red text on dark maroon = critically low contrast for team:0 (R-P02)
- "Unassigned" bot group visible on dashboard during active play (R-B05)
- Skull (deaths) and medal (rank) icons shown with no text labels throughout phone UI (R-B01)
- Respawn countdown number shown without label ("Respawning in: 5s" vs just "5") (R-P02, R-B03)

### Respawn modes need extra scrutiny
In modes with respawning (DeathCount), the "dead" and "respawned" screenshots may look identical
if the capture timing was off. Also: R-D03 and R-P02 still apply even for temporary death —
a respawning player card must look different from an alive one on the dashboard.

## Rules That Trigger Most Often
- R-P01 (HP/status scannable) — almost always fires for active phone; in death-count modes, death count replaces HP as primary metric and is often missing
- R-B03 (first-time comprehension) — fires whenever phase/role/mechanic is not labeled
- R-B04 (distinct phases look distinct) — fires when pre-game = active visually
- R-D03 (alive/dead distinction) — fires when active dashboard lacks dead state
- R-D04 (HP scannable on dashboard) — fires when no HP bars on active dashboard; in death-count modes, check for death count bars instead
- R-D05 (king/special designation dominant) — fires in team/king modes
- R-D10 (team scores dominate) — fires in any team mode where team score is absent or subordinated
- R-B01 (color not only indicator) — fires in team modes where team = background color only, no text label

## Audit Workflow Notes
- Read manifest.json first to understand PlayerA/PlayerB roles before looking at screenshots
- Screenshots labeled "pregame" that look like "active" = phase indistinguishability CONCERN
- Screenshots labeled "cascade_dead" that look like "active" = dead state CONCERN
- The "CLICK TO TAKE DAMAGE" and "CLICK WHEN READY" buttons are DEV MODE UI — do not flag
- "[DEV MODE]" badge is dev UI — do not flag

## File Paths
- Rules: /Users/simonerocutto/personal/role-based-joust-king/docs/ux-rules.md
- Screenshots root: /Users/simonerocutto/personal/role-based-joust-king/client/e2e/screenshots/
- Report goes in the mode subdirectory as ux-report.md
