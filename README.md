# DuoVibe — Party Edition

Real-time party games for long-distance couples and besties. One person creates a
room, the other joins with a 4-digit code, and every game syncs between both
screens without a page reload.

**Stack:** static HTML/CSS/JS · [Supabase](https://supabase.com) (Postgres + REST
+ anonymous auth) · Netlify.

---

## Quick start (Windows)

```powershell
# from the repo root
.\scripts\duovibe.ps1 doctor     # what's installed, what still needs doing
.\scripts\duovibe.ps1 verify     # syntax, question banks, payload size
.\scripts\duovibe.ps1 dev        # serve locally, prints a URL for your phone
.\scripts\duovibe.ps1 deploy     # commit + push, Netlify rebuilds
```

If PowerShell refuses to run the script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

or double-click `scripts\duovibe.cmd`.

Everything here also works on macOS/Linux with `pwsh`.

---

## Two things to do in the Supabase dashboard

The app runs without these, but it is not scoped to real users and the atomic
room functions are missing.

1. **Enable anonymous sign-ins**
   Authentication → Sign In / Providers → *Anonymous sign-ins* → Enable.
   `doctor` tells you whether this is already on.

2. **Apply the schema**
   SQL Editor → paste `supabase-schema.sql` → Run, *or* `.\scripts\duovibe.ps1 sql`.
   The file is idempotent: it creates what is missing, never drops a table and
   never deletes a room. Safe to run on the live database.

`config.js` already holds your project URL and anon key.

---

## Files

| File | Purpose | gzip |
| --- | --- | --- |
| `index.html` | Shell: brand header, landing form, `#game-view` mount | 1.5 KB |
| `style.css` | All styling | 2.6 KB |
| `app.js` | Core: room lifecycle, polling, game state machine, renderers | 9.0 KB |
| `features.js` | Flash Poll / Word Storm / Spy in the Crowd overlay | 3.4 KB |
| `banks.js` | 15 question banks × 100 items + shuffle-bag `Picker` | 27.6 KB |
| `supabase-lite.js` | Supabase client (anon auth + PostgREST), replaces the 110 KB SDK | 3.0 KB |
| `config.js` | Supabase URL + anon key | 0.3 KB |
| `sw.js` | Service worker: app shell cache | 1.0 KB |
| `supabase-schema.sql` | Tables, RLS policies, RPCs, cleanup | — |
| `scripts/duovibe.ps1` | Windows helper: doctor / verify / dev / deploy / sql / patch | — |

**Total app shell ≈ 48 KB gzipped (≈31 KB brotli), including all 1,500 questions.**
The previous version downloaded a 110 KB Supabase SDK plus a 9 KB confetti library
on every visit and shipped a 114 KB `banks.js`.

---

## How sync works

The host and guest both poll `rooms`; the renderer only touches the DOM when a
state signature actually changes.

```
rooms
  id             text pk       4-digit code
  host_id        text          auth user id (or local id without auth)
  host_name      text
  players        jsonb         [{ id, name, role }]
  state          text          LOBBY | DRAFTING | PLAYING | COMPARISON
  game_type      text
  current_prompt jsonb         question + per-round data
  choices        jsonb         { playerId: answer }
  streak         int
  round          int
```

Writes that must not race go through `SECURITY DEFINER` functions instead of
read-modify-write:

| Function | Purpose |
| --- | --- |
| `dv_create_room(name)` | allocates a free code, retries internally |
| `dv_join_room(code, name)` | adds or renames the caller, caps the room at two |
| `dv_leave_room(code)` | removes the caller, deletes the room when the host leaves |
| `dv_set_choice(code, choice)` | `jsonb` merge — two answers at once cannot overwrite each other |
| `dv_set_state(code, state)` | host-only atomic state update |
| `dv_purge_stale_rooms(hours)` | housekeeping, callable manually or by pg_cron |

Every function resolves the caller as `coalesce(auth.uid()::text, p_uid)`, so the
same code works with anonymous auth **on** (identity from the JWT, `p_uid`
ignored) and **off** (identity from the client). An authenticated user cannot
impersonate another player by passing someone else's `p_uid`.

---

## Questions

15 banks, **exactly 100 items each**, 1,500 total:

Would You Rather · Red/Green Flag · Compatibility · Hot Takes · Bucket List ·
Truth or Dare · Mind Meld · Vibe Slider · Percentage · Blind Rank · Flash Poll ·
Word Storm · Spy in the Crowd · Mastermind (secret word) · Dares

`Picker` is a **shuffle bag**, not a random index: it deals through all 100
questions in a shuffled order before repeating, keeps the deck in
`localStorage`, and never serves the same question twice in a row. Two players
on different devices therefore get different orders, and the host's draw is what
is written to the database so both see the same question.

To change the questions, edit `build/normalise_banks.py` and regenerate — do not
hand-edit `banks.js`. The generator validates every item's shape before writing.

---

## Performance notes

Built so a phone survives being used while other apps are open:

- **Polling pauses when the tab is hidden** (`visibilitychange` + `pagehide`),
  so a pocketed phone makes no requests at all.
- Adaptive interval: 900 ms while playing, 2 s idle, exponential backoff to 8 s
  after failures, and every request has an 8 s `AbortController` timeout.
- **No `backdrop-filter`** anywhere — blurring re-reads the whole backdrop every
  frame and is the main cause of jank on mid-range Android.
- The background is a **static** gradient. It used to animate a 400%-wide
  gradient forever, repainting the entire page continuously.
- `content-visibility: auto` on game cards keeps offscreen cards out of layout
  and paint.
- The DOM is only rewritten when state actually changes.
- Celebrations are a CSS animation instead of a 40 KB confetti library.
- A service worker caches the shell, so a repeat visit starts instantly and the
  app still opens offline.

---

## Deploy

Netlify auto-deploys this repo. `netlify.toml` sets a CSP, `nosniff`,
`permissions-policy`, long cache for icons and `no-cache` for `index.html` and
`sw.js`.

When you release, bump the `?v=` query in `index.html` and the `CACHE` constant
in `sw.js` so returning visitors get the new files.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| "Could not create a room" | Supabase project paused, or the anon key in `config.js` is stale |
| Both players see different questions | one tab is showing a cached page: hard-reload once |
| Room not found | the code was reused after the previous room was deleted |
| Only one player appears | the guest's join was blocked: room full, or the host left |
| Anonymous sign-in warning in console | dashboard step 1 above is not done — harmless, anon-key mode |

---

## Security

Without auth: the anon key is public and RLS has to allow anonymous access, so
anyone holding the key could mass-delete rooms. With anonymous auth enabled the
policies tighten to "you can read a room you are in", writes are host-only, and
membership checks live in the database — that is the configuration to run in
production.

Room contents are effectively public: anyone who guesses a 4-digit code is a
guest. Do not put anything private in a prompt.
