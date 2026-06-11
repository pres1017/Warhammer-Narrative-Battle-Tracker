"use client";

import { useState } from "react";
import type { CrusadeForce, CrusadeUnit } from "@/lib/types";
import type { ArmyList } from "@/lib/rosters/types";
import type { PlayerInfo } from "@/lib/api";
import { rankForXp, rankIndex } from "@/lib/crusade";
import { factionColor } from "@/lib/factions";

interface CrusadePanelProps {
  forces: CrusadeForce[];
  units: CrusadeUnit[];
  players: PlayerInfo[];
  armyLists: ArmyList[];
  canEditForce: (force: CrusadeForce) => boolean;
  onAddForce: (input: {
    name: string;
    faction: string;
    notes: string;
  }) => Promise<void>;
  onDeleteForce: (forceId: string) => Promise<void>;
  onAddUnit: (
    forceId: string,
    input: Partial<CrusadeUnit> & { name: string }
  ) => Promise<void>;
  onUpdateUnit: (unitId: string, patch: Partial<CrusadeUnit>) => Promise<void>;
  onDeleteUnit: (unitId: string) => Promise<void>;
  onClose: () => void;
}

const RANK_COLORS = ["#8a8678", "#3f7a3f", "#3a6ea5", "#6d3fa8", "#c9a227"];

const inputCls =
  "rounded border border-border bg-surface-raised px-2 py-1 text-sm";
const chipBtnCls =
  "rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-accent";

