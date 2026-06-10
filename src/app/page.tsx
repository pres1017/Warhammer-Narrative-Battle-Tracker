import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          ++ Administratum Cartographae ++
        </p>
        <h1 className="mt-3 text-4xl font-bold text-accent sm:text-5xl">
          Warhammer Battle Mapper
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Generate a contested star system, gather your players, and chronicle
          every battle fought across it.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/c/local/setup"
          className="rounded border border-accent-dim bg-surface px-6 py-3 text-center font-display text-accent transition-colors hover:bg-surface-raised"
        >
          Forge a New Campaign
        </Link>
        <span
          className="cursor-not-allowed rounded border border-border bg-surface px-6 py-3 text-center font-display text-muted"
          title="Coming soon"
        >
          Join with Invite Code
        </span>
      </div>
    </main>
  );
}
