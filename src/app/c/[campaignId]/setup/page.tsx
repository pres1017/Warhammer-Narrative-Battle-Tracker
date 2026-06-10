"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { GeneratorParams } from "@/lib/types";
import { DEFAULT_PARAMS, generateSystem } from "@/lib/generator/system";
import { randomSeedString } from "@/lib/generator/prng";
import { loadLocalCampaign, saveLocalCampaign } from "@/lib/local";
import { GeneratorForm } from "@/components/setup/GeneratorForm";
import { SystemMap, type SystemMapHandle } from "@/components/map/SystemMap";
import { PlanetPanel } from "@/components/map/PlanetPanel";

export default function SetupPage() {
  const router = useRouter();
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;

  const [genParams, setGenParams] = useState<GeneratorParams>(DEFAULT_PARAMS);
  const [seed, setSeed] = useState("");
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const mapRef = useRef<SystemMapHandle>(null);

  // Seed is random per visit; set after mount to avoid hydration mismatch.
  useEffect(() => {
    setSeed((s) => s || randomSeedString());
  }, []);

  // If the system is already locked, setup is closed.
  useEffect(() => {
    const campaign = loadLocalCampaign();
    if (campaign.systemLocked) router.replace(`/c/${campaignId}`);
  }, [campaignId, router]);

  const system = useMemo(
    () => (seed ? generateSystem(genParams, seed) : null),
    [genParams, seed]
  );

  const selectedBody =
    system?.bodies.find((b) => b.id === selectedBodyId) ?? null;

  function lockIn() {
    if (!system) return;
    const campaign = loadLocalCampaign();
    saveLocalCampaign({ ...campaign, system, systemLocked: true });
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
        {system && (
          <SystemMap
            ref={mapRef}
            system={system}
            selectedBodyId={selectedBodyId}
            onSelectBody={setSelectedBodyId}
          />
        )}
        {system && selectedBody && (
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