function UnitCard({
  unit,
  canEdit,
  onUpdate,
  onDelete,
}: {
  unit: CrusadeUnit;
  canEdit: boolean;
  onUpdate: (patch: Partial<CrusadeUnit>) => void;
  onDelete: () => void;
}) {
  const [adding, setAdding] = useState<"honour" | "scar" | null>(null);
  const [text, setText] = useState("");

  function commitAdd() {
    const value = text.trim();
    if (value && adding) {
      onUpdate(
        adding === "honour"
          ? { honours: [...unit.honours, value] }
          : { scars: [...unit.scars, value] }
      );
    }
    setAdding(null);
    setText("");
  }

  return (
    <div className="rounded border border-border/70 bg-surface-raised/40 p-2">
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-foreground">{unit.name}</span>
        {unit.role && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {unit.role}
          </span>
        )}
        <span className="flex-1" />
        {unit.points !== null && (
          <span className="font-mono text-[11px] text-muted">
            {unit.points} pts
          </span>
        )}
        {canEdit && (
          <button
            onClick={onDelete}
            aria-label={`Remove ${unit.name}`}
            className="px-1 text-muted hover:text-danger"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
          style={{
            color: RANK_COLORS[rankIndex(unit.xp)],
            border: `1px solid ${RANK_COLORS[rankIndex(unit.xp)]}55`,
          }}
        >
          {rankForXp(unit.xp)} · {unit.xp} XP
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {unit.battlesPlayed} battles · {unit.unitsDestroyed} kills
        </span>
        {canEdit && (
          <span className="flex gap-1">
            <button onClick={() => onUpdate({ xp: unit.xp + 1 })} className={chipBtnCls}>
              +1 XP
            </button>
            <button
              onClick={() =>
                onUpdate({ battlesPlayed: unit.battlesPlayed + 1, xp: unit.xp + 1 })
              }
              title="+1 battle played (and +1 XP for taking part)"
              className={chipBtnCls}
            >
              +1 Battle
            </button>
            <button
              onClick={() => onUpdate({ unitsDestroyed: unit.unitsDestroyed + 1 })}
              className={chipBtnCls}
            >
              +1 Kill
            </button>
          </span>
        )}
      </div>

      {(unit.honours.length > 0 || unit.scars.length > 0 || canEdit) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {unit.honours.map((h, i) => (
            <span
              key={`h${i}`}
              className="rounded border border-accent-dim/60 px-1.5 py-0.5 font-mono text-[10px] text-accent"
            >
              ★ {h}
            </span>
          ))}
          {unit.scars.map((s, i) => (
            <span
              key={`s${i}`}
              className="rounded border border-danger/50 px-1.5 py-0.5 font-mono text-[10px] text-danger"
            >
              ✖ {s}
            </span>
          ))}
          {canEdit && adding === null && (
            <>
              <button onClick={() => setAdding("honour")} className={chipBtnCls}>
                + Honour
              </button>
              <button onClick={() => setAdding("scar")} className={chipBtnCls}>
                + Scar
              </button>
            </>
          )}
          {adding !== null && (
            <span className="flex items-center gap-1">
              <input
                className={`${inputCls} w-44 py-0.5 text-xs`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitAdd();
                  }
                  if (e.key === "Escape") setAdding(null);
                }}
                placeholder={adding === "honour" ? "Battle honour…" : "Battle scar…"}
                autoFocus
              />
              <button onClick={commitAdd} className={chipBtnCls}>
                Add
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AddUnitRow({
  forceId,
  armyLists,
  onAddUnit,
}: {
  forceId: string;
  armyLists: ArmyList[];
  onAddUnit: CrusadePanelProps["onAddUnit"];
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [points, setPoints] = useState("");
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onAddUnit(forceId, {
      name: name.trim(),
      role: role.trim(),
      points: points === "" ? null : Number(points),
    });
    setName("");
    setRole("");
    setPoints("");
  }

  async function importList(list: ArmyList) {
    setBusy(true);
    try {
      for (const u of list.roster.units) {
        await onAddUnit(forceId, {
          name: u.name,
          role: u.modelCount > 1 ? `${u.modelCount} models` : "",
          points: u.points,
        });
      }
    } finally {
      setBusy(false);
      setImporting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <form onSubmit={add} className="flex flex-wrap items-center gap-1">
        <input
          className={`${inputCls} min-w-[8rem] flex-1`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add unit…"
        />
        <input
          className={`${inputCls} w-24`}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
        />
        <input
          className={`${inputCls} w-16`}
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="Pts"
        />
        <button type="submit" disabled={!name.trim()} className={chipBtnCls}>
          Add
        </button>
      </form>
      {armyLists.length > 0 && !importing && (
        <button
          onClick={() => setImporting(true)}
          className="self-start font-mono text-[10px] uppercase tracking-wider text-muted underline-offset-2 hover:text-accent hover:underline"
        >
          ⬆ Import units from an attached army list
        </button>
      )}
      {importing && (
        <div className="flex flex-wrap items-center gap-1">
          {armyLists.map((list) => (
            <button
              key={list.id}
              onClick={() => void importList(list)}
              disabled={busy}
              className={chipBtnCls}
            >
              {list.roster.faction || list.sourceFilename} (
              {list.roster.units.length} units)
            </button>
          ))}
          <button onClick={() => setImporting(false)} className={chipBtnCls}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function CrusadePanel({
  forces,
  units,
  players,
  armyLists,
  canEditForce,
  onAddForce,
  onDeleteForce,
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
  onClose,
}: CrusadePanelProps) {
  const [founding, setFounding] = useState(false);
  const [forceName, setForceName] = useState("");
  const [forceFaction, setForceFaction] = useState("");
  const [error, setError] = useState<string | null>(null);

  const playerName = (id: string | null) =>
    id === null
      ? "You"
      : players.find((p) => p.id === id)?.displayName ?? "Departed Commander";

  async function found(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onAddForce({
        name: forceName.trim(),
        faction: forceFaction.trim(),
        notes: "",
      });
      setFounding(false);
      setForceName("");
      setForceFaction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="gothic-panel flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg text-accent">Crusade Forces</h3>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Orders of battle endure between engagements
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close crusade panel"
          className="rounded px-2 py-0.5 text-muted hover:bg-surface-raised hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {forces.length === 0 && !founding && (
        <p className="text-sm text-muted">
          No crusade forces founded yet. Every legend begins with a muster.
        </p>
      )}

      {forces.map((force) => {
        const forceUnits = units
          .filter((u) => u.forceId === force.id)
          .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
        const editable = canEditForce(force);
        const totalPoints = forceUnits.reduce(
          (sum, u) => sum + (u.points ?? 0),
          0
        );
        return (
          <section
            key={force.id}
            className="rounded border border-border bg-surface/60 p-3"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {force.faction && (
                <span
                  className="inline-block h-3 w-3 shrink-0 self-center rounded-sm"
                  style={{ background: factionColor(force.faction) }}
                />
              )}
              <h4 className="text-base text-foreground">{force.name}</h4>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                {force.faction && `${force.faction} · `}
                {playerName(force.playerId)} · {forceUnits.length} units ·{" "}
                {totalPoints} pts
              </span>
              <span className="flex-1" />
              {editable && (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Disband ${force.name}? Its units and their histories are lost.`
                      )
                    ) {
                      void onDeleteForce(force.id);
                    }
                  }}
                  className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-danger"
                >
                  Disband
                </button>
              )}
            </div>
            <div className="mt-2 space-y-1.5">
              {forceUnits.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  canEdit={editable}
                  onUpdate={(patch) => void onUpdateUnit(unit.id, patch)}
                  onDelete={() => void onDeleteUnit(unit.id)}
                />
              ))}
            </div>
            {editable && (
              <AddUnitRow
                forceId={force.id}
                armyLists={armyLists}
                onAddUnit={onAddUnit}
              />
            )}
          </section>
        );
      })}

      {founding ? (
        <form
          onSubmit={found}
          className="flex flex-col gap-2 rounded border border-accent-dim/50 p-3"
        >
          <div className="flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              value={forceName}
              onChange={(e) => setForceName(e.target.value)}
              placeholder="Force name — e.g. The Vorlag Penitents"
              required
              autoFocus
            />
            <input
              className={`${inputCls} w-40`}
              value={forceFaction}
              onChange={(e) => setForceFaction(e.target.value)}
              placeholder="Faction"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFounding(false)}
              className={chipBtnCls}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!forceName.trim()}
              className="rounded border border-accent-dim bg-accent-dim/20 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-accent hover:bg-accent-dim/40 disabled:opacity-50"
            >
              Found Force
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setFounding(true)}
          className="self-start rounded border border-accent-dim px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-accent hover:bg-surface-raised"
        >
          + Found a Crusade Force
        </button>
      )}
    </div>
  );
}
