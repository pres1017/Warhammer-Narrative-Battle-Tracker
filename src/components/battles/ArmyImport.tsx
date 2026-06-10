"use client";

import { useRef, useState } from "react";
import { parseRosterFile } from "@/lib/rosters/parse";
import { bytesToBase64 } from "@/lib/rosters/file";
import type { PendingImport } from "@/hooks/useLocalCampaign";

interface ArmyImportProps {
  /** Name of the currently attached file, if any. */
  attachedFilename: string | null;
  onImport: (pending: PendingImport) => void;
}

/** File-picker button that parses .json/.ros/.rosz army exports. */
export function ArmyImport({ attachedFilename, onImport }: ArmyImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    const data = new Uint8Array(await file.arrayBuffer());
    const { format, roster } = parseRosterFile(file.name, data);
    if (roster.units.length === 0) {
      setError(roster.warnings[0] ?? "Could not read any units from the file.");
      return;
    }
    setError(null);
    onImport({
      format,
      sourceFilename: file.name,
      roster,
      rawBase64: bytesToBase64(data),
    });
  }

  return (
    <div className="flex flex-col">
      <input
        ref={inputRef}
        type="file"
        accept=".json,.ros,.rosz"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Import army list (.json, .ros, .rosz)"
        className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
          attachedFilename
            ? "border-accent-dim text-accent"
            : "border-border text-muted hover:text-accent"
        }`}
      >
        {attachedFilename ? "⚙ List ✓" : "⚙ List"}
      </button>
      {error && <p className="mt-0.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
