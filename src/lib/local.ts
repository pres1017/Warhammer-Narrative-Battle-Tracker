import type { Battle, StarSystem } from "./types";
import type { ArmyList } from "./rosters/types";

/** Army list plus the original file, kept locally until Phase 3 moves it to Storage. */
export interface StoredArmyList extends ArmyList {
  rawBase64: string;
}

/**
 * Phase 1–2 persistence: a single local campaign in localStorage, exposed as
 * an external store for useSyncExternalStore. Replaced by Supabase in
 * Phase 3; the shape mirrors what the DB will hold.
 */
export interface LocalCampaign {
  name: string;
  system: StarSystem | null;
  systemLocked: boolean;
  battles: Battle[];
  armyLists: StoredArmyList[];
}

const KEY = "wbm:local-campaign";

export const EMPTY_CAMPAIGN: LocalCampaign = {
  name: "Local Campaign",
  system: null,
  systemLocked: false,
  battles: [],
  armyLists: [],
};

let cache: LocalCampaign | null = null;
const listeners = new Set<() => void>();

function read(): LocalCampaign {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_CAMPAIGN;
    return { ...EMPTY_CAMPAIGN, ...(JSON.parse(raw) as LocalCampaign) };
  } catch {
    return EMPTY_CAMPAIGN;
  }
}

export function subscribeLocalCampaign(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocalCampaignSnapshot(): LocalCampaign {
  if (cache === null) cache = read();
  return cache;
}

export function getLocalCampaignServerSnapshot(): LocalCampaign {
  return EMPTY_CAMPAIGN;
}

export function updateLocalCampaign(
  fn: (current: LocalCampaign) => LocalCampaign
): void {
  cache = fn(getLocalCampaignSnapshot());
  window.localStorage.setItem(KEY, JSON.stringify(cache));
  for (const listener of listeners) listener();
}
