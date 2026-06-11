import type { Battle, Body, Participant } from "./types";
import { participantVp } from "./score";

export interface CombatantStats {
  /** Player or faction name this row aggregates. */
  name: string;
  games: number;
  wins: number;
  losses: number;
  /** 3 per win; battles with no resolvable winner score nothing. */
  campaignPoints: number;
  vpFor: number;
  vpAgainst: number;
  /** Games where VP was recorded (denominator for averages). */
  scoredGames: number;
}

export interface ContestedWorld {
  bodyId: string;
  name: string;
  battles: number;
  controlledBy: string;
}

export interface CampaignStats {
  byPlayer: CombatantStats[];
  byFaction: CombatantStats[];
  contested: ContestedWorld[];
  /** faction → worlds held (only bodies with a controller). */
  holdings: { faction: string; worlds: number }[];
  totalBattles: number;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * The participant who won this battle, resolved by matching the free-text
 * winner against player names first, then factions. Null when unresolvable
 * (no winner recorded, ambiguous faction-vs-faction, etc.).
 */
export function winningParticipant(battle: Battle): Participant | null {
  const w = norm(battle.winner);
  if (!w) return null;
  const byPlayer = battle.participants.filter(
    (p) => norm(p.playerName) === w && p.playerName.trim()
  );
  if (byPlayer.length === 1) return byPlayer[0];
  const byFaction = battle.participants.filter(
    (p) => norm(p.faction) === w && p.faction.trim()
  );
  if (byFaction.length === 1) return byFaction[0];
  return null;
}

function tally(
  battles: Battle[],
  keyOf: (p: Participant) => string
): CombatantStats[] {
  const rows = new Map<string, CombatantStats>();
  const rowFor = (name: string): CombatantStats => {
    const key = norm(name);
    let row = rows.get(key);
    if (!row) {
      row = {
        name,
        games: 0,
        wins: 0,
        losses: 0,
        campaignPoints: 0,
        vpFor: 0,
        vpAgainst: 0,
        scoredGames: 0,
      };
      rows.set(key, row);
    }
    return row;
  };

  for (const battle of battles) {
    const winner = winningParticipant(battle);
    const vps = battle.participants.map((p) =>
      participantVp(p, battle.scoreMode)
    );
    const vpTotal = vps.reduce<number>((sum, v) => sum + (v ?? 0), 0);
    const anyVp = vps.some((v) => v !== null);

    battle.participants.forEach((p, i) => {
      const name = keyOf(p).trim();
      if (!name) return;
      const row = rowFor(name);
      row.games += 1;
      if (winner) {
        if (winner.key === p.key) {
          row.wins += 1;
          row.campaignPoints += 3;
        } else {
          row.losses += 1;
        }
      }
      if (anyVp) {
        row.scoredGames += 1;
        row.vpFor += vps[i] ?? 0;
        row.vpAgainst += vpTotal - (vps[i] ?? 0);
      }
    });
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.campaignPoints - a.campaignPoints || b.wins - a.wins || b.games - a.games
  );
}

export function computeStats(
  battles: Battle[],
  bodies: Body[]
): CampaignStats {
  const counts = new Map<string, number>();
  for (const b of battles) {
    if (b.locationId) counts.set(b.locationId, (counts.get(b.locationId) ?? 0) + 1);
  }
  const contested: ContestedWorld[] = bodies
    .filter((b) => (counts.get(b.id) ?? 0) > 0)
    .map((b) => ({
      bodyId: b.id,
      name: b.name,
      battles: counts.get(b.id) ?? 0,
      controlledBy: b.controlledBy ?? "",
    }))
    .sort((a, b) => b.battles - a.battles);

  const held = new Map<string, number>();
  for (const b of bodies) {
    const f = b.controlledBy?.trim();
    if (f) held.set(f, (held.get(f) ?? 0) + 1);
  }
  const holdings = [...held.entries()]
    .map(([faction, worlds]) => ({ faction, worlds }))
    .sort((a, b) => b.worlds - a.worlds);

  return {
    byPlayer: tally(battles, (p) => p.playerName),
    byFaction: tally(battles, (p) => p.faction),
    contested,
    holdings,
    totalBattles: battles.length,
  };
}
