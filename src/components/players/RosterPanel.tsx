"use client";

import { useState } from "react";
import type { PlayerInfo, Role } from "@/lib/api";

interface RosterPanelProps {
  players: PlayerInfo[];
  myPlayerId: string | null;
  isAdmin: boolean;
  isMod: boolean;
  inviteCode: string | null;
  onSetRole: (playerId: string, role: Role) => void;
  onRemove: (playerId: string) => void;
  onClose: () => void;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Warmaster",
  moderator: "Lieutenant",
  member: "Commander",
};

export function RosterPanel({
  players,
  myPlayerId,
  isAdmin,
  isMod,
  inviteCode,
  onSetRole,
  onRemove,
  onClose,
}: RosterPanelProps) {
  const [copied, setCopied] = useState(false);

  async function copyInvite() {
    if (!inviteCode) return;
    const url = `${window.location.origin}/join/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="gothic-panel flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded p-5">
      <div className="flex items-start justify-between">
        <h3 className="text-lg text-accent">Muster Roll</h3>
        <button
          onClick={onClose}
          aria-label="Close roster"
          className="rounded px-2 py-0.5 text-muted hover:bg-surface-raised hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {inviteCode && (
        <div className="flex items-center justify-between rounded border border-border bg-surface-raised px-3 py-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Invite Code
            </p>
            <p className="font-mono text-lg tracking-[0.3em] text-accent">
              {inviteCode}
            </p>
          </div>
          <button
            onClick={() => void copyInvite()}
            className="rounded border border-accent-dim px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-surface"
          >
            {copied ? "Copied ✓" : "Copy Link"}
          </button>
        </div>
      )}

      <ul className="space-y-1">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded border border-border/60 px-3 py-2"
          >
            <div>
              <span className="text-sm">
                {p.displayName}
                {p.id === myPlayerId && (
                  <span className="ml-1 text-muted">(you)</span>
                )}
              </span>
              <span
                className={`ml-2 font-mono text-[10px] uppercase tracking-wider ${
                  p.role === "admin"
                    ? "text-accent"
                    : p.role === "moderator"
                      ? "text-eldritch"
                      : "text-muted"
                }`}
              >
                {ROLE_LABELS[p.role]}
              </span>
            </div>
            <div className="flex gap-1">
              {isAdmin && p.id !== myPlayerId && p.role !== "admin" && (
                <button
                  onClick={() =>
                    onSetRole(
                      p.id,
                      p.role === "moderator" ? "member" : "moderator"
                    )
                  }
                  className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-accent"
                >
                  {p.role === "moderator" ? "Demote" : "Promote"}
                </button>
              )}
              {isMod && p.id !== myPlayerId && p.role !== "admin" && (
                <button
                  onClick={() => {
                    if (
                      window.confirm(`Remove ${p.displayName} from the campaign?`)
                    ) {
                      onRemove(p.id);
                    }
                  }}
                  className="rounded border border-danger/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-danger/80 hover:text-danger"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
