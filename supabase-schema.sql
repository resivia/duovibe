-- ═══════════════════════════════════════════════════════════════════
-- DuoVibe — Supabase schema, security and RPCs
-- ═══════════════════════════════════════════════════════════════════
-- Idempotent: safe to run repeatedly and safe on the existing database.
-- It never drops a table and never deletes a room.
--
-- What this file sets up
--   1. rooms table matching the client (see supabase-lite.js / app.js)
--   2. Row level security that works BOTH with and without anonymous auth
--   3. Four SECURITY DEFINER functions the client calls instead of doing
--      read-modify-write on the table
--   4. Optional scheduled cleanup of abandoned rooms
--
-- Step you must do in the dashboard for anonymous auth:
--   Authentication → Sign In / Providers → Anonymous sign-ins → Enable
-- Until you do, the app keeps working in anon-key mode (policies below
-- already allow that), it just cannot scope rows to a real user.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. table ────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id             text primary key,
  host_id        text,
  host_name      text,
  players        jsonb       not null default '[]'::jsonb,
  state          text        not null default 'LOBBY',
  game_type      text,
  current_prompt jsonb,
  choices        jsonb       not null default '{}'::jsonb,
  streak         integer     not null default 0,
  round          integer     not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.rooms add column if not exists host_id        text;
alter table public.rooms add column if not exists host_name      text;
alter table public.rooms add column if not exists players        jsonb   not null default '[]'::jsonb;
alter table public.rooms add column if not exists state          text    not null default 'LOBBY';
alter table public.rooms add column if not exists game_type      text;
alter table public.rooms add column if not exists current_prompt jsonb;
alter table public.rooms add column if not exists choices        jsonb   not null default '{}'::jsonb;
alter table public.rooms add column if not exists streak         integer not null default 0;
alter table public.rooms add column if not exists round          integer not null default 1;
alter table public.rooms add column if not exists created_at     timestamptz not null default now();
alter table public.rooms add column if not exists updated_at     timestamptz not null default now();

create index if not exists rooms_updated_at_idx on public.rooms (updated_at desc);

-- keep updated_at honest even if a client forgets
create or replace function public.duovibe_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at
  before update on public.rooms
  for each row execute function public.duovibe_touch_updated_at();

-- ── 2. row level security ──────────────────────────────────────────
alter table public.rooms enable row level security;

drop policy if exists "Public rooms"     on public.rooms;
drop policy if exists "duovibe select"   on public.rooms;
drop policy if exists "duovibe insert"   on public.rooms;
drop policy if exists "duovibe update"   on public.rooms;
drop policy if exists "duovibe delete"   on public.rooms;

-- Read: you can see a room if you are in it, if you host it, or if this
-- project has no auth at all (anon-key mode, where auth.uid() is null).
create policy "duovibe select" on public.rooms for select
using (
  auth.uid() is null
  or host_id = auth.uid()::text
  or players @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
);

-- Create: only as yourself.
create policy "duovibe insert" on public.rooms for insert
with check (auth.uid() is null or host_id = auth.uid()::text);

-- Change game state: host only. Guests go through dv_set_choice().
create policy "duovibe update" on public.rooms for update
using (auth.uid() is null or host_id = auth.uid()::text)
with check (auth.uid() is null or host_id = auth.uid()::text);

-- Delete: host only, or the dv_leave_room() function.
create policy "duovibe delete" on public.rooms for delete
using (auth.uid() is null or host_id = auth.uid()::text);

-- ── 3. RPCs ────────────────────────────────────────────────────────
-- Every function resolves the caller as:
--     coalesce(auth.uid()::text, p_uid)
-- so anonymous auth is used when it is available, and the client's local
-- id is used when anonymous sign-ins are switched off. An authenticated
-- caller can never impersonate someone else: p_uid is ignored for them.

create or replace function public.dv_caller(p_uid text)
returns text language sql stable as $$
  select coalesce(auth.uid()::text, nullif(p_uid, ''));
$$;

-- Create a room with a free 4-digit code. Retries internally so the
-- client never sees a duplicate-key error.
create or replace function public.dv_create_room(p_name text, p_uid text default null)
returns setof public.rooms
language plpgsql security definer set search_path = public as $$
declare
  v_uid  text := public.dv_caller(p_uid);
  v_code text;
  v_try  int := 0;
begin
  if v_uid is null then
    raise exception 'No identity available' using errcode = '28000';
  end if;

  loop
    v_try := v_try + 1;
    v_code := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');

    begin
      return query
        insert into public.rooms (id, host_id, host_name, players, state, choices, streak, round)
        values (
          v_code,
          v_uid,
          left(coalesce(nullif(trim(p_name), ''), 'Host'), 20),
          jsonb_build_array(jsonb_build_object(
            'id', v_uid,
            'name', left(coalesce(nullif(trim(p_name), ''), 'Host'), 20),
            'role', 'host'
          )),
          'LOBBY', '{}'::jsonb, 0, 1
        )
        returning *;
      return;
    exception when unique_violation then
      if v_try >= 40 then
        raise exception 'No free room code available, try again shortly';
      end if;
    end;
  end loop;
end;
$$;

-- Join by code. Adds or renames the caller. Caps a room at two players.
create or replace function public.dv_join_room(p_code text, p_name text, p_uid text default null)
returns setof public.rooms
language plpgsql security definer set search_path = public as $$
declare
  v_uid     text := public.dv_caller(p_uid);
  v_name    text := left(coalesce(nullif(trim(p_name), ''), 'Player'), 20);
  v_room    public.rooms;
  v_players jsonb;
  v_at      int;
