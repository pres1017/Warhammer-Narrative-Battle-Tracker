import type { Participant, ScoreMode } from "./types";

/**
 * Final victory points for a participant under the battle's score mode,
 * or null when nothing has been recorded.
 */
export function participantVp(
  p: Participant,
  mode: ScoreMode | undefined
): number | null {
  if (mode === "detailed") {
    if (p.vpPrimary == null && p.vpSecondary == null) return null;
    return (p.vpPrimary ?? 0) + (p.vpSecondary ?? 0);
  }
  return p.vp ?? null;
}

/** "87 – 62" style scoreline across participants, or null if unscored. */
export function scoreline(
  participants: Participant[],
  mode: ScoreMode | undefined
): string | null {
  const scores = participants.map((p) => participantVp(p, mode));
  if (scores.every((s) => s === null)) return null;
  return scores.map((s) => (s === null ? "—" : String(s))).join(" – ");
}
