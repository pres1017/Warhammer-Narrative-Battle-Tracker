"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Battle,
  BattlePhoto,
  CampaignSettings,
  CrusadeForce,
  CrusadeUnit,
  StarSystem,
} from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import type { ArmyList } from "@/lib/rosters/types";
import { keyForAppend, keyForMove, sortBattles } from "@/lib/ordering";
import { updateLocalCampaign } from "@/lib/local";
import {
  isSupabaseConfigured,
  ensureSession,
  getSupabase,
} from "@/lib/supabase";
import * as api from "@/lib/api";
import {
  useLocalCampaign,
  type BattleInput,
  type ImportMap,
} from "./useLocalCampaign";

export type CampaignStatus = "loading" | "ready" | "error";

export interface CampaignController {
  mode: "local" | "remote";
  status: CampaignStatus;
  error: string | null;
  name: string;
  inviteCode: string | null;
  system: StarSystem | null;
  systemLocked: boolean;
  battles: Battle[];
  armyLists: ArmyList[];
  players: api.PlayerInfo[];
  myPlayerId: string | null;
  isMod: boolean;
  isAdmin: boolean;
  canEditBattle: (battle: Battle) => boolean;
  addBattle: (input: BattleInput, imports: ImportMap) => Promise<string>;
  updateBattle: (
    id: string,
    input: BattleInput,
    imports: ImportMap
  ) => Promise<void>;
  deleteBattle: (id: string) => Promise<void>;
  moveBattle: (id: string, targetIndex: number) => Promise<void>;
  lockSystem: (system: StarSystem) => Promise<void>;
  updateBody: (
    bodyId: string,
    patch: { name: string; blurb: string }
  ) => Promise<void>;
  setRole: (playerId: string, role: api.Role) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  refresh: () => Promise<void>;
  // Feature toggles (admin saves explicitly).
  settings: CampaignSettings;
  updateSettings: (settings: CampaignSettings) => Promise<void>;
  // Territory control.
  claimBody: (bodyId: string, faction: string) => Promise<void>;
  // Battle photos.
  photos: BattlePhoto[];
  addPhoto: (battleId: string, file: File) => Promise<void>;
  deletePhoto: (photoId: string) => Promise<void>;
  /** Resolves to a displayable URL (signed URL or data URI). */
  photoSrc: (photo: BattlePhoto) => Promise<string>;
  // Crusade.
  crusadeForces: CrusadeForce[];
  crusadeUnits: CrusadeUnit[];
  addForce: (input: {
    name: string;
    faction: string;
    notes: string;
  }) => Promise<void>;
  deleteForce: (forceId: string) => Promise<void>;
  addUnit: (
    forceId: string,
    input: Partial<CrusadeUnit> & { name: string }
  ) => Promise<void>;
  updateUnit: (unitId: string, patch: Partial<CrusadeUnit>) => Promise<void>;
  deleteUnit: (unitId: string) => Promise<void>;
  /** May this user edit the given crusade force? */
  canEditForce: (force: CrusadeForce) => boolean;
}

const noopAsync = async () => {};

const NOT_CONFIGURED_MESSAGE =
  "Cloud campaigns are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

