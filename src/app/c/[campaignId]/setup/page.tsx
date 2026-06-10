"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { GeneratorParams } from "@/lib/types";
import { DEFAULT_PARAMS, generateSystem } from "@/lib/generator/system";
import { randomSeedString } from "@/lib/generator/prng";
import { updateLocalCampaign } from "@/lib/local";
import { useHydrated, useLocalCampaign } from "@/hooks/useLocalCampaign";
import { GeneratorForm } from "@/components/setup/GeneratorForm";
import { SystemMap, type SystemMapHandle } from "@/components/map/SystemMap";
import { PlanetPanel } from "@/components/map/PlanetPanel";

export default function SetupPage() {
  const router = useRouter();
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;
  const hydrated = useHydrated();
  const { campaign } = useLocalCampaign();

  const [genParams, setGenParams] = useState<GeneratorParams>(DEFAULT_PARAMS);
  // Initializer also runs (and is discarded) on the server; the form is only
  // rendered after hydration, so the values never mismatch.
  const [seed, setSeed] = useState(randomSeedString);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const mapRef = useRef<SystemMapHandle>(null);

  // If the system is already locked, setup is closed.
  useEffect(() => {
    if (hydrated && campaign.systemLocked) router.replace(`/c/${campaignId}`);
  }, [hydrated, campaign.systemLocked, campaignId, router]);

  const system = useMemo(
    () => generateSystem(genParams, seed),
    [genParams, seed]
  );

  if (!hydrated || campaign.systemLocked) {
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

  function lockIn() {
    updateLocalCampaign((c) => ({ ...c, system, systemLocked: true }));
    router.push(`/c/${campaignId}`);
  }

  return (
    <main className="flex h-dvh flex-col lg:flex-row">
      <div className="w-full overflow-y-auto p-4 lg:w-96 lg:shrink-0">
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
          onLockIn={lockIn}
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
