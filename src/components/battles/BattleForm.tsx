"use client";

import { useState } from "react";
import type { Battle, Participant, ScoreMode, StarSystem } from "@/lib/types";
import type {
  BattleInput,
  ImportMap,
  PendingImport,
} from "@/hooks/useLocalCampaign";
import type { ArmyList } from "@/lib/rosters/types";
import { ArmyImport } from "./ArmyImport";
import { RosterView } from "./RosterView";

/** Territory claim resolved from the battle's victor on save. */
export interface BattleClaim {
  bodyId: string;
  faction: string;
}

interface BattleFormProps {
  system: StarSystem;
  /** Existing battle when editing; null when creating. */
  battle: Battle | null;
  /** Already-saved army lists, to show existing attachments while editing. */
  armyLists: ArmyList[];
  /** Pre-selected location (e.g. "add battle here" from the map). */
  initialLocationId?: string | null;
  /** Offers a "claim this world" checkbox when the campaign has territory. */
  territoryEnabled?: boolean;
  onSave: (
    input: BattleInput,
    imports: ImportMap,
    claim: BattleClaim | null
  ) => void;
  onCancel: () => void;
}

/** "Chaos - Death Guard" → "Death Guard" for the faction autofill. */
function shortFaction(catalogueName: string): string {
  const parts = catalogueName.split(" - ");
  return parts[parts.length - 1].trim();
}

function emptyParticipant(): Participant {
  return {
    key: crypto.randomUUID(),
    playerName: "",
    faction: "",
    points: null,
    armyListId: null,
  };
}

