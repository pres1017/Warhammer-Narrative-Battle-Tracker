"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Battle } from "@/lib/types";
import {
  getLocalCampaignServerSnapshot,
  getLocalCampaignSnapshot,
  subscribeLocalCampaign,
  updateLocalCampaign,
} from "@/lib/local";
import { keyForAppend, keyForMove } from "@/lib/ordering";

export interface BattleInput {
  locationId: string | null;
  title: string;
  mission: string;
  foughtAt: string | null;
  winner: string;
  participants: Battle["participants"];
  notes: string;
}

const emptySubscribe = () => () => {};

/** True once the client has hydrated; the server always sees false. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Phase 1–2 campaign state: localStorage-backed external store. The
 * mutation surface mirrors the Supabase api that replaces it in Phase 3.
 */
export function useLocalCampaign() {
  const campaign = useSyncExternalStore(
    subscribeLocalCampaign,
    getLocalCampaignSnapshot,
    getLocalCampaignServerSnapshot
  );
  const hydrated = useHydrated();

  const addBattle = useCallback((input: BattleInput): string => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    updateLocalCampaign((c) => ({
      ...c,
      battles: [
        ...c.battles,
        {
          ...input,
          id,
          sortKey: keyForAppend(c.battles),
          createdBy: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
    return id;
  }, []);

  const updateBattle = useCallback(
    (id: string, patch: Partial<BattleInput>) => {
      updateLocalCampaign((c) => ({
        ...c,
        battles: c.battles.map((b) =>
          b.id === id
            ? { ...b, ...patch, updatedAt: new Date().toISOString() }
            : b
        ),
      }));
    },
    []
  );

  const deleteBattle = useCallback((id: string) => {
    updateLocalCampaign((c) => ({
      ...c,
      battles: c.battles.filter((b) => b.id !== id),
    }));
  }, []);

  const moveBattle = useCallback((id: string, targetIndex: number) => {
    updateLocalCampaign((c) => {
      const sortKey = keyForMove(c.battles, id, targetIndex);
      return {
        ...c,
        battles: c.battles.map((b) =>
          b.id === id
            ? { ...b, sortKey, updatedAt: new Date().toISOString() }
            : b
        ),
      };
    });
  }, []);

  return {
    campaign,
    hydrated,
    addBattle,
    updateBattle,
    deleteBattle,
    moveBattle,
  };
}
