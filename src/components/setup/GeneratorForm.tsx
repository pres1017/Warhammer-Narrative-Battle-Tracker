"use client";

import type { GeneratorParams, StarType } from "@/lib/types";
import { STAR_VISUALS } from "@/lib/generator/tables";

interface GeneratorFormProps {
  params: GeneratorParams;
  seed: string;
  onParamsChange: (params: GeneratorParams) => void;
  onSeedChange: (seed: string) => void;
  onReroll: () => void;
  onLockIn: () => void;
  locking?: boolean;
}

const DANGER_LABELS = ["", "Backwater", "Contested", "Embattled", "Warzone", "Apocalyptic"];
const STORM_LABELS = ["None", "Squalls", "Raging", "Engulfing"];

export function GeneratorForm({
  params,
  seed,
  onParamsChange,
  onSeedChange,
  onReroll,
  onLockIn,
  locking,
}: GeneratorFormProps) {
  const set = (patch: Partial<GeneratorParams>) =>
    onParamsChange({ ...params, ...patch });

  return (
    <div className="flex w-full flex-col gap-5 rounded border border-border bg-surface p-5">
      <div>
        <h2 className="text-xl text-accent">System Genesis</h2>
        <p className="mt-1 text-sm text-muted">
          Tune the auguries, re-roll until the omens please you, then lock the
          system in. Locking is permanent.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          Planets · {params.planetCountMin}–{params.planetCountMax}
        </span>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={12}
            value={params.planetCountMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              set({
                planetCountMin: v,
                planetCountMax: Math.max(v, params.planetCountMax),
              });
            }}
            className="flex-1 accent-[var(--accent)]"
          />
          <input
            type="range"
            min={1}
            max={12}
            value={params.planetCountMax}
            onChange={(e) => {
              const v = Number(e.target.value);
              set({
                planetCountMax: v,
                planetCountMin: Math.min(v, params.planetCountMin),
              });
            }}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          Star Type
        </span>
        <select
          value={params.starType}
          onChange={(e) => set({ starType: e.target.value as StarType })}
          className="rounded border border-border bg-surface-raised px-3 py-2 text-sm"
        >
          {(Object.keys(STAR_VISUALS) as StarType[]).map((type) => (
            <option key={type} value={type}>
              {STAR_VISUALS[type].label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          Danger Level · {DANGER_LABELS[params.dangerLevel]}
        </span>
        <input
          type="range"
          min={1}
          max={5}
          value={params.dangerLevel}
          onChange={(e) => set({ dangerLevel: Number(e.target.value) })}
          className="accent-[var(--danger)]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          Warp Storms · {STORM_LABELS[params.warpStorms]}
        </span>
        <input
          type="range"
          min={0}
          max={3}
          value={params.warpStorms}
          onChange={(e) => set({ warpStorms: Number(e.target.value) })}
          className="accent-[var(--eldritch)]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          Seed
        </span>
        <input
          type="text"
          value={seed}
          onChange={(e) => onSeedChange(e.target.value)}
          spellCheck={false}
          className="rounded border border-border bg-surface-raised px-3 py-2 font-mono text-sm tracking-widest"
        />
      </label>

      <div className="flex gap-3">
        <button
          onClick={onReroll}
          className="flex-1 rounded border border-border bg-surface-raised px-4 py-2 font-display text-foreground transition-colors hover:border-accent-dim hover:text-accent"
        >
          Re-roll Omens
        </button>
        <button
          onClick={onLockIn}
          disabled={locking}
          className="flex-1 rounded border border-accent-dim bg-accent-dim/20 px-4 py-2 font-display text-accent transition-colors hover:bg-accent-dim/40 disabled:opacity-50"
        >
          {locking ? "Inscribing…" : "Lock In System"}
        </button>
      </div>
    </div>
  );
}
