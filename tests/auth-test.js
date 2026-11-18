/* Unit tests for project-scoped sessions. No network or live accounts. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const URL = 'https://new-project.supabase.co';
const KEY = 'sb_publishable_test';
const STORAGE_KEY = 'duovibe_session_v2:' + URL;
const script = readFileSync(join(__dirname, '../supabase-lite.js'), 'utf8');
const load = new Function('window', 'localStorage', 'fetch', script + '\nreturn window.SB;');

function fixture(respond, initial = {}) {
  const storage = { ...initial };
  const store = {
    getItem: k => storage[k] ?? null,
    setItem: (k, v) => { storage[k] = v; },
    removeItem: k => { delete storage[k]; }
  };
  const calls = [];
  const sb = load({}, store, async (url, options) => {
    calls.push({ url, ...options });
    return respond(url, options);
  });
  sb.configure(URL + '/', KEY);
  return { sb, calls, storage };
}

function reply(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

function auth(uid, token) {
  return reply(200, { access_token: token, refresh_token: `refresh-${token}`, expires_in: 3600, user: { id: uid } });
}

function saved({ expires = Date.now() + 10000 } = {}) {
  return JSON.stringify({ user_id: 'guest', access_token: 'saved', refresh_token: 'stored-refresh', expires_at: expires });
}

test('signup uses a publishable apikey, RPCs use the user token', async () => {
  const { sb, calls, storage } = fixture(url => url.endsWith('/signup') ? auth('guest', 'jwt') : reply(200, [{ id: 'ABCD23' }]));
  assert.equal((await sb.init()).uid, 'guest');
  assert.equal(JSON.parse(storage[STORAGE_KEY]).user_id, 'guest');
  assert.equal((await sb.rpc('dv_create_room', { p_name: 'Demo', p_emoji: '🦊' })).data[0].id, 'ABCD23');
  assert.equal(calls[0].headers.apikey, KEY);
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal(calls[1].headers.apikey, KEY);
  assert.equal(calls[1].headers.Authorization, 'Bearer jwt');
  assert.deepEqual(JSON.parse(calls[1].body), { p_name: 'Demo', p_emoji: '🦊' });
});

test('disabled guest sign-in fails closed with no local identity', async () => {
  const { sb, calls, storage } = fixture(() => reply(422, { error_code: 'anonymous_provider_disabled' }));
  const result = await sb.init();
  assert.equal(result.error.code, 'anonymous_provider_disabled');
  assert.equal(result.uid, '');
  assert.equal((await sb.getRoom('ABCD23')).error.code, 'session_expired');
  assert.equal(calls.length, 1);
  assert.deepEqual(storage, {});
});

test('project-scoped cache ignores legacy and old-project sessions', async () => {
  const { sb, calls, storage } = fixture(() => auth('new-guest', 'new-jwt'), {
    duovibe_session_v1: saved(), 'duovibe_session_v2:https://old-project.supabase.co': saved()
  });
  assert.equal((await sb.init()).uid, 'new-guest');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, URL + '/auth/v1/signup');
  assert.equal(storage.duovibe_session_v1, undefined);
});

test('a valid session in the current project is reused', async () => {
  const { sb, calls } = fixture(() => reply(500, null), { [STORAGE_KEY]: saved() });
  assert.equal((await sb.init()).uid, 'guest');
  assert.equal(calls.length, 0);
});

test('simultaneous reads refresh one expired session and keep the identity', async () => {
  const { sb, calls, storage } = fixture(url => url.includes('refresh_token') ? auth('guest', 'refreshed') : reply(200, []), {
    [STORAGE_KEY]: saved({ expires: Date.now() - 1 })
  });
  for (const result of await Promise.all([sb.getRoom('ABCD23'), sb.getRoom('ABCD23')])) {
    assert.deepEqual(result, { data: null, error: null });
  }
  assert.equal(calls.filter(call => call.url.includes('grant_type=refresh_token')).length, 1);
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal(calls[1].headers.Authorization, 'Bearer refreshed');
  assert.equal(JSON.parse(storage[STORAGE_KEY]).user_id, 'guest');
});

test('a 401 refreshes and retries the same choice request once', async () => {
  const { sb, calls } = fixture((url, options) => {
    if (url.includes('refresh_token')) return auth('guest', 'new');
    if (options.headers.Authorization === 'Bearer saved') return reply(401, { code: 'token_expired' });
    return reply(200, [{ id: 'ABCD23' }]);
  }, { [STORAGE_KEY]: saved() });
  const result = await sb.rpc('dv_set_choice', { p_code: 'ABCD23', p_choice: 'hello', p_turn: 'turn-test' });
  assert.equal(result.error, null);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, calls[2].url);
  assert.equal(calls[0].body, calls[2].body);
  assert.equal(calls[2].headers.Authorization, 'Bearer new');
});

test('an invalid refresh token never creates a replacement during room play', async () => {
  const { sb, calls, storage } = fixture(() => reply(401, { error_code: 'refresh_token_not_found' }), {
    [STORAGE_KEY]: saved({ expires: 0 })
  });
  assert.equal((await sb.getRoom('ABCD23')).error.code, 'session_expired');
  assert.equal(calls.length, 1);
  assert.equal(storage[STORAGE_KEY], undefined);
});

test('transient outages preserve the refresh token', async () => {
  const initial = saved({ expires: 0 });
  const { sb, storage } = fixture(() => { throw new Error('network error'); }, { [STORAGE_KEY]: initial });
  const result = await sb.getRoom('ABCD23');
  assert.equal(result.error.status, 0);
  assert.equal(storage[STORAGE_KEY], initial);
});
