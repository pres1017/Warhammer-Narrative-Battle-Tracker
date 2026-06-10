import type {
  Body,
  Classification,
  GeneratorParams,
  StarSystem,
} from "@/lib/types";
import { NameForge } from "./names";
import { chance, pick, randInt, rngFromSeed, weightedPick, type Rng } from "./prng";
import {
  BASE_CLASSIFICATION_WEIGHTS,
  CLASSIFICATION_INFO,
  DANGER_SCALED,
  POI_INFO,
  POI_KINDS,
  STAR_TYPE_BIASES,
  STAR_VISUALS,
} from "./tables";

export const DEFAULT_PARAMS: GeneratorParams = {
  planetCountMin: 4,
  planetCountMax: 8,
  starType: "mature_yellow",
  dangerLevel: 2,
  warpStorms: 0,
};

const ORBIT_BASE = 90;
const ORBIT_STEP = 65;

function classificationWeights(
  params: GeneratorParams
): Record<Classification, number> {
  const weights = { ...BASE_CLASSIFICATION_WEIGHTS };
  const biases = STAR_TYPE_BIASES[params.starType];
  for (const [cls, mult] of Object.entries(biases)) {
    weights[cls as Classification] *= mult;
  }
  for (const [cls, perLevel] of Object.entries(DANGER_SCALED)) {
    weights[cls as Classification] *= 1 + perLevel * (params.dangerLevel - 1);
  }
  if (params.warpStorms > 0) {
    weights.daemon_world *= 1 + params.warpStorms * 1.5;
  }
  return weights;
}

function fillBlurb(rng: Rng, template: string): string {
  return template
    .replaceAll("{bil}", String(randInt(rng, 2, 120)))
    .replaceAll("{n}", String(randInt(rng, 2, 40)));
}

/**
 * Pure seeded generator: identical (params, seed) inputs always produce an
 * identical system. All randomness flows through one PRNG in a fixed order.
 */
export function generateSystem(
  params: GeneratorParams,
  seed: string
): StarSystem {
  const rng = rngFromSeed(seed);
  const names = new NameForge(rng);
  const bodies: Body[] = [];
  let idCounter = 0;
  const nextId = (kind: string) => `${kind}-${idCounter++}`;

  const starVisual = STAR_VISUALS[params.starType];
  const star = {
    name: names.starName(),
    type: params.starType,
    color: starVisual.color,
    radiusPx: randInt(rng, starVisual.radiusPx[0], starVisual.radiusPx[1]),
  };

  const planetCount = randInt(
    rng,
    Math.min(params.planetCountMin, params.planetCountMax),
    Math.max(params.planetCountMin, params.planetCountMax)
  );
  const beltCount = chance(rng, 0.55) ? randInt(rng, 1, 2) : 0;
  const totalOrbits = planetCount + beltCount;

  // Belts occupy whole orbit slots, shifting planets outward around them.
  const beltSlots = new Set<number>();
  while (beltSlots.size < beltCount) {
    beltSlots.add(randInt(rng, 1, totalOrbits - 1));
  }

  const weights = classificationWeights(params);
  const lostToWarp = params.warpStorms >= 2;

  for (let slot = 0; slot < totalOrbits; slot++) {
    const orbitRadius =
      ORBIT_BASE + slot * ORBIT_STEP + randInt(rng, -15, 15);

    if (beltSlots.has(slot)) {
      bodies.push({
        id: nextId("belt"),
        kind: "belt",
        parentId: null,
        name: `${star.name} Belt ${bodies.filter((b) => b.kind === "belt").length === 0 ? "Primus" : "Secundus"}`,
        classification: null,
        orbitIndex: slot,
        visual: {
          orbitRadius,
          angle: 0,
          sizePx: 0,
          palette: ["#6e6a60", "#9a948a"],
          hasRings: false,
        },
        blurb: "A churning ring of rock and wreckage; void-prospectors and pirates contest its riches.",
        tags: [],
      });
      continue;
    }

    const classification = weightedPick(rng, weights);
    const info = CLASSIFICATION_INFO[classification];
    const planetId = nextId("planet");
    const planetName = names.planetName(star.name);
    const tags: string[] = [];
    if (lostToWarp && chance(rng, 0.15)) tags.push("Lost to the Warp");
    if (params.dangerLevel >= 4 && chance(rng, 0.2)) tags.push("Quarantined");

    bodies.push({
      id: planetId,
      kind: "planet",
      parentId: null,
      name: planetName,
      classification,
      orbitIndex: slot,
      visual: {
        orbitRadius,
        angle: rng() * Math.PI * 2,
        sizePx: randInt(rng, info.sizePx[0], info.sizePx[1]),
        palette: pick(rng, info.palettes),
        hasRings: classification === "gas_giant" ? chance(rng, 0.5) : chance(rng, 0.08),
      },
      blurb: fillBlurb(rng, pick(rng, info.blurbs)),
      tags,
    });

    const moonCount = weightedPick(rng, { 0: 45, 1: 30, 2: 17, 3: 8 } as Record<
      string,
      number
    >);
    for (let m = 0; m < Number(moonCount); m++) {
      bodies.push({
        id: nextId("moon"),
        kind: "moon",
        parentId: planetId,
        name: names.moonName(planetName, m),
        classification: null,
        orbitIndex: m,
        visual: {
          orbitRadius: 0,
          angle: rng() * Math.PI * 2,
          sizePx: randInt(rng, 3, 5),
          palette: ["#8a8a92", "#c2c2cc"],
          hasRings: false,
        },
        blurb: "",
        tags: [],
      });
    }
  }

  // Stations and points of interest scale with danger.
  const poiCount =
    params.dangerLevel >= 3 ? randInt(rng, 1, 3) : chance(rng, 0.4) ? 1 : 0;
  const planets = bodies.filter((b) => b.kind === "planet");
  for (let i = 0; i < poiCount; i++) {
    const hostile = params.dangerLevel >= 3 && chance(rng, 0.5);
    if (hostile) {
      const poiKind = pick(rng, POI_KINDS);
      const info = POI_INFO[poiKind];
      bodies.push({
        id: nextId("poi"),
        kind: "poi",
        parentId: null,
        name:
          poiKind === "space_hulk"
            ? `Space Hulk ${names.hulkName()}`
            : `${info.label} ${i + 1}`,
        classification: null,
        orbitIndex: totalOrbits + i,
        visual: {
          orbitRadius: ORBIT_BASE + (totalOrbits + i) * ORBIT_STEP * 0.9,
          angle: rng() * Math.PI * 2,
          sizePx: randInt(rng, 6, 9),
          palette: ["#7a4a3a", "#b07a5a"],
          hasRings: false,
        },
        blurb: info.blurb,
        tags: poiKind === "space_hulk" || poiKind === "ork_rok" ? ["Hostile"] : [],
      });
    } else {
      const host = planets.length > 0 ? pick(rng, planets) : null;
      bodies.push({
        id: nextId("station"),
        kind: "station",
        parentId: host?.id ?? null,
        name: names.stationName(),
        classification: null,
        orbitIndex: i,
        visual: {
          orbitRadius: host ? 0 : ORBIT_BASE * 0.6,
          angle: rng() * Math.PI * 2,
          sizePx: randInt(rng, 4, 6),
          palette: ["#8a8a6a", "#c2c29a"],
          hasRings: false,
        },
        blurb: "An orbital waypoint of dock-spurs and gun batteries, loyal to whoever pays its tithe.",
        tags: [],
      });
    }
  }

  return {
    seed,
    params,
    star,
    bodies,
    warpStormIntensity: params.warpStorms,
  };
}