function useRemoteCampaign(campaignId: string | null): CampaignController {
  const [data, setData] = useState<api.CampaignData | null>(null);
  const [status, setStatus] = useState<CampaignStatus>(() =>
    isSupabaseConfigured ? "loading" : "error"
  );
  const [error, setError] = useState<string | null>(() =>
    isSupabaseConfigured ? null : NOT_CONFIGURED_MESSAGE
  );
  // Mutations read the latest cache without re-binding callbacks.
  const dataRef = useRef<api.CampaignData | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refresh = useCallback(async () => {
    if (!campaignId || !isSupabaseConfigured) return;
    try {
      const authUserId = await ensureSession();
      const fetched = await api.fetchCampaignData(campaignId, authUserId);
      setData(fetched);
      setStatus("ready");
      setError(null);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [campaignId]);

  useEffect(() => {
    // Initial data fetch; all setState happens after awaits, never
    // synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // Realtime: one channel per campaign patches the cache; reconnects and
  // tab re-focus trigger a full refetch to heal any missed events.
  useEffect(() => {
    if (!campaignId || !isSupabaseConfigured) return;
    const supabase = getSupabase();
    const opts = (table: string) => ({
      event: "*" as const,
      schema: "public",
      table,
      filter: `campaign_id=eq.${campaignId}`,
    });

    let sawFirstSubscribe = false;
    const channel = supabase
      .channel(`campaign:${campaignId}`)
      .on("postgres_changes", opts("battles"), (payload) => {
        setData((d) => {
          if (!d) return d;
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return { ...d, battles: d.battles.filter((b) => b.id !== id) };
          }
          const battle = api.battleFromRow(payload.new as api.BattleRow);
          const rest = d.battles.filter((b) => b.id !== battle.id);
          return { ...d, battles: [...rest, battle] };
        });
      })
      .on("postgres_changes", opts("army_lists"), (payload) => {
        setData((d) => {
          if (!d) return d;
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return { ...d, armyLists: d.armyLists.filter((l) => l.id !== id) };
          }
          const list = api.armyListFromRow(payload.new as api.ArmyListRow);
          const rest = d.armyLists.filter((l) => l.id !== list.id);
          return { ...d, armyLists: [...rest, list] };
        });
      })
      .on("postgres_changes", opts("players"), (payload) => {
        setData((d) => {
          if (!d) return d;
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return { ...d, players: d.players.filter((p) => p.id !== id) };
          }
          const row = payload.new as {
            id: string;
            display_name: string;
            role: api.Role;
            auth_user_id: string;
          };
          const player: api.PlayerInfo = {
            id: row.id,
            displayName: row.display_name,
            role: row.role,
            authUserId: row.auth_user_id,
          };
          const rest = d.players.filter((p) => p.id !== player.id);
          const players = [...rest, player];
          const me = players.find((p) => p.id === d.myPlayerId);
          return { ...d, players, myRole: me?.role ?? d.myRole };
        });
      })
      .on("postgres_changes", opts("system_bodies"), (payload) => {
        // Inserts arrive with the lock-in refresh; here we only care about
        // body edits (name/blurb by mods, territory claims by members).
        if (payload.eventType !== "UPDATE") return;
        const row = payload.new as {
          id: string;
          name: string;
          blurb: string;
          controlled_by: string | null;
        };
        setData((d) => {
          if (!d?.system) return d;
          return {
            ...d,
            system: {
              ...d.system,
              bodies: d.system.bodies.map((b) =>
                b.id === row.id
                  ? {
                      ...b,
                      name: row.name,
                      blurb: row.blurb,
                      controlledBy: row.controlled_by ?? "",
                    }
                  : b
              ),
            },
          };
        });
      })
      .on("postgres_changes", opts("battle_photos"), (payload) => {
        setData((d) => {
          if (!d) return d;
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return { ...d, photos: d.photos.filter((p) => p.id !== id) };
          }
          const photo = api.photoFromRow(payload.new as api.BattlePhotoRow);
          const rest = d.photos.filter((p) => p.id !== photo.id);
          return { ...d, photos: [...rest, photo] };
        });
      })
      .on("postgres_changes", opts("crusade_forces"), (payload) => {
        setData((d) => {
          if (!d) return d;
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return {
              ...d,
              crusadeForces: d.crusadeForces.filter((f) => f.id !== id),
              crusadeUnits: d.crusadeUnits.filter((u) => u.forceId !== id),
            };
          }
          const force = api.forceFromRow(payload.new as api.CrusadeForceRow);
          const rest = d.crusadeForces.filter((f) => f.id !== force.id);
          return { ...d, crusadeForces: [...rest, force] };
        });
      })
      .on("postgres_changes", opts("crusade_units"), (payload) => {
        setData((d) => {
          if (!d) return d;
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return {
              ...d,
              crusadeUnits: d.crusadeUnits.filter((u) => u.id !== id),
            };
          }
          const unit = api.unitFromRow(payload.new as api.CrusadeUnitRow);
          const rest = d.crusadeUnits.filter((u) => u.id !== unit.id);
          return { ...d, crusadeUnits: [...rest, unit] };
        });
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          const row = payload.new as {
            name: string;
            system_locked: boolean;
            territory_enabled: boolean | null;
            crusade_enabled: boolean | null;
          };
          // Lock-in flips peers from the waiting screen to the map; refetch
          // to pull the freshly inscribed system and bodies.
          if (row.system_locked) void refresh();
          setData((d) =>
            d
              ? {
                  ...d,
                  campaign: {
                    ...d.campaign,
                    name: row.name,
                    systemLocked: row.system_locked,
                    settings: {
                      territoryEnabled: row.territory_enabled ?? false,
                      crusadeEnabled: row.crusade_enabled ?? false,
                    },
                  },
                }
              : d
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Re-heal after reconnects (skip the initial subscribe; the
          // mount effect already fetches).
          if (sawFirstSubscribe) void refresh();
          sawFirstSubscribe = true;
        }
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      void supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [campaignId, refresh]);

  const myRole = data?.myRole ?? null;
  const myPlayerId = data?.myPlayerId ?? null;
  const isMod = myRole === "admin" || myRole === "moderator";

  const addBattle = useCallback(
    async (input: BattleInput, imports: ImportMap): Promise<string> => {
      const current = dataRef.current;
      if (!campaignId || !current?.myPlayerId) {
        throw new Error("Not a member of this campaign");
      }
      const sortKey = keyForAppend(current.battles);
      const { battle, armyLists } = await api.insertBattle(
        campaignId,
        current.myPlayerId,
        input,
        sortKey,
        imports
      );
      setData((d) =>
        d
          ? {
              ...d,
              battles: [...d.battles, battle],
              armyLists: [...d.armyLists, ...armyLists],
            }
          : d
      );
      return battle.id;
    },
    [campaignId]
  );

  const updateBattle = useCallback(
    async (id: string, input: BattleInput, imports: ImportMap) => {
      const current = dataRef.current;
      if (!campaignId || !current?.myPlayerId) {
        throw new Error("Not a member of this campaign");
      }
      const { battle, armyLists } = await api.updateBattleRow(
        campaignId,
        current.myPlayerId,
        id,
        input,
        imports
      );
      setData((d) =>
        d
          ? {
              ...d,
              battles: d.battles.map((b) => (b.id === id ? battle : b)),
              armyLists: [
                ...d.armyLists.filter(
                  (l) =>
                    l.battleId !== id ||
                    !armyLists.some(
                      (n) => n.participantKey === l.participantKey
                    )
                ),
                ...armyLists,
              ],
            }
          : d
      );
    },
    [campaignId]
  );

  const deleteBattle = useCallback(async (id: string) => {
    // Optimistic: remove locally, restore via refresh on failure.
    setData((d) =>
      d
        ? {
            ...d,
            battles: d.battles.filter((b) => b.id !== id),
            armyLists: d.armyLists.filter((l) => l.battleId !== id),
          }
        : d
    );
    try {
      await api.deleteBattleRow(id);
    } catch {
      await refresh();
    }
  }, [refresh]);

  const moveBattle = useCallback(
    async (id: string, targetIndex: number) => {
      const current = dataRef.current;
      if (!current) return;
      const sortKey = keyForMove(current.battles, id, targetIndex);
      setData((d) =>
        d
          ? {
              ...d,
              battles: d.battles.map((b) =>
                b.id === id ? { ...b, sortKey } : b
              ),
            }
          : d
      );
      try {
        await api.moveBattleRow(id, sortKey);
      } catch {
        await refresh();
      }
    },
    [refresh]
  );

  const lockSystem = useCallback(
    async (system: StarSystem) => {
      if (!campaignId) return;
      await api.lockSystem(campaignId, system);
      await refresh();
    },
    [campaignId, refresh]
  );

  const updateBody = useCallback(
    async (bodyId: string, patch: { name: string; blurb: string }) => {
      setData((d) => {
        if (!d?.system) return d;
        return {
          ...d,
          system: {
            ...d.system,
            bodies: d.system.bodies.map((b) =>
              b.id === bodyId ? { ...b, ...patch } : b
            ),
          },
        };
      });
      try {
        await api.updateBodyRow(bodyId, patch);
      } catch (e) {
        await refresh();
        throw e;
      }
    },
    [refresh]
  );

  const updateSettings = useCallback(
    async (settings: CampaignSettings) => {
      if (!campaignId) return;
      setData((d) =>
        d ? { ...d, campaign: { ...d.campaign, settings } } : d
      );
      try {
        await api.updateCampaignSettings(campaignId, settings);
      } catch (e) {
        await refresh();
        throw e;
      }
    },
    [campaignId, refresh]
  );

  const claimBody = useCallback(
    async (bodyId: string, faction: string) => {
      setData((d) => {
        if (!d?.system) return d;
        return {
          ...d,
          system: {
            ...d.system,
            bodies: d.system.bodies.map((b) =>
              b.id === bodyId ? { ...b, controlledBy: faction } : b
            ),
          },
        };
      });
      try {
        await api.claimBody(bodyId, faction);
      } catch (e) {
        await refresh();
        throw e;
      }
    },
    [refresh]
  );

  const addPhoto = useCallback(
    async (battleId: string, file: File) => {
      const current = dataRef.current;
      if (!campaignId || !current?.myPlayerId) {
        throw new Error("Not a member of this campaign");
      }
      const photo = await api.uploadBattlePhoto(
        campaignId,
        battleId,
        current.myPlayerId,
        file
      );
      setData((d) =>
        d ? { ...d, photos: [...d.photos.filter((p) => p.id !== photo.id), photo] } : d
      );
    },
    [campaignId]
  );

  const deletePhoto = useCallback(
    async (photoId: string) => {
      const photo = dataRef.current?.photos.find((p) => p.id === photoId);
      if (!photo) return;
      setData((d) =>
        d ? { ...d, photos: d.photos.filter((p) => p.id !== photoId) } : d
      );
      try {
        await api.deleteBattlePhoto(photo);
      } catch {
        await refresh();
      }
    },
    [refresh]
  );

  const photoSrc = useCallback(async (photo: BattlePhoto) => {
    if (!photo.storagePath) throw new Error("Photo has no stored file");
    return api.photoUrl(photo.storagePath);
  }, []);

  const addForce = useCallback(
    async (input: { name: string; faction: string; notes: string }) => {
      const current = dataRef.current;
      if (!campaignId || !current?.myPlayerId) {
        throw new Error("Not a member of this campaign");
      }
      const force = await api.insertCrusadeForce(
        campaignId,
        current.myPlayerId,
        input
      );
      setData((d) =>
        d
          ? {
              ...d,
              crusadeForces: [
                ...d.crusadeForces.filter((f) => f.id !== force.id),
                force,
              ],
            }
          : d
      );
    },
    [campaignId]
  );

  const deleteForce = useCallback(
    async (forceId: string) => {
      setData((d) =>
        d
          ? {
              ...d,
              crusadeForces: d.crusadeForces.filter((f) => f.id !== forceId),
              crusadeUnits: d.crusadeUnits.filter((u) => u.forceId !== forceId),
            }
          : d
      );
      try {
        await api.deleteCrusadeForce(forceId);
      } catch {
        await refresh();
      }
    },
    [refresh]
  );

  const addUnit = useCallback(
    async (forceId: string, input: Partial<CrusadeUnit> & { name: string }) => {
      if (!campaignId) return;
      const unit = await api.insertCrusadeUnit(campaignId, forceId, input);
      setData((d) =>
        d
          ? {
              ...d,
              crusadeUnits: [
                ...d.crusadeUnits.filter((u) => u.id !== unit.id),
                unit,
              ],
            }
          : d
      );
    },
    [campaignId]
  );

  const updateUnit = useCallback(
    async (unitId: string, patch: Partial<CrusadeUnit>) => {
      setData((d) =>
        d
          ? {
              ...d,
              crusadeUnits: d.crusadeUnits.map((u) =>
                u.id === unitId ? { ...u, ...patch } : u
              ),
            }
          : d
      );
      try {
        await api.updateCrusadeUnit(unitId, patch);
      } catch (e) {
        await refresh();
        throw e;
      }
    },
    [refresh]
  );

  const deleteUnit = useCallback(
    async (unitId: string) => {
      setData((d) =>
        d
          ? { ...d, crusadeUnits: d.crusadeUnits.filter((u) => u.id !== unitId) }
          : d
      );
      try {
        await api.deleteCrusadeUnit(unitId);
      } catch {
        await refresh();
      }
    },
    [refresh]
  );

  const setRole = useCallback(
    async (playerId: string, role: api.Role) => {
      setData((d) =>
        d
          ? {
              ...d,
              players: d.players.map((p) =>
                p.id === playerId ? { ...p, role } : p
              ),
            }
          : d
      );
      try {
        await api.setPlayerRole(playerId, role);
      } catch {
        await refresh();
      }
    },
    [refresh]
  );

  const removePlayer = useCallback(
    async (playerId: string) => {
      setData((d) =>
        d
          ? { ...d, players: d.players.filter((p) => p.id !== playerId) }
          : d
      );
      try {
        await api.removePlayer(playerId);
      } catch {
        await refresh();
      }
    },
    [refresh]
  );

  return {
    mode: "remote",
    status,
    error,
    name: data?.campaign.name ?? "",
    inviteCode: data?.campaign.inviteCode ?? null,
    system: data?.system ?? null,
    systemLocked: data?.campaign.systemLocked ?? false,
    battles: data ? sortBattles(data.battles) : [],
    armyLists: data?.armyLists ?? [],
    players: data?.players ?? [],
    myPlayerId,
    isMod,
    isAdmin: myRole === "admin",
    canEditBattle: (battle) =>
      isMod || (myPlayerId !== null && battle.createdBy === myPlayerId),
    addBattle,
    updateBattle,
    deleteBattle,
    moveBattle,
    lockSystem,
    updateBody,
    setRole,
    removePlayer,
    refresh,
    settings: data?.campaign.settings ?? DEFAULT_SETTINGS,
    updateSettings,
    claimBody,
    photos: data?.photos ?? [],
    addPhoto,
    deletePhoto,
    photoSrc,
    crusadeForces: data?.crusadeForces ?? [],
    crusadeUnits: data?.crusadeUnits ?? [],
    addForce,
    deleteForce,
    addUnit,
    updateUnit,
    deleteUnit,
    canEditForce: (force) =>
      isMod || (myPlayerId !== null && force.playerId === myPlayerId),
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

function useLocalController(active: boolean): CampaignController {
  const local = useLocalCampaign();

  const lockSystem = useCallback(async (system: StarSystem) => {
    updateLocalCampaign((c) => ({ ...c, system, systemLocked: true }));
  }, []);

  const claimBodyLocal = useCallback(async (bodyId: string, faction: string) => {
    updateLocalCampaign((c) =>
      c.system
        ? {
            ...c,
            system: {
              ...c.system,
              bodies: c.system.bodies.map((b) =>
                b.id === bodyId ? { ...b, controlledBy: faction } : b
              ),
            },
          }
        : c
    );
  }, []);

  const addPhotoLocal = useCallback(async (battleId: string, file: File) => {
    if (file.size > 1.5 * 1024 * 1024) {
      throw new Error(
        "Offline photos are limited to 1.5 MB (browser storage); cloud campaigns allow larger files."
      );
    }
    const dataUrl = await fileToDataUrl(file);
    updateLocalCampaign((c) => ({
      ...c,
      photos: [
        ...c.photos,
        {
          id: crypto.randomUUID(),
          battleId,
          caption: "",
          rawBase64: dataUrl,
          uploadedBy: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }, []);

  const updateBody = useCallback(
    async (bodyId: string, patch: { name: string; blurb: string }) => {
      updateLocalCampaign((c) =>
        c.system
          ? {
              ...c,
              system: {
                ...c.system,
                bodies: c.system.bodies.map((b) =>
                  b.id === bodyId ? { ...b, ...patch } : b
                ),
              },
            }
          : c
      );
    },
    []
  );

  return {
    mode: "local",
    status: active && !local.hydrated ? "loading" : "ready",
    error: null,
    name: local.campaign.name,
    inviteCode: null,
    system: local.campaign.system,
    systemLocked: local.campaign.systemLocked,
    battles: sortBattles(local.campaign.battles),
    armyLists: local.campaign.armyLists,
    players: [],
    myPlayerId: null,
    isMod: true,
    isAdmin: true,
    canEditBattle: () => true,
    addBattle: async (input, imports) => local.addBattle(input, imports),
    updateBattle: async (id, input, imports) =>
      local.updateBattle(id, input, imports),
    deleteBattle: async (id) => local.deleteBattle(id),
    moveBattle: async (id, idx) => local.moveBattle(id, idx),
    lockSystem,
    updateBody,
    setRole: noopAsync,
    removePlayer: noopAsync,
    refresh: noopAsync,
    settings: local.campaign.settings ?? DEFAULT_SETTINGS,
    updateSettings: async (settings) => {
      updateLocalCampaign((c) => ({ ...c, settings }));
    },
    claimBody: claimBodyLocal,
    photos: local.campaign.photos ?? [],
    addPhoto: addPhotoLocal,
    deletePhoto: async (photoId) => {
      updateLocalCampaign((c) => ({
        ...c,
        photos: c.photos.filter((p) => p.id !== photoId),
      }));
    },
    photoSrc: async (photo) => {
      if (!photo.rawBase64) throw new Error("Photo file is missing");
      return photo.rawBase64;
    },
    crusadeForces: local.campaign.crusadeForces ?? [],
    crusadeUnits: local.campaign.crusadeUnits ?? [],
    addForce: async (input) => {
      updateLocalCampaign((c) => ({
        ...c,
        crusadeForces: [
          ...c.crusadeForces,
          {
            id: crypto.randomUUID(),
            playerId: null,
            ...input,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    },
    deleteForce: async (forceId) => {
      updateLocalCampaign((c) => ({
        ...c,
        crusadeForces: c.crusadeForces.filter((f) => f.id !== forceId),
        crusadeUnits: c.crusadeUnits.filter((u) => u.forceId !== forceId),
      }));
    },
    addUnit: async (forceId, input) => {
      updateLocalCampaign((c) => ({
        ...c,
        crusadeUnits: [
          ...c.crusadeUnits,
          {
            id: crypto.randomUUID(),
            forceId,
            role: "",
            points: null,
            xp: 0,
            battlesPlayed: 0,
            unitsDestroyed: 0,
            honours: [],
            scars: [],
            notes: "",
            createdAt: new Date().toISOString(),
            ...input,
          },
        ],
      }));
    },
    updateUnit: async (unitId, patch) => {
      updateLocalCampaign((c) => ({
        ...c,
        crusadeUnits: c.crusadeUnits.map((u) =>
          u.id === unitId ? { ...u, ...patch } : u
        ),
      }));
    },
    deleteUnit: async (unitId) => {
      updateLocalCampaign((c) => ({
        ...c,
        crusadeUnits: c.crusadeUnits.filter((u) => u.id !== unitId),
      }));
    },
    canEditForce: () => true,
  };
}

/**
 * Unified campaign controller: the "local" campaign id maps to localStorage,
 * anything else to a Supabase campaign uuid.
 */
export function useCampaign(campaignId: string): CampaignController {
  const isLocal = campaignId === "local";
  const localController = useLocalController(isLocal);
  const remoteController = useRemoteCampaign(isLocal ? null : campaignId);
  return isLocal ? localController : remoteController;
}
