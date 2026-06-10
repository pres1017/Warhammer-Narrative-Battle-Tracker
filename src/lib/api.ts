import type {
  Battle,
  Body,
  GeneratorParams,
  Participant,
  Star,
  StarSystem,
} from "./types";
import type { ArmyList, NormalizedRoster, RosterFormat } from "./rosters/types";
import { base64ToBytes } from "./rosters/file";
import { getSupabase } from "./supabase";

export type Role = "admin" | "moderator" | "member";

export interface PlayerInfo {
  id: string;
  displayName: string;
  role: Role;
  authUserId: string;
}

export interface CampaignInfo {
  id: string;
  name: string;
  inviteCode: string;
  systemLocked: boolean;
}

export interface CampaignData {
  campaign: CampaignInfo;
  players: PlayerInfo[];
  system: StarSystem | null;
  battles: Battle[];
  armyLists: ArmyList[];
  myPlayerId: string | null;
  myRole: Role | null;
}

/** Imports passed alongside battle saves (same shape as the local hook). */
export interface RemotePendingImport {
  format: RosterFormat;
  sourceFilename: string;
  roster: NormalizedRoster;
  rawBase64: string;
}

// ---------------------------------------------------------------- mapping

export interface BattleRow {
  id: string;
  location_id: string | null;
  sort_key: string;
  title: string;
  mission: string;
  fought_at: string | null;
  winner: string;
  participants: Participant[];
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function battleFromRow(row: BattleRow): Battle {
  return {
    id: row.id,
    locationId: row.location_id,
    sortKey: row.sort_key,
    title: row.title,
    mission: row.mission,
    foughtAt: row.fought_at,
    winner: row.winner,
    participants: row.participants ?? [],
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface BodyRow {
  id: string;
  kind: Body["kind"];
  parent_id: string | null;
  name: string;
  classification: Body["classification"];
  orbit_index: number;
  visual: Body["visual"];
  blurb: string;
  tags: string[];
}

export interface ArmyListRow {
  id: string;
  battle_id: string;
  participant_key: string;
  format: RosterFormat;
  source_filename: string;
  roster: NormalizedRoster;
  storage_path: string | null;
}

export function armyListFromRow(row: ArmyListRow): ArmyList {
  return {
    id: row.id,
    battleId: row.battle_id,
    participantKey: row.participant_key,
    format: row.format,
    sourceFilename: row.source_filename,
    roster: row.roster,
    storagePath: row.storage_path,
  };
}

// ---------------------------------------------------------------- entry

export async function createCampaign(
  name: string,
  displayName: string
): Promise<CampaignInfo> {
  const { data, error } = await getSupabase().rpc("create_campaign", {
    p_name: name,
    p_display_name: displayName,
  });
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    systemLocked: data.system_locked,
  };
}

export async function joinCampaign(
  inviteCode: string,
  displayName: string
): Promise<CampaignInfo> {
  const { data, error } = await getSupabase().rpc("join_campaign", {
    p_invite_code: inviteCode,
    p_display_name: displayName,
  });
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    systemLocked: data.system_locked,
  };
}

// ---------------------------------------------------------------- fetch

export async function fetchCampaignData(
  campaignId: string,
  authUserId: string
): Promise<CampaignData> {
  const supabase = getSupabase();
  const [campaignRes, playersRes, systemRes, battlesRes, listsRes] =
    await Promise.all([
      supabase.from("campaigns").select("*").eq("id", campaignId).single(),
      supabase.from("players").select("*").eq("campaign_id", campaignId),
      supabase
        .from("systems")
        .select("*, system_bodies(*)")
        .eq("campaign_id", campaignId)
        .maybeSingle(),
      supabase
        .from("battles")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("sort_key"),
      supabase.from("army_lists").select("*").eq("campaign_id", campaignId),
    ]);

  if (campaignRes.error) {
    throw new Error(
      "Campaign not found — you may need an invite to join it."
    );
  }

  const players: PlayerInfo[] = (playersRes.data ?? []).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    role: p.role,
    authUserId: p.auth_user_id,
  }));
  const me = players.find((p) => p.authUserId === authUserId) ?? null;

  let system: StarSystem | null = null;
  if (systemRes.data) {
    const row = systemRes.data;
    const bodies = ((row.system_bodies ?? []) as BodyRow[])
      .map(
        (b): Body => ({
          id: b.id,
          kind: b.kind,
          parentId: b.parent_id,
          name: b.name,
          classification: b.classification,
          orbitIndex: b.orbit_index,
          visual: b.visual,
          blurb: b.blurb,
          tags: b.tags ?? [],
        })
      )
      .sort((a, b) => a.orbitIndex - b.orbitIndex);
    system = {
      seed: row.seed,
      params: row.params as GeneratorParams,
      star: row.star as Star,
      bodies,
      warpStormIntensity: row.warp_storm_intensity,
    };
  }

  return {
    campaign: {
      id: campaignRes.data.id,
      name: campaignRes.data.name,
      inviteCode: campaignRes.data.invite_code,
      systemLocked: campaignRes.data.system_locked,
    },
    players,
    system,
    battles: ((battlesRes.data ?? []) as BattleRow[]).map(battleFromRow),
    armyLists: ((listsRes.data ?? []) as ArmyListRow[]).map(armyListFromRow),
    myPlayerId: me?.id ?? null,
    myRole: me?.role ?? null,
  };
}

// ---------------------------------------------------------------- system

