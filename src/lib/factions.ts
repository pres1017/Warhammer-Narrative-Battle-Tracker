import { rngFromSeed } from "./generator/prng";

/** Fixed 40k-flavoured banner palette for faction control rings. */
const PALETTE = [
  "#3a6ea5", // ultramar blue
  "#9c2b2b", // blood red
  "#3f7a3f", // ork/deathguard green
  "#c9a227", // imperial gold
  "#6d3fa8", // warp purple
  "#b35a1f", // martian rust
  "#3aa5a0", // sotek teal
  "#8a8a6a", // bone/drab
  "#b03a7e", // daemonette magenta
  "#5a6a8a", // grey knight steel
  "#a5a53a", // toxic ochre
  "#7a2f4f", // wine carmine
];

/**
 * Deterministic banner color for a faction name. Same name → same color on
 * every client; nothing stored.
 */
export function factionColor(faction: string): string {
  const key = faction.trim().toLowerCase();
  const rng = rngFromSeed(`faction-${key}`);
  return PALETTE[Math.floor(rng() * PALETTE.length)];
}
