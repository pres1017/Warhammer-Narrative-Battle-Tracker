import type { Classification, StarType } from "@/lib/types";

export const BASE_CLASSIFICATION_WEIGHTS: Record<Classification, number> = {
  hive_world: 8,
  forge_world: 5,
  agri_world: 9,
  civilised_world: 10,
  shrine_world: 5,
  feral_world: 7,
  feudal_world: 6,
  death_world: 5,
  mining_world: 8,
  war_world: 3,
  daemon_world: 1,
  ork_held_world: 3,
  dead_world: 8,
  frontier_world: 7,
  cemetery_world: 3,
  gas_giant: 12,
};

/** Multiplicative biases applied per star type. */
export const STAR_TYPE_BIASES: Record<
  StarType,
  Partial<Record<Classification, number>>
> = {
  young_blue: {
    death_world: 2,
    feral_world: 1.8,
    frontier_world: 2,
    dead_world: 1.5,
    hive_world: 0.4,
    shrine_world: 0.3,
    cemetery_world: 0.2,
  },
  mature_yellow: {
    civilised_world: 1.5,
    agri_world: 1.4,
    hive_world: 1.3,
  },
  ancient_red_giant: {
    hive_world: 1.6,
    shrine_world: 2,
    cemetery_world: 2.5,
    dead_world: 1.5,
    frontier_world: 0.4,
  },
  dying_ember: {
    dead_world: 2.5,
    cemetery_world: 2,
    mining_world: 1.5,
    agri_world: 0.3,
    civilised_world: 0.5,
  },
  anomaly: {
    daemon_world: 4,
    dead_world: 1.5,
    death_world: 1.5,
    civilised_world: 0.6,
  },
};

/** Classifications whose weight scales with danger level (1–5). */
export const DANGER_SCALED: Partial<Record<Classification, number>> = {
  death_world: 0.6,
  daemon_world: 0.5,
  ork_held_world: 0.7,
  war_world: 0.9,
};

export const STAR_VISUALS: Record<
  StarType,
  { color: string; radiusPx: [number, number]; label: string }
> = {
  young_blue: { color: "#9db7ff", radiusPx: [22, 30], label: "Young Blue Star" },
  mature_yellow: { color: "#ffd97a", radiusPx: [26, 34], label: "Mature Yellow Star" },
  ancient_red_giant: { color: "#ff7a5c", radiusPx: [38, 50], label: "Ancient Red Giant" },
  dying_ember: { color: "#b35438", radiusPx: [16, 22], label: "Dying Ember" },
  anomaly: { color: "#b07aff", radiusPx: [20, 36], label: "Stellar Anomaly" },
};

export const CLASSIFICATION_INFO: Record<
  Classification,
  {
    label: string;
    sizePx: [number, number];
    palettes: [string, string][];
    blurbs: string[];
  }
