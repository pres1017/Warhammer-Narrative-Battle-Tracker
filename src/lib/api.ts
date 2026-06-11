import type {
  Battle,
  BattlePhoto,
  Body,
  CampaignSettings,
  CrusadeForce,
  CrusadeUnit,
  GeneratorParams,
  Participant,
  ScoreMode,
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
  settings: CampaignSettings;
}

export interface CampaignData {
  campaign: CampaignInfo;
  players: PlayerInfo[];
  system: StarSystem | null;
  battles: Battle[];
  armyLists: ArmyList[];
  photos: BattlePhoto[];
  crusadeForces: CrusadeForce[];
  crusadeUnits: CrusadeUnit[];
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
  score_mode: ScoreMode | null;
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
    scoreMode: row.score_mode ?? "simple",
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
  controlled_by: string | null;
}

interface CampaignRow {
  id: string;
  name: string;
  invite_code: string;
  system_locked: boolean;
  territory_enabled: boolean | null;
  crusade_enabled: boolean | null;
}

export function campaignFromRow(row: CampaignRow): CampaignInfo {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    systemLocked: row.system_locked,
    settings: {
      territoryEnabled: row.territory_enabled ?? false,
      crusadeEnabled: row.crusade_enabled ?? false,
    },
  };
}

export interface BattlePhotoRow {
  id: string;
  battle_id: string;
  storage_path: string;
  caption: string;
  uploaded_by: string | null;
  created_at: string;
}

