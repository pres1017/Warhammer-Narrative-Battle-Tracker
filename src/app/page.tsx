"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, ensureSession } from "@/lib/supabase";
import { createCampaign, joinCampaign } from "@/lib/api";

type Panel = "none" | "create" | "join";

export default function Home() {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("none");
  const [campaignName, setCampaignName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const campaign = await createCampaign(campaignName, displayName);
      router.push(`/c/${campaign.id}/setup`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function submitJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const campaign = await joinCampaign(inviteCode, displayName);
      router.push(`/c/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const inputCls =
    "rounded border border-border bg-surface-raised px-3 py-2 text-sm w-full";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-muted";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          ++ Administratum Cartographae ++
        </p>
        <h1 className="mt-3 text-4xl font-bold text-accent sm:text-5xl">
          Warhammer Battle Mapper
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Generate a contested star system, gather your players, and chronicle
          every battle fought across it.
        </p>
      </div>

      {panel === "none" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() =>
                isSupabaseConfigured
                  ? setPanel("create")
                  : router.push("/c/local/setup")
              }
              className="rounded border border-accent-dim bg-surface px-6 py-3 text-center font-display text-accent transition-colors hover:bg-surface-raised"
            >
              Forge a New Campaign
            </button>
            <button
              onClick={() => setPanel("join")}
              disabled={!isSupabaseConfigured}
              className="rounded border border-border bg-surface px-6 py-3 text-center font-display text-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:text-muted"
              title={
                isSupabaseConfigured
                  ? undefined
                  : "Cloud campaigns are not configured"
              }
            >
              Join with Invite Code
            </button>
          </div>
          <Link
            href="/c/local/setup"
            className="font-mono text-[11px] uppercase tracking-widest text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            Or play offline on this device only
          </Link>
        </div>
      )}

      {panel !== "none" && (
        <form
          onSubmit={panel === "create" ? submitCreate : submitJoin}
          className="flex w-full max-w-sm flex-col gap-3 rounded border border-border bg-surface p-5"
        >
          <h2 className="text-lg text-accent">
            {panel === "create" ? "Forge a New Campaign" : "Answer the Call"}
          </h2>
          {panel === "create" ? (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Campaign Name</span>
              <input
                className={inputCls}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="The Vorlag Crusade"
                required
                autoFocus
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Invite Code</span>
              <input
                className={`${inputCls} font-mono uppercase tracking-[0.3em]`}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                required
                autoFocus
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Your Name</span>
            <input
              className={inputCls}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How the chronicles will know you"
              required
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setPanel("none");
                setError(null);
              }}
              className="rounded border border-border px-4 py-2 font-display text-muted hover:text-foreground"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded border border-accent-dim bg-accent-dim/20 px-4 py-2 font-display text-accent hover:bg-accent-dim/40 disabled:opacity-50"
            >
              {busy
                ? "Transmitting…"
                : panel === "create"
                  ? "Create Campaign"
                  : "Join Campaign"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
