"use client";

import { useState } from "react";
import type { Battle, Body, StarSystem } from "@/lib/types";
import { CLASSIFICATION_INFO } from "@/lib/generator/tables";
import { factionColor } from "@/lib/factions";

interface PlanetPanelProps {
  system: StarSystem;
  body: Body;
  battles: Battle[];
  /** Admins/moderators may rename and redescribe bodies. */
  canEdit?: boolean;
  onSaveBody?: (
    bodyId: string,
    patch: { name: string; blurb: string }
  ) => Promise<void>;
  /** Territory control: shown when the campaign has it enabled. */
  territoryEnabled?: boolean;
  /** Known faction names, offered as suggestions when claiming. */
  knownFactions?: string[];
  onClaim?: (bodyId: string, faction: string) => Promise<void>;
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
  canEdit,
  onSaveBody,
  territoryEnabled,
  knownFactions,
  onClaim,
  onClose,
  onSelectBattle,
  onAddBattleHere,
}: PlanetPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBlurb, setDraftBlurb] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimFaction, setClaimFaction] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);

  const battlesHere = battles.filter((b) => b.locationId === body.id);
  const parent = body.parentId
    ? system.bodies.find((b) => b.id === body.parentId)
    : null;
  const classLabel = body.classification
    ? CLASSIFICATION_INFO[body.classification].label
    : KIND_LABELS[body.kind];

  function startEdit() {
    setDraftName(body.name);
    setDraftBlurb(body.blurb);
    setEditError(null);
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!onSaveBody || !draftName.trim()) return;
    setSaving(true);
    setEditError(null);
    try {
      await onSaveBody(body.id, {
        name: draftName.trim(),
        blurb: draftBlurb.trim(),
      });
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="gothic-panel pointer-events-auto flex max-h-[60vh] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-y-auto rounded p-4 md:max-h-[70vh]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg text-accent">{body.name}</h3>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {classLabel}
            {parent ? ` · orbiting ${parent.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && !editing && (
            <button
              onClick={startEdit}
              title="Amend name and description"
              aria-label="Edit this body"
              className="rounded px-2 py-0.5 text-muted hover:bg-surface-raised hover:text-accent"
            >
              ✎
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="rounded px-2 py-0.5 text-muted hover:bg-surface-raised hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </div>

      {editing ? (
        <form onSubmit={saveEdit} className="mt-3 flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Name
            </span>
            <input
              className="w-full rounded border border-border bg-surface-raised px-2 py-1.5 text-sm"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Description
            </span>
            <textarea
              className="min-h-24 w-full rounded border border-border bg-surface-raised px-2 py-1.5 text-sm"
              value={draftBlurb}
              onChange={(e) => setDraftBlurb(e.target.value)}
            />
          </label>
          {editError && <p className="text-sm text-danger">{editError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !draftName.trim()}
              className="rounded border border-accent-dim bg-accent-dim/20 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-accent hover:bg-accent-dim/40 disabled:opacity-50"
            >
              {saving ? "Inscribing…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <>
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
            <p className="mt-3 text-sm italic text-foreground/90">
              {body.blurb}
            </p>
          )}
        </>
      )}

      {territoryEnabled && !editing && (
        <div className="mt-3 rounded border border-border/70 bg-surface-raised/40 p-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Controlled by
            </span>
            {body.controlledBy ? (
              <span className="flex items-center gap-1.5 text-sm">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ background: factionColor(body.controlledBy) }}
                />
                {body.controlledBy}
              </span>
            ) : (
              <span className="text-sm text-muted">No one — unclaimed</span>
            )}
            <span className="flex-1" />
            {onClaim && !claiming && (
              <button
                onClick={() => {
                  setClaimFaction(body.controlledBy ?? "");
                  setClaimError(null);
                  setClaiming(true);
                }}
                className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-accent"
              >
                Change
              </button>
            )}
          </div>
          {claiming && onClaim && (
            <form
              className="mt-2 flex items-center gap-1"
              onSubmit={async (e) => {
                e.preventDefault();
                setClaimError(null);
                try {
                  await onClaim(body.id, claimFaction.trim());
                  setClaiming(false);
                } catch (err) {
                  setClaimError(
                    err instanceof Error ? err.message : String(err)
                  );
                }
              }}
            >
              <input
                className="flex-1 rounded border border-border bg-surface-raised px-2 py-1 text-sm"
                value={claimFaction}
                onChange={(e) => setClaimFaction(e.target.value)}
                list="known-factions"
                placeholder="Faction (empty = unclaimed)"
                autoFocus
              />
              <datalist id="known-factions">
                {(knownFactions ?? []).map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
              <button
                type="submit"
                className="rounded border border-accent-dim px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-surface-raised"
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => setClaiming(false)}
                className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted"
              >
                ✕
              </button>
            </form>
          )}
          {claimError && (
            <p className="mt-1 text-sm text-danger">{claimError}</p>
          )}
        </div>
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
