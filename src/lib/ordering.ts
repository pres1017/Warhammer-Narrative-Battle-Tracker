import { generateKeyBetween } from "fractional-indexing";
import type { Battle } from "./types";

/**
 * Plain code-unit comparison. Fractional-indexing keys are case-sensitive
 * ASCII ("Zz" sorts before "a0"), so localeCompare must NOT be used here.
 */
function asciiCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Campaign display order: fractional sort key, then created time, then id. */
export function sortBattles(battles: Battle[]): Battle[] {
  return [...battles].sort(
    (a, b) =>
      asciiCompare(a.sortKey, b.sortKey) ||
      asciiCompare(a.createdAt, b.createdAt) ||
      asciiCompare(a.id, b.id)
  );
}

/** Key that places a new battle at the end of the campaign. */
export function keyForAppend(battles: Battle[]): string {
  const sorted = sortBattles(battles);
  const last = sorted[sorted.length - 1];
  return generateKeyBetween(last?.sortKey ?? null, null);
}

/**
 * Key that moves a battle to `targetIndex` within the sorted list
 * (index interpreted after the battle is removed from its current spot).
 */
export function keyForMove(
  battles: Battle[],
  battleId: string,
  targetIndex: number
): string {
  const sorted = sortBattles(battles).filter((b) => b.id !== battleId);
  const clamped = Math.max(0, Math.min(targetIndex, sorted.length));
  const before = sorted[clamped - 1]?.sortKey ?? null;
  const after = sorted[clamped]?.sortKey ?? null;
  return generateKeyBetween(before, after);
}
