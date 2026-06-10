"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Battle, StarSystem } from "@/lib/types";

interface BattleListItemProps {
  battle: Battle;
  index: number;
  system: StarSystem;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function BattleListItem({
  battle,
  index,
  system,
  selected,
  onSelect,
}: BattleListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: battle.id });

  const location = battle.locationId
    ? system.bodies.find((b) => b.id === battle.locationId)
    : null;
  const factions = [
    ...new Set(battle.participants.map((p) => p.faction).filter(Boolean)),
  ];

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group rounded border ${
        selected
          ? "border-accent-dim bg-surface-raised"
          : "border-border bg-surface hover:border-accent-dim/50"
      } ${isDragging ? "z-10 opacity-80 shadow-lg" : ""}`}
    >
      <div className="flex items-stretch">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Reorder battle ${battle.title || index + 1}`}
          className="cursor-grab touch-none px-2 font-mono text-muted/60 hover:text-accent active:cursor-grabbing"
        >
          ⣿
        </button>
        <button
          onClick={() => onSelect(battle.id)}
          className="flex-1 py-2 pr-3 text-left"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm text-foreground">
              {battle.title || "Untitled Engagement"}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            {factions.length > 0 && <span>{factions.join(" vs ")}</span>}
            {location && <span>@ {location.name}</span>}
            {battle.winner && (
              <span className="text-accent">⚜ {battle.winner}</span>
            )}
          </div>
        </button>
      </div>
    </li>
  );
}