export function BattleForm({
  system,
  battle,
  armyLists,
  initialLocationId,
  territoryEnabled,
  onSave,
  onCancel,
}: BattleFormProps) {
  const [title, setTitle] = useState(battle?.title ?? "");
  const [mission, setMission] = useState(battle?.mission ?? "");
  const [foughtAt, setFoughtAt] = useState(battle?.foughtAt ?? "");
  const [winner, setWinner] = useState(battle?.winner ?? "");
  const [locationId, setLocationId] = useState<string>(
    battle?.locationId ?? initialLocationId ?? ""
  );
  const [notes, setNotes] = useState(battle?.notes ?? "");
  const [participants, setParticipants] = useState<Participant[]>(
    battle?.participants?.length
      ? battle.participants
      : [emptyParticipant(), emptyParticipant()]
  );
  const [scoreMode, setScoreMode] = useState<ScoreMode>(
    battle?.scoreMode ?? "simple"
  );
  const [claimForVictor, setClaimForVictor] = useState(true);
  const [imports, setImports] = useState<ImportMap>({});

  const namedBodies = system.bodies.filter((b) => b.kind !== "moon");

  function setParticipant(key: string, patch: Partial<Participant>) {
    setParticipants((list) =>
      list.map((p) => (p.key === key ? { ...p, ...patch } : p))
    );
  }

  function attachedFilename(p: Participant): string | null {
    const pending = imports[p.key];
    if (pending) return pending.sourceFilename;
    if (p.armyListId) {
      return (
        armyLists.find((l) => l.id === p.armyListId)?.sourceFilename ?? null
      );
    }
    return null;
  }

  function importArmy(p: Participant, pending: PendingImport) {
    setImports((m) => ({ ...m, [p.key]: pending }));
    // Auto-fill faction and points from the parsed list (still editable).
    setParticipant(p.key, {
      faction: p.faction.trim() || shortFaction(pending.roster.faction),
      points: p.points ?? pending.roster.totalPoints,
    });
  }

  /** The faction the victor fought for, best-effort from the winner text. */
  function victorFaction(kept: Participant[]): string {
    const w = winner.trim().toLowerCase();
    if (!w) return "";
    const byPlayer = kept.find(
      (p) => p.playerName.trim().toLowerCase() === w && p.playerName.trim()
    );
    if (byPlayer?.faction.trim()) return byPlayer.faction.trim();
    const byFaction = kept.find(
      (p) => p.faction.trim().toLowerCase() === w && p.faction.trim()
    );
    if (byFaction) return byFaction.faction.trim();
    return winner.trim();
  }

  const canClaim = Boolean(territoryEnabled && locationId && winner.trim());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const kept = participants.filter(
      (p) => p.playerName.trim() || p.faction.trim()
    );
    const keptImports: ImportMap = {};
    for (const p of kept) {
      if (imports[p.key]) keptImports[p.key] = imports[p.key];
    }
    const claim =
      canClaim && claimForVictor
        ? { bodyId: locationId, faction: victorFaction(kept) }
        : null;
    onSave(
      {
        title: title.trim(),
        mission: mission.trim(),
        foughtAt: foughtAt || null,
        winner: winner.trim(),
        locationId: locationId || null,
        notes: notes.trim(),
        participants: kept,
        scoreMode,
      },
      keptImports,
      claim
    );
  }

  const inputCls =
    "rounded border border-border bg-surface-raised px-2 py-1.5 text-sm w-full";
  const labelCls =
    "font-mono text-[10px] uppercase tracking-widest text-muted";

  return (
    <form
      onSubmit={submit}
      className="gothic-panel flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded p-5"
    >
      <h3 className="text-lg text-accent">
        {battle ? "Amend Battle Record" : "Record a Battle"}
      </h3>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Title</span>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The Siege of Vorlag Tertius"
          autoFocus
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Mission / Objective</span>
          <input
            className={inputCls}
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="Take and Hold"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Date Fought</span>
          <input
            type="date"
            className={inputCls}
            value={foughtAt ?? ""}
            onChange={(e) => setFoughtAt(e.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Location</span>
        <select
          className={inputCls}
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">— Deep space / unspecified —</option>
          {namedBodies.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={labelCls}>Combatants</span>
          <button
            type="button"
            onClick={() =>
              setParticipants((list) => [...list, emptyParticipant()])
            }
            className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-accent"
          >
            + Add
          </button>
        </div>
        {participants.map((p, i) => (
          <div key={p.key} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                className={inputCls}
                value={p.playerName}
                onChange={(e) =>
                  setParticipant(p.key, { playerName: e.target.value })
                }
                placeholder={`Player ${i + 1}`}
              />
              <input
                className={inputCls}
                value={p.faction}
                onChange={(e) =>
                  setParticipant(p.key, { faction: e.target.value })
                }
                placeholder="Faction"
              />
              <input
                className={`${inputCls} w-24`}
                type="number"
                value={p.points ?? ""}
                onChange={(e) =>
                  setParticipant(p.key, {
                    points:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="Pts"
              />
              <ArmyImport
                attachedFilename={attachedFilename(p)}
                onImport={(pending) => importArmy(p, pending)}
              />
              <button
                type="button"
                aria-label="Remove combatant"
                onClick={() =>
                  setParticipants((list) => list.filter((x) => x.key !== p.key))
                }
                className="px-1 text-muted hover:text-danger"
              >
                ✕
              </button>
            </div>
            {imports[p.key] && <RosterView roster={imports[p.key].roster} />}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded border border-border/60 bg-surface-raised/40 p-3">
        <div className="flex items-center justify-between">
          <span className={labelCls}>Final Score</span>
          <div className="flex overflow-hidden rounded border border-border">
            <button
              type="button"
              onClick={() => setScoreMode("simple")}
              className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                scoreMode === "simple"
                  ? "bg-accent-dim/30 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setScoreMode("detailed")}
              className={`border-l border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                scoreMode === "detailed"
                  ? "bg-accent-dim/30 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Primary + Secondary
            </button>
          </div>
        </div>
        {participants.map((p, i) => {
          const name =
            p.playerName.trim() || p.faction.trim() || `Player ${i + 1}`;
          return scoreMode === "simple" ? (
            <div key={p.key} className="flex items-center gap-2">
              <span className="flex-1 truncate text-sm text-foreground/90">
                {name}
              </span>
              <input
                className={`${inputCls} w-24`}
                type="number"
                min={0}
                value={p.vp ?? ""}
                onChange={(e) =>
                  setParticipant(p.key, {
                    vp: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="VP"
              />
            </div>
          ) : (
            <div key={p.key} className="flex items-center gap-2">
              <span className="flex-1 truncate text-sm text-foreground/90">
                {name}
              </span>
              <input
                className={`${inputCls} w-24`}
                type="number"
                min={0}
                value={p.vpPrimary ?? ""}
                onChange={(e) =>
                  setParticipant(p.key, {
                    vpPrimary:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="Primary"
              />
              <input
                className={`${inputCls} w-24`}
                type="number"
                min={0}
                value={p.vpSecondary ?? ""}
                onChange={(e) =>
                  setParticipant(p.key, {
                    vpSecondary:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="Secondary"
              />
              <span className="w-10 text-right font-mono text-xs text-muted">
                {p.vpPrimary == null && p.vpSecondary == null
                  ? "—"
                  : (p.vpPrimary ?? 0) + (p.vpSecondary ?? 0)}
              </span>
            </div>
          );
        })}
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Victor</span>
        <input
          className={inputCls}
          value={winner}
          onChange={(e) => setWinner(e.target.value)}
          placeholder="Faction or player who carried the day"
        />
      </label>

      {canClaim && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={claimForVictor}
            onChange={(e) => setClaimForVictor(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          <span>
            Claim{" "}
            <span className="text-accent">
              {namedBodies.find((b) => b.id === locationId)?.name ?? "this world"}
            </span>{" "}
            for the victor
          </span>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Narrative Notes</span>
        <textarea
          className={`${inputCls} min-h-24`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How the battle unfolded, heroics, grudges sworn…"
        />
      </label>

      <div className="mt-1 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border px-4 py-2 font-display text-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded border border-accent-dim bg-accent-dim/20 px-4 py-2 font-display text-accent hover:bg-accent-dim/40"
        >
          {battle ? "Save Changes" : "Inscribe Battle"}
        </button>
      </div>
    </form>
  );
}
