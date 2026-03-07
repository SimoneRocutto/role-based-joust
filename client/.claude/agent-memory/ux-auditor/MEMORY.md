# UX Auditor Memory

## Recurring pattern: team color vs HP color collision (R-B01)

The phone active screen uses a full-screen color fill as a battery-style HP gauge.
The fill color transitions green -> yellow -> red as HP drops.
Red Team phones are solid red at full HP — identical to low-HP appearance in non-team modes.
Blue Team phones at low HP show blue fill (team color) instead of red, muting the urgency signal.

**Always flag this as a CONCERN for any team mode with red or blue teams.**
Rule anchor: R-B01 (color not the only indicator), R-P01 (status instantly scannable).

## Recurring pattern: phone round-end/game-over shows individual score only (R-P06)

In team modes, the round-end and game-over phone screens show individual points ("Total: N pts",
"Final Score: N pts") but omit team name, team score, and team outcome (win/loss).
This is always a CONCERN in team modes — the player cannot determine their team's standing
without looking at the dashboard.
Rule anchor: R-P06, R-B05.

## Recurring pattern: mode badge abbreviates team variant (MINOR)

The top-right mode badge on the dashboard shows "[CLASSIC]" instead of "[CLASSIC TEAM]".
This drops the "TEAM" qualifier and may mislead spectators arriving mid-game.
Flag as MINOR for any team mode where the badge omits "TEAM".

## Recurring pattern: status bar names individual champion in team mode (MINOR)

The bottom status bar in game-over says "Bot 2 is the champion!" even in team modes.
The main leaderboard is correct (shows team winner) but the status bar undercuts team framing.
Flag as MINOR for all team modes.

## Recurring pattern: "Score: 0 pts" on dead phone during active round (MINOR)

Dead phone screen shows "Score: 0 pts" while the round is still live.
In team modes this is a phantom metric — individual scores are always 0 mid-round.
Flag as MINOR for team modes.

## Recurring pattern: dashboard HP bars are thin card borders only (R-D04)

Active dashboard player cards use only a colored border (thin outline) as HP signal.
No bar inside the card, no numeric HP. From 3-5m projection distance this is too subtle.
Flag as CONCERN in any mode where individual HP matters to spectators.

## Recurring pattern: round-end dashboard overflows viewport (R-D08)

With 4+ players in team mode, the round-end leaderboard (team rows + individual sub-rows)
can exceed the 800px dashboard viewport height, clipping the bottom rows.
Always check whether all rows are visible in the screenshot before writing PASS.
