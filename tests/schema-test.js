const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { openDatabase, asUser, schema } = require('./database');

const host = '00000000-0000-4000-8000-000000000011';
const guest = '00000000-0000-4000-8000-000000000012';
const outsider = '00000000-0000-4000-8000-000000000013';

test('migration, room permissions, turn isolation and cleanup', async t => {
  const db = await openDatabase();
  t.after(() => db.close());
  const run = (uid, query, params = [], role) => asUser(db, uid, tx => tx.query(query, params), role);
  const one = async (...args) => (await run(...args)).rows[0];
  const advance = (room, state) => one(host, 'select * from public.dv_set_state($1, $2::jsonb, $3::uuid)',
    [room.id, JSON.stringify(state), room.turn_token]);
  const answer = (uid, room, value) => one(uid, 'select * from public.dv_set_choice($1, $2, $3::uuid)',
    [room.id, value, room.turn_token]);

  await assert.rejects(run(null, "select * from public.dv_create_room('Unsigned')"), { code: '42501' });
  await assert.rejects(run(null, 'select * from public.rooms'), { code: '42501' });
  await assert.rejects(run(null, "select * from public.dv_create_room('No user')", [], 'authenticated'), { code: '28000' });
  const start = await one(host, "select * from public.dv_create_room('Demo host', '🐼')");
  assert.match(start.id, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(start.players[0].id, host);
  assert.equal(start.players[0].emoji, '🐼');
  assert.equal(start.state, 'LOBBY');

  // Reapplying the SQL must keep rooms and their original membership.
  await db.exec(schema);
  assert.equal((await one(host, 'select id from public.rooms where id=$1', [start.id])).id, start.id);
  assert.equal((await run(guest, 'select * from public.rooms')).rows.length, 0);
  await assert.rejects(advance(start, { state: 'PLAYING' }), { code: 'PT409' });
  const joined = await one(guest, "select * from public.dv_join_room($1, 'Demo guest', '🦊')", [start.id.toLowerCase()]);
  assert.equal(joined.players.length, 2);
  assert.equal(joined.players[1].id, guest);
  await assert.rejects(run(outsider, "select * from public.dv_join_room($1, 'Third player')", [start.id]), { code: '23505' });
  const withIcon = await one(guest, "select * from public.dv_set_avatar($1, '🐙')", [start.id]);
  assert.equal(withIcon.players[1].emoji, '🐙');
  assert.equal(withIcon.players[0].emoji, '🐼');
  for (const uid of [host, guest]) await assert.rejects(run(uid, 'update public.rooms set round=13'), { code: '42501' });
  await assert.rejects(run(guest, 'select public.dv_purge_stale_rooms(0)'), { code: '42501' });
  await assert.rejects(run(host, 'select * from duovibe_archive.rooms'), { code: '42501' });

  const playing = await advance(joined, { state: 'PLAYING', game_type: 'numberGuess', current_prompt: { min: 1, max: 50 }, choices: {} });
  assert.notEqual(playing.turn_token, start.turn_token);
  assert.ok(playing.revision > withIcon.revision);
  await assert.rejects(run(guest, "select * from public.dv_set_state($1, '{\"state\":\"LOBBY\"}', $2)", [start.id, playing.turn_token]), { code: '42501' });
  await assert.rejects(answer(outsider, playing, 'outsider'), { code: '42501' });
  await assert.rejects(advance(playing, { choices: { [guest]: 'spoofed answer' } }), { code: '22023' });

  const vals = [`{"s":12,"g":[14]}`, `{"s":14,"g":[12]}`];
  await Promise.all([answer(host, playing, vals[0]), answer(guest, playing, vals[1])]);
  const picked = await one(host, 'select * from public.rooms where id=$1', [start.id]);
  assert.deepEqual(picked.choices, { [host]: vals[0], [guest]: vals[1] });
  const scored = await advance(picked, { current_prompt: { finalScores: { [host]: 1 } }, streak: 1 });
  assert.equal(scored.turn_token, picked.turn_token);
  assert.deepEqual(scored.choices, picked.choices);
  assert.equal(scored.streak, 1);

  const next = await advance(scored, { round: 2, choices: {} });
  assert.deepEqual(next.choices, {});
  await assert.rejects(answer(guest, playing, 'stale answer'), { code: 'PT409' });
  await answer(guest, next, 'current answer');
  await run(outsider, 'select public.dv_leave_room($1)', [start.id]);
  assert.equal((await one(host, 'select * from public.rooms where id=$1', [start.id])).players.length, 2);
  await run(guest, 'select public.dv_leave_room($1)', [start.id]);
  const lobby = await one(host, 'select * from public.rooms where id=$1', [start.id]);
  assert.equal(lobby.state, 'LOBBY');
  assert.equal(lobby.players.length, 1);
  assert.equal(lobby.current_prompt, null);
  assert.deepEqual(lobby.choices, {});
  assert.equal((await run(guest, 'select * from public.rooms')).rows.length, 0);
  await run(host, 'select public.dv_leave_room($1)', [start.id]);
  assert.equal((await db.query('select id from public.rooms')).rows.length, 0);

  // Owner-only expiry does not need a background job to make old rooms inaccessible.
  await db.query(`insert into public.rooms (id, host_id, players, updated_at)
    values ('OLD234', $1, $2::jsonb, now() - interval '25 hours'), ('FRESH2', $1, $2::jsonb, now())`,
    [host, JSON.stringify(start.players)]);
  assert.deepEqual((await run(host, 'select id from public.rooms')).rows, [{ id: 'FRESH2' }]);
  await assert.rejects(run(guest, "select * from public.dv_join_room('OLD234','Guest')"), { code: 'P0002' });
  assert.equal((await db.query('select public.dv_purge_stale_rooms(0) as count')).rows[0].count, 1);
  assert.equal((await db.query("select count(*)::int as n from pg_publication_tables where pubname='supabase_realtime' and tablename='rooms'")).rows[0].n, 1);
});

test('room-only dump extraction keeps app rows out of public rooms', async t => {
  const db = await openDatabase();
  t.after(() => db.close());
  const dir = mkdtempSync(join(tmpdir(), 'duovibe-archive-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const dump = join(dir, 'example.sql');
  writeFileSync(dump, 'COPY auth.sessions (example) FROM stdin;\nignore-me\n\\.\n\n' +
    'COPY public.rooms (id, host_name, players, state, current_prompt, round) FROM stdin;\n' +
    '1234\tD’Angelo\'s \\tfox\t[{"name":"Demo","emoji":"🦊"}]\tLOBBY\t\\N\t2\n\\.\n');
  const sql = execFileSync(process.env.PYTHON || 'python3', [join(__dirname, '../scripts/archive_rooms.py'), dump, '--expect', '1'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.ok(!sql.includes('ignore-me'));
  await db.exec(sql);
  await db.exec(sql);
  const record = (await db.query('select snapshot from duovibe_archive.rooms')).rows;
  assert.equal(record.length, 1);
  assert.deepEqual(record[0].snapshot, { id: '1234', host_name: "D’Angelo's \tfox", players: [{ name: 'Demo', emoji: '🦊' }],
    state: 'LOBBY', current_prompt: null, round: 2 });
  assert.equal((await db.query('select * from public.rooms')).rows.length, 0);
});
