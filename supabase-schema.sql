-- DuoVibe application schema. Apply as the project owner, in one transaction.
-- No managed Supabase schemas or existing room data are restored or dropped.
-- Enable Anonymous sign-ins in the Supabase Auth dashboard before taking traffic.

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
  updated_at     timestamptz not null default now(),
  turn_token     uuid        not null default gen_random_uuid(),
  revision       integer     not null default 0
);

alter table public.rooms add column if not exists turn_token uuid not null default gen_random_uuid();
alter table public.rooms add column if not exists revision integer not null default 0;
create index if not exists rooms_updated_at_idx on public.rooms (updated_at desc);

create or replace function public.duovibe_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.revision := old.revision + 1;
  return new;
end;
$$;

drop trigger if exists update_rooms_updated_at on public.rooms;
drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at before update on public.rooms
  for each row execute function public.duovibe_touch_updated_at();

-- Remove every known policy from the older schema/dump; permissive policies
-- combine with OR. Only signed-in room members can read; writes use RPCs.
alter table public.rooms enable row level security;
drop policy if exists "Public rooms" on public.rooms;
drop policy if exists "Allow public read" on public.rooms;
drop policy if exists "Allow public insert" on public.rooms;
drop policy if exists "Allow public update" on public.rooms;
drop policy if exists "Allow public delete" on public.rooms;
drop policy if exists "duovibe select" on public.rooms;
drop policy if exists "duovibe insert" on public.rooms;
drop policy if exists "duovibe update" on public.rooms;
drop policy if exists "duovibe delete" on public.rooms;

revoke all on table public.rooms from public, anon, authenticated;
grant select on table public.rooms to authenticated;
create policy "duovibe select" on public.rooms for select to authenticated
using (
  updated_at >= now() - interval '24 hours'
  and players @> jsonb_build_array(jsonb_build_object('id', (select auth.uid())::text))
);

-- Overloads that accepted client-supplied user IDs must not survive an upgrade.
drop function if exists public.dv_create_room(text, text);
drop function if exists public.dv_join_room(text, text, text);
drop function if exists public.dv_leave_room(text, text);
drop function if exists public.dv_set_choice(text, text, text);
drop function if exists public.dv_set_state(text, jsonb, text);
drop function if exists public.dv_caller(text);

create or replace function public.dv_require_user()
returns text language plpgsql stable set search_path = '' as $$
declare v_uid text := auth.uid()::text;
begin
  if v_uid is null then
    raise exception 'Guest sign-in required' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

-- Internal helper; all mutations of one room serialize on the row lock.
create or replace function public.dv_lock_room(p_code text)
returns public.rooms language plpgsql set search_path = '' as $$
declare v_room public.rooms;
begin
  select * into v_room from public.rooms
   where id = upper(trim(p_code)) and updated_at >= now() - interval '24 hours'
   for update;
  return v_room;
end;
$$;

create function public.dv_create_room(p_name text, p_emoji text default null)
returns setof public.rooms language plpgsql security definer set search_path = '' as $$
declare
  v_uid text := public.dv_require_user();
  v_name text := left(coalesce(nullif(trim(p_name), ''), 'Host'), 20);
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  v_room public.rooms;
begin
  for attempt in 1..20 loop
    -- Six random characters (30 bits), without lookalikes like I/1 or O/0.
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, 1 + get_byte(v_bytes, i) % 32, 1);
    end loop;

    insert into public.rooms (id, host_id, host_name, players)
    values (v_code, v_uid, v_name, jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', v_uid, 'name', v_name, 'role', 'host', 'emoji', left(nullif(p_emoji, ''), 16)
    ))))
    on conflict (id) do nothing
    returning * into v_room;
    if found then
      return next v_room;
      return;
    end if;
  end loop;
  raise exception 'No free room code available, try again shortly';
end;
$$;

