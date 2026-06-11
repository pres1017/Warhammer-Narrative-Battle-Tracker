"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { GeneratorParams } from "@/lib/types";
import { DEFAULT_PARAMS, generateSystem } from "@/lib/generator/system";
import { randomSeedString } from "@/lib/generator/prng";
import { useCampaign } from "@/hooks/useCampaign";
import { GeneratorForm } from "@/components/setup/GeneratorForm";
import { SystemMap, type SystemMapHandle } from "@/components/map/SystemMap";
import { PlanetPanel } from "@/components/map/PlanetPanel";

export default function SetupPage() {
  const router = useRouter();
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;
  const campaign = useCampaign(campaignId);

  const [genParams, setGenParams] = useState<GeneratorParams>(DEFAULT_PARAMS);
  // Initializer also runs (and is discarded) on the server; the form is only
  // rendered after load, so the values never mismatch.
  const [seed, setSeed] = useState(randomSeedString);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const mapRef = useRef<SystemMapHandle>(null);

  // Setup is closed once the system is locked (or for non-admins).
  useEffect(() => {
    if (campaign.status === "ready" && (campaign.systemLocked || !campaign.isAdmin)) {
      router.replace(`/c/${campaignId}`);
    }
  }, [campaign.status, campaign.systemLocked, campaign.isAdmin, campaignId, router]);

  const system = useMemo(
    () => generateSystem(genParams, seed),
    [genParams, seed]
  );

  if (campaign.status === "error") {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl text-danger">Transmission Lost</h1>
        <p className="max-w-md text-sm text-muted">{campaign.error}</p>
      </main>
    );
  }

  if (campaign.status !== "ready" || campaign.systemLocked) {
    return (
      <main className="flex h-dvh items-center justify-center">
        <p className="font-mono text-sm uppercase tracking-widest text-muted">
          Consulting the cartographers…
        </p>
      </main>
    );
  }

  const selectedBody =
    system.bodies.find((b) => b.id === selectedBodyId) ?? null;

  async function lockIn() {
    setLocking(true);
    setLockError(null);
    try {
      await campaign.lockSystem(system);
      router.push(`/c/${campaignId}`);
    } catch (e) {
      setLockError(e instanceof Error ? e.message : String(e));
      setLocking(false);
    }
  }

  return (
    <main className="flex h-dvh flex-col lg:flex-row">
      <div className="max-h-[55dvh] w-full overflow-y-auto p-4 lg:max-h-none lg:w-96 lg:shrink-0">
        {campaign.name && (
          <h1 className="mb-3 text-2xl text-accent">{campaign.name}</h1>
        )}
        {lockError && (
          <p className="mb-3 rounded border border-danger/50 px-3 py-2 text-sm text-danger">
            {lockError}
          </p>
        )}
        <GeneratorForm
          params={genParams}
          seed={seed}
          onParamsChange={(p) => {
            setGenParams(p);
            setSelectedBodyId(null);
          }}
          onSeedChange={setSeed}
          onReroll={() => {
            setSeed(randomSeedString());
            setSelectedBodyId(null);
          }}
          onLockIn={() => void lockIn()}
          locking={locking}
        />
      </div>
      <div className="relative min-h-0 flex-1">
        <SystemMap
          ref={mapRef}
          system={system}
          selectedBodyId={selectedBodyId}
          onSelectBody={setSelectedBodyId}
        />
        {selectedBody && (
          <div className="pointer-events-none absolute right-4 top-4">
            <PlanetPanel
              system={system}
              body={selectedBody}
              battles={[]}
              onClose={() => setSelectedBodyId(null)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
