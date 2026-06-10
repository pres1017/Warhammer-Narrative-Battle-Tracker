"use client";

import type { NormalizedRoster } from "@/lib/rosters/types";

/** Expandable parsed army roster: units → wargear/enhancements. */
export function RosterView({ roster }: { roster: NormalizedRoster }) {
  return (
    <div className="rounded border border-border bg-surface-raised/60 p-2 text-sm">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {roster.faction}
        {roster.detachment ? ` · ${roster.detachment}` : ""}
        {roster.totalPoints !== null ? ` · ${roster.totalPoints} pts` : ""}
      </p>

      {roster.warnings.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {roster.warnings.map((warning, i) => (
            <li key={i} className="text-xs text-danger">
              ⚠ {warning}
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-1 space-y-0.5">
        {roster.units.map((unit, i) => (
          <li key={i}>
            {unit.wargear.length > 0 || unit.enhancements.length > 0 ? (
              <details>
                <summary className="cursor-pointer rounded px-1 hover:bg-surface-raised">
                  <span>{unit.name}</span>
                  <span className="ml-1 font-mono text-xs text-muted">
                    {unit.modelCount > 1 ? `×${unit.modelCount}` : ""}
                    {unit.points !== null ? ` · ${unit.points} pts` : ""}
                  </span>
                </summary>
                <div className="ml-4 border-l border-border pl-2 text-xs text-muted">
                  {unit.enhancements.map((e) => (
                    <p key={e} className="text-accent">
                      ✦ {e}
                    </p>
                  ))}
                  {unit.wargear.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                </div>
              </details>
            ) : (
              <p className="px-1">
                <span>{unit.name}</span>
                <span className="ml-1 font-mono text-xs text-muted">
                  {unit.modelCount > 1 ? `×${unit.modelCount}` : ""}
                  {unit.points !== null ? ` · ${unit.points} pts` : ""}
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