/** Inscribes the generated system: bodies get fresh uuids, battles FK them. */
export async function lockSystem(
  campaignId: string,
  system: StarSystem
): Promise<void> {
  const supabase = getSupabase();
  const systemId = crypto.randomUUID();

  const { error: sysError } = await supabase.from("systems").insert({
    id: systemId,
    campaign_id: campaignId,
    seed: system.seed,
    params: system.params,
    star: system.star,
    warp_storm_intensity: system.warpStormIntensity,
  });
  if (sysError) throw new Error(sysError.message);

  const idMap = new Map<string, string>(
    system.bodies.map((b) => [b.id, crypto.randomUUID()])
  );
  const rows = system.bodies.map((b) => ({
    id: idMap.get(b.id)!,
    system_id: systemId,
    campaign_id: campaignId,
    client_id: b.id,
    kind: b.kind,
    parent_id: b.parentId ? (idMap.get(b.parentId) ?? null) : null,
    name: b.name,
    classification: b.classification,
    orbit_index: b.orbitIndex,
    visual: b.visual,
    blurb: b.blurb,
    tags: b.tags,
  }));
  const { error: bodiesError } = await supabase
    .from("system_bodies")
    .insert(rows);
  if (bodiesError) throw new Error(bodiesError.message);

  const { error: lockError } = await supabase
    .from("campaigns")
    .update({ system_locked: true })
    .eq("id", campaignId);
  if (lockError) throw new Error(lockError.message);
}

// ---------------------------------------------------------------- battles

async function uploadArmyLists(
  campaignId: string,
  battleId: string,
  myPlayerId: string,
  participants: Participant[],
  imports: Record<string, RemotePendingImport>
): Promise<{ participants: Participant[]; created: ArmyList[] }> {
  const supabase = getSupabase();
  const created: ArmyList[] = [];

  const updated = await Promise.all(
    participants.map(async (p) => {
      const pending = imports[p.key];
      if (!pending) return p;

      const listId = crypto.randomUUID();
      const storagePath = `${campaignId}/${listId}/${pending.sourceFilename}`;
      const bytes = base64ToBytes(pending.rawBase64);
      const { error: uploadError } = await supabase.storage
        .from("army-files")
        .upload(storagePath, new Blob([new Uint8Array(bytes)]), {
          contentType: "application/octet-stream",
        });
      // A failed raw-file upload is not fatal; the parsed roster still saves.
      const path = uploadError ? null : storagePath;

      const { error } = await supabase.from("army_lists").insert({
        id: listId,
        campaign_id: campaignId,
        battle_id: battleId,
        participant_key: p.key,
        format: pending.format,
        source_filename: pending.sourceFilename,
        roster: pending.roster,
        storage_path: path,
        uploaded_by: myPlayerId,
      });
      if (error) throw new Error(error.message);

      created.push({
        id: listId,
        battleId,
        participantKey: p.key,
        format: pending.format,
        sourceFilename: pending.sourceFilename,
        roster: pending.roster,
        storagePath: path,
      });
      return { ...p, armyListId: listId };
    })
  );

  return { participants: updated, created };
}

export interface BattleSaveInput {
  locationId: string | null;
  title: string;
  mission: string;
  foughtAt: string | null;
  winner: string;
  participants: Participant[];
  notes: string;
}

export async function insertBattle(
  campaignId: string,
  myPlayerId: string,
  input: BattleSaveInput,
  sortKey: string,
  imports: Record<string, RemotePendingImport>
): Promise<{ battle: Battle; armyLists: ArmyList[] }> {
  const supabase = getSupabase();
  const battleId = crypto.randomUUID();

  const { participants, created } = await uploadArmyLists(
    campaignId,
    battleId,
    myPlayerId,
    input.participants,
    imports
  );

  const { data, error } = await supabase
    .from("battles")
    .insert({
      id: battleId,
      campaign_id: campaignId,
      location_id: input.locationId,
      sort_key: sortKey,
      title: input.title,
      mission: input.mission,
      fought_at: input.foughtAt,
      winner: input.winner,
      participants,
      notes: input.notes,
      created_by: myPlayerId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { battle: battleFromRow(data as BattleRow), armyLists: created };
}

export async function updateBattleRow(
  campaignId: string,
  myPlayerId: string,
  battleId: string,
  input: BattleSaveInput,
  imports: Record<string, RemotePendingImport>
): Promise<{ battle: Battle; armyLists: ArmyList[] }> {
  const supabase = getSupabase();

  const { participants, created } = await uploadArmyLists(
    campaignId,
    battleId,
    myPlayerId,
    input.participants,
    imports
  );

  // Replaced imports: remove the superseded army list rows.
  const replacedKeys = Object.keys(imports);
  if (replacedKeys.length > 0) {
    await supabase
      .from("army_lists")
      .delete()
      .eq("battle_id", battleId)
      .in("participant_key", replacedKeys)
      .not("id", "in", `(${created.map((l) => l.id).join(",")})`);
  }

  const { data, error } = await supabase
    .from("battles")
    .update({
      location_id: input.locationId,
      title: input.title,
      mission: input.mission,
      fought_at: input.foughtAt,
      winner: input.winner,
      participants,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", battleId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { battle: battleFromRow(data as BattleRow), armyLists: created };
}

export async function deleteBattleRow(battleId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("battles")
    .delete()
    .eq("id", battleId);
  if (error) throw new Error(error.message);
}

export async function moveBattleRow(
  battleId: string,
  sortKey: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("battles")
    .update({ sort_key: sortKey, updated_at: new Date().toISOString() })
    .eq("id", battleId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- players

export async function setPlayerRole(
  playerId: string,
  role: Role
): Promise<void> {
  const { error } = await getSupabase()
    .from("players")
    .update({ role })
    .eq("id", playerId);
  if (error) throw new Error(error.message);
}

export async function removePlayer(playerId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("players")
    .delete()
    .eq("id", playerId);
  if (error) throw new Error(error.message);
}
