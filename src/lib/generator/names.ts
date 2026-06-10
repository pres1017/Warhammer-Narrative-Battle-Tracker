import { chance, pick, Rng, weightedPick } from "./prng";

const ONSETS = [
  "Vor", "Khar", "Thra", "Mor", "Sol", "Ophe", "Cad", "Vald", "Bel",
  "Dra", "Gath", "Hel", "Kor", "Lath", "Mal", "Nec", "Oct", "Pra",
  "Quel", "Rav", "Sar", "Tor", "Ulth", "Vex", "Xan", "Zar", "Ael",
  "Brak", "Cron", "Dorn", "Fenr", "Grend", "Ist", "Jur", "Krak",
] as const;

const NUCLEI = [
  "ax", "an", "esh", "ia", "or", "um", "ar", "el", "ius", "on",
  "eth", "ov", "ul", "im", "as", "ek",
] as const;

const CODAS = [
  "is", "ia", "ium", "os", "ar", "", "", "us", "a", "e", "ath", "or",
] as const;

const ORDINALS = [
  "Prime", "Secundus", "Tertius", "Quartus", "Quintus", "Sextus",
  "Septimus", "Octavia", "Nonus", "IV", "V", "VI", "VII", "VIII", "IX",
] as const;

const MAJORIS = ["Majoris", "Minoris", "Extremis", "Ultima"] as const;

const SAINT_SUFFIXES = [
  "Rest", "Fall", "Vigil", "Sorrow", "Redoubt", "Lament", "Triumph",
] as const;

const FOLLY_SUFFIXES = [
  "Folly", "Bastion", "Anvil", "Reach", "Gate", "Throne", "Grave",
] as const;

export function gothicRoot(rng: Rng): string {
  let root = pick(rng, ONSETS) + pick(rng, NUCLEI);
  if (chance(rng, 0.35)) root += pick(rng, CODAS);
  return root;
}

type NamePattern = "root" | "ordinal" | "majoris" | "saint" | "folly";

const PATTERN_WEIGHTS: Record<NamePattern, number> = {
  root: 40,
  ordinal: 25,
  majoris: 12,
  saint: 12,
  folly: 11,
};

function nameFromPattern(rng: Rng, root: string): string {
  switch (weightedPick(rng, PATTERN_WEIGHTS)) {
    case "root":
      return root;
    case "ordinal":
      return `${root} ${pick(rng, ORDINALS)}`;
    case "majoris":
      return `${root} ${pick(rng, MAJORIS)}`;
    case "saint":
      return `Saint ${root}'s ${pick(rng, SAINT_SUFFIXES)}`;
    case "folly":
      return `${root}'s ${pick(rng, FOLLY_SUFFIXES)}`;
  }
}

/**
 * Stateful per-system name generator: guarantees uniqueness within a system
 * and lets ~40% of planets derive from the star's name for coherence.
 */
export class NameForge {
  private used = new Set<string>();

  constructor(private rng: Rng) {}

  private unique(make: () => string): string {
    for (let i = 0; i < 50; i++) {
      const name = make();
      if (!this.used.has(name)) {
        this.used.add(name);
        return name;
      }
    }
    // Pathological seed: disambiguate with a numeral rather than loop forever.
    const base = make();
    let n = 2;
    while (this.used.has(`${base} ${n}`)) n++;
    const name = `${base} ${n}`;
    this.used.add(name);
    return name;
  }

  starName(): string {
    return this.unique(() => gothicRoot(this.rng));
  }

  planetName(starName: string): string {
    if (chance(this.rng, 0.4)) {
      return this.unique(() => `${starName} ${pick(this.rng, ORDINALS)}`);
    }
    return this.unique(() => nameFromPattern(this.rng, gothicRoot(this.rng)));
  }

  moonName(planetName: string, index: number): string {
    const greek = ["Alpha", "Beta", "Gamma", "Delta"][index] ?? `${index + 1}`;
    if (chance(this.rng, 0.6)) {
      return this.unique(() => `${planetName} ${greek}`);
    }
    return this.unique(() => gothicRoot(this.rng));
  }

  stationName(): string {
    const prefixes = [
      "Star Fort", "Orbital Dock", "Bastion", "Relay Spire", "Watch Station",
    ];
    return this.unique(
      () => `${pick(this.rng, prefixes)} ${gothicRoot(this.rng)}`
    );
  }

  hulkName(): string {
    const epithets = [
      "Harbinger of Woe", "Penitent Wanderer", "Grave of Hope",
      "Writhing Dark", "Echo of Damnation", "Silent Pilgrim",
    ];
    return this.unique(() => pick(this.rng, epithets));
  }
}
