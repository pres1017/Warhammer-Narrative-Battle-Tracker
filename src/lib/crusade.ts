/** Crusade rank thresholds per the 40k Crusade rules. */
export type CrusadeRank =
  | "Battle-ready"
  | "Blooded"
  | "Battle-hardened"
  | "Heroic"
  | "Legendary";

export function rankForXp(xp: number): CrusadeRank {
  if (xp >= 51) return "Legendary";
  if (xp >= 31) return "Heroic";
  if (xp >= 16) return "Battle-hardened";
  if (xp >= 6) return "Blooded";
  return "Battle-ready";
}

/** Rank index 0–4, handy for badges/progress styling. */
export function rankIndex(xp: number): number {
  if (xp >= 51) return 4;
  if (xp >= 31) return 3;
  if (xp >= 16) return 2;
  if (xp >= 6) return 1;
  return 0;
}
