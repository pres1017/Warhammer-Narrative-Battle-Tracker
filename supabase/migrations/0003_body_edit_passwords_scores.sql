-- 0003 — planet editing for mods, optional name passwords (when2meet style),
-- and per-battle final scoring. Paste into the Supabase SQL editor after 0002.

-- ============================================================ body editing

-- Admins and moderators may rename bodies and rewrite their descriptions.
create policy bodies_update on system_bodies
  for update using (is_mod(campaign_id));

-- ============================================================ battle scoring

-- 'simple' = one final total per combatant; 'detailed' = primary + secondary.
alter table battles add column score_mode text not null default 'simple'
  check (score_mode in ('simple', 'detailed'));

-- ============================================================ name passwords

-- Hashes live in a side table that has RLS enabled and NO policies, no
-- grants, and is not in the realtime publication: only the security-definer
-- RPCs below can touch it, so hashes never reach a client.
create extension if not exists pgcrypto with schema extensions;

create table player_secrets (
  player_id     uuid primary key references players(id) on delete cascade,
  password_hash text not null
);
alter table player_secrets enable row level security;
revoke all on player_secrets from anon, authenticated;

-- Replace the entry RPCs with password-aware versions (drop first: a changed
-- signature would otherwise create an ambiguous overload for PostgREST).
drop function if exists create_campaign(text, text);
drop function if exists join_campaign(text, text);

create or replace function create_campaign(
  p_name text,
  p_display_name text,
  p_password text default null
)
returns campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign campaigns;
  v_code text;
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if length(trim(p_name)) = 0 or length(trim(p_display_name)) = 0 then
    raise exception 'Campaign name and display name are required';
  end if;

  -- 6-char Crockford-ish invite code (no pgcrypto; it lives outside our
  -- pinned search_path on Supabase); retry on the (unlikely) collision.
  loop
    v_code := (
      select string_agg(
        substr('ABCDEFGHJKMNPQRSTVWXYZ0123456789', (floor(random() * 32))::int + 1, 1),
        ''
      )
      from generate_series(1, 6)
    );
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
  values (v_campaign.id, auth.uid(), trim(p_display_name), 'admin')
  returning id into v_player_id;

  if p_password is not null and length(trim(p_password)) > 0 then
    insert into player_secrets (player_id, password_hash)
    values (v_player_id, extensions.crypt(p_password, extensions.gen_salt('bf')));
  end if;

  return v_campaign;
end;
$$;

-- Join semantics (when2meet style):
--   * new name → creates the player; an optional password protects the name.
--   * existing name, no password → typing the name claims it on this device.
--   * existing name with password → the password is required to claim it.
--   * already a member → idempotent; may set a password if none exists yet.
create or replace function join_campaign(
  p_invite_code text,
  p_display_name text,
  p_password text default null
)
returns campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign campaigns;
  v_player players;
  v_hash text;
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

  -- Already a member on this device/session.
  select * into v_player from players
  where campaign_id = v_campaign.id and auth_user_id = auth.uid();
  if found then
    if p_password is not null and length(trim(p_password)) > 0 then
      insert into player_secrets (player_id, password_hash)
      values (v_player.id, extensions.crypt(p_password, extensions.gen_salt('bf')))
      on conflict (player_id) do nothing;
    end if;
    return v_campaign;
  end if;

  -- The name already exists in this campaign → claim it.
  select * into v_player from players
  where campaign_id = v_campaign.id
    and lower(display_name) = lower(trim(p_display_name));
  if found then
    select password_hash into v_hash
    from player_secrets where player_id = v_player.id;
    if v_hash is not null then
      if p_password is null
         or extensions.crypt(p_password, v_hash) <> v_hash then
        raise exception 'That name is protected by a password.';
      end if;
    elsif p_password is not null and length(trim(p_password)) > 0 then
      -- Claiming an unprotected name with a password locks it in.
      insert into player_secrets (player_id, password_hash)
      values (v_player.id, extensions.crypt(p_password, extensions.gen_salt('bf')));
    end if;
    -- Bind the name to this device; the previous device binding is dropped.
    update players set auth_user_id = auth.uid() where id = v_player.id;
    return v_campaign;
  end if;

  -- Brand-new player.
  insert into players (campaign_id, auth_user_id, display_name)
  values (v_campaign.id, auth.uid(), trim(p_display_name))
  returning * into v_player;

  if p_password is not null and length(trim(p_password)) > 0 then
    insert into player_secrets (player_id, password_hash)
    values (v_player.id, extensions.crypt(p_password, extensions.gen_salt('bf')));
  end if;

  return v_campaign;
end;
$$;
