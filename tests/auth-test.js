/*
   Unit tests for supabase-lite.js. Network is stubbed, so these run even
   when anonymous sign-ins are disabled on the project.

     node tests/auth-test.js
*/
/* Exercise supabase-lite's session logic by stubbing fetch + localStorage. */
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const check = (n, ok, extra='') => { ok ? pass++ : fail++; console.log(`${ok?'PASS':'FAIL'}  ${n}${extra?'  -> '+extra:''}`); };

function makeStore() {
  const d = {};
  return { getItem: k => (k in d ? d[k] : null), setItem: (k,v) => { d[k] = String(v); }, removeItem: k => { delete d[k]; }, _d: d };
}

function loadSB() {
  const src = fs.readFileSync(path.join('/home/user/duovibe', 'supabase-lite.js'), 'utf8');
  const g = {};
  const fn = new Function('window', 'localStorage', 'fetch', 'AbortController', 'console', src + '\nreturn window.SB;');
  return (store, fetchImpl) => fn(g, store, fetchImpl, AbortController, { warn(){}, log(){}, error(){} });
}

const build = loadSB();
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) });

(async () => {
  // 1. anonymous auth available
  {
    const store = makeStore();
    let calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push(url);
      if (url.includes('/auth/v1/signup')) return reply(200, { access_token: 'tok-1', refresh_token: 'ref-1', expires_in: 3600, user: { id: 'uuid-1' } });
      return reply(200, []);
    };
    const SB = build(store, fetchImpl);
    SB.configure('https://x.supabase.co', 'anon-key');
    const s = await SB.init();
    check('anonymous sign-in sets auth mode', s.mode === 'auth' && s.uid === 'uuid-1', JSON.stringify(s));
    check('session persisted to storage', !!store.getItem('duovibe_session_v1'));
  }

  // 2. anonymous sign-in disabled (the live project today)
  {
    const store = makeStore();
    const fetchImpl = async () => reply(422, { code: 'anonymous_provider_disabled' });
    const SB = build(store, fetchImpl);
    SB.configure('https://x.supabase.co', 'anon-key');
    const s = await SB.init();
    check('422 falls back to anon-key mode', s.mode === 'anon' && s.uid.startsWith('local_'), JSON.stringify(s));
    check('fallback id is stable', store.getItem('duovibe_uid') === s.uid);
  }

  // 3. a stored, unexpired session is reused with no network call
  {
    const store = makeStore();
    store.setItem('duovibe_session_v1', JSON.stringify({ access_token: 'tok-live', refresh_token: 'r', expires_at: Date.now() + 3600e3, user_id: 'uuid-live' }));
    let calls = 0;
    const SB = build(store, async () => { calls++; return reply(200, {}); });
    SB.configure('https://x.supabase.co', 'anon-key');
    const s = await SB.init();
    check('valid stored session reused without a request', s.mode === 'auth' && s.uid === 'uuid-live' && calls === 0, `calls=${calls}`);
  }

  // 4. expired session is refreshed
  {
    const store = makeStore();
    store.setItem('duovibe_session_v1', JSON.stringify({ access_token: 'old', refresh_token: 'ref-ok', expires_at: Date.now() - 1000, user_id: 'uuid-2' }));
    let refreshed = false;
    const fetchImpl = async (url) => {
      if (url.includes('grant_type=refresh_token')) { refreshed = true; return reply(200, { access_token: 'new', refresh_token: 'ref-2', expires_in: 3600, user: { id: 'uuid-2' } }); }
      return reply(200, []);
    };
    const SB = build(store, fetchImpl);
    SB.configure('https://x.supabase.co', 'anon-key');
    const s = await SB.init();
    check('expired token is refreshed', refreshed && s.mode === 'auth' && s.uid === 'uuid-2');
  }

  // 5. a 401 on a query triggers recovery and one retry
  {
    const store = makeStore();
    let n = 0;
    const fetchImpl = async (url) => {
      if (url.includes('/auth/v1/signup')) return reply(200, { access_token: 'tok', refresh_token: 'r', expires_in: 3600, user: { id: 'uuid-3' } });
      if (url.includes('/rest/v1/rooms')) { n++; return n === 1 ? reply(401, { message: 'JWT expired' }) : reply(200, { id: '1234' }); }
      return reply(200, []);
    };
    const SB = build(store, fetchImpl);
    SB.configure('https://x.supabase.co', 'anon-key');
    await SB.init();
    const r = await SB.from('rooms').select('*').eq('id', '1234').single();
    check('401 is retried after recovery', !r.error && r.data && r.data.id === '1234', JSON.stringify(r).slice(0, 80));
  }

  // 6. network failure never throws, returns an error object
  {
    const store = makeStore();
    const fetchImpl = async () => { throw new Error('network down'); };
    const SB = build(store, fetchImpl);
    SB.configure('https://x.supabase.co', 'anon-key');
    await SB.init();
    const r = await SB.from('rooms').select('*').eq('id', '1').single();
    check('offline query returns an error, does not throw', !!r.error && r.data === null);
  }

  // 7. single() on zero rows gives the 406 shape app.js checks for
  {
    const store = makeStore();
    const fetchImpl = async (url) => {
      if (url.includes('/auth/v1/signup')) return reply(422, {});
      return reply(406, { message: 'no rows' });
    };
    const SB = build(store, fetchImpl);
    SB.configure('https://x.supabase.co', 'anon-key');
    await SB.init();
    const r = await SB.from('rooms').select('*').eq('id', '9999').single();
    check('missing row yields status 406 for the closed-room path', r.error && r.error.status === 406, JSON.stringify(r.error));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
