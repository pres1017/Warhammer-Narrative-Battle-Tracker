"use client";

import type { Battle, StarSystem } from "@/lib/types";

interface BattleDetailProps {
  battle: Battle;
  system: StarSystem;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onFocusLocation?: (bodyId: string) => void;
}

export function BattleDetail({
  battle,
  system,
  index,
  onEdit,
  onDelete,
  onClose,
  onFocusLocation,
}: BattleDetailProps) {
  const location = battle.locationId
    ? system.bodies.find((b) => b.id === battle.locationId)
    : null;

  return (
    <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded border border-border bg-surface p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Engagement {String(index + 1).padStart(2, "0")}
            {battle.foughtAt ? ` · ${battle.foughtAt}` : ""}
          </p>
          <h3 className="text-xl text-accent">
            {battle.title || "Untitled Engagement"}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close battle detail"
          className="rounded px-2 py-0.5 text-muted hover:bg-surface-raised hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {battle.mission && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Mission
            </dt>
            <dd>{battle.mission}</dd>
          </div>
        )}
        {location && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Location
            </dt>
            <dd>
              <button
                onClick={() => onFocusLocation?.(location.id)}
                className="text-accent underline-offset-2 hover:underline"
              >
                {location.name}
              </button>
            </dd>
          </div>
        )}
        {battle.winner && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Victor
            </dt>
            <dd className="text-accent">⚜ {battle.winner}</dd>
          </div>
        )}
      </dl>

      {battle.participants.length > 0 && (
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Combatants
          </h4>
          <table className="mt-1 w-full text-sm">
            <tbody>
              {battle.participants.map((p) => (
                <tr key={p.key} className="border-t border-border/60">
                  <td className="py-1 pr-2">{p.playerName || "—"}</td>
                  <td className="py-1 pr-2 text-muted">{p.faction || "—"}</td>
                  <td className="py-1 text-right font-mono">
                    {p.points !== null ? `${p.points} pts` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {battle.notes && (
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Chronicle
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm italic text-foreground/90">
            {battle.notes}
          </p>
        </div>
      )}

      <div className="mt-1 flex justify-end gap-3 border-t border-border pt-3">
        <button
          onClick={onDelete}
          className="rounded border border-danger/50 px-3 py-1.5 font-display text-sm text-danger hover:bg-danger/10"
        >
          Strike from Record
        </button>
        <button
          onClick={onEdit}
          className="rounded border border-accent-dim px-3 py-1.5 font-display text-sm text-accent hover:bg-surface-raised"
        >
          Amend
        </button>
      </div>
    </div>
  );
}
