import type { PlayerState } from "@/types/player.types";

/**
 * Compute standard competition ranks by death count (ascending).
 * Tied players share a rank; the next rank skips by the group size.
 * e.g. deaths [0,0,1,2] → ranks 1,1,3,4
 */
export function computeDeathCountRanks(
  players: PlayerState[]
): Map<string, number> {
  const sorted = [...players].sort(
    (a, b) => (a.deathCount ?? 0) - (b.deathCount ?? 0)
  );
  const rankMap = new Map<string, number>();
  let rank = 1;
  let i = 0;
  while (i < sorted.length) {
    const deaths = sorted[i].deathCount ?? 0;
    let j = i;
    while (j < sorted.length && (sorted[j].deathCount ?? 0) === deaths) j++;
    for (let k = i; k < j; k++) rankMap.set(sorted[k].id, rank);
    rank += j - i;
    i = j;
  }
  return rankMap;
}

/**
 * Compute team ranks by total team death count (ascending).
 * Returns a map of teamId → rank.
 */
export function computeTeamDeathCountRanks(
  players: PlayerState[]
): Map<number, number> {
  const teamDeaths = new Map<number, number>();
  for (const p of players) {
    if (p.teamId == null) continue;
    teamDeaths.set(p.teamId, (teamDeaths.get(p.teamId) ?? 0) + (p.deathCount ?? 0));
  }

  const sorted = [...teamDeaths.entries()].sort((a, b) => a[1] - b[1]);
  const rankMap = new Map<number, number>();
  let rank = 1;
  let i = 0;
  while (i < sorted.length) {
    const deaths = sorted[i][1];
    let j = i;
    while (j < sorted.length && sorted[j][1] === deaths) j++;
    for (let k = i; k < j; k++) rankMap.set(sorted[k][0], rank);
    rank += j - i;
    i = j;
  }
  return rankMap;
}

/** Map a standard competition rank (1/2/3) to a medal emoji, or null if rank > 3. */
export function rankToMedal(rank: number | undefined): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}
