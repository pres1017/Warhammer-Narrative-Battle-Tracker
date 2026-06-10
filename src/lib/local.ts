import type { Battle, StarSystem } from "./types";

/**
 * Phase 1–2 persistence: a single local campaign in localStorage.
 * Replaced by Supabase in Phase 3; the shape mirrors what the DB will hold.
 */
export interface LocalCampaign {
  name: string;
  system: StarSystem | null;
  systemLocked: boolean;
  battles: Battle[];
}

const KEY = "wbm:local-campaign";

export const EMPTY_CAMPAIGN: LocalCampaign = {
  name: "Local Campaign",
  system: null,
  systemLocked: false,
  battles: [],
};

export function loadLocalCampaign(): LocalCampaign {
  if (typeof window === "undefined") return EMPTY_CAMPAIGN;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_CAMPAIGN;
    return { ...EMPTY_CAMPAIGN, ...(JSON.parse(raw) as LocalCampaign) };
  } catch {
    return EMPTY_CAMPAIGN;
  }
}

export function saveLocalCampaign(campaign: LocalCampaign): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(campaign));
}
