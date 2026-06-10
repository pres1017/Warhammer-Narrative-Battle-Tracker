"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Battle, StarSystem } from "@/lib/types";
import type { ArmyList } from "@/lib/rosters/types";
import { keyForAppend, keyForMove, sortBattles } from "@/lib/ordering";
import { updateLocalCampaign } from "@/lib/local";
import { isSupabaseConfigured, ensureSession } from "@/lib/supabase";
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
  setRole: (playerId: string, role: api.Role) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  refresh: () => Promise<void>;
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
    setRole,
    removePlayer,
    refresh,
  };
}

function useLocalController(active: boolean): CampaignController {
  const local = useLocalCampaign();

  const lockSystem = useCallback(async (system: StarSystem) => {
    updateLocalCampaign((c) => ({ ...c, system, systemLocked: true }));
  }, []);

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
    setRole: noopAsync,
    removePlayer: noopAsync,
    refresh: noopAsync,
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
