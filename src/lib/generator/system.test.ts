import { describe, expect, it } from "vitest";
import type { GeneratorParams, StarType } from "@/lib/types";
import { rngFromSeed } from "./prng";
import { DEFAULT_PARAMS, generateSystem } from "./system";

describe("rngFromSeed", () => {
  it("is deterministic for the same seed", () => {
    const a = rngFromSeed("CADIA");
    const b = rngFromSeed("CADIA");
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it("differs across seeds", () => {
    const a = rngFromSeed("CADIA");
    const b = rngFromSeed("TERRA");
    const aVals = Array.from({ length: 10 }, () => a());
    const bVals = Array.from({ length: 10 }, () => b());
    expect(aVals).not.toEqual(bVals);
  });
});

describe("generateSystem", () => {
  it("same seed + params produce identical systems", () => {
    const s1 = generateSystem(DEFAULT_PARAMS, "VIGILUS");
    const s2 = generateSystem(DEFAULT_PARAMS, "VIGILUS");
    expect(s1).toEqual(s2);
  });

  it("different seeds produce different systems", () => {
    const s1 = generateSystem(DEFAULT_PARAMS, "VIGILUS");
    const s2 = generateSystem(DEFAULT_PARAMS, "ARMAGEDDON");
    expect(s1.bodies.map((b) => b.name)).not.toEqual(
      s2.bodies.map((b) => b.name)
    );
  });

  it("respects the planet count range", () => {
    for (let i = 0; i < 50; i++) {
      const system = generateSystem(
        { ...DEFAULT_PARAMS, planetCountMin: 3, planetCountMax: 5 },
        `seed-${i}`
      );
      const planets = system.bodies.filter((b) => b.kind === "planet");
      expect(planets.length).toBeGreaterThanOrEqual(3);
      expect(planets.length).toBeLessThanOrEqual(5);
    }
  });

  it("survives knob extremes without crashing", () => {
    const extremes: GeneratorParams[] = [
      { planetCountMin: 1, planetCountMax: 1, starType: "dying_ember", dangerLevel: 1, warpStorms: 0 },
      { planetCountMin: 15, planetCountMax: 15, starType: "anomaly", dangerLevel: 5, warpStorms: 3 },
      // Swapped min/max should still work.
      { planetCountMin: 8, planetCountMax: 2, starType: "young_blue", dangerLevel: 5, warpStorms: 3 },
    ];
    for (const params of extremes) {
      const system = generateSystem(params, "EXTREME");
      expect(system.bodies.length).toBeGreaterThan(0);
      expect(system.star.name.length).toBeGreaterThan(0);
    }
  });

  it("never duplicates names within a system (1k runs)", () => {
    for (let i = 0; i < 1000; i++) {
      const system = generateSystem(
        { ...DEFAULT_PARAMS, planetCountMax: 10, dangerLevel: 4 },
        `run-${i}`
      );
      const names = system.bodies.map((b) => b.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("gives every planet a classification, blurb, and sane visuals", () => {
    for (const starType of [
      "young_blue",
      "mature_yellow",
      "ancient_red_giant",
      "dying_ember",
      "anomaly",
    ] as StarType[]) {
      const system = generateSystem(
        { ...DEFAULT_PARAMS, starType },
        `vis-${starType}`
      );
      for (const planet of system.bodies.filter((b) => b.kind === "planet")) {
        expect(planet.classification).toBeTruthy();
        expect(planet.blurb).not.toMatch(/\{(bil|n)\}/);
        expect(planet.visual.sizePx).toBeGreaterThan(0);
        expect(planet.visual.orbitRadius).toBeGreaterThan(0);
      }
    }
  });

  it("moons and stations reference existing parents", () => {
    for (let i = 0; i < 100; i++) {
      const system = generateSystem(
        { ...DEFAULT_PARAMS, dangerLevel: 3 },
        `parent-${i}`
      );
      const ids = new Set(system.bodies.map((b) => b.id));
      for (const body of system.bodies) {
        if (body.parentId !== null) {
          expect(ids.has(body.parentId)).toBe(true);
        }
      }
    }
  });
});
