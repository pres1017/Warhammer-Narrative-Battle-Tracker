"use client";

import { useState } from "react";
import type { CampaignSettings } from "@/lib/types";

interface CampaignSettingsPanelProps {
  settings: CampaignSettings;
  onSave: (settings: CampaignSettings) => Promise<void>;
  onClose: () => void;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded border border-border bg-surface-raised/50 p-3">
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-border transition-colors peer-checked:bg-accent-dim" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-muted transition-transform peer-checked:translate-x-4 peer-checked:bg-accent" />
      </span>
    </label>
  );
}

/**
 * Admin-only feature toggles. Changes are held as a draft and applied only
 * when the admin explicitly clicks Save.
 */
export function CampaignSettingsPanel({
  settings,
  onSave,
  onClose,
}: CampaignSettingsPanelProps) {
  const [draft, setDraft] = useState<CampaignSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    draft.territoryEnabled !== settings.territoryEnabled ||
    draft.crusadeEnabled !== settings.crusadeEnabled;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="gothic-panel flex w-full max-w-md flex-col gap-3 rounded p-5">
      <div className="flex items-start justify-between">
        <h3 className="text-lg text-accent">Campaign Edicts</h3>
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="rounded px-2 py-0.5 text-muted hover:bg-surface-raised hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Changes take effect only when saved
      </p>

      <Toggle
        label="Territory Control"
        description="Factions hold worlds. Battles can claim planets for the victor; the map shows control rings and the Ledger tallies holdings."
        checked={draft.territoryEnabled}
        onChange={(v) => setDraft((d) => ({ ...d, territoryEnabled: v }))}
      />
      <Toggle
        label="Crusade Tracking"
        description="Each player keeps a persistent Order of Battle: units gain XP, ranks, battle honours, and scars between games."
        checked={draft.crusadeEnabled}
        onChange={(v) => setDraft((d) => ({ ...d, crusadeEnabled: v }))}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="mt-1 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded border border-border px-4 py-2 font-display text-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={() => void save()}
          disabled={saving || !dirty}
          className="rounded border border-accent-dim bg-accent-dim/20 px-4 py-2 font-display text-accent hover:bg-accent-dim/40 disabled:opacity-50"
        >
          {saving ? "Inscribing…" : "Save"}
        </button>
      </div>
    </div>
  );
}
