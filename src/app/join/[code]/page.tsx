"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureSession, isSupabaseConfigured } from "@/lib/supabase";
import { joinCampaign } from "@/lib/api";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const campaign = await joinCampaign(code, displayName);
      router.push(`/c/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">Cloud campaigns are not configured.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          ++ A summons has reached you ++
        </p>
        <h1 className="mt-2 text-3xl text-accent">Answer the Call</h1>
        <p className="mt-2 font-mono text-sm tracking-[0.3em] text-muted">
          CODE {code.toUpperCase()}
        </p>
      </div>
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-3 rounded border border-border bg-surface p-5"
      >
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Your Name
          </span>
          <input
            className="w-full rounded border border-border bg-surface-raised px-3 py-2 text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How the chronicles will know you"
            required
            autoFocus
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded border border-accent-dim bg-accent-dim/20 px-4 py-2 font-display text-accent hover:bg-accent-dim/40 disabled:opacity-50"
        >
          {busy ? "Transmitting…" : "Join Campaign"}
        </button>
      </form>
    </main>
  );
}
