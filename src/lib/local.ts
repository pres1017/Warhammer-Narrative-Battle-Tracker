import type { Battle, StarSystem } from "./types";
import type { ArmyList } from "./rosters/types";

/**
 * Offline persistence: the "local" campaign in localStorage, exposed as an
 * external store for useSyncExternalStore. Cloud campaigns live in Supabase;
 * this shape mirrors what the DB holds (army lists keep rawBase64 here
 * instead of a Storage path).
 */
export interface LocalCampaign {
  name: string;
  system: StarSystem | null;
  systemLocked: boolean;
  battles: Battle[];
  armyLists: ArmyList[];
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
