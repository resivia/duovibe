#Requires -Version 5.1
<#
.SYNOPSIS
    DuoVibe maintenance and deployment helper for Windows.

.DESCRIPTION
    One script, a handful of commands. Run it from anywhere:

        .\scripts\duovibe.ps1 doctor
        .\scripts\duovibe.ps1 verify
        .\scripts\duovibe.ps1 dev
        .\scripts\duovibe.ps1 deploy -Message "Fix spy rounds"
        .\scripts\duovibe.ps1 sql
        .\scripts\duovibe.ps1 patch

    If Windows blocks the script, run once in the same window:
        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.PARAMETER Command
    doctor  - environment + project health check, and whether anonymous
              sign-ins are enabled on your Supabase project
    verify  - syntax check every script, validate the question banks, measure
              the compressed payload
    dev     - serve the app locally and print a URL you can open on your phone
    deploy  - commit everything and push (Netlify rebuilds automatically)
    sql     - apply supabase-schema.sql to your database
    patch   - write the current branch out as a .patch file

.PARAMETER Message
    Commit message for `deploy`.

.PARAMETER ConnectionString
    Postgres connection string for `sql`, e.g.
    postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
    Leave empty to read $env:SUPABASE_DB_URL, or type it when prompted.

.EXAMPLE
    .\scripts\duovibe.ps1 deploy -Message "100 questions per game"
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('doctor', 'verify', 'dev', 'deploy', 'sql', 'patch')]
    [string]$Command = 'doctor',

    [string]$Message = 'Update DuoVibe',

    [string]$ConnectionString = $env:SUPABASE_DB_URL,

    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

# ── output helpers ───────────────────────────────────────────────────
function Write-Ok    { param($m) Write-Host "  [ok]   $m" -ForegroundColor Green }
function Write-Warn2 { param($m) Write-Host "  [warn] $m" -ForegroundColor Yellow }
function Write-Fail  { param($m) Write-Host "  [fail] $m" -ForegroundColor Red }
function Write-Head  { param($m) Write-Host ""; Write-Host $m -ForegroundColor Cyan; Write-Host ("-" * $m.Length) -ForegroundColor DarkCyan }

function Test-Tool {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-Node {
    foreach ($n in @('node', 'node.exe')) { if (Test-Tool $n) { return $n } }
    return $null
}

# ── project facts ────────────────────────────────────────────────────
$JsFiles = @('app.js', 'banks.js', 'features.js', 'config.js', 'sw.js', 'supabase-lite.js')

function Get-PayloadReport {
    param([string[]]$Files)

    $totalRaw = 0
    $totalGz = 0
    Write-Host ("  {0,-20} {1,10} {2,10}" -f 'file', 'raw', 'gzip')
    Write-Host ("  {0,-20} {1,10} {2,10}" -f '----', '---', '----')

    foreach ($f in $Files) {
        if (-not (Test-Path $f)) { continue }
        $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $f))
        $totalRaw += $bytes.Length

        $ms = New-Object System.IO.MemoryStream
        $gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress, $true)
        $gz.Write($bytes, 0, $bytes.Length)
        $gz.Close()
        $size = $ms.ToArray().Length
        $totalGz += $size
        $ms.Dispose()

        Write-Host ("  {0,-20} {1,10} {2,10}" -f $f, $bytes.Length, $size)
    }

    Write-Host ("  {0,-20} {1,10} {2,10}" -f 'TOTAL', $totalRaw, $totalGz) -ForegroundColor Cyan
    return $totalGz
}

function Get-SupabaseConfig {
    if (-not (Test-Path 'config.js')) { return $null }
    $text = Get-Content 'config.js' -Raw
    $url = [regex]::Match($text, 'SUPABASE_URL\s*:\s*"([^"]+)"').Groups[1].Value
    $key = [regex]::Match($text, 'SUPABASE_ANON_KEY\s*:\s*"([^"]+)"').Groups[1].Value
    if (-not $url -or -not $key) { return $null }
    return [pscustomobject]@{ Url = $url.TrimEnd('/'); Key = $key }
}

