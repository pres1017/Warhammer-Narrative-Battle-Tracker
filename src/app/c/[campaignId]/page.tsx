"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { LocalCampaign } from "@/lib/local";
import { loadLocalCampaign } from "@/lib/local";
import { SystemMap, type SystemMapHandle } from "@/components/map/SystemMap";
import { PlanetPanel } from "@/components/map/PlanetPanel";

export default function CampaignPage() {
  const router = useRouter();
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;

  const [campaign, setCampaign] = useState<LocalCampaign | null>(null);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const mapRef = useRef<SystemMapHandle>(null);

  useEffect(() => {
    const loaded = loadLocalCampaign();
    if (!loaded.system || !loaded.systemLocked) {
      router.replace(`/c/${campaignId}/setup`);
      return;
    }
    setCampaign(loaded);
  }, [campaignId, router]);

  if (!campaign?.system) {
    return (
      <main className="flex h-dvh items-center justify-center">
        <p className="font-mono text-sm uppercase tracking-widest text-muted">
          Consulting the cartographers…
        </p>
      </main>
    );
  }

  const system = campaign.system;
  const selectedBody =
    system.bodies.find((b) => b.id === selectedBodyId) ?? null;

  const battleCounts: Record<string, number> = {};
  for (const battle of campaign.battles) {
    if (battle.locationId) {
      battleCounts[battle.locationId] =
        (battleCounts[battle.locationId] ?? 0) + 1;
    }
  }

  return (
    <main className="flex h-dvh">
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <h1 className="text-xl text-accent">{system.star.name} System</h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Seed {system.seed} · {campaign.battles.length} battles recorded
          </p>
        </div>
        <SystemMap
          ref={mapRef}
          system={system}
          selectedBodyId={selectedBodyId}
          onSelectBody={setSelectedBodyId}
          battleCounts={battleCounts}
        />
        {selectedBody && (
          <div className="pointer-events-none absolute right-4 top-4 z-10">
            <PlanetPanel
              system={system}
              body={selectedBody}
              battles={campaign.battles}
              onClose={() => setSelectedBodyId(null)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
