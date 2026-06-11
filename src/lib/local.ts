import type {
  Battle,
  BattlePhoto,
  CampaignSettings,
  CrusadeForce,
  CrusadeUnit,
  StarSystem,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import type { ArmyList } from "./rosters/types";

/**
 * Offline persistence: the "local" campaign in localStorage, exposed as an
 * external store for useSyncExternalStore. Cloud campaigns live in Supabase;
 * this shape mirrors what the DB holds (army lists and photos keep rawBase64
 * here instead of a Storage path).
 */
export interface LocalCampaign {
  name: string;
  system: StarSystem | null;
  systemLocked: boolean;
  battles: Battle[];
  armyLists: ArmyList[];
  settings: CampaignSettings;
  photos: BattlePhoto[];
  crusadeForces: CrusadeForce[];
  crusadeUnits: CrusadeUnit[];
}

const KEY = "wbm:local-campaign";

export const EMPTY_CAMPAIGN: LocalCampaign = {
  name: "Local Campaign",
  system: null,
  systemLocked: false,
  battles: [],
  armyLists: [],
  settings: DEFAULT_SETTINGS,
  photos: [],
  crusadeForces: [],
  crusadeUnits: [],
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
  const next = fn(getLocalCampaignSnapshot());
  // Photos/army files can blow the ~5MB localStorage quota; fail loudly
  // without corrupting the in-memory state.
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error(
      "Browser storage is full — remove a photo or army list, or use a cloud campaign."
    );
  }
  cache = next;
  for (const listener of listeners) listener();
}