create function public.dv_join_room(p_code text, p_name text, p_emoji text default null)
returns setof public.rooms language plpgsql security definer set search_path = '' as $$
declare
  v_uid text := public.dv_require_user();
  v_name text := left(coalesce(nullif(trim(p_name), ''), 'Player'), 20);
  v_emoji text := left(nullif(p_emoji, ''), 16);
  v_room public.rooms := public.dv_lock_room(p_code);
  v_players jsonb := coalesce(v_room.players, '[]'::jsonb);
  v_at int;
begin
  if v_room.id is null then
    raise exception 'Room not found or expired' using errcode = 'P0002';
  end if;

  select (ord - 1) into v_at
    from jsonb_array_elements(v_players) with ordinality as t(player, ord)
   where player->>'id' = v_uid;

  if v_at is not null then
    v_players := jsonb_set(v_players, array[v_at::text, 'name'], to_jsonb(v_name));
    if v_emoji is not null then
      v_players := jsonb_set(v_players, array[v_at::text, 'emoji'], to_jsonb(v_emoji));
    end if;
  else
    if jsonb_array_length(v_players) >= 2 then
      raise exception 'Room is full' using errcode = '23505';
    end if;
    if v_room.state <> 'LOBBY' then
      raise exception 'Ask the host to return to the lobby first' using errcode = 'PT409';
    end if;
    v_players := v_players || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', v_uid, 'name', v_name, 'role', 'player', 'emoji', v_emoji
    )));
  end if;

  return query update public.rooms
     set players = v_players, host_name = case when host_id = v_uid then v_name else host_name end
   where id = v_room.id returning *;
end;
$$;

create or replace function public.dv_set_avatar(p_code text, p_emoji text)
returns setof public.rooms language plpgsql security definer set search_path = '' as $$
declare
  v_uid text := public.dv_require_user();
  v_room public.rooms := public.dv_lock_room(p_code);
  v_at int;
begin
  if v_room.id is null then
    raise exception 'Room not found or expired' using errcode = 'P0002';
  end if;
  select (ord - 1) into v_at
    from jsonb_array_elements(v_room.players) with ordinality as t(player, ord)
   where player->>'id' = v_uid;
  if v_at is null then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;
  return query update public.rooms
     set players = jsonb_set(players, array[v_at::text, 'emoji'], to_jsonb(left(coalesce(nullif(p_emoji, ''), '🙂'), 16)))
   where id = v_room.id returning *;
end;
$$;

