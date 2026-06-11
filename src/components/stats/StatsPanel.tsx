"use client";

import { useMemo, useState } from "react";
import type { Battle, Body } from "@/lib/types";
import { computeStats, type CombatantStats } from "@/lib/stats";
import { factionColor } from "@/lib/factions";

interface StatsPanelProps {
  battles: Battle[];
  bodies: Body[];
  territoryEnabled: boolean;
  onClose: () => void;
}

function StatsTable({ rows }: { rows: CombatantStats[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted">
        No battles recorded yet — the ledger awaits.
      </p>
    );
  }
  const maxPoints = Math.max(...rows.map((r) => r.campaignPoints), 1);
  return (
    <table className="mt-1 w-full text-sm">
      <thead>
        <tr className="font-mono text-[10px] uppercase tracking-wider text-muted">
          <th className="py-1 pr-2 text-left font-normal">Name</th>
          <th className="px-1 text-right font-normal">G</th>
          <th className="px-1 text-right font-normal">W</th>
          <th className="px-1 text-right font-normal">L</th>
          <th className="px-1 text-right font-normal">VP±</th>
          <th className="px-1 text-right font-normal">Pts</th>
          <th className="w-1/4 pl-2 font-normal" aria-hidden />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-t border-border/60">
            <td className="py-1 pr-2">{r.name}</td>
            <td className="px-1 text-right font-mono text-muted">{r.games}</td>
            <td className="px-1 text-right font-mono text-accent">{r.wins}</td>
            <td className="px-1 text-right font-mono text-muted">{r.losses}</td>
            <td className="px-1 text-right font-mono text-muted">
              {r.scoredGames > 0
                ? `${r.vpFor - r.vpAgainst >= 0 ? "+" : ""}${r.vpFor - r.vpAgainst}`
                : "—"}
            </td>
            <td className="px-1 text-right font-mono text-foreground">
              {r.campaignPoints}
            </td>
            <td className="pl-2">
              <div
                className="h-2 rounded-sm bg-accent-dim/70"
                style={{ width: `${(r.campaignPoints / maxPoints) * 100}%` }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StatsPanel({
  battles,
  bodies,
  territoryEnabled,
  onClose,
}: StatsPanelProps) {
  const [tab, setTab] = useState<"players" | "factions">("players");
  const stats = useMemo(() => computeStats(battles, bodies), [battles, bodies]);

  return (
    <div className="gothic-panel flex max-h-[85vh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg text-accent">Campaign Ledger</h3>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {stats.totalBattles} battle{stats.totalBattles === 1 ? "" : "s"}{" "}
            chronicled · 3 pts per victory
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close ledger"
          className="rounded px-2 py-0.5 text-muted hover:bg-surface-raised hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="flex overflow-hidden rounded border border-border self-start">
        <button
          onClick={() => setTab("players")}
          className={`px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
            tab === "players"
              ? "bg-accent-dim/30 text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Players
        </button>
        <button
          onClick={() => setTab("factions")}
          className={`border-l border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
            tab === "factions"
              ? "bg-accent-dim/30 text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Factions
        </button>
      </div>

      <StatsTable rows={tab === "players" ? stats.byPlayer : stats.byFaction} />

      {territoryEnabled && (
        <div className="border-t border-border pt-3">
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted">
            Worlds Held
          </h4>
          {stats.holdings.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No world has yet been claimed.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {stats.holdings.map((h) => (
                <li key={h.faction} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ background: factionColor(h.faction) }}
                  />
                  <span className="flex-1">{h.faction}</span>
                  <span className="font-mono text-muted">
                    {h.worlds} world{h.worlds === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {stats.contested.length > 0 && (
        <div className="border-t border-border pt-3">
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted">
            Most Contested Worlds
          </h4>
          <ul className="mt-2 space-y-1">
            {stats.contested.slice(0, 8).map((w) => (
              <li key={w.bodyId} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{w.name}</span>
                {territoryEnabled && w.controlledBy && (
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider"
                    style={{ color: factionColor(w.controlledBy) }}
                  >
                    {w.controlledBy}
                  </span>
                )}
                <span className="font-mono text-muted">
                  {w.battles} battle{w.battles === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
