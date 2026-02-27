# Scoreboard Design Spec

Dashboard end-of-round and end-of-game scoreboards. Designed for projection: players read the screen from a distance (3–6 m), so all text must be large and unambiguous.

## Design Principles

- **Hierarchy**: winner row is always visually dominant (gold highlight or gold glow)
- **Large type**: titles at ~7 xl (≈72 px), row labels at 4–5 xl (≈40–48 px)
- **Color carries meaning**: team color fills the entire team banner so the association is instant
- **Minimal clutter**: one metric per row, no explanatory prose
- **Consistent layout**: same structural template across all mode/team combinations; players learn it after the first round

---

## Layout Template

```
┌────────────────────────────────────────────────┐
│  ROUND N COMPLETE  ·  or  ·  GAME OVER          │  ← 7 xl, centered
│  N rounds remaining  (round-end only)            │  ← 3 xl subtitle
├────────────────────────────────────────────────┤
│  Leaderboard rows  (see variants below)         │
├────────────────────────────────────────────────┤
│  [ NEXT ROUND → ]  [ STOP GAME ]               │  ← round-end
│  [ NEW GAME ]                                   │  ← game-end
└────────────────────────────────────────────────┘
```

---

## Variant 1 — Individual (Death Count mode)

**Round end and Game end — same row structure, different right-side metric.**

```
┌─────────────────────────────────────────────────────────┐
│  🥇  #3  Alice                            💀 0  ← gold  │
│  🥈  #1  Bob                              💀 1           │
│  🥉  #4  Carol                            💀 2           │
│       #2  Dave                            💀 3           │
└─────────────────────────────────────────────────────────┘
```

- Winner row: `bg-yellow-500/20 border-2 border-yellow-400`; player number `text-yellow-300`
- Metric (round-end): death count from the just-finished round; label "this round" in `text-gray-500`
- Metric (game-end): cumulative points (death-count ranking translated to pts across rounds)
- Zero deaths: `text-gray-400` (muted — no deaths is good, no alarm)
- 1+ deaths: `text-red-400`
- Medal column: `text-6xl w-20`; rank 4+ shows empty space (no placeholder)

**Screenshots**: `score_dc_round_end.png` · `score_dc_game_end.png`

---

## Variant 2 — Individual (Classic / Role-Based mode)

Identical structure to Variant 1 but right-side metric is points.

```
┌─────────────────────────────────────────────────────────┐
│  🥇  #3  Alice                         10 pts  ← gold   │
│  🥈  #1  Bob                            5 pts            │
│  🥉  #4  Carol                          3 pts            │
│       #2  Dave                          0 pts            │
└─────────────────────────────────────────────────────────┘
```

- Round-end: shows "+N this round" sub-label (hidden when 0)
- Game-end: total accumulated points, no sub-label
- Metric color: `text-green-400`

---

## Variant 3 — Team (Classic mode)

Each team gets a solid-color banner header. Individual players listed below inside a tinted panel that shares the team color.

```
┌─────────────────────────────────────────────────────────┐
│ 🥇  Red                                8 pts            │  ← red banner
│     +8 this round (round-end only)                      │  ← sub-label
│  #3  Alice                       5 pts  +5              │  ← tinted red panel
│  #4  Carol                       1 pts  +1              │
├─────────────────────────────────────────────────────────┤
│ 🥈  Blue                               3 pts            │  ← blue banner
│     +3 this round                                       │
│  #1  Bob                         3 pts  +3              │  ← tinted blue panel
│  #2  Dave                        0 pts                  │
└─────────────────────────────────────────────────────────┘
```

- Team banner: `backgroundColor = teamColor.primary + 'cc'` (80% opaque)
- Player rows background: `teamColor.tint` (very subtle)
- Team score: `text-5xl font-black text-white`
- Winner team: outer `shadow-lg` glow in team primary color
- Individual rank: medal or blank; player sorted by score desc within team
- Round-end: `+N this round` shown in banner and in individual rows (if > 0)
- Game-end: no sub-labels; just totals

**Screenshots**: `score_team_classic_round_end.png` · `score_team_classic_game_end.png`

---

## Variant 4 — Team (Death Count mode)

Same colored-banner structure as Variant 3 but metric is deaths, not points.

```
┌─────────────────────────────────────────────────────────┐
│ 🥇  Red                            💀 3  total deaths   │  ← red banner
│  #3  Alice                                  💀 0        │  ← tinted panel
│  #2  Dave                                   💀 3        │
├─────────────────────────────────────────────────────────┤
│ 🥈  Blue                           💀 3  total deaths   │  ← blue banner
│  #1  Bob                                    💀 1        │
│  #4  Carol                                  💀 2        │
└─────────────────────────────────────────────────────────┘
```

- Team-level metric: sum of individual death counts; label "total deaths"
- Round-end banner label: "total deaths"
- Game-end: cumulative team points (death-count rankings → pts per round summed)
- Individual death count color: 0 = `text-white/40`; 1+ = `text-red-300`
- Individual players sorted by death count ascending within team (fewest = top)

**Screenshots**: `score_team_dc_round_end.png` · `score_team_dc_game_end.png`

---

## Header Bar (GameState component)

Round indicator at top-left:
- When `totalRounds` is known: `Round N/M`
- When game uses target score (no fixed round count): `Round N` (no denominator)
- Mode badge at top-right: `[CLASSIC]`, `[DEATH-COUNT]`, etc.

---

## Color Tokens

```
Winner row bg:        yellow-500/20
Winner row border:    yellow-400
Winner row glow:      shadow-yellow-500/20

Team Red primary:     #ef4444  (Tailwind red-500)
Team Blue primary:    #3b82f6  (Tailwind blue-500)

Deaths (non-zero):    red-400 / red-300 (inside team panel)
Points:               green-400
Subtitle text:        gray-400
Sub-label text:       gray-500 / white/60
```

---

## Accessibility Notes

- All critical numbers (rank, score, deaths) rendered in the largest font size that fits the row
- Team color alone is never the only differentiator — team name always printed in text
- Skull emoji (💀) provides semantic meaning beyond color for death-count mode

---

## Files Implementing This Design

| Component | Path |
|-----------|------|
| Scoreboard (all variants) | `client/src/components/dashboard/Scoreboard.tsx` |
| Team color palette | `client/src/utils/teamColors.ts` |
| Game store (scores, teamScores, players) | `client/src/store/gameStore.ts` |
| Dashboard layout (scoreboard shown on round/game end) | `client/src/pages/DashboardView.tsx` |
| Screenshot e2e spec | `client/e2e/screenshot-scoreboards.spec.ts` |
