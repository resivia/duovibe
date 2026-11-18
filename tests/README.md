# Tests

The app has no runtime npm dependencies. This directory’s optional tools test
against disposable local data by default.

```sh
node tests/auth-test.js                      # session logic only; no dependencies
npm ci --prefix tests                        # Node.js 20+
npm test --prefix tests                       # auth, Postgres RPCs/RLS, room archive
cd tests
npx playwright install chromium              # or supply CHROMIUM_EXECUTABLE
npm run test:browser
```

The archive test invokes `python3` (set `PYTHON=python` on systems where that is
the Python 3 command). `schema-test.js` applies the production SQL to an
in-memory PostgreSQL database with the Supabase roles, including reapplication,
room membership, stale-turn rejection, and owner-only cleanup.

`browser-test.js` uses independent Chromium profiles against that SQL and a
local Auth/REST transport fixture. It covers create, join, avatar sync, both
new games, representative classic, stream, Secret Duel, social and Party Pack
rounds, and launching all 19 modes. It does **not** validate the live GoTrue or
PostgREST configuration. Use the [cutover live check](../supabase/README.md#release-check)
for that. No global test-room purge is needed.

To serve the actual configured app without the fixture:

```sh
node tests/serve.js              # http://localhost:8090 (HOST and PORT are optional)
```

## Opt-in live check

After enabling Anonymous sign-ins in the destination, `DUOVIBE_LIVE_SMOKE=1 npm
run test:live --prefix tests` runs two genuine browser sessions against the
configured project. The script closes only its own test room and does not log
tokens. Two anonymous test identities may remain. The GitHub **Verify DuoVibe**
workflow normally runs the local checks only; to include live verification,
select `live_smoke` in a manual run or include `[live-smoke]` in a test push's
commit message.
