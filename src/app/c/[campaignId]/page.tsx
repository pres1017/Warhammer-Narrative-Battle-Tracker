"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useLocalCampaign,
  type BattleInput,
  type ImportMap,
} from "@/hooks/useLocalCampaign";
import { sortBattles } from "@/lib/ordering";
import { SystemMap, type SystemMapHandle } from "@/components/map/SystemMap";
import { PlanetPanel } from "@/components/map/PlanetPanel";
import { BattleSidebar } from "@/components/battles/BattleSidebar";
import { BattleForm } from "@/components/battles/BattleForm";
import { BattleDetail } from "@/components/battles/BattleDetail";

type Modal =
  | { kind: "none" }
  | { kind: "detail"; battleId: string }
  | { kind: "edit"; battleId: string }
  | { kind: "create"; locationId: string | null };

export default function CampaignPage() {
  const router = useRouter();
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;

  const {
    campaign,
    hydrated,
    addBattle,
    updateBattle,
    deleteBattle,
    moveBattle,
  } = useLocalCampaign();
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const mapRef = useRef<SystemMapHandle>(null);

  useEffect(() => {
    if (hydrated && (!campaign.system || !campaign.systemLocked)) {
      router.replace(`/c/${campaignId}/setup`);
    }
  }, [hydrated, campaign, campaignId, router]);

  const system = campaign.system;
  const battles = useMemo(() => sortBattles(campaign.battles), [campaign]);

  const battleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const battle of battles) {
      if (battle.locationId) {
        counts[battle.locationId] = (counts[battle.locationId] ?? 0) + 1;
      }
    }
    return counts;
  }, [battles]);

  if (!system) {
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
  const modalBattle =
    modal.kind === "detail" || modal.kind === "edit"
      ? battles.find((b) => b.id === modal.battleId) ?? null
      : null;

  function openBattle(battleId: string) {
    setModal({ kind: "detail", battleId });
    const battle = battles.find((b) => b.id === battleId);
    if (battle?.locationId) {
      setSelectedBodyId(battle.locationId);
      mapRef.current?.zoomToBody(battle.locationId);
    }
  }

  function saveBattle(input: BattleInput, imports: ImportMap) {
    if (modal.kind === "edit") {
      updateBattle(modal.battleId, input, imports);
      setModal({ kind: "detail", battleId: modal.battleId });
    } else if (modal.kind === "create") {
      const id = addBattle(input, imports);
      setModal({ kind: "detail", battleId: id });
    }
  }

  return (
    <main className="flex h-dvh">
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <h1 className="text-xl text-accent">{system.star.name} System</h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Seed {system.seed} · {battles.length} battle
            {battles.length === 1 ? "" : "s"} recorded
          </p>
        </div>

        <SystemMap
          ref={mapRef}
          system={system}
          selectedBodyId={selectedBodyId}
          onSelectBody={setSelectedBodyId}
          battleCounts={battleCounts}
        />

        {selectedBody && modal.kind === "none" && (
          <div className="pointer-events-none absolute right-4 top-4 z-10">
            <PlanetPanel
              system={system}
              body={selectedBody}
              battles={battles}
              onClose={() => setSelectedBodyId(null)}
              onSelectBattle={openBattle}
              onAddBattleHere={(bodyId) =>
                setModal({ kind: "create", locationId: bodyId })
              }
            />
          </div>
        )}

        {modal.kind !== "none" && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModal({ kind: "none" });
            }}
          >
            {modal.kind === "create" || modal.kind === "edit" ? (
              <BattleForm
                system={system}
                battle={modal.kind === "edit" ? modalBattle : null}
                armyLists={campaign.armyLists}
                initialLocationId={
                  modal.kind === "create" ? modal.locationId : null
                }
                onSave={saveBattle}
                onCancel={() => setModal({ kind: "none" })}
              />
            ) : modalBattle ? (
              <BattleDetail
                battle={modalBattle}
                system={system}
                armyLists={campaign.armyLists}
                index={battles.findIndex((b) => b.id === modalBattle.id)}
                onEdit={() =>
                  setModal({ kind: "edit", battleId: modalBattle.id })
                }
                onDelete={() => {
                  if (
                    window.confirm(
                      "Strike this battle from the record? This cannot be undone."
                    )
                  ) {
                    deleteBattle(modalBattle.id);
                    setModal({ kind: "none" });
                  }
                }}
                onClose={() => setModal({ kind: "none" })}
                onFocusLocation={(bodyId) => {
                  setModal({ kind: "none" });
                  setSelectedBodyId(bodyId);
                  mapRef.current?.zoomToBody(bodyId);
                }}
              />
            ) : null}
          </div>
        )}
      </div>

      <BattleSidebar
        battles={battles}
        system={system}
        selectedBattleId={
          modal.kind === "detail" || modal.kind === "edit"
            ? modal.battleId
            : null
        }
        onSelectBattle={openBattle}
        onAddBattle={() => setModal({ kind: "create", locationId: null })}
        onMoveBattle={moveBattle}
      />
    </main>
  );
}