create or replace function public.dv_leave_room(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid text := public.dv_require_user();
  v_room public.rooms := public.dv_lock_room(p_code);
begin
  if v_room.id is null then return; end if;
  if v_room.host_id = v_uid then
    delete from public.rooms where id = v_room.id;
  elsif v_room.players @> jsonb_build_array(jsonb_build_object('id', v_uid)) then
    -- A replacement guest starts in a clean lobby, never in the old conversation.
    update public.rooms
       set players = (select jsonb_agg(player order by ord)
                        from jsonb_array_elements(v_room.players) with ordinality as t(player, ord)
                       where player->>'id' <> v_uid),
           state = 'LOBBY', game_type = null, current_prompt = null, choices = '{}'::jsonb,
           round = 1, streak = 0, turn_token = gen_random_uuid()
     where id = v_room.id;
  end if;
end;
$$;

create or replace function public.dv_set_choice(p_code text, p_choice text, p_turn uuid)
returns setof public.rooms language plpgsql security definer set search_path = '' as $$
declare
  v_uid text := public.dv_require_user();
  v_room public.rooms := public.dv_lock_room(p_code);
begin
  if v_room.id is null then
    raise exception 'Room not found or expired' using errcode = 'P0002';
  end if;
  if not (v_room.players @> jsonb_build_array(jsonb_build_object('id', v_uid))) then
    raise exception 'You are not in this room' using errcode = '42501';
  end if;
  if v_room.state <> 'PLAYING' or v_room.turn_token is distinct from p_turn then
    raise exception 'That round has already changed' using errcode = 'PT409';
  end if;
  if p_choice is null or octet_length(p_choice) > 4096 then
    raise exception 'Invalid answer' using errcode = '22023';
  end if;

  return query update public.rooms
     set choices = coalesce(choices, '{}'::jsonb) || jsonb_build_object(v_uid, p_choice)
   where id = v_room.id returning *;
end;
$$;

create or replace function public.dv_set_state(p_code text, p_state jsonb, p_turn uuid)
returns setof public.rooms language plpgsql security definer set search_path = '' as $$
declare
  v_uid text := public.dv_require_user();
  v_room public.rooms := public.dv_lock_room(p_code);
  v_next_state text;
begin
  if v_room.id is null then
    raise exception 'Room not found or expired' using errcode = 'P0002';
  end if;
  if v_room.host_id is distinct from v_uid then
    raise exception 'Only the host can change the game' using errcode = '42501';
  end if;
  if v_room.turn_token is distinct from p_turn then
    raise exception 'That round has already changed' using errcode = 'PT409';
  end if;
  if jsonb_typeof(p_state) is distinct from 'object'
     or octet_length(p_state::text) > 24576
     or p_state - array['state', 'game_type', 'current_prompt', 'choices', 'streak', 'round'] <> '{}'::jsonb
     or (p_state ? 'choices' and p_state->'choices' is distinct from '{}'::jsonb) then
    raise exception 'Invalid game update' using errcode = '22023';
  end if;
  v_next_state := coalesce(p_state->>'state', v_room.state);
  if v_next_state not in ('LOBBY', 'DRAFTING', 'PLAYING', 'COMPARISON') then
    raise exception 'Unknown game state' using errcode = '22023';
  end if;
  if v_next_state in ('PLAYING', 'DRAFTING') and jsonb_array_length(v_room.players) <> 2 then
    raise exception 'Wait for your partner to join' using errcode = 'PT409';
  end if;

  return query update public.rooms
     set state = v_next_state,
         game_type = case when p_state ? 'game_type' then p_state->>'game_type' else game_type end,
         current_prompt = case when p_state ? 'current_prompt' then nullif(p_state->'current_prompt', 'null'::jsonb) else current_prompt end,
         choices = case when p_state ? 'choices' then '{}'::jsonb else choices end,
         streak = coalesce((p_state->>'streak')::int, streak),
         round = coalesce((p_state->>'round')::int, round),
         turn_token = case when p_state ?| array['state', 'game_type', 'choices', 'round']
                           then gen_random_uuid() else turn_token end
   where id = v_room.id returning *;
end;
$$;

-- Supabase projects provision this publication. DuoVibe polls via REST, but
-- preserve the old project's publication membership for dashboard/Realtime use.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
          where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
end;
$$;

-- Optionally schedule this from the dashboard as postgres. It is not a client RPC.
create or replace function public.dv_purge_stale_rooms(p_hours int default 24)
returns integer language plpgsql set search_path = '' as $$
declare v_count int;
begin
  delete from public.rooms where updated_at < now() - make_interval(hours => greatest(p_hours, 24));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function
  public.duovibe_touch_updated_at(), public.dv_require_user(), public.dv_lock_room(text), public.dv_purge_stale_rooms(int),
  public.dv_create_room(text, text), public.dv_join_room(text, text, text), public.dv_set_avatar(text, text),
  public.dv_leave_room(text), public.dv_set_choice(text, text, uuid), public.dv_set_state(text, jsonb, uuid)
from public, anon, authenticated;

grant execute on function
  public.dv_create_room(text, text), public.dv_join_room(text, text, text), public.dv_set_avatar(text, text),
  public.dv_leave_room(text), public.dv_set_choice(text, text, uuid), public.dv_set_state(text, jsonb, uuid)
to authenticated;

notify pgrst, 'reload schema';
