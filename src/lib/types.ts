export type StarType =
  | "young_blue"
  | "mature_yellow"
  | "ancient_red_giant"
  | "dying_ember"
  | "anomaly";

export interface GeneratorParams {
  planetCountMin: number;
  planetCountMax: number;
  starType: StarType;
  /** 1 (backwater calm) – 5 (open warzone) */
  dangerLevel: number;
  /** 0 (none) – 3 (system-engulfing) */
  warpStorms: number;
}

export type BodyKind = "planet" | "moon" | "belt" | "station" | "poi";

export type Classification =
  | "hive_world"
  | "forge_world"
  | "agri_world"
  | "civilised_world"
  | "shrine_world"
  | "feral_world"
  | "feudal_world"
  | "death_world"
  | "mining_world"
  | "war_world"
  | "daemon_world"
  | "ork_held_world"
  | "dead_world"
  | "frontier_world"
  | "cemetery_world"
  | "gas_giant";

export interface BodyVisual {
  orbitRadius: number;
  /** radians */
  angle: number;
  sizePx: number;
  /** [base, highlight] hex colors */
  palette: [string, string];
  hasRings: boolean;
}

export interface Body {
  id: string;
  kind: BodyKind;
  parentId: string | null;
  name: string;
  classification: Classification | null;
  orbitIndex: number;
  visual: BodyVisual;
  blurb: string;
  tags: string[];
  /** Faction holding this body (territory control); empty/absent = nobody. */
  controlledBy?: string;
}

export interface Star {
  name: string;
  type: StarType;
  color: string;
  radiusPx: number;
}

export interface StarSystem {
  seed: string;
  params: GeneratorParams;
  star: Star;
  bodies: Body[];
  /** 0–3; rendered as a warp storm overlay when > 0 */
  warpStormIntensity: number;
}

export interface Participant {
  /** Stable key within the battle, links to an army list. */
  key: string;
  playerName: string;
  faction: string;
  points: number | null;
  armyListId: string | null;
  /** Final victory points (simple score mode). */
  vp?: number | null;
  /** Primary-objective points (detailed score mode). */
  vpPrimary?: number | null;
  /** Secondary-objective points (detailed score mode). */
  vpSecondary?: number | null;
}

/** How a battle's final score is recorded. */
export type ScoreMode = "simple" | "detailed";

export interface Battle {
  id: string;
  /** Body id of where it was fought, if anywhere specific. */
  locationId: string | null;
  /** Fractional index controlling campaign order. */
  sortKey: string;
  title: string;
  mission: string;
  /** ISO date (yyyy-mm-dd) the battle was played. */
  foughtAt: string | null;
  winner: string;
  participants: Participant[];
  notes: string;
  /** Absent on records saved before scoring existed; treated as "simple". */
  scoreMode?: ScoreMode;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Admin-controlled per-campaign feature toggles. */
export interface CampaignSettings {
  territoryEnabled: boolean;
  crusadeEnabled: boolean;
}

export const DEFAULT_SETTINGS: CampaignSettings = {
  territoryEnabled: false,
  crusadeEnabled: false,
};

/** A tabletop photo attached to a battle. Cloud keeps the file in Storage
 * (storagePath); the offline campaign keeps it inline as base64. */
export interface BattlePhoto {
  id: string;
  battleId: string;
  caption: string;
  storagePath?: string | null;
  rawBase64?: string;
  uploadedBy: string | null;
  createdAt: string;
}

/** A player's persistent Crusade order of battle. */
export interface CrusadeForce {
  id: string;
  /** Player row id in cloud campaigns; null for the offline campaign. */
  playerId: string | null;
  name: string;
  faction: string;
  notes: string;
  createdAt: string;
}

export interface CrusadeUnit {
  id: string;
  forceId: string;
  name: string;
  role: string;
  points: number | null;
  xp: number;
  battlesPlayed: number;
  unitsDestroyed: number;
  honours: string[];
  scars: string[];
  notes: string;
  createdAt: string;
}
