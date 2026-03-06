# Claude Task Board

Lightweight task management for Claude instances. Each task has a unique ID, priority, status, and tags.

## How to use this file

- **Pick work**: Read this index, find the highest-priority `TODO` task, read its detail file in `claude-tasks/`, and execute.
- **Update status**: When starting a task, set it to `IN-PROGRESS`. When done, set it to `DONE`, add the commit hash, and **strike through the entire row** (~~like this~~) so completed work is visually obvious at a glance.
- **NEEDS-INPUT**: Tasks tagged `NEEDS-INPUT` require a decision from the user before implementation can start. Do NOT begin these until the user has resolved the open questions listed in the detail file.
- **Dependencies**: Some tasks depend on others (listed in detail files). Don't start a task whose dependencies aren't `DONE`.
- **User priorities**: The user's `TODO.md` may reference task IDs from here. That file controls what gets worked on next.

## Priority levels

- **P0** Critical — blocks player comprehension across most modes
- **P1** High — significant UX gap in multiple modes
- **P2** Medium — affects one mode or is a quality-of-life improvement
- **P3** Low — polish, nice-to-have

## Statuses

`TODO` | `IN-PROGRESS` | `DONE` | `BLOCKED`

---

## Task Index

### Cross-Mode UX (from audit)

| ID | Title | Priority | Status | Tags | Detail |
|----|-------|----------|--------|------|--------|
| UX-001 | Phone active: consider reducing number size in non-role modes | P3 | TODO | `NEEDS-INPUT` | [detail](claude-tasks/UX-001.md) |
| ~~UX-002~~ | ~~Phone active: HP display~~ | N/A | DONE | | [detail](claude-tasks/UX-002.md) |
| UX-003 | Dashboard team-mode: add HP info to player chips | P1 | TODO | `NEEDS-INPUT` | [detail](claude-tasks/UX-003.md) |
| UX-004 | Dashboard team-mode: differentiate active-round from pre-game | P1 | TODO | | [detail](claude-tasks/UX-004.md) |
| UX-005 | Dashboard: round-end summary overlay | P1 | TODO | `NEEDS-INPUT` | [detail](claude-tasks/UX-005.md) |
| ~~UX-006~~ | ~~Phone dead/round-end: fix "Final Score" label + add context~~ | P1 | DONE | | [detail](claude-tasks/UX-006.md) |
| UX-007 | Phone team modes: show team name + team result | P1 | TODO | | [detail](claude-tasks/UX-007.md) |
| UX-008 | Phone pre-game: add "shake to ready" instruction | P2 | TODO | | [detail](claude-tasks/UX-008.md) |
| UX-009 | Death-count modes: "pts" -> "deaths" label | P2 | TODO | | [detail](claude-tasks/UX-009.md) |

### Mode-Specific UX

| ID | Title | Priority | Status | Tags | Detail |
|----|-------|----------|--------|------|--------|
| UX-010 | King mode: cascade death visual feedback | P1 | TODO | `NEEDS-INPUT` | [detail](claude-tasks/UX-010.md) |
| UX-011 | King mode: crown/king indicator on dashboard | P1 | TODO | | [detail](claude-tasks/UX-011.md) |
| UX-012 | Role-based: role visibility on dashboard (NOT phone) | P2 | TODO | `NEEDS-INPUT` | [detail](claude-tasks/UX-012.md) |
| UX-013 | Role-based: ability feedback design (hidden from opponents) | P2 | TODO | `NEEDS-INPUT` | [detail](claude-tasks/UX-013.md) |
| ~~UX-014~~ | ~~Role-based: show roles on dashboard player cards~~ | N/A | MERGED | | Merged into UX-012 |
| UX-015 | Domination: team scores as primary dashboard element | P1 | TODO | | [detail](claude-tasks/UX-015.md) |
| UX-016 | Domination: rework dashboard active game UI | P1 | TODO | | [detail](claude-tasks/UX-016.md) |
| UX-017 | Death-count teams: team score visibility on dashboard | P1 | TODO | | [detail](claude-tasks/UX-017.md) |
| UX-018 | Respawn screen: label countdown + death count | P2 | TODO | | [detail](claude-tasks/UX-018.md) |

### Gameplay / Logic (from TODO.md)

| ID | Title | Priority | Status | Tags | Detail |
|----|-------|----------|--------|------|--------|
| ~~GM-001~~ | ~~Domination: no individual scores, team-only scoring~~ | P1 | DONE | | [detail](claude-tasks/GM-001.md) |
| ~~GM-002~~ | ~~Domination: base capture by tapping team color section~~ | P1 | DONE | | [detail](claude-tasks/GM-002.md) |
| GM-003 | Classic: trophy on round winner, fix skull logic | P2 | TODO | | [detail](claude-tasks/GM-003.md) |
| GM-004 | Team mode: round-end scoreboard ordering + team totals | P2 | TODO | | [detail](claude-tasks/GM-004.md) |
| GM-005 | Team mode: score normalization for uneven teams | P2 | TODO | `NEEDS-INPUT` | [detail](claude-tasks/GM-005.md) |

---

## NEEDS-INPUT Summary

Tasks requiring user decisions before work can begin. Claude: report these to the user and resolve before starting.

| ID | Open Question |
|----|---------------|
| UX-001 | (P3) In non-role modes, should the big player number be smaller? Or keep consistent across all modes? |
| UX-003 | Team-mode dashboard: how to show HP on player chips? Color chip background, add thin HP bar, use mini-cards, or color the left-border? How to show dead state? |
| UX-005 | Round-end overlay content: minimal banner ("ROUND OVER") or full summary (winner + scores + standings)? Use classic-teams round-end as template? |
| UX-010 | Cascade death: what should the phone show? Skull + "YOUR KING DIED"? What should dashboard show? Team panel grays out? Overlay banner? |
| UX-012 | Roles are SECRET (phones face opponents). Should roles appear on the DASHBOARD? When? (always / on death / never / configurable). Includes old UX-014. |
| UX-013 | Ability feedback must be invisible to opponents (phone faces outward). How? Vibration? Audio-only? Subtle screen flash? |
| GM-005 | Score normalization: exclude worst player from larger team, or use per-capita scoring, or another method? |
