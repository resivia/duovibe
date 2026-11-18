-- Optional, one-time archive for room records from the old project.
-- Keep the data import out of Git and out of the live public.rooms table.
create schema if not exists duovibe_archive;
revoke all on schema duovibe_archive from public, anon, authenticated, service_role;

create table if not exists duovibe_archive.rooms (
  room_code text primary key,
  snapshot jsonb not null,
  archived_at timestamptz not null default now()
);
alter table duovibe_archive.rooms enable row level security;
revoke all on table duovibe_archive.rooms from public, anon, authenticated, service_role;