function Test-AnonAuth {
    <# Returns 'enabled', 'disabled' or 'unknown' #>
    param($Config)
    if (-not $Config) { return 'unknown' }
    try {
        $body = '{"data":{},"gotrue_meta_security":{}}'
        $headers = @{ apikey = $Config.Key; Authorization = "Bearer $($Config.Key)" }
        $resp = Invoke-WebRequest -Uri "$($Config.Url)/auth/v1/signup" -Method Post -Body $body `
            -ContentType 'application/json' -Headers $headers -UseBasicParsing -TimeoutSec 15
        if ($resp.StatusCode -eq 200) { return 'enabled' }
    }
    catch {
        $code = $null
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        if ($code -eq 422) { return 'disabled' }
        if ($code -eq 429) { return 'unknown' }
    }
    return 'unknown'
}

# ═════════════════════════════════════════════════════════════════════
# doctor
# ═════════════════════════════════════════════════════════════════════
function Invoke-Doctor {
    Write-Head 'DuoVibe doctor'

    Write-Host "  repo      : $RepoRoot"
    if (Test-Path '.git') {
        $branch = (git rev-parse --abbrev-ref HEAD) 2>$null
        $dirty = (git status --porcelain) 2>$null
        Write-Ok "git branch $branch ($(if ($dirty) { 'uncommitted changes' } else { 'clean' }))"
    }
    else {
        Write-Warn2 'not a git repository'
    }

    Write-Host ''
    if (Test-Tool git) { Write-Ok "git      $(git --version)" } else { Write-Fail 'git not found - install from https://git-scm.com/download/win' }
    $node = Get-Node
    if ($node) { Write-Ok "node     $(& $node --version)" } else { Write-Warn2 'node not found - only needed for `verify`' }
    if (Test-Tool python) { Write-Ok "python   $(python --version 2>&1)" }
    elseif (Test-Tool py) { Write-Ok "py       $(py --version 2>&1)" }
    else { Write-Warn2 'python not found - `dev` will fall back to npx' }
    if (Test-Tool psql) { Write-Ok "psql     $((psql --version) -join '')" } else { Write-Warn2 'psql not found - needed only for `sql`' }

    Write-Host ''
    $cfg = Get-SupabaseConfig
    if ($cfg) {
        Write-Ok "supabase $($cfg.Url)"
        $anon = Test-AnonAuth $cfg
        switch ($anon) {
            'enabled'  { Write-Ok 'anonymous sign-ins: ENABLED' }
            'disabled' {
                $ref = ([uri]$cfg.Url).Host.Split('.')[0]
                Write-Warn2 'anonymous sign-ins: DISABLED'
                Write-Host '           Enable here: Authentication > Sign In / Providers > Anonymous sign-ins' -ForegroundColor Yellow
                Write-Host "           https://supabase.com/dashboard/project/$ref/auth/providers" -ForegroundColor Yellow
                Write-Host '           The app still works without them (anon-key mode).' -ForegroundColor DarkGray
            }
            default { Write-Warn2 'anonymous sign-ins: could not determine' }
        }
    }
    else {
        Write-Fail 'config.js is missing a Supabase URL/key'
    }

    Write-Host ''
    Write-Host '  Next steps' -ForegroundColor Cyan
    Write-Host '    1. Authentication > Sign In / Providers > enable Anonymous sign-ins'
    Write-Host '    2. SQL Editor > paste supabase-schema.sql > Run   (or: .\scripts\duovibe.ps1 sql)'
    Write-Host '    3. .\scripts\duovibe.ps1 dev      - test locally on your phone'
    Write-Host '    4. .\scripts\duovibe.ps1 deploy   - push, Netlify redeploys'
}

# ═════════════════════════════════════════════════════════════════════
# verify
# ═════════════════════════════════════════════════════════════════════
function Invoke-Verify {
    Write-Head 'Syntax'
    $node = Get-Node
    $syntaxErrors = 0

    foreach ($f in $JsFiles) {
        if (-not (Test-Path $f)) { Write-Fail "$f is missing"; $syntaxErrors++; continue }
        if ($node) {
            $out = & $node --check $f 2>&1
            if ($LASTEXITCODE -eq 0) { Write-Ok $f }
            else { Write-Fail "$f : $out"; $syntaxErrors++ }
        }
        else {
            Write-Warn2 "$f skipped (node not installed)"
        }
    }

    foreach ($f in @('manifest.json')) {
        try {
            Get-Content $f -Raw | ConvertFrom-Json | Out-Null
            Write-Ok "$f parses"
        }
        catch { Write-Fail "$f is not valid JSON"; $syntaxErrors++ }
    }

    Write-Head 'Question banks'
    if ($node) {
        $probe = @'
global.window = {}; global.localStorage = { _d:{}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=v} };
require(process.cwd() + '/banks.js');
const b = window.GAME_BANKS;
let bad = 0;
for (const [k, v] of Object.entries(b)) {
  const ok = Array.isArray(v) && v.length === 100;
  if (!ok) bad++;
  console.log(`  ${ok ? '[ok]  ' : '[fail]'} ${k.padEnd(15)} ${v.length}`);
}
console.log(`\n  ${Object.keys(b).length} banks, ${Object.values(b).reduce((n,v)=>n+v.length,0)} questions, ${bad} not 100`);
process.exit(bad ? 1 : 0);
'@
        $tmp = Join-Path ([System.IO.Path]::GetTempPath()) 'duovibe-bankcheck.js'
        Set-Content -Path $tmp -Value $probe -Encoding UTF8
        & $node $tmp
        $bankExit = $LASTEXITCODE
        Remove-Item $tmp -ErrorAction SilentlyContinue
        if ($bankExit -ne 0) { $syntaxErrors++ }
    }
    else {
        Write-Warn2 'bank check needs node'
    }

    Write-Head 'Shipping hygiene'
    $index = Get-Content 'index.html' -Raw
    if ($index -match 'supabase-js') { Write-Fail 'supabase-js CDN still referenced in index.html' }
    else { Write-Ok 'no supabase-js CDN (replaced by supabase-lite.js)' }

    if ($index -match 'canvas-confetti') { Write-Fail 'confetti CDN still referenced' }
    else { Write-Ok 'no confetti CDN (replaced by CSS animation)' }

    if ($index -match 'rel="manifest"') { Write-Ok 'PWA manifest linked' } else { Write-Fail 'PWA manifest not linked' }

    Write-Head 'Compressed payload'
    $files = @('index.html', 'style.css', 'config.js', 'supabase-lite.js', 'banks.js', 'app.js', 'features.js', 'sw.js')
    $gz = Get-PayloadReport -Files $files
    Write-Host ""
    if ($gz -lt 60000) { Write-Ok ("total gzip {0:N1} KB - under the 60 KB budget" -f ($gz / 1KB)) }
    else { Write-Warn2 ("total gzip {0:N1} KB - over the 60 KB budget" -f ($gz / 1KB)) }

    Write-Host ''
    if ($syntaxErrors -eq 0) { Write-Ok 'everything passed'; exit 0 }
    Write-Fail "$syntaxErrors problem(s) found"
    exit 1
}

# ═════════════════════════════════════════════════════════════════════
# dev
# ═════════════════════════════════════════════════════════════════════
function Invoke-Dev {
    Write-Head 'Local server'

    $lan = $null
    try {
        if (Get-Command Get-NetIPAddress -ErrorAction SilentlyContinue) {
            $lan = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
                Select-Object -First 1).IPAddress
        }
    }
    catch { $lan = $null }
    if (-not $lan) {
        try {
            $lan = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
                Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.ToString() -notlike '127.*' -and $_.ToString() -notlike '169.254.*' } |
                Select-Object -First 1
            if ($lan) { $lan = $lan.ToString() }
        }
        catch { $lan = $null }
    }
    if (-not $lan) { $lan = 'localhost' }

    Write-Host "  desktop : http://localhost:$Port"
    Write-Host "  phone   : http://${lan}:$Port" -ForegroundColor Cyan
    Write-Host '  (both devices must be on the same wifi)' -ForegroundColor DarkGray
    Write-Host '  press Ctrl+C to stop' -ForegroundColor DarkGray
    Write-Host ''

    if (Test-Tool python) {
        python -m http.server $Port --bind 0.0.0.0
    }
    elseif (Test-Tool py) {
        py -m http.server $Port --bind 0.0.0.0
    }
    elseif ($node) {
        npx --yes http-server . -p $Port -a 0.0.0.0 -c-1
    }
    else {
        Write-Fail 'need python or node to serve files'
    }
}

# ═════════════════════════════════════════════════════════════════════
# deploy
# ═════════════════════════════════════════════════════════════════════
function Invoke-Deploy {
    Write-Head 'Deploy'

    if (-not (Test-Tool git)) { Write-Fail 'git not found'; exit 1 }

    $branch = git rev-parse --abbrev-ref HEAD
    Write-Host "  branch: $branch"

    $status = git status --porcelain
    if ($status) {
        Write-Host ''
        Write-Host '  changes:' -ForegroundColor Cyan
        $status | ForEach-Object { Write-Host "    $_" }
        Write-Host ''
        git add -A
        git commit -m $Message | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Fail 'commit failed'; exit 1 }
        Write-Ok "committed: $Message"
    }
    else {
        Write-Ok 'nothing to commit'
    }

    Write-Host ''
    Write-Host '  pushing...'
    git push origin $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Fail 'push rejected - pull first, or check your credentials'
        exit 1
    }
    Write-Ok 'pushed - Netlify will redeploy from this branch'

    if (Test-Tool netlify) {
        Write-Host ''
        $answer = Read-Host '  Netlify CLI detected. Deploy to production now? (y/N)'
        if ($answer -eq 'y') { netlify deploy --prod --dir . }
    }
    exit 0
}

# ═════════════════════════════════════════════════════════════════════
# sql
# ═════════════════════════════════════════════════════════════════════
function Invoke-Sql {
    Write-Head 'Apply database schema'

    if (-not (Test-Path 'supabase-schema.sql')) { Write-Fail 'supabase-schema.sql not found'; exit 1 }

    if (-not (Test-Tool psql)) {
        Write-Warn2 'psql is not installed.'
        Write-Host ''
        Write-Host '  Either install the Postgres client:' -ForegroundColor Cyan
        Write-Host '    winget install PostgreSQL.PostgreSQL.17'
        Write-Host ''
        Write-Host '  Or paste supabase-schema.sql into the Supabase SQL Editor:' -ForegroundColor Cyan
        $cfg = Get-SupabaseConfig
        if ($cfg) {
            $ref = ([uri]$cfg.Url).Host.Split('.')[0]
            Write-Host "    https://supabase.com/dashboard/project/$ref/sql/new"
        }
        exit 1
    }

    if (-not $ConnectionString) {
        Write-Host '  Find it in Supabase: Project Settings > Database > Connection string (URI)' -ForegroundColor DarkGray
        $secure = Read-Host '  Paste your connection string' -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try { $ConnectionString = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) }
        finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    }

    if (-not $ConnectionString) { Write-Fail 'no connection string'; exit 1 }
    if ($ConnectionString -notmatch 'sslmode=') {
        $sep = if ($ConnectionString.Contains('?')) { '&' } else { '?' }
        $ConnectionString = "$ConnectionString${sep}sslmode=require"
    }

    Write-Host '  applying supabase-schema.sql ...' -ForegroundColor DarkGray
    psql $ConnectionString -v ON_ERROR_STOP=1 -f supabase-schema.sql
    if ($LASTEXITCODE -ne 0) { Write-Fail 'schema failed - see the error above'; exit 1 }

    Write-Ok 'schema applied (idempotent - safe to run again any time)'
    Write-Host ''
    Write-Host '  Now enable anonymous sign-ins in the dashboard:' -ForegroundColor Cyan
    $cfg = Get-SupabaseConfig
    if ($cfg) {
        $ref = ([uri]$cfg.Url).Host.Split('.')[0]
        Write-Host "    https://supabase.com/dashboard/project/$ref/auth/providers"
    }
    exit 0
}

# ═════════════════════════════════════════════════════════════════════
# patch
# ═════════════════════════════════════════════════════════════════════
function Invoke-Patch {
    Write-Head 'Write patch'

    if (-not (Test-Tool git)) { Write-Fail 'git not found'; exit 1 }
    if (-not (git rev-parse --verify main 2>$null)) { Write-Fail 'no main branch'; return 1 }

    $out = Join-Path (Split-Path -Parent $RepoRoot) 'duovibe-fixes.patch'
    git diff --binary main HEAD > $out
    if ($LASTEXITCODE -ne 0) { Write-Fail 'git diff failed'; exit 1 }

    $size = (Get-Item $out).Length
    Write-Ok "wrote $out ($([math]::Round($size / 1KB, 1)) KB)"
    Write-Host '  apply with:  git apply duovibe-fixes.patch'
    exit 0
}

# ── dispatch ─────────────────────────────────────────────────────────
switch ($Command) {
    'doctor' { Invoke-Doctor }
    'verify' { Invoke-Verify }
    'dev'    { Invoke-Dev }
    'deploy' { Invoke-Deploy }
    'sql'    { Invoke-Sql }
    'patch'  { Invoke-Patch }
}