export function photoFromRow(row: BattlePhotoRow): BattlePhoto {
  return {
    id: row.id,
    battleId: row.battle_id,
    storagePath: row.storage_path,
    caption: row.caption,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export interface CrusadeForceRow {
  id: string;
  player_id: string;
  name: string;
  faction: string;
  notes: string;
  created_at: string;
}

export function forceFromRow(row: CrusadeForceRow): CrusadeForce {
  return {
    id: row.id,
    playerId: row.player_id,
    name: row.name,
    faction: row.faction,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export interface CrusadeUnitRow {
  id: string;
  force_id: string;
  name: string;
  role: string;
  points: number | null;
  xp: number;
  battles_played: number;
  units_destroyed: number;
  honours: string[];
  scars: string[];
  notes: string;
  created_at: string;
}

export function unitFromRow(row: CrusadeUnitRow): CrusadeUnit {
  return {
    id: row.id,
    forceId: row.force_id,
    name: row.name,
    role: row.role,
    points: row.points,
    xp: row.xp,
    battlesPlayed: row.battles_played,
    unitsDestroyed: row.units_destroyed,
    honours: row.honours ?? [],
    scars: row.scars ?? [],
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function unitToColumns(patch: Partial<CrusadeUnit>): Record<string, unknown> {
  const cols: Record<string, unknown> = {};
  if (patch.name !== undefined) cols.name = patch.name;
  if (patch.role !== undefined) cols.role = patch.role;
  if (patch.points !== undefined) cols.points = patch.points;
  if (patch.xp !== undefined) cols.xp = patch.xp;
  if (patch.battlesPlayed !== undefined) cols.battles_played = patch.battlesPlayed;
  if (patch.unitsDestroyed !== undefined) cols.units_destroyed = patch.unitsDestroyed;
  if (patch.honours !== undefined) cols.honours = patch.honours;
  if (patch.scars !== undefined) cols.scars = patch.scars;
  if (patch.notes !== undefined) cols.notes = patch.notes;
  return cols;
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
  displayName: string,
  password?: string
): Promise<CampaignInfo> {
  const { data, error } = await getSupabase().rpc("create_campaign", {
    p_name: name,
    p_display_name: displayName,
    p_password: password?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return campaignFromRow(data as CampaignRow);
}

export async function joinCampaign(
  inviteCode: string,
  displayName: string,
  password?: string
): Promise<CampaignInfo> {
  const { data, error } = await getSupabase().rpc("join_campaign", {
    p_invite_code: inviteCode,
    p_display_name: displayName,
    p_password: password?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return campaignFromRow(data as CampaignRow);
}

// ---------------------------------------------------------------- fetch

export async function fetchCampaignData(
  campaignId: string,
  authUserId: string
): Promise<CampaignData> {
  const supabase = getSupabase();
  const [
    campaignRes,
    playersRes,
    systemRes,
    battlesRes,
    listsRes,
    photosRes,
    forcesRes,
    unitsRes,
  ] = await Promise.all([
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
    supabase.from("battle_photos").select("*").eq("campaign_id", campaignId),
    supabase.from("crusade_forces").select("*").eq("campaign_id", campaignId),
    supabase.from("crusade_units").select("*").eq("campaign_id", campaignId),
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
          controlledBy: b.controlled_by ?? "",
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
    campaign: campaignFromRow(campaignRes.data as CampaignRow),
    players,
    system,
    battles: ((battlesRes.data ?? []) as BattleRow[]).map(battleFromRow),
    armyLists: ((listsRes.data ?? []) as ArmyListRow[]).map(armyListFromRow),
    photos: ((photosRes.data ?? []) as BattlePhotoRow[]).map(photoFromRow),
    crusadeForces: ((forcesRes.data ?? []) as CrusadeForceRow[]).map(
      forceFromRow
    ),
    crusadeUnits: ((unitsRes.data ?? []) as CrusadeUnitRow[]).map(unitFromRow),
    myPlayerId: me?.id ?? null,
    myRole: me?.role ?? null,
  };
}

// ---------------------------------------------------------------- settings

export async function updateCampaignSettings(
  campaignId: string,
  settings: CampaignSettings
): Promise<void> {
  const { error } = await getSupabase()
    .from("campaigns")
    .update({
      territory_enabled: settings.territoryEnabled,
      crusade_enabled: settings.crusadeEnabled,
    })
    .eq("id", campaignId);
  if (error) throw new Error(error.message);
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
  scoreMode: ScoreMode;
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

  // The battle row must exist before army_lists rows can reference it
  // (battle_id FK), so insert it first and patch participants afterwards.
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
      participants: input.participants,
      notes: input.notes,
      score_mode: input.scoreMode,
      created_by: myPlayerId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  let battle = battleFromRow(data as BattleRow);

  const { participants, created } = await uploadArmyLists(
    campaignId,
    battleId,
    myPlayerId,
    input.participants,
    imports
  );

  if (created.length > 0) {
    const { data: patched, error: patchError } = await supabase
      .from("battles")
      .update({ participants })
      .eq("id", battleId)
      .select()
      .single();
    if (patchError) throw new Error(patchError.message);
    battle = battleFromRow(patched as BattleRow);
  }

  return { battle, armyLists: created };
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
      score_mode: input.scoreMode,
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

// ---------------------------------------------------------------- bodies

/** Rename/redescribe a system body (RLS allows admins and moderators). */
export async function updateBodyRow(
  bodyId: string,
  patch: { name: string; blurb: string }
): Promise<void> {
  const { error } = await getSupabase()
    .from("system_bodies")
    .update(patch)
    .eq("id", bodyId);
  if (error) throw new Error(error.message);
}

/** Set (or clear, with "") the controlling faction of a body. Members only,
 * enforced by the claim_body RPC. */
export async function claimBody(
  bodyId: string,
  faction: string
): Promise<void> {
  const { error } = await getSupabase().rpc("claim_body", {
    p_body_id: bodyId,
    p_faction: faction,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- photos

const PHOTO_BUCKET = "battle-photos";

export async function uploadBattlePhoto(
  campaignId: string,
  battleId: string,
  myPlayerId: string,
  file: File
): Promise<BattlePhoto> {
  const supabase = getSupabase();
  const photoId = crypto.randomUUID();
  const storagePath = `${campaignId}/${battleId}/${photoId}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, file, { contentType: file.type || "image/jpeg" });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("battle_photos")
    .insert({
      id: photoId,
      campaign_id: campaignId,
      battle_id: battleId,
      storage_path: storagePath,
      uploaded_by: myPlayerId,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  return photoFromRow(data as BattlePhotoRow);
}

export async function deleteBattlePhoto(photo: BattlePhoto): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("battle_photos")
    .delete()
    .eq("id", photo.id);
  if (error) throw new Error(error.message);
  if (photo.storagePath) {
    await supabase.storage.from(PHOTO_BUCKET).remove([photo.storagePath]);
  }
}

/** Short-lived signed URL for viewing a stored photo. */
export async function photoUrl(storagePath: string): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(PHOTO_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data) throw new Error(error?.message ?? "No signed URL");
  return data.signedUrl;
}

// ---------------------------------------------------------------- crusade

export async function insertCrusadeForce(
  campaignId: string,
  playerId: string,
  input: { name: string; faction: string; notes: string }
): Promise<CrusadeForce> {
  const { data, error } = await getSupabase()
    .from("crusade_forces")
    .insert({
      campaign_id: campaignId,
      player_id: playerId,
      name: input.name,
      faction: input.faction,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return forceFromRow(data as CrusadeForceRow);
}

export async function deleteCrusadeForce(forceId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("crusade_forces")
    .delete()
    .eq("id", forceId);
  if (error) throw new Error(error.message);
}

export async function insertCrusadeUnit(
  campaignId: string,
  forceId: string,
  input: Partial<CrusadeUnit> & { name: string }
): Promise<CrusadeUnit> {
  const { data, error } = await getSupabase()
    .from("crusade_units")
    .insert({
      campaign_id: campaignId,
      force_id: forceId,
      ...unitToColumns(input),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return unitFromRow(data as CrusadeUnitRow);
}

export async function updateCrusadeUnit(
  unitId: string,
  patch: Partial<CrusadeUnit>
): Promise<CrusadeUnit> {
  const { data, error } = await getSupabase()
    .from("crusade_units")
    .update(unitToColumns(patch))
    .eq("id", unitId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return unitFromRow(data as CrusadeUnitRow);
}

export async function deleteCrusadeUnit(unitId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("crusade_units")
    .delete()
    .eq("id", unitId);
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
