# Tests

| File | What it does | Needs |
| --- | --- | --- |
| `browser-test.js` | Two real browsers play all 14 modes end to end: creation, joining, every game, penalty dare, XSS, leave, polling behaviour. Creates rooms in the live DB. | playwright + chromium |
| `auth-test.js` | Unit tests for `supabase-lite.js`: anon sign-in, 422 fallback, token refresh, 401 retry, offline handling. Network is stubbed. | node |
| `serve.js` | Static server with brotli/gzip and the production CSP, so local tests see what Netlify serves. | node |

```bash
node tests/auth-test.js          # no server needed
node tests/serve.js &            # http://127.0.0.1:8090
node tests/browser-test.js
```

Clean up the rooms the browser test creates:

```sql
select public.dv_purge_stale_rooms(0);
```
