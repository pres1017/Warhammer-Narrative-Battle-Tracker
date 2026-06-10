"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Battle, StarSystem } from "@/lib/types";
import { sortBattles } from "@/lib/ordering";
import { BattleListItem } from "./BattleListItem";

interface BattleSidebarProps {
  battles: Battle[];
  system: StarSystem;
  selectedBattleId: string | null;
  onSelectBattle: (id: string) => void;
  onAddBattle: () => void;
  onMoveBattle: (id: string, targetIndex: number) => void;
}

export function BattleSidebar({
  battles,
  system,
  selectedBattleId,
  onSelectBattle,
  onAddBattle,
  onMoveBattle,
}: BattleSidebarProps) {
  const [filter, setFilter] = useState("");
  const sorted = useMemo(() => sortBattles(battles), [battles]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((b) => {
      const location = b.locationId
        ? system.bodies.find((body) => body.id === b.locationId)?.name ?? ""
        : "";
      const haystack = [
        b.title,
        b.mission,
        b.winner,
        location,
        ...b.participants.flatMap((p) => [p.playerName, p.faction]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sorted, filter, system]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const targetIndex = sorted.findIndex((b) => b.id === over.id);
    if (targetIndex >= 0) onMoveBattle(String(active.id), targetIndex);
  }

  const reorderDisabled = filter.trim().length > 0;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface/80">
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base text-accent">Battle Chronicle</h2>
          <button
            onClick={onAddBattle}
            className="rounded border border-accent-dim px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-accent hover:bg-surface-raised"
          >
            + Record Battle
          </button>
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by title, faction, player, planet…"
          className="mt-2 w-full rounded border border-border bg-surface-raised px-2 py-1.5 text-sm placeholder:text-muted/60"
        />
        {reorderDisabled && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
            Clear filter to reorder
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted">
            {battles.length === 0
              ? "No battles recorded. History awaits its first bloodletting."
              : "No battles match the filter."}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filtered.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
              disabled={reorderDisabled}
            >
              <ul className="space-y-2">
                {filtered.map((battle) => (
                  <BattleListItem
                    key={battle.id}
                    battle={battle}
                    index={sorted.findIndex((b) => b.id === battle.id)}
                    system={system}
                    selected={battle.id === selectedBattleId}
                    onSelect={onSelectBattle}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </aside>
  );
}
