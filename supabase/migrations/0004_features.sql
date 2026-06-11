-- 0004 — campaign feature toggles, territory control, battle photos, and
-- crusade tracking. Paste into the Supabase SQL editor after 0003.

-- ============================================================ settings

-- Per-campaign feature flags, changed only by the admin (campaigns_update
-- policy is already admin-only) via an explicit Save in the settings panel.
alter table campaigns
  add column territory_enabled boolean not null default false,
  add column crusade_enabled boolean not null default false;

-- ============================================================ territory

alter table system_bodies add column controlled_by text not null default '';

-- Any member may claim a world for a faction (battle outcomes are
-- member-driven); name/blurb editing stays mod-only via bodies_update.
create or replace function claim_body(p_body_id uuid, p_faction text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
begin
  select campaign_id into v_campaign_id
  from system_bodies where id = p_body_id;
  if not found then
    raise exception 'No such body';
  end if;
  if not is_member(v_campaign_id) then
    raise exception 'Not a member of this campaign';
  end if;
  update system_bodies
  set controlled_by = coalesce(trim(p_faction), '')
  where id = p_body_id;
end;
$$;

-- ============================================================ battle photos

create table battle_photos (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  battle_id    uuid not null references battles(id) on delete cascade,
  storage_path text not null,
  caption      text not null default '',
  uploaded_by  uuid references players(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index battle_photos_battle_idx on battle_photos (battle_id);

alter table battle_photos enable row level security;
create policy battle_photos_select on battle_photos
  for select using (is_member(campaign_id));
create policy battle_photos_insert on battle_photos
  for insert with check (
    is_member(campaign_id) and uploaded_by = my_player_id(campaign_id)
  );
create policy battle_photos_delete on battle_photos
  for delete using (
    is_mod(campaign_id) or uploaded_by = my_player_id(campaign_id)
  );

insert into storage.buckets (id, name, public)
values ('battle-photos', 'battle-photos', false)
on conflict (id) do nothing;

create policy battle_photos_read on storage.objects
  for select using (
    bucket_id = 'battle-photos'
    and is_member(((string_to_array(name, '/'))[1])::uuid)
  );
create policy battle_photos_write on storage.objects
  for insert with check (
    bucket_id = 'battle-photos'
    and is_member(((string_to_array(name, '/'))[1])::uuid)
  );
create policy battle_photos_remove on storage.objects
  for delete using (
    bucket_id = 'battle-photos'
    and is_member(((string_to_array(name, '/'))[1])::uuid)
  );

-- ============================================================ crusade

create table crusade_forces (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  name        text not null,
  faction     text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);
create index crusade_forces_campaign_idx on crusade_forces (campaign_id);

create table crusade_units (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  force_id        uuid not null references crusade_forces(id) on delete cascade,
  name            text not null,
  role            text not null default '',
  points          int,
  xp              int not null default 0,
  battles_played  int not null default 0,
  units_destroyed int not null default 0,
  honours         jsonb not null default '[]',
  scars           jsonb not null default '[]',
  notes           text not null default '',
  created_at      timestamptz not null default now()
);
create index crusade_units_force_idx on crusade_units (force_id);

-- True when the current user owns the force (or is a mod of its campaign).
create or replace function owns_force(fid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from crusade_forces f
    where f.id = fid
      and (f.player_id = my_player_id(f.campaign_id) or is_mod(f.campaign_id))
  );
$$;

alter table crusade_forces enable row level security;
create policy crusade_forces_select on crusade_forces
  for select using (is_member(campaign_id));
create policy crusade_forces_insert on crusade_forces
  for insert with check (
    is_member(campaign_id)
    and (player_id = my_player_id(campaign_id) or is_mod(campaign_id))
  );
create policy crusade_forces_update on crusade_forces
  for update using (
    player_id = my_player_id(campaign_id) or is_mod(campaign_id)
  );
create policy crusade_forces_delete on crusade_forces
  for delete using (
    player_id = my_player_id(campaign_id) or is_mod(campaign_id)
  );

alter table crusade_units enable row level security;
create policy crusade_units_select on crusade_units
  for select using (is_member(campaign_id));
create policy crusade_units_insert on crusade_units
  for insert with check (is_member(campaign_id) and owns_force(force_id));
create policy crusade_units_update on crusade_units
  for update using (owns_force(force_id));
create policy crusade_units_delete on crusade_units
  for delete using (owns_force(force_id));

-- ============================================================ realtime

alter publication supabase_realtime add table battle_photos;
alter publication supabase_realtime add table crusade_forces;
alter publication supabase_realtime add table crusade_units;
