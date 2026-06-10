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
import type {
  ArmyList,
  NormalizedRoster,
  RosterFormat,
} from "@/lib/rosters/types";

export interface BattleInput {
  locationId: string | null;
  title: string;
  mission: string;
  foughtAt: string | null;
  winner: string;
  participants: Battle["participants"];
  notes: string;
}

/** A freshly imported army file, keyed by participant in the save call. */
export interface PendingImport {
  format: RosterFormat;
  sourceFilename: string;
  roster: NormalizedRoster;
  rawBase64: string;
}

export type ImportMap = Record<string, PendingImport>;

function applyImports(
  battleId: string,
  input: BattleInput,
  imports: ImportMap,
  existingLists: ArmyList[]
): { participants: Battle["participants"]; armyLists: ArmyList[] } {
  const keptKeys = new Set(input.participants.map((p) => p.key));
  // Drop lists for removed participants or ones being replaced by a new import.
  const armyLists = existingLists.filter(
    (l) =>
      l.battleId !== battleId ||
      (keptKeys.has(l.participantKey) && !imports[l.participantKey])
  );
  const participants = input.participants.map((p) => {
    const pending = imports[p.key];
    if (!pending) return p;
    const list: ArmyList = {
      id: crypto.randomUUID(),
      battleId,
      participantKey: p.key,
      format: pending.format,
      sourceFilename: pending.sourceFilename,
      roster: pending.roster,
      rawBase64: pending.rawBase64,
    };
    armyLists.push(list);
    return { ...p, armyListId: list.id };
  });
  return { participants, armyLists };
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

  const addBattle = useCallback(
    (input: BattleInput, imports: ImportMap = {}): string => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      updateLocalCampaign((c) => {
        const { participants, armyLists } = applyImports(
          id,
          input,
          imports,
          c.armyLists
        );
        return {
          ...c,
          armyLists,
          battles: [
            ...c.battles,
            {
              ...input,
              participants,
              id,
              sortKey: keyForAppend(c.battles),
              createdBy: null,
              createdAt: now,
              updatedAt: now,
            },
          ],
        };
      });
      return id;
    },
    []
  );

  const updateBattle = useCallback(
    (id: string, input: BattleInput, imports: ImportMap = {}) => {
      updateLocalCampaign((c) => {
        const { participants, armyLists } = applyImports(
          id,
          input,
          imports,
          c.armyLists
        );
        return {
          ...c,
          armyLists,
          battles: c.battles.map((b) =>
            b.id === id
              ? {
                  ...b,
                  ...input,
                  participants,
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        };
      });
    },
    []
  );

  const deleteBattle = useCallback((id: string) => {
    updateLocalCampaign((c) => ({
      ...c,
      battles: c.battles.filter((b) => b.id !== id),
      armyLists: c.armyLists.filter((l) => l.battleId !== id),
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
