-- Warhammer Battle Mapper — initial schema, RPCs, and RLS.
-- Apply via the Supabase dashboard SQL editor. Requires anonymous sign-ins
-- to be enabled (Authentication → Sign In / Up → Anonymous).

-- ============================================================ tables

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  invite_code   text not null unique,
  system_locked boolean not null default false,
  created_at    timestamptz not null default now()
);

create table players (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  auth_user_id uuid not null,
  display_name text not null,
  role         text not null default 'member'
               check (role in ('admin', 'moderator', 'member')),
  created_at   timestamptz not null default now(),
  unique (campaign_id, auth_user_id)
);

create table systems (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references campaigns(id) on delete cascade,
  seed        text not null,
  params      jsonb not null,
  star        jsonb not null,
  warp_storm_intensity int not null default 0
);

create table system_bodies (
  id             uuid primary key default gen_random_uuid(),
  system_id      uuid not null references systems(id) on delete cascade,
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  client_id      text not null,            -- generator's body id ("planet-3")
  kind           text not null check (kind in ('planet','moon','belt','station','poi')),
  parent_id      uuid references system_bodies(id),
  name           text not null,
  classification text,
  orbit_index    int not null,
  visual         jsonb not null,
  blurb          text not null default '',
  tags           jsonb not null default '[]',
  unique (system_id, client_id)
);

create table battles (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  location_id  uuid references system_bodies(id) on delete set null,
  sort_key     text not null,
  title        text not null default '',
  mission      text not null default '',
  fought_at    date,
  winner       text not null default '',
  participants jsonb not null default '[]',
  notes        text not null default '',
  created_by   uuid references players(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index battles_campaign_idx on battles (campaign_id, sort_key);

create table army_lists (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  battle_id       uuid not null references battles(id) on delete cascade,
  participant_key text not null,
  format          text not null check (format in ('newrecruit_json','ros','rosz')),
  source_filename text not null,
  roster          jsonb not null,
  storage_path    text,
  uploaded_by     uuid references players(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index army_lists_battle_idx on army_lists (battle_id);

-- ============================================================ helpers

create or replace function is_member(cid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from players
    where campaign_id = cid and auth_user_id = auth.uid()
  );
$$;

create or replace function is_mod(cid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from players
    where campaign_id = cid
      and auth_user_id = auth.uid()
      and role in ('admin', 'moderator')
  );
$$;

create or replace function is_admin(cid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from players
    where campaign_id = cid
      and auth_user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function my_player_id(cid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from players
  where campaign_id = cid and auth_user_id = auth.uid();
$$;

-- ============================================================ entry RPCs

-- Creates a campaign; the caller becomes its admin. Returns the campaign row.
create or replace function create_campaign(p_name text, p_display_name text)
returns campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign campaigns;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if length(trim(p_name)) = 0 or length(trim(p_display_name)) = 0 then
    raise exception 'Campaign name and display name are required';
  end if;

  -- 6-char Crockford-ish invite code; retry on the (unlikely) collision.
  loop
    v_code := upper(substring(replace(replace(encode(gen_random_bytes(8), 'base64'), '/', ''), '+', '') from 1 for 6));
    begin
      insert into campaigns (name, invite_code)
      values (trim(p_name), v_code)
      returning * into v_campaign;
      exit;
    exception when unique_violation then
      -- regenerate and retry
    end;
  end loop;

  insert into players (campaign_id, auth_user_id, display_name, role)
  values (v_campaign.id, auth.uid(), trim(p_display_name), 'admin');

  return v_campaign;
end;
$$;

-- Joins a campaign by invite code (idempotent for existing members).
create or replace function join_campaign(p_invite_code text, p_display_name text)
returns campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign campaigns;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if length(trim(p_display_name)) = 0 then
    raise exception 'Display name is required';
  end if;

  select * into v_campaign from campaigns
  where invite_code = upper(trim(p_invite_code));
  if not found then
    raise exception 'No campaign found for that invite code';
  end if;

  insert into players (campaign_id, auth_user_id, display_name)
  values (v_campaign.id, auth.uid(), trim(p_display_name))
  on conflict (campaign_id, auth_user_id) do nothing;

  return v_campaign;
end;
$$;

-- ============================================================ RLS

alter table campaigns enable row level security;
alter table players enable row level security;
alter table systems enable row level security;
alter table system_bodies enable row level security;
alter table battles enable row level security;
alter table army_lists enable row level security;

-- campaigns: members read; admins update (rename, lock); no direct
-- insert/delete (creation goes through the RPC).
create policy campaigns_select on campaigns
  for select using (is_member(id));
create policy campaigns_update on campaigns
  for update using (is_admin(id));

-- players: members read the roster; admins change roles; admins/mods
-- remove players (and players may remove themselves).
create policy players_select on players
  for select using (is_member(campaign_id));
create policy players_update on players
  for update using (is_admin(campaign_id));
create policy players_delete on players
  for delete using (is_mod(campaign_id) or auth_user_id = auth.uid());

-- systems / bodies: members read; only the admin inscribes the system.
create policy systems_select on systems
  for select using (is_member(campaign_id));
create policy systems_insert on systems
  for insert with check (is_admin(campaign_id));
create policy bodies_select on system_bodies
  for select using (is_member(campaign_id));
create policy bodies_insert on system_bodies
  for insert with check (is_admin(campaign_id));

-- battles: members read + add; owners and mods edit/delete.
create policy battles_select on battles
  for select using (is_member(campaign_id));
create policy battles_insert on battles
  for insert with check (
    is_member(campaign_id) and created_by = my_player_id(campaign_id)
  );
create policy battles_update on battles
  for update using (
    is_mod(campaign_id) or created_by = my_player_id(campaign_id)
  );
create policy battles_delete on battles
  for delete using (
    is_mod(campaign_id) or created_by = my_player_id(campaign_id)
  );

-- army lists: members read + add; owners and mods replace/remove.
create policy army_lists_select on army_lists
  for select using (is_member(campaign_id));
create policy army_lists_insert on army_lists
  for insert with check (
    is_member(campaign_id) and uploaded_by = my_player_id(campaign_id)
  );
create policy army_lists_delete on army_lists
  for delete using (
    is_mod(campaign_id) or uploaded_by = my_player_id(campaign_id)
  );

-- ============================================================ storage

-- Raw army files live in the "army-files" bucket under {campaign_id}/...;
-- only campaign members can read or write them.
insert into storage.buckets (id, name, public)
values ('army-files', 'army-files', false)
on conflict (id) do nothing;

create policy army_files_read on storage.objects
  for select using (
    bucket_id = 'army-files'
    and is_member(((string_to_array(name, '/'))[1])::uuid)
  );
create policy army_files_insert on storage.objects
  for insert with check (
    bucket_id = 'army-files'
    and is_member(((string_to_array(name, '/'))[1])::uuid)
  );
create policy army_files_delete on storage.objects
  for delete using (
    bucket_id = 'army-files'
    and is_member(((string_to_array(name, '/'))[1])::uuid)
  );

-- ============================================================ realtime

alter publication supabase_realtime add table campaigns;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table systems;
alter publication supabase_realtime add table system_bodies;
alter publication supabase_realtime add table battles;
alter publication supabase_realtime add table army_lists;
