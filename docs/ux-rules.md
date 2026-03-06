# UX Rules for Extended Joust

This rulebook is used by `npm run ux-audit` to automatically evaluate screenshots of the
game from a player and spectator perspective. Rules cover both **visual quality** (readability,
hierarchy, clarity) and **behavioral expectations** (does the screen communicate what is
actually happening? would a first-time player understand what to do next?).

## Context

- **Dashboard**: projected on a large screen (TV/projector), viewed from 3–5 meters by
  spectators and the admin. Text must be large and high-contrast. Dense small text fails.
- **Phone**: held in one hand, glanced at quickly (< 1 second) during active gameplay.
  Critical state must be scannable instantly. Fine print fails.
- **Both**: some rules apply to both contexts.

Rules are grouped into three sections. The audit script passes only the relevant section(s)
to the model based on the viewport type of each screenshot.

---

## Dashboard Rules

### R-D01 — Readability at distance
All meaningful text must be legible from 3–5 meters. Player names ≥ 24px equivalent,
scores/HP ≥ 32px, game phase label ≥ 36px. Small text for any game-critical information
(who's alive, scores, round count) is a failure. Low-contrast text on a similarly-colored
background is a failure.

### R-D02 — Game phase is always labelled
The current game phase (lobby, pre-game, countdown, active, round-ended, game-over) must
always be visible on the dashboard. A spectator arriving mid-game must know what's happening
without asking. If the only cue is the state of the player grid, that's insufficient.

### R-D03 — Alive/dead distinction is unambiguous
Alive and dead players must be immediately distinguishable. Grayscale, skull overlay, faded
card, or explicit "DEAD" label are acceptable. A subtle opacity change is not. A spectator
should be able to count alive players at a glance from across the room.

### R-D04 — HP is scannable
Health status must be readable at a glance for all players simultaneously. HP bars should
be wide enough to convey proportion, color-coded (green/yellow/red). A number alone without
a visual bar is harder to parse quickly. An HP bar that is 4px tall is effectively invisible
from a distance.

### R-D05 — King/special designation is visually dominant
In modes where one player has a special designation (king, team leader, etc.), that player's
card must be visually distinctive from across the room. A small icon in the corner of a
card is insufficient. The designation should be the first thing your eye goes to on that card.

### R-D06 — Mode-appropriate information only
The dashboard must not show metrics that are meaningless or misleading for the current game
mode. Examples:
- Individual scores shown prominently in a team mode where team score is what matters
- "Total points" shown in a single-round mode where there are no accumulated points
- Kill counts shown in a mode where kills aren't a mechanic
- Per-player score during domination mode, where the scoring unit is the team
If a metric is shown that doesn't apply to the mode, it will confuse spectators.

### R-D07 — Round/game progress is visible
Spectators should know how far into the game they are: current round number, total rounds,
and whether this is the last round. This should be visible without reading fine print.

### R-D08 — Round-end summary is complete
At round end: who won the round must be highlighted. Current point standings must be shown.
Whether another round follows or the game is over must be clear. A spectator should not
need to ask "is the game over or are they still playing?"

### R-D09 — Game-end leaderboard is unambiguous
The winner must be immediately obvious (position 1, visually highlighted, distinct from
other positions). Rankings must be clearly ordered top to bottom. Ties must be resolved or
marked. A spectator looking at the leaderboard for the first time must know who won.

### R-D10 — Team scores dominate in team modes
In any team mode, team-level scores must be the primary visual element. Individual
contributions can be secondary but must not compete visually with the team score. If a
spectator reads off the "scores" and names individual players instead of teams, the
hierarchy is wrong.

---

## Phone Rules

### R-P01 — Current status is instantly scannable
A player glancing at their phone for < 1 second must answer: am I alive? what is my HP?
do I have an active ability? These must be the largest, most central visual elements.
Anything requiring scrolling or careful reading to determine alive/dead/HP status is a failure.

### R-P02 — Dead screen is explicit and informative
When a player is eliminated, the screen must unambiguously communicate "you are dead."
It must not look like a loading screen, an error state, or a blank page. Secondary useful
info: who or what killed you, whether spectating is available, when the next round starts.

### R-P03 — Role reveal is impactful and clear
When a role is assigned, the role name must be the dominant visual element. The brief
description must fit without scrolling. This is an exciting moment — the screen should
feel different from the lobby. A player should immediately know what their role does.

### R-P04 — Available actions are obvious
At any point where the player can take an action (tap to use ability, shake to ready up,
tap to switch team), that option must be visually prominent — not discoverable by accident.
If the primary action is below the fold or in small text, it will be missed.

### R-P05 — Game phase is clear on phone too
Players joining mid-session or returning after a disconnect must be able to tell what phase
the game is in from their phone screen alone. "Waiting for game to start", "countdown",
"active round", "round ended — shake to ready up" must each look distinct.

### R-P06 — Round-end feedback is complete
At round end, the player must see: did they win this round? what is their current score?
what is their rank? what happens next? A player looking at the round-end screen should
not need to look at the dashboard to understand their standing.

---

## Both Contexts

### R-B01 — Color is not the only indicator
Any information conveyed by color (alive = green, dead = gray, team = red/blue) must also
be conveyed by shape, label, icon, or position. Pure color-only signaling excludes
colorblind players and fails in poor lighting.

### R-B02 — State transitions are communicated
When something significant changes (game starts, round ends, player dies, king changes,
role is assigned), there must be a visible indication. A player should never wonder "wait,
did something just happen?" A screenshot mid-transition should show some transitional
state, not just silence.

### R-B03 — First-time player comprehension
Imagine a player who has never played this game before. Could they understand what is
being asked of them right now just from this screen? If the answer requires prior knowledge
of the game's rules, the screen is not self-explaining enough. At minimum: "hold still to
survive" or "you are the king, protect yourself" should be inferable from the UI.

### R-B04 — Behavioral consistency within a mode
Within a single game mode, similar states should look similar, and different states should
look different. If the active-round screen and the round-ended screen look nearly identical,
players will be confused about whether the round is still going. Distinct phases = distinct
visual states.

### R-B05 — No phantom or orphaned metrics
Every metric shown must be meaningful in the current context. Examples of phantom metrics:
- A score counter stuck at 0 for a mode where scoring hasn't started yet
- A "round 1/3" label shown on the game-over screen
- A role badge still shown after the round where roles were randomized ended
Phantom metrics make players question whether the game is working correctly.

### R-B06 — Feedback matches player action
If a player just did something (tapped, moved, used ability), their screen should
acknowledge it. Silent actions breed confusion. Example: player taps the ability button —
does something visually change? If nothing happens visually, they'll tap again and again.
