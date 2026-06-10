"use client";

import type { Battle, Body, StarSystem } from "@/lib/types";
import { CLASSIFICATION_INFO } from "@/lib/generator/tables";

interface PlanetPanelProps {
  system: StarSystem;
  body: Body;
  battles: Battle[];
  onClose: () => void;
  onSelectBattle?: (battleId: string) => void;
  onAddBattleHere?: (bodyId: string) => void;
}

const KIND_LABELS: Record<Body["kind"], string> = {
  planet: "Planet",
  moon: "Moon",
  belt: "Asteroid Belt",
  station: "Orbital Station",
  poi: "Point of Interest",
};

export function PlanetPanel({
  system,
  body,
  battles,
  onClose,
  onSelectBattle,
  onAddBattleHere,
}: PlanetPanelProps) {
  const battlesHere = battles.filter((b) => b.locationId === body.id);
  const parent = body.parentId
    ? system.bodies.find((b) => b.id === body.parentId)
    : null;
  const classLabel = body.classification
    ? CLASSIFICATION_INFO[body.classification].label
    : KIND_LABELS[body.kind];

  return (
    <aside className="pointer-events-auto flex max-h-[70vh] w-80 flex-col overflow-y-auto rounded border border-border bg-surface/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg text-accent">{body.name}</h3>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {classLabel}
            {parent ? ` · orbiting ${parent.name}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="rounded px-2 py-0.5 text-muted hover:bg-surface-raised hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {body.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {body.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-danger/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-danger"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {body.blurb && (
        <p className="mt-3 text-sm italic text-foreground/90">{body.blurb}</p>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted">
            Battles Fought · {battlesHere.length}
          </h4>
          {onAddBattleHere && (
            <button
              onClick={() => onAddBattleHere(body.id)}
              className="rounded border border-accent-dim px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-surface-raised"
            >
              + Battle Here
            </button>
          )}
        </div>
        {battlesHere.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No recorded engagements. The Emperor watches.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {battlesHere.map((battle) => (
              <li key={battle.id}>
                <button
                  onClick={() => onSelectBattle?.(battle.id)}
                  className="w-full rounded px-2 py-1 text-left text-sm hover:bg-surface-raised"
                >
                  <span className="text-foreground">
                    {battle.title || "Untitled Engagement"}
                  </span>
                  {battle.winner && (
                    <span className="ml-1 text-muted">— {battle.winner}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
