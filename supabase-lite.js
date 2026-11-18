/* Small Supabase client: guest Auth, room reads and authenticated RPCs. */
(function () {
  'use strict';

  const TIMEOUT_MS = 8000;
  const ROOM_COLUMNS = 'id,host_id,players,state,game_type,round,current_prompt,choices,streak,turn_token,revision';
  const expired = () => ({ status: 401, code: 'session_expired', message: 'Your guest session expired. Create or join a room again.' });

  function errorOf(r) {
    return {
      status: r.status,
      code: r.data?.error_code || r.data?.code || String(r.status),
      message: r.data?.message || r.data?.msg || r.data?.error_description ||
        (r.status ? 'Request failed (HTTP ' + r.status + ').' : 'Could not connect. Check your connection and try again.')
    };
  }

  const SB = {
    url: '',
    key: '',
    uid: '',
    _session: null,
    _sessionWork: null,

    configure(url, key) {
      this.url = String(url || '').replace(/\/+$/, '');
      this.key = key || '';
      this._session = null;
      this.uid = '';
      // Never exchange a token issued by the old project with the new one.
      this._sessionKey = 'duovibe_session_v2:' + this.url;
      try { localStorage.removeItem('duovibe_session_v1'); } catch (e) {}
    },

    _readSession() {
      try { return JSON.parse(localStorage.getItem(this._sessionKey)); }
      catch (e) { return null; }
    },

    _saveSession(session) {
      this._session = session;
      this.uid = session?.user_id || '';
      try {
        if (session) localStorage.setItem(this._sessionKey, JSON.stringify(session));
        else localStorage.removeItem(this._sessionKey);
      } catch (e) {}
    },

    async _fetch(path, { method = 'GET', body, token } = {}) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const headers = { apikey: this.key };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      // The publishable key goes in apikey, never in place of an access token.
      if (token) headers.Authorization = 'Bearer ' + token;

      try {
        const res = await fetch(this.url + path, {
          method, headers, body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal, cache: 'no-store', credentials: 'omit'
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) {}
        return { ok: res.ok, status: res.status, data };
      } catch (e) {
        return { ok: false, status: 0, data: null };
      } finally {
        clearTimeout(timer);
      }
    },

    _parseSession(data, uid) {
      const userId = data?.user?.id || uid;
      if (!data?.access_token || !data?.refresh_token || !userId) return null;
      const lifetime = (Number(data.expires_in) || 3600) * 1000;
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + lifetime - Math.min(60000, lifetime / 2),
        user_id: userId
      };
    },

    async _sessionFor(allowSignup, rejectedToken) {
      const saved = this._readSession() || this._session;
      if (saved?.access_token && saved.user_id && saved.expires_at > Date.now() &&
          saved.access_token !== rejectedToken) {
        this._session = saved;
        this.uid = saved.user_id;
        return { session: saved };
      }
      if (saved?.refresh_token) {
        const reply = await this._fetch('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', body: { refresh_token: saved.refresh_token }
        });
        const session = reply.ok && this._parseSession(reply.data, saved.user_id);
        if (session && session.user_id === saved.user_id) {
          this._saveSession(session);
          return { session };
        }
        // Do not discard an identity during a transient outage or rate limit.
        if (!reply.ok && ![400, 401, 403].includes(reply.status)) return { error: errorOf(reply) };
        const latest = this._readSession();
        if (latest?.user_id === saved.user_id && latest.refresh_token !== saved.refresh_token && latest.expires_at > Date.now()) {
          // Another tab refreshed while this request was in flight.
          this._session = latest;
          this.uid = latest.user_id;
          return { session: latest };
        }
        this._saveSession(null);
      }

      if (!allowSignup) return { error: expired() };
      const reply = await this._fetch('/auth/v1/signup', {
        method: 'POST', body: { data: {}, gotrue_meta_security: {} }
      });
      const session = reply.ok && this._parseSession(reply.data);
      if (!session) return { error: reply.ok ? expired() : errorOf(reply) };
      this._saveSession(session);
      return { session };
    },

    async _ensureSession(allowSignup = false, rejectedToken = null) {
      const pending = this._sessionWork;
      if (pending) {
        const result = await pending;
        // A normal read may have started just before a 401 or a Create/Join.
        if (result.session?.access_token === rejectedToken ||
            (allowSignup && result.error?.code === 'session_expired')) {
          return this._ensureSession(allowSignup, rejectedToken);
        }
        return result;
      }
      const work = this._sessionFor(allowSignup, rejectedToken);
      this._sessionWork = work;
      try { return await work; }
      finally { if (this._sessionWork === work) this._sessionWork = null; }
    },

    // Called on Create/Join. Ordinary room requests never create a new user.
    async init({ allowSignup = true } = {}) {
      const { session, error } = await this._ensureSession(allowSignup);
      return { uid: session?.user_id || '', error: error || null };
    },

    async _request(path, opts = {}) {
      const initial = await this._ensureSession();
      if (initial.error) return { data: null, error: initial.error };
      const { user_id: uid, access_token: token } = initial.session;
      let r = await this._fetch(path, { ...opts, token });
      if (r.status === 401) {
        const next = await this._ensureSession(false, token);
        if (next.error || next.session.user_id !== uid) return { data: null, error: next.error || expired() };
        r = await this._fetch(path, { ...opts, token: next.session.access_token });
        if (r.status === 401) return { data: null, error: expired() };
      }
      return r.ok ? { data: r.data, error: null } : { data: null, error: errorOf(r) };
    },

    async getRoom(code) {
      const { data, error } = await this._request('/rest/v1/rooms?select=' + ROOM_COLUMNS + '&id=eq.' + encodeURIComponent(code) + '&limit=1');
      if (error) return { data: null, error };
      if (!Array.isArray(data)) return { data: null, error: { message: 'The room service returned an unexpected response.' } };
      return { data: data[0] || null, error: null };
    },

    rpc(name, args) {
      return this._request('/rest/v1/rpc/' + name, { method: 'POST', body: args });
    }
  };

  window.SB = SB;
})();