begin
  if v_uid is null then
    raise exception 'No identity available' using errcode = '28000';
  end if;

  select * into v_room from public.rooms where id = upper(trim(p_code)) for update;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  v_players := coalesce(v_room.players, '[]'::jsonb);

  -- already in the room: just update the display name
  select (ord - 1) into v_at
  from jsonb_array_elements(v_players) with ordinality as t(p, ord)
  where p->>'id' = v_uid
  limit 1;

  if v_at is not null then
    v_players := jsonb_set(v_players, array[v_at::text, 'name'], to_jsonb(v_name));
  else
    if jsonb_array_length(v_players) >= 2 then
      raise exception 'Room is full' using errcode = '23505';
    end if;
    v_players := v_players || jsonb_build_array(jsonb_build_object(
      'id', v_uid, 'name', v_name, 'role', 'player'
    ));
  end if;

  return query
    update public.rooms
       set players = v_players
     where id = v_room.id
    returning *;
end;
$$;

-- Remove the caller. Deletes the room when the host leaves or when nobody
-- is left, so abandoned rooms do not pile up forever.
create or replace function public.dv_leave_room(p_code text, p_uid text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid     text := public.dv_caller(p_uid);
  v_room    public.rooms;
  v_players jsonb;
begin
  if v_uid is null then return; end if;

  select * into v_room from public.rooms where id = upper(trim(p_code)) for update;
  if not found then return; end if;

  if v_room.host_id = v_uid then
    delete from public.rooms where id = v_room.id;
    return;
  end if;

  select coalesce(jsonb_agg(p), '[]'::jsonb) into v_players
  from jsonb_array_elements(coalesce(v_room.players, '[]'::jsonb)) as p
  where p->>'id' <> v_uid;

  if jsonb_array_length(v_players) = 0 then
    delete from public.rooms where id = v_room.id;
  else
    update public.rooms set players = v_players where id = v_room.id;
  end if;
end;
$$;

-- Record one player's answer. Uses jsonb object merge, so two players
-- answering at the same moment can never overwrite each other — this was
-- a real race with the old read-modify-write in app.js.
create or replace function public.dv_set_choice(p_code text, p_choice text, p_uid text default null)
returns setof public.rooms
language plpgsql security definer set search_path = public as $$
declare
  v_uid  text := public.dv_caller(p_uid);
  v_room public.rooms;
begin
  if v_uid is null then
    raise exception 'No identity available' using errcode = '28000';
  end if;

  select * into v_room from public.rooms where id = upper(trim(p_code)) for update;
  if not found then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if not (coalesce(v_room.players, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id', v_uid))) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;

  return query
    update public.rooms
       set choices = coalesce(choices, '{}'::jsonb) || jsonb_build_object(v_uid, p_choice)
     where id = v_room.id
    returning *;
end;
$$;

-- Host only: replace the whole game state in one atomic write.
create or replace function public.dv_set_state(p_code text, p_state jsonb, p_uid text default null)
returns setof public.rooms
language plpgsql security definer set search_path = public as $$
declare
  v_uid text := public.dv_caller(p_uid);
begin
  if v_uid is null then
    raise exception 'No identity available' using errcode = '28000';
  end if;

  return query
    update public.rooms
       set state          = case when p_state ? 'state'          then p_state->>'state'            else state          end,
           game_type      = case when p_state ? 'game_type'      then p_state->>'game_type'       else game_type      end,
           current_prompt = case when p_state ? 'current_prompt' then p_state->'current_prompt'   else current_prompt end,
           choices        = case when p_state ? 'choices'        then p_state->'choices'          else choices        end,
           streak         = case when p_state ? 'streak'         then (p_state->>'streak')::int   else streak         end,
           round          = case when p_state ? 'round'          then (p_state->>'round')::int    else round          end
     where id = upper(trim(p_code))
       and host_id = v_uid
    returning *;
end;
$$;

revoke all on function public.dv_caller(text)             from public;
revoke all on function public.dv_create_room(text, text)   from public;
revoke all on function public.dv_join_room(text, text, text) from public;
revoke all on function public.dv_leave_room(text, text)    from public;
revoke all on function public.dv_set_choice(text, text, text) from public;
revoke all on function public.dv_set_state(text, jsonb, text) from public;

grant execute on function public.dv_create_room(text, text)   to anon, authenticated;
grant execute on function public.dv_join_room(text, text, text) to anon, authenticated;
grant execute on function public.dv_leave_room(text, text)    to anon, authenticated;
grant execute on function public.dv_set_choice(text, text, text) to anon, authenticated;
grant execute on function public.dv_set_state(text, jsonb, text) to anon, authenticated;

-- ── 4. realtime (optional) ─────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;

-- ── 5. housekeeping ────────────────────────────────────────────────
-- Removes rooms nobody has touched in a day. Run it manually, or with
-- pg_cron if the extension is available on your plan.
create or replace function public.dv_purge_stale_rooms(p_hours int default 24)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with gone as (
    delete from public.rooms
     where updated_at < now() - make_interval(hours => greatest(p_hours, 1))
    returning 1
  )
  select count(*) into v_count from gone;
  return v_count;
end;
$$;

grant execute on function public.dv_purge_stale_rooms(int) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('duovibe-purge') where exists (
      select 1 from cron.job where jobname = 'duovibe-purge'
    );
    perform cron.schedule('duovibe-purge', '17 * * * *', $cron$select public.dv_purge_stale_rooms(24);$cron$);
  end if;
exception when others then
  raise notice 'pg_cron not configured, skipping schedule (run dv_purge_stale_rooms manually)';
end $$;

-- ── notes ──────────────────────────────────────────────────────────
-- public.game_events and public.love_notes exist in older versions of this
-- project and are not used by the client. Drop them when you are sure:
--   drop table if exists public.game_events;
--   drop table if exists public.love_notes;
