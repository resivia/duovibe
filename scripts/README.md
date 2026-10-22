# DuoVibe PowerShell helper

One script, six commands. Works in Windows PowerShell 5.1 and PowerShell 7.

```powershell
.\scripts\duovibe.ps1 doctor     # default; environment + project health
.\scripts\duovibe.ps1 verify     # syntax + question banks + payload size
.\scripts\duovibe.ps1 dev        # local server, prints a phone-friendly URL
.\scripts\duovibe.ps1 deploy -Message "what changed"
.\scripts\duovibe.ps1 sql        # apply supabase-schema.sql
.\scripts\duovibe.ps1 patch      # write the branch out as a .patch file
```

If Windows blocks execution:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

or run `scripts\duovibe.cmd doctor`, which bypasses the policy for that run only.

## What each command does

**doctor** — reports git/node/python/psql, reads `config.js`, and calls the
Supabase signup endpoint to tell you whether anonymous sign-ins are enabled.
Prints the exact dashboard link when they are not.

**verify** — `node --check` on every script, validates `manifest.json`, counts
every question bank and fails if any bank is not exactly 100 items, greps for
leftover CDN references, and prints raw vs gzip size per file with a 60 KB
budget. Exits non-zero on any problem, so it can gate a deploy.

**dev** — serves the repo on `0.0.0.0:8080` using python if present, otherwise
`npx http-server`, and prints both `localhost` and your LAN IP so you can open
the game on a phone on the same wifi.

**deploy** — shows the pending changes, commits with your message, pushes the
current branch, and offers a `netlify deploy --prod` if the Netlify CLI is
installed.

**sql** — applies `supabase-schema.sql` through `psql`. Accepts a connection
string via `-ConnectionString`, `$env:SUPABASE_DB_URL`, or a masked prompt, and
adds `sslmode=require` automatically. If `psql` is missing it prints the SQL
Editor URL instead.

**patch** — writes `../duovibe-fixes.patch` (outside the repo, so it never gets
committed) containing everything on the current branch since `main`.

## Examples

```powershell
# first-time setup
.\scripts\duovibe.ps1 doctor
.\scripts\duovibe.ps1 sql -ConnectionString "postgresql://postgres:PASS@db.abcdefgh.supabase.co:5432/postgres"

# ship a change
.\scripts\duovibe.ps1 verify
.\scripts\duovibe.ps1 deploy -Message "100 questions per game"

# play on two phones
.\scripts\duovibe.ps1 dev
```

## Exit codes

`0` success · `1` problem found (failures in `verify`, failed push, failed SQL).

## Requirements

| Command | Needs |
| --- | --- |
| doctor, verify | nothing (node improves the checks) |
| dev | python **or** node |
| sql | `psql` (`winget install PostgreSQL.PostgreSQL.17`) |
| deploy | git, plus push access to the repo |
| patch | git |

Install the Postgres client only if you want `sql` to work; pasting the file into
the Supabase SQL Editor does the same thing.
