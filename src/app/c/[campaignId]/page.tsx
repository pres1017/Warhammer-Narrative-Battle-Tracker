"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { BattleInput, ImportMap } from "@/hooks/useLocalCampaign";
import { useCampaign } from "@/hooks/useCampaign";
import { SystemMap, type SystemMapHandle } from "@/components/map/SystemMap";
import { PlanetPanel } from "@/components/map/PlanetPanel";
import { BattleSidebar } from "@/components/battles/BattleSidebar";
import { BattleForm, type BattleClaim } from "@/components/battles/BattleForm";
import { BattleDetail } from "@/components/battles/BattleDetail";
import { RosterPanel } from "@/components/players/RosterPanel";
import { CampaignSettingsPanel } from "@/components/settings/CampaignSettingsPanel";
import { StatsPanel } from "@/components/stats/StatsPanel";
import { CrusadePanel } from "@/components/crusade/CrusadePanel";

type Modal =
  | { kind: "none" }
  | { kind: "detail"; battleId: string }
  | { kind: "edit"; battleId: string }
  | { kind: "create"; locationId: string | null }
  | { kind: "roster" }
  | { kind: "settings" }
  | { kind: "stats" }
  | { kind: "crusade" };

export default function CampaignPage() {
  const router = useRouter();
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;

  const campaign = useCampaign(campaignId);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterMatches, setFilterMatches] = useState<Set<string> | null>(null);
  const mapRef = useRef<SystemMapHandle>(null);

  const handleFilterMatches = useCallback(
    (ids: Set<string> | null) => setFilterMatches(ids),
    []
  );

  const { status, system, systemLocked, battles, isAdmin } = campaign;

  useEffect(() => {
    if (status === "ready" && (!system || !systemLocked) && isAdmin) {
      router.replace(`/c/${campaignId}/setup`);
    }
  }, [status, system, systemLocked, isAdmin, campaignId, router]);

  const battleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const battle of battles) {
      if (battle.locationId) {
        counts[battle.locationId] = (counts[battle.locationId] ?? 0) + 1;
      }
    }
    return counts;
  }, [battles]);

  // Faction names seen anywhere in the campaign, for claim suggestions.
  const knownFactions = useMemo(() => {
    const set = new Set<string>();
    for (const battle of battles) {
      for (const p of battle.participants) {
        if (p.faction.trim()) set.add(p.faction.trim());
      }
    }
    for (const body of system?.bodies ?? []) {
      if (body.controlledBy?.trim()) set.add(body.controlledBy.trim());
    }
    return [...set].sort();
  }, [battles, system]);

  if (campaign.status === "error") {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl text-danger">Transmission Lost</h1>
        <p className="max-w-md text-sm text-muted">{campaign.error}</p>
      </main>
    );
  }

  if (campaign.status === "loading" || !system) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3">
        <p className="font-mono text-sm uppercase tracking-widest text-muted">
          {campaign.status === "loading"
            ? "Consulting the cartographers…"
            : "Awaiting the Warmaster's system survey…"}
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

  async function saveBattle(
    input: BattleInput,
    imports: ImportMap,
    claim: BattleClaim | null
  ) {
    setSaveError(null);
    try {
      if (modal.kind === "edit") {
        await campaign.updateBattle(modal.battleId, input, imports);
        setModal({ kind: "detail", battleId: modal.battleId });
      } else if (modal.kind === "create") {
        const id = await campaign.addBattle(input, imports);
        setModal({ kind: "detail", battleId: id });
      }
      if (claim && claim.faction) {
        await campaign.claimBody(claim.bodyId, claim.faction);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="flex h-dvh">
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <h1 className="text-xl text-accent">
            {campaign.name || `${system.star.name} System`}
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {system.star.name} · Seed {system.seed} · {battles.length} battle
            {battles.length === 1 ? "" : "s"} recorded
          </p>
        </div>

        <button
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? "Hide battle list" : "Show battle list"}
          className="absolute right-4 top-4 z-10 rounded border border-border bg-surface/90 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent"
        >
          {sidebarOpen ? "Chronicle ▸" : "◂ Chronicle"}
        </button>

        <SystemMap
          ref={mapRef}
          system={system}
          selectedBodyId={selectedBodyId}
          onSelectBody={setSelectedBodyId}
          battleCounts={battleCounts}
          highlightedIds={filterMatches}
          territoryEnabled={campaign.settings.territoryEnabled}
        />

        {selectedBody && modal.kind === "none" && (
          <div className="pointer-events-none absolute right-4 top-14 z-10">
            <PlanetPanel
              system={system}
              body={selectedBody}
              battles={battles}
              canEdit={campaign.isMod}
              onSaveBody={(bodyId, patch) => campaign.updateBody(bodyId, patch)}
              territoryEnabled={campaign.settings.territoryEnabled}
              knownFactions={knownFactions}
              onClaim={(bodyId, faction) => campaign.claimBody(bodyId, faction)}
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
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModal({ kind: "none" });
            }}
          >
            {modal.kind === "roster" ? (
              <RosterPanel
                players={campaign.players}
                myPlayerId={campaign.myPlayerId}
                isAdmin={campaign.isAdmin}
                isMod={campaign.isMod}
                inviteCode={campaign.inviteCode}
                onSetRole={(id, role) => void campaign.setRole(id, role)}
                onRemove={(id) => void campaign.removePlayer(id)}
                onClose={() => setModal({ kind: "none" })}
              />
            ) : modal.kind === "settings" ? (
              <CampaignSettingsPanel
                settings={campaign.settings}
                onSave={(settings) => campaign.updateSettings(settings)}
                onClose={() => setModal({ kind: "none" })}
              />
            ) : modal.kind === "stats" ? (
              <StatsPanel
                battles={battles}
                bodies={system.bodies}
                territoryEnabled={campaign.settings.territoryEnabled}
                onClose={() => setModal({ kind: "none" })}
              />
            ) : modal.kind === "crusade" ? (
              <CrusadePanel
                forces={campaign.crusadeForces}
                units={campaign.crusadeUnits}
                players={campaign.players}
                armyLists={campaign.armyLists}
                canEditForce={campaign.canEditForce}
                onAddForce={campaign.addForce}
                onDeleteForce={campaign.deleteForce}
                onAddUnit={campaign.addUnit}
                onUpdateUnit={campaign.updateUnit}
                onDeleteUnit={campaign.deleteUnit}
                onClose={() => setModal({ kind: "none" })}
              />
            ) : modal.kind === "create" || modal.kind === "edit" ? (
              <div className="flex flex-col items-center gap-2">
                {saveError && (
                  <p className="rounded border border-danger/50 bg-surface px-3 py-1 text-sm text-danger">
                    {saveError}
                  </p>
                )}
                <BattleForm
                  system={system}
                  battle={modal.kind === "edit" ? modalBattle : null}
                  armyLists={campaign.armyLists}
                  initialLocationId={
                    modal.kind === "create" ? modal.locationId : null
                  }
                  territoryEnabled={campaign.settings.territoryEnabled}
                  onSave={(input, imports, claim) =>
                    void saveBattle(input, imports, claim)
                  }
                  onCancel={() => {
                    setSaveError(null);
                    setModal({ kind: "none" });
                  }}
                />
              </div>
            ) : modalBattle ? (
              <BattleDetail
                battle={modalBattle}
                system={system}
                armyLists={campaign.armyLists}
                index={battles.findIndex((b) => b.id === modalBattle.id)}
                canEdit={campaign.canEditBattle(modalBattle)}
                photos={campaign.photos.filter(
                  (p) => p.battleId === modalBattle.id
                )}
                canDeletePhoto={(photo) =>
                  campaign.mode === "local" ||
                  campaign.isMod ||
                  (campaign.myPlayerId !== null &&
                    photo.uploadedBy === campaign.myPlayerId)
                }
                onAddPhoto={(file) => campaign.addPhoto(modalBattle.id, file)}
                onDeletePhoto={(photoId) => void campaign.deletePhoto(photoId)}
                photoSrc={campaign.photoSrc}
                onEdit={() =>
                  setModal({ kind: "edit", battleId: modalBattle.id })
                }
                onDelete={() => {
                  if (
                    window.confirm(
                      "Strike this battle from the record? This cannot be undone."
                    )
                  ) {
                    void campaign.deleteBattle(modalBattle.id);
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

      {sidebarOpen && (
      <BattleSidebar
        battles={battles}
        system={system}
        selectedBattleId={
          modal.kind === "detail" || modal.kind === "edit"
            ? modal.battleId
            : null
        }
        canReorder={campaign.canEditBattle}
        onSelectBattle={openBattle}
        onAddBattle={() => setModal({ kind: "create", locationId: null })}
        onMoveBattle={(id, idx) => void campaign.moveBattle(id, idx)}
        onFilterMatches={handleFilterMatches}
        headerExtra={
          <>
            <button
              onClick={() => setModal({ kind: "stats" })}
              title="Campaign ledger — stats and standings"
              className="rounded border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent"
            >
              📜
            </button>
            {campaign.settings.crusadeEnabled && (
              <button
                onClick={() => setModal({ kind: "crusade" })}
                title="Crusade forces"
                className="rounded border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent"
              >
                ⚔
              </button>
            )}
            {campaign.mode === "remote" && (
              <button
                onClick={() => setModal({ kind: "roster" })}
                title="Players and invite code"
                className="rounded border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent"
              >
                ☰ {campaign.players.length}
              </button>
            )}
            {campaign.isAdmin && (
              <button
                onClick={() => setModal({ kind: "settings" })}
                title="Campaign settings"
                className="rounded border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent"
              >
                ⚙
              </button>
            )}
          </>
        }
      />
      )}
    </main>
  );
}
