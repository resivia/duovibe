/* ═══════════════════════════════════════════════════════════════════
   supabase-lite.js — tiny Supabase client (~6KB, no dependencies)

   Replaces @supabase/supabase-js (about 110KB gzipped) because the app
   only ever needs three things:
     · anonymous sign-in, so rows can be scoped to a real auth user
     · PostgREST select / insert / update / delete
     · RPC calls for the atomic room operations

   It also gives us AbortController timeouts on every request, which the
   official SDK does not, so a flaky mobile connection cannot leave the
   poll loop hanging forever.

   Public surface:
     SB.init()              → promise, sets SB.mode and SB.uid
     SB.from(t).select().eq().single()   / .insert() / .update() / .delete()
     SB.rpc(name, args)
     SB.mode                → 'auth' | 'anon'
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SESSION_KEY = 'duovibe_session_v1';
  const TIMEOUT_MS = 8000;

  const SB = {
    url: '',
    key: '',
    token: '',          // access token used as the Bearer
    mode: 'anon',       // 'auth' once anonymous sign-in succeeds
    uid: '',            // auth user id, or a local fallback id
    _waiters: [],
    _session: null,

    configure(url, key) {
      this.url = String(url || '').replace(/\/+$/, '');
      this.key = key || '';
    },

    /* ── session plumbing ─────────────────────────────────────────── */
    _readSession() {
      try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
      catch (e) { return null; }
    },
    _writeSession(s) {
      this._session = s;
      try {
        if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        else localStorage.removeItem(SESSION_KEY);
      } catch (e) {}
    },
    _localFallbackId() {
      let id = localStorage.getItem('duovibe_uid');
      if (!id) {
        id = 'local_' + Math.random().toString(36).slice(2, 11);
        localStorage.setItem('duovibe_uid', id);
      }
      return id;
    },

    /* One request helper: timeout, JSON in/out, never throws on HTTP 4xx */
    async _fetch(path, opts = {}) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const headers = {
          'apikey': this.key,
          'Content-Type': 'application/json'
        };
        if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
        else if (this.key) headers['Authorization'] = 'Bearer ' + this.key;
        Object.assign(headers, opts.headers || {});

        const res = await fetch(this.url + path, {
          method: opts.method || 'GET',
          headers: headers,
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
          signal: ctrl.signal,
          cache: 'no-store',
          credentials: 'omit'
        });

        const text = await res.text();
        let data = null;
        if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
        return { ok: res.ok, status: res.status, data: data };
      } catch (err) {
        return { ok: false, status: 0, data: null, error: { message: String(err && err.message || err) } };
      } finally {
        clearTimeout(timer);
      }
    },

    /* Exchange a refresh token for a fresh access token */
    async _refresh(refreshToken) {
      const r = await this._fetch('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: { refresh_token: refreshToken }
      });
      if (r.ok && r.data && r.data.access_token) {
        this._writeSession({
          access_token: r.data.access_token,
          refresh_token: r.data.refresh_token,
          expires_at: Date.now() + ((r.data.expires_in || 3600) * 1000) - 60000,
          user_id: (r.data.user && r.data.user.id) || this.uid
        });
        return true;
      }
      return false;
    },

    /* Create an anonymous user (needs Authentication → Anonymous sign-ins ON) */
    async _signInAnonymously() {
      const r = await this._fetch('/auth/v1/signup', {
        method: 'POST',
        body: { data: {}, gotrue_meta_security: {} }
      });
      if (r.ok && r.data && r.data.access_token) {
        this._writeSession({
          access_token: r.data.access_token,
          refresh_token: r.data.refresh_token,
          expires_at: Date.now() + ((r.data.expires_in || 3600) * 1000) - 60000,
          user_id: (r.data.user && r.data.user.id) || ''
        });
        return true;
      }
      return false;
    },

    async init() {
      const saved = this._readSession();
      this._session = saved;

      if (saved && saved.access_token) {
        if (saved.expires_at && saved.expires_at > Date.now()) {
          this.token = saved.access_token;
          this.uid = saved.user_id || '';
          this.mode = this.uid ? 'auth' : 'anon';
          if (this.mode === 'auth') return this._ready();
        } else if (saved.refresh_token && await this._refresh(saved.refresh_token)) {
          this.token = this._session.access_token;
          this.uid = this._session.user_id || '';
          this.mode = this.uid ? 'auth' : 'anon';
          if (this.mode === 'auth') return this._ready();
        }
      }

      /* No usable session: try anonymous sign-in */
      if (await this._signInAnonymously()) {
        this.token = this._session.access_token;
        this.uid = this._session.user_id || '';
        this.mode = 'auth';
        return this._ready();
      }

      /* Anonymous sign-ins are disabled on this project: keep playing with
         the anon key. The SQL file ships matching fallback policies. */
      this.mode = 'anon';
      this.token = '';
      this.uid = this._localFallbackId();
      console.warn('[DuoVibe] Anonymous sign-in unavailable, using anon-key mode.');
      return this._ready();
    },

    _ready() {
      const waiters = this._waiters;
      this._waiters = [];
      waiters.forEach(fn => { try { fn(this.uid); } catch (e) {} });
      return { mode: this.mode, uid: this.uid };
    },

    /* Re-run init after a 401 (expired token) */
    async _recover() {
      this._writeSession(null);
      this.token = '';
      return this.init();
    },

    /* ── PostgREST query builder ─────────────────────────────────── */
    from(table) {
      const self = this;
      const st = {
        table: table,
        method: 'GET',
        filters: [],
        select: '*',
        body: undefined,
        single: false,
        headers: {}
      };

      const q = {
        select(cols) {
          if (st.method === 'GET') st.select = cols || '*';
          else st.headers['Prefer'] = (st.headers['Prefer'] ? st.headers['Prefer'] + ',' : '') + 'return=representation';
          return q;
        },
        insert(rows) { st.method = 'POST'; st.body = rows; st.select = '*'; return q; },
        update(patch) { st.method = 'PATCH'; st.body = patch; return q; },
        delete() { st.method = 'DELETE'; return q; },
        eq(col, val) { st.filters.push(col + '=eq.' + encodeURIComponent(val)); return q; },
        single() { st.single = true; return q; },

        async run() {
          let path = '/rest/v1/' + st.table + '?';
          const params = [];
          if (st.method === 'GET') params.push('select=' + encodeURIComponent(st.select));
          params.push.apply(params, st.filters);

          const headers = Object.assign({}, st.headers);
          if (st.single) headers['Accept'] = 'application/vnd.pgrst.object+json';
          if (st.method !== 'GET') headers['Prefer'] = (headers['Prefer'] || 'return=representation');

          let r = await self._fetch(path + params.join('&'), {
            method: st.method, body: st.body, headers: headers
          });

          if (r.status === 401) {
            await self._recover();
            r = await self._fetch(path + params.join('&'), {
              method: st.method, body: st.body, headers: headers
            });
          }

          if (r.status === 406 && st.single) {
            /* zero rows or many rows where one was expected */
            return { data: null, error: { message: 'No matching row', code: '406', status: 406 } };
          }
          if (!r.ok) {
            return {
              data: null,
              error: {
                message: (r.data && (r.data.message || r.data.hint)) || ('HTTP ' + r.status),
                code: (r.data && r.data.code) || String(r.status),
                status: r.status,
                details: r.data && r.data.details
              }
            };
          }
          return { data: r.data, error: null };
        },

        then(resolve, reject) { return q.run().then(resolve, reject); },
        catch(fn) { return q.run().catch(fn); }
      };

      return q;
    },

    async rpc(name, args) {
      let r = await this._fetch('/rest/v1/rpc/' + name, { method: 'POST', body: args || {} });
      if (r.status === 401) { await this._recover(); r = await this._fetch('/rest/v1/rpc/' + name, { method: 'POST', body: args || {} }); }
      if (!r.ok) {
        return { data: null, error: { message: (r.data && r.data.message) || ('HTTP ' + r.status), status: r.status } };
      }
      return { data: r.data, error: null };
    }
  };

  window.SB = SB;
})();