> = {
  hive_world: {
    label: "Hive World",
    sizePx: [14, 20],
    palettes: [
      ["#5a5a66", "#9a9aad"],
      ["#4d4a40", "#8f8a76"],
    ],
    blurbs: [
      "Population: {bil} billion souls toil in the under-hives. Tithe grade: Exactis Prima.",
      "Continent-spanning hive cities choke the skies. {bil} billion labour for the Throne.",
    ],
  },
  forge_world: {
    label: "Forge World",
    sizePx: [12, 18],
    palettes: [
      ["#6b3226", "#c46a3a"],
      ["#46333d", "#a06a52"],
    ],
    blurbs: [
      "Sacred to the Omnissiah. Manufactora output feeds {n} sector war efforts.",
      "The Adeptus Mechanicus rules here; its forges have not cooled in {n} millennia.",
    ],
  },
  agri_world: {
    label: "Agri World",
    sizePx: [11, 16],
    palettes: [
      ["#3f6b35", "#88b25f"],
      ["#56682e", "#a3b05f"],
    ],
    blurbs: [
      "Endless grain oceans feed {n} neighbouring systems.",
      "Tithed harvests sustain a dozen hive worlds; its people have never known plenty.",
    ],
  },
  civilised_world: {
    label: "Civilised World",
    sizePx: [11, 16],
    palettes: [
      ["#33617a", "#6fa8c4"],
      ["#3a6a64", "#76aea2"],
    ],
    blurbs: [
      "A stable Imperial world of {bil} billion citizens and quiet, dutiful prosperity.",
      "Spires, commerce, and the ever-watchful eye of the Adeptus Arbites.",
    ],
  },
  shrine_world: {
    label: "Shrine World",
    sizePx: [11, 15],
    palettes: [
      ["#7a6a3a", "#d4b96a"],
      ["#6e5a46", "#c2a276"],
    ],
    blurbs: [
      "Pilgrim fleets arrive without end to honour the saint entombed beneath its basilica.",
      "Every stone is consecrated; every dawn begins with {n} million voices in prayer.",
    ],
  },
  feral_world: {
    label: "Feral World",
    sizePx: [10, 15],
    palettes: [
      ["#5d5237", "#a08e5a"],
      ["#4f5d37", "#8aa05a"],
    ],
    blurbs: [
      "Stone-age tribes war beneath strange stars; recruiters of the Astra Militarum watch with interest.",
      "Untamed and unforgiving — its hunters make fearsome Guardsmen.",
    ],
  },
  feudal_world: {
    label: "Feudal World",
    sizePx: [10, 15],
    palettes: [
      ["#54483f", "#9a8470"],
      ["#4a5046", "#86927e"],
    ],
    blurbs: [
      "Knight-kings rule from granite keeps, ignorant of the Imperium they serve.",
      "Black-powder armies clash over oaths sworn {n} centuries ago.",
    ],
  },
  death_world: {
    label: "Death World",
    sizePx: [11, 16],
    palettes: [
      ["#3c5530", "#6f8f4a"],
      ["#5a3a30", "#9a6248"],
    ],
    blurbs: [
      "Everything here is lethal: flora, fauna, weather, and the survivors it breeds.",
      "Catalogued as lethal-extremis. Settlement attempts: {n}. Survivors: none.",
    ],
  },
  mining_world: {
    label: "Mining World",
    sizePx: [9, 14],
    palettes: [
      ["#55504c", "#8f867e"],
      ["#5e4a3a", "#9c7e5e"],
    ],
    blurbs: [
      "Strip-mined to the mantle; ore convoys depart hourly for the forge worlds.",
      "Its promethium fields burn day and night, visible from orbit.",
    ],
  },
  war_world: {
    label: "War World",
    sizePx: [12, 18],
    palettes: [
      ["#6a3a2a", "#b56a3a"],
      ["#5a4a3a", "#a07a4a"],
    ],
    blurbs: [
      "A grinding theatre of war for {n} years; the trench lines are visible from orbit.",
      "Contested without pause. Casualty estimates are classified by order of the Munitorum.",
    ],
  },
  daemon_world: {
    label: "Daemon World",
    sizePx: [12, 18],
    palettes: [
      ["#5a2a5e", "#a04ab0"],
      ["#6e2a3a", "#c04a6a"],
    ],
    blurbs: [
      "Reality is a suggestion here. Quarantined by order of the Inquisition.",
      "The laws of physics kneel to a darker sovereign. Approach is heresy.",
    ],
  },
  ork_held_world: {
    label: "Ork-held World",
    sizePx: [11, 17],
    palettes: [
      ["#4a5e2a", "#7e9e3a"],
      ["#555e2a", "#8e9e3a"],
    ],
    blurbs: [
      "Infested by greenskins; scrap-cities sprawl where Imperial colonies once stood.",
      "Waaagh!-sign detected. Estimated ork population doubles every {n} years.",
    ],
  },
  dead_world: {
    label: "Dead World",
    sizePx: [9, 14],
    palettes: [
      ["#4a4a52", "#7e7e8a"],
      ["#3f444c", "#6e7682"],
    ],
    blurbs: [
      "Airless and silent. Whatever lived here left only dust and ruins.",
      "Surveyed and abandoned; the auspex returns share only static and old ghosts.",
    ],
  },
  frontier_world: {
    label: "Frontier World",
    sizePx: [10, 15],
    palettes: [
      ["#6a5a3a", "#b09a5e"],
      ["#5a6252", "#96a28a"],
    ],
    blurbs: [
      "A raw colony on the Imperium's ragged edge; {n} thousand settlers and counting.",
      "Charted but barely tamed — prospectors, outlaws, and missionaries share its single port.",
    ],
  },
  cemetery_world: {
    label: "Cemetery World",
    sizePx: [10, 15],
    palettes: [
      ["#46464a", "#82828a"],
      ["#3a4242", "#6e7a7a"],
    ],
    blurbs: [
      "A necropolis of {bil} billion honoured dead, tended by silent mortuary orders.",
      "Mausoleum spires stretch past the clouds; the living are visitors here.",
    ],
  },
  gas_giant: {
    label: "Gas Giant",
    sizePx: [20, 30],
    palettes: [
      ["#7a5a3a", "#c49a5e"],
      ["#3a5a7a", "#5e9ac4"],
      ["#6a4a6a", "#aa7aaa"],
    ],
    blurbs: [
      "Vast banded storms; atmospheric harvesters skim its upper reaches for fuel.",
      "A swirling colossus attended by captive moons.",
    ],
  },
};

export const POI_KINDS = [
  "space_hulk",
  "ork_rok",
  "webway_gate",
  "blackstone_fragment",
  "derelict_fortress",
] as const;
export type PoiKind = (typeof POI_KINDS)[number];

export const POI_INFO: Record<PoiKind, { label: string; blurb: string }> = {
  space_hulk: {
    label: "Space Hulk",
    blurb: "A drifting amalgam of lost vessels; what sleeps within is best left unwoken.",
  },
  ork_rok: {
    label: "Ork Rok",
    blurb: "A hollowed asteroid fortress, crudely engined and crawling with greenskins.",
  },
  webway_gate: {
    label: "Webway Gate",
    blurb: "An ancient Aeldari portal; its runes still glow when the moons align.",
  },
  blackstone_fragment: {
    label: "Blackstone Fragment",
    blurb: "A shard of noctilith older than the Imperium, humming with null energy.",
  },
  derelict_fortress: {
    label: "Derelict Star Fort",
    blurb: "A silent orbital bastion; its last garrison answered no hails.",
  },
};
