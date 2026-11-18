# DuoVibe — Party Edition

Two-player browser games for long-distance couples and friends. Create a room,
send the invite link or six-character code, and play together. No email, phone
number, downloads, or video call required.

## Play something together

Start with **Postcards** if you want to know each other better, or **Story
Relay** if you just want to laugh. Neither depends on having met in person.
Both are text-only, untimed, and let either player pass.

| Mood | Pick | How to keep it fresh |
| --- | --- | --- |
| A quiet check-in | **Postcards** — trade one short answer. They open together. | 30 prompts, and your answers change with your day. Try “What small thing made you smile today?” |
| Make something silly | **Story Relay** — alternate four lines of a shared story. | 20 openings × 20 twists, different writers starting each round. |
| Five-minute warm-up | **Would You Rather** or **Mind Meld** | Explain one surprising choice instead of trying to win every round. |
| A light challenge | **Emoji Charades** | Swap clue-giver each round. Try a “food only” night outside the app. |
| Discover a side of them | **Two Truths & a Lie** or **Hot Seat** | Rotate a theme: childhood snacks, hobbies, comfort shows, imagined weekends. Skip anything too personal. |

If your schedules don’t overlap, try **One-song radio** by text: pick a theme
(“walking home,” “instant good mood”), each send one song and a one-line reason,
and trade who chooses tomorrow’s theme. No room or account needed for that one.

## Run locally

```sh
node tests/serve.js
# Open http://localhost:8090. HOST and PORT can override the listen address.
```

On Windows, `scripts\duovibe.cmd doctor` checks the environment and reports the
configured backend’s guest-sign-in setting without creating an account. See the
[Windows commands](scripts/README.md) and the [test guide](tests/README.md).

## Backend setup and cutover

The app is configured for `https://waraigofwvtaicuuregf.supabase.co` in
[`config.js`](config.js). The publishable key is safe to put in frontend code;
never substitute a secret key, database password, or service-role key.

1. For a fresh project, apply [`supabase-schema.sql`](supabase-schema.sql) as
   the database owner in a single transaction. It installs the table, policies,
   RPCs and cleanup function without deleting existing rows. **The schema is
   already applied to `waraigofwvtaicuuregf`.**
2. Enable **Anonymous sign-ins** under Authentication → Sign In / Providers in
   the [destination dashboard](https://supabase.com/dashboard/project/waraigofwvtaicuuregf/auth/providers).
   Create and Join require guest authentication; there is no unscoped fallback.
3. To preserve room history from the old database, follow the
   [room archive and cutover runbook](supabase/README.md). Do not restore the full
   dump over a managed Supabase project. Old invites cannot transfer membership
   to a new project; use a new link.
4. Smoke-test the new backend in two independent browser profiles before deploying.
   Netlify builds `dist/` from an explicit public-asset list, so SQL, tests and
   docs are not shipped. To build locally: `node scripts/site-files.js`.

## How sync works

- A guest session is created on Create or Join, stored per project, and
  refreshed using the same identity whenever possible. Use separate browser
  profiles or devices for two players; tabs in one profile share a guest ID.
- A room has two seats. Only current members can read it. Browser clients
  cannot write `rooms` directly; writes go through narrowly scoped RPCs that
  take their identity from `auth.uid()`.
- Each choice write updates just that player’s slot. The host changes rounds
  through a separate RPC. The server rotates a turn token when a round or phase
  advances, and the UI ignores older revisions, so a delayed response cannot
  replace a newer turn.
- Polling uses REST, pauses in hidden tabs and backs off on errors. The service
  worker caches the versioned app shell, not API traffic. For a release, bump
  the asset version in `index.html` and `sw.js` together.
- Inactive rooms stop accepting reads and joins after 24 hours. The owner can
  schedule `select public.dv_purge_stale_rooms(24);` in Supabase Cron to delete
  expired rows. A host leaving closes the room; a guest leaving clears the game
  and returns the host to a clean lobby.

Treat invites like private links; anyone with one can take a free seat. Game
answers are stored by the room service, not end-to-end encrypted. Keep sensitive
personal details out of prompts and answers.
