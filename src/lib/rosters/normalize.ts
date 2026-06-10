import type { NormalizedRoster, RosterUnit } from "./types";

/**
 * Shared normalizer for BattleScribe-schema rosters. The .ros XML and the
 * New Recruit .json export carry the same structure with two container
 * spellings: XML wraps lists ({ selections: { selection: [...] } }) while
 * JSON keeps plain arrays ({ selections: [...] }). All accessors here accept
 * both.
 */

type Raw = Record<string, unknown>;

function asArray(value: unknown): Raw[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as Raw[];
  return [value as Raw];
}

/** List access tolerant of both container spellings. */
function list(node: Raw | undefined, plural: string, singular: string): Raw[] {
  if (!node) return [];
  const container = node[plural];
  if (container == null) return [];
  if (Array.isArray(container)) return container as Raw[];
  if (typeof container === "object") {
    return asArray((container as Raw)[singular]);
  }
  return [];
}

const selectionsOf = (n: Raw) => list(n, "selections", "selection");
const costsOf = (n: Raw) => list(n, "costs", "cost");
const categoriesOf = (n: Raw) => list(n, "categories", "category");
const forcesOf = (n: Raw) => list(n, "forces", "force");

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Points from a costs list (prefers the "pts" cost type). */
function points(node: Raw): number {
  const costs = costsOf(node);
  const pts = costs.find((c) => str(c.name).trim().toLowerCase() === "pts");
  return num((pts ?? costs[0])?.value);
}

function subtreePoints(node: Raw): number {
  let total = points(node);
  for (const child of selectionsOf(node)) total += subtreePoints(child);
  return total;
}

function subtreeModelCount(node: Raw): number {
  let total = 0;
  if (str(node.type) === "model") total += num(node.number) || 1;
  for (const child of selectionsOf(node)) total += subtreeModelCount(child);
  return total;
}

function isConfiguration(node: Raw): boolean {
  return categoriesOf(node).some(
    (c) => str(c.name).trim().toLowerCase() === "configuration"
  );
}

function isEnhancement(node: Raw): boolean {
  return str(node.group).trim().toLowerCase() === "enhancements";
}

/** Collects upgrade names in a unit subtree, split into wargear and enhancements. */
function collectUpgrades(
  node: Raw,
  wargear: Map<string, number>,
  enhancements: Set<string>
): void {
  for (const child of selectionsOf(node)) {
    const name = str(child.name).trim();
    if (name) {
      if (isEnhancement(child)) {
        enhancements.add(name);
      } else if (str(child.type) === "upgrade") {
        wargear.set(name, (wargear.get(name) ?? 0) + (num(child.number) || 1));
      }
    }
    collectUpgrades(child, wargear, enhancements);
  }
}

function toUnit(node: Raw): RosterUnit {
  const wargear = new Map<string, number>();
  const enhancements = new Set<string>();
  collectUpgrades(node, wargear, enhancements);
  const pts = subtreePoints(node);
  return {
    name: str(node.name).trim() || "Unknown unit",
    modelCount: Math.max(subtreeModelCount(node), 1),
    points: pts > 0 ? pts : null,
    wargear: [...wargear.entries()].map(([name, count]) =>
      count > 1 ? `${count}× ${name}` : name
    ),
    enhancements: [...enhancements],
  };
}

/** Detachment name: child of the force-level "Detachment" configuration. */
function findDetachment(forceSelections: Raw[]): string {
  for (const sel of forceSelections) {
    const name = str(sel.name).trim().toLowerCase();
    if (name === "detachment" || name === "detachment choice") {
      const child = selectionsOf(sel)[0];
      if (child) return str(child.name).trim();
    }
  }
  return "";
}

export function normalizeRoster(roster: unknown): NormalizedRoster {
  const warnings: string[] = [];
  const root = (roster ?? {}) as Raw;

  const totalPoints = points(root);
  const forces = forcesOf(root);
  if (forces.length === 0) {
    warnings.push("No forces found in roster; the file may be incomplete.");
  }

  const units: RosterUnit[] = [];
  let faction = "";
  let detachment = "";

  for (const force of forces) {
    if (!faction) faction = str(force.catalogueName).trim();
    const selections = selectionsOf(force);
    if (!detachment) detachment = findDetachment(selections);
    for (const sel of selections) {
      if (isConfiguration(sel)) continue;
      const type = str(sel.type);
      if (type === "unit" || type === "model" || selectionsOf(sel).length > 0) {
        units.push(toUnit(sel));
      } else {
        warnings.push(`Unrecognised entry "${str(sel.name)}" kept as a unit.`);
        units.push(toUnit(sel));
      }
    }
  }

  return {
    name: str(root.name).trim(),
    faction: faction || "Unknown faction",
    detachment,
    totalPoints: totalPoints > 0 ? totalPoints : null,
    units,
    warnings,
  };
}
