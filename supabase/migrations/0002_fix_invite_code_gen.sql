-- Fix: create_campaign failed with "function gen_random_bytes(integer) does
-- not exist". pgcrypto lives in the `extensions` schema on Supabase, outside
-- this function's pinned `search_path = public`. Generate the invite code
-- with plain random() instead — the collision-retry loop already guarantees
-- uniqueness, and invite codes are not security-critical secrets.

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
  values (v_campaign.id, auth.uid(), trim(p_display_name), 'admin');

  return v_campaign;
end;
$$;
