import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRosterFile } from "./parse";

const SAMPLES_DIR = join(__dirname, "../../../samples");

function sampleFiles(): string[] {
  try {
    return readdirSync(SAMPLES_DIR).filter((f) =>
      /\.(json|ros|rosz)$/i.test(f)
    );
  } catch {
    return [];
  }
}

describe("parseRosterFile (sample fixtures)", () => {
  const files = sampleFiles();

  it("has sample files to test against", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`parses ${file}`, () => {
      const data = new Uint8Array(readFileSync(join(SAMPLES_DIR, file)));
      const { roster } = parseRosterFile(file, data);
      expect(roster.faction).not.toBe("Unknown faction");
      expect(roster.totalPoints).toBeGreaterThan(0);
      expect(roster.units.length).toBeGreaterThan(0);
      for (const unit of roster.units) {
        expect(unit.name.length).toBeGreaterThan(0);
        expect(unit.modelCount).toBeGreaterThanOrEqual(1);
      }
    });
  }

  it("all formats of the same list normalize identically", () => {
    const groups = new Map<string, string[]>();
    for (const file of files) {
      const stem = file.replace(/\.(json|ros|rosz)$/i, "");
      groups.set(stem, [...(groups.get(stem) ?? []), file]);
    }
    for (const [, group] of groups) {
      if (group.length < 2) continue;
      const rosters = group.map((file) => {
        const data = new Uint8Array(readFileSync(join(SAMPLES_DIR, file)));
        return parseRosterFile(file, data).roster;
      });
      for (let i = 1; i < rosters.length; i++) {
        expect(rosters[i]).toEqual(rosters[0]);
      }
    }
  });

  it("extracts known details from the Death Guard sample", () => {
    const file = files.find((f) => f.toLowerCase().endsWith(".json"));
    if (!file) return;
    const data = new Uint8Array(readFileSync(join(SAMPLES_DIR, file)));
    const { format, roster } = parseRosterFile(file, data);
    expect(format).toBe("newrecruit_json");
    expect(roster.faction).toBe("Chaos - Death Guard");
    expect(roster.detachment).toBe("Virulent Vectorium");
    expect(roster.totalPoints).toBe(2000);

    const daemonPrince = roster.units.find((u) =>
      u.name.startsWith("Daemon Prince")
    );
    expect(daemonPrince).toBeDefined();
    expect(daemonPrince!.enhancements).toContain("Revolting Regeneration");
    expect(daemonPrince!.points).toBe(215); // 195 base + 20 enhancement
    expect(daemonPrince!.wargear).toContain("Hellforged weapons");

    const plagueMarines = roster.units.filter(
      (u) => u.name === "Plague Marines"
    );
    expect(plagueMarines.length).toBe(3);
    expect(plagueMarines[0].modelCount).toBeGreaterThanOrEqual(5);
  });
});

describe("parseRosterFile (defensive)", () => {
  const garbage = new TextEncoder().encode("not a roster at all {{{");

  it("handles corrupt json gracefully", () => {
    const { roster } = parseRosterFile("bad.json", garbage);
    expect(roster.units).toEqual([]);
    expect(roster.warnings.length).toBeGreaterThan(0);
  });

  it("handles corrupt ros gracefully", () => {
    const { roster } = parseRosterFile("bad.ros", garbage);
    expect(roster.units).toEqual([]);
    expect(roster.warnings.length).toBeGreaterThan(0);
  });

  it("handles corrupt rosz gracefully", () => {
    const { roster } = parseRosterFile("bad.rosz", garbage);
    expect(roster.units).toEqual([]);
    expect(roster.warnings.length).toBeGreaterThan(0);
  });

  it("handles unsupported extensions gracefully", () => {
    const { roster } = parseRosterFile("list.pdf", garbage);
    expect(roster.units).toEqual([]);
    expect(roster.warnings[0]).toMatch(/Unsupported file type/);
  });

  it("handles valid json that is not a roster", () => {
    const { roster } = parseRosterFile(
      "other.json",
      new TextEncoder().encode('{"hello": "world"}')
    );
    expect(roster.units).toEqual([]);
    expect(roster.warnings.length).toBeGreaterThan(0);
  });
});
