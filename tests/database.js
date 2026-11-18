/* Local PostgreSQL for tests; models the Supabase roles and JWT subject only. */
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const schema = readFileSync(join(__dirname, '../supabase-schema.sql'), 'utf8');
const archive = readFileSync(join(__dirname, '../supabase/room-archive.sql'), 'utf8');

async function openDatabase() {
  const db = await PGlite.create();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      grant usage on schema auth to anon, authenticated;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create publication supabase_realtime;
      alter default privileges in schema public grant all on tables to anon, authenticated;
      alter default privileges in schema public grant execute on functions to anon, authenticated;
    `);
    await db.exec(schema);
    await db.exec(archive);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

function asUser(db, uid, run, role = uid ? 'authenticated' : 'anon') {
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid || '']);
    await tx.exec(role === 'authenticated' ? 'set local role authenticated' : 'set local role anon');
    return run(tx);
  });
}

module.exports = { openDatabase, asUser, schema, archive };
