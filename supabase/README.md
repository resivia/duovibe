# DuoVibe Supabase cutover

## Destination and scope

- Project: `waraigofwvtaicuuregf` (`duovibes`)
- API: `https://waraigofwvtaicuuregf.supabase.co`
- Applied migration: `20261118210659`, `duovibe_rooms_cutover`.
  The equivalent SQL is [`../supabase-schema.sql`](../supabase-schema.sql) and
  [`room-archive.sql`](room-archive.sql). The new schema uses the dump’s
  app-owned room model, with replacement member-scoped policies and RPCs.
- The archive table exists, but **the seven original room snapshots have not
  been imported**. The workspace does not contain the original room `COPY`
  rows, and the connection can only access the new project. The source project
  was not modified. This archive is optional for playing; start with fresh rooms
  and import archived snapshots later if the original data becomes available.

Do not replay the dump’s DDL, roles, grants or managed `auth`, `storage`, or
Realtime data. In particular, never import old Auth users’ sessions or refresh
credentials. Do not copy old rows to `public.rooms`: anonymous memberships were
issued by the old project and cannot be recovered by a new guest session.

## Restore room history only

Use the original UTF-8, plain-text `pg_dump` (default `COPY`, not `--inserts`), or
just its complete `COPY public.rooms (...) FROM stdin;` block, including the
`\.` terminator. Keep the original dump and generated SQL **outside** the repo
and website publish directory. The extractor never executes the source SQL or
includes any other table’s rows.

```sh
umask 077
python3 scripts/archive_rooms.py /path/outside/repo/original.sql --expect 7 \
  > /path/outside/repo/room-archive-import.sql
```

Once extraction succeeds, run the generated SQL in the **destination** SQL
Editor as the owner. For a different project, run `room-archive.sql` first to
provision the private archive. The import is transactional and does not
replace snapshots on a rerun. Verify counts without displaying private data:

```sql
select count(*) as archived_rooms from duovibe_archive.rooms; -- expected 7
select count(*) as live_rooms from public.rooms;               -- initially 0
```

The archive is not an API schema, has RLS enabled with no client policies,
and is inaccessible to the browser roles. Do not expose it or use it for lobby
lookups. Keep the source backup until the owner has verified the counts. If the
original full dump was shared, review whether its old sessions should be revoked
on the original project.

## Release check

1. Confirm [Anonymous sign-ins](https://supabase.com/dashboard/project/waraigofwvtaicuuregf/auth/providers)
   are on for the **destination** (verified on 2026-11-18). This is an Auth
   setting, not part of the SQL migration. `scripts\duovibe.cmd doctor` can
   check it.
2. Serve this branch and open it in two independent browser profiles (or on two
   devices). Verify the requests in the browser Network panel go to the new
   project. Create a room, share the invite, join, and pick different avatars.
3. Play one Postcards or Would You Rather round and one structured-choice game
   such as Guess My Number. Submit from both profiles, advance a round, and
   check both answers and the next prompt appear on both sides.
4. Leave as guest and rejoin the clean lobby; then leave as host and confirm
   the guest sees the room close. Clean up test rooms by leaving as the host,
   not by running a global purge.
5. Release the checked build. A hard reload on both devices will pick up the
   new assets if an older app shell was already open. Old four-digit invites
   should be replaced with new ones.

If validation fails, hold the frontend release. Do not mix an older frontend
with the new RPCs, relax RLS, or reuse old sessions to get around guest sign-in.
The old deployment and source database are unchanged by this migration.
