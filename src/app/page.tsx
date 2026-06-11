"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, ensureSession } from "@/lib/supabase";
import { createCampaign, joinCampaign } from "@/lib/api";
import { rngFromSeed } from "@/lib/generator/prng";

type Panel = "none" | "create" | "join";

/** Seeded (hydration-safe) twinkling backdrop for the landing page. */
function HeroStars() {
  const stars = useMemo(() => {
    const rng = rngFromSeed("landing-hero");
    return Array.from({ length: 160 }, () => ({
      x: rng() * 100,
      y: rng() * 100,
      r: rng() * 1.4 + 0.3,
      delay: rng() * 5,
      duration: 2.5 + rng() * 4,
      opacity: 0.25 + rng() * 0.6,
      color: ["#cfd4e8", "#ffd9a0", "#a8c4ff"][Math.floor(rng() * 3)],
    }));
  }, []);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill={s.color}
          opacity={s.opacity}
          className="animate-twinkle"
          style={{
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("none");
  const [campaignName, setCampaignName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const campaign = await createCampaign(
        campaignName,
        displayName,
        password
      );
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
      const campaign = await joinCampaign(inviteCode, displayName, password);
      router.push(`/c/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const inputCls =
    "rounded border border-border bg-surface-raised px-3 py-2 text-sm w-full focus:border-accent-dim focus:outline-none transition-colors";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-muted";

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-10 overflow-hidden p-8">
      <HeroStars />

      <div className="relative text-center">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-muted">
          ✠ Administratum Cartographae ✠
        </p>
        <h1 className="mt-4 bg-gradient-to-b from-[#f0d977] via-accent to-[#8a6d1a] bg-clip-text text-4xl font-bold text-transparent drop-shadow-[0_0_30px_rgba(201,162,39,0.25)] sm:text-6xl">
          Warhammer Battle Mapper
        </h1>
        <div
          aria-hidden
          className="mx-auto mt-5 flex max-w-md items-center gap-3 text-accent-dim"
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent-dim" />
          <span className="font-mono text-xs">⚜</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent-dim" />
        </div>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Generate a contested star system, gather your players, and chronicle
          every battle fought across it.
        </p>
      </div>

      {panel === "none" && (
        <div className="relative flex flex-col items-center gap-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() =>
                isSupabaseConfigured
                  ? setPanel("create")
                  : router.push("/c/local/setup")
              }
              className="rounded border border-accent-dim bg-gradient-to-b from-surface-raised to-surface px-7 py-3.5 text-center font-display text-accent shadow-[0_0_20px_rgba(201,162,39,0.12)] transition-all hover:border-accent hover:shadow-[0_0_32px_rgba(201,162,39,0.25)]"
            >
              Forge a New Campaign
            </button>
            <button
              onClick={() => setPanel("join")}
              disabled={!isSupabaseConfigured}
              className="rounded border border-border bg-gradient-to-b from-surface-raised to-surface px-7 py-3.5 text-center font-display text-foreground transition-all hover:border-accent-dim disabled:cursor-not-allowed disabled:text-muted"
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
            className="font-mono text-[11px] uppercase tracking-widest text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            Or play offline on this device only
          </Link>
        </div>
      )}

      {panel !== "none" && (
        <form
          onSubmit={panel === "create" ? submitCreate : submitJoin}
          className="gothic-panel relative flex w-full max-w-sm flex-col gap-3 rounded p-5"
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
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Password · Optional</span>
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Protects your name in this campaign"
            />
            <span className="text-[11px] leading-snug text-muted">
              Set one and only you can sign in under this name. If the name is
              already protected, enter its password.
            </span>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setPanel("none");
                setError(null);
              }}
              className="rounded border border-border px-4 py-2 font-display text-muted transition-colors hover:text-foreground"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded border border-accent-dim bg-accent-dim/20 px-4 py-2 font-display text-accent transition-all hover:bg-accent-dim/40 disabled:opacity-50"
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
