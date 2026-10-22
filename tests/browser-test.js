/*
   DuoVibe end-to-end test: drives two real browsers (host + guest) through
   every game mode against a real Supabase project.

   Setup:
     npm i -D playwright && npx playwright install chromium
     node tests/serve.js &            # serves the repo on :8090
     node tests/browser-test.js

   It creates rooms in the live database. Clean up afterwards with:
     select public.dv_purge_stale_rooms(0);
*/
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8090';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
};

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const errors = [];

  async function mk(tag) {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`[${tag}] ${e.message.split('\n')[0]}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text().split('\n')[0]}`); });
    return page;
  }

  const host = await mk('host');
  const guest = await mk('guest');

  // ── 1. boot ──────────────────────────────────────────────────────
  await host.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(1200);
  const boot = await host.evaluate(() => ({
    uid: window.App && window.App.myUid,
    mode: window.SB.mode,
    banks: window.GAME_BANKS ? Object.keys(window.GAME_BANKS).length : 0,
    items: window.GAME_BANKS ? Object.values(window.GAME_BANKS).reduce((n, v) => n + v.length, 0) : 0,
    all100: window.GAME_BANKS ? Object.values(window.GAME_BANKS).every(v => v.length === 100) : false,
    sdkGone: typeof window.supabase === 'undefined',
    confettiGone: typeof window.confetti === 'undefined'
  }));
  check('app boots with an identity', !!boot.uid, `uid=${boot.uid} mode=${boot.mode}`);
  check('15 banks x 100 questions', boot.banks === 15 && boot.items === 1500 && boot.all100, `${boot.banks} banks / ${boot.items} items`);
  check('110KB supabase-js SDK not loaded', boot.sdkGone);
  check('confetti library not loaded', boot.confettiGone);

  // ── 2. create + join ─────────────────────────────────────────────
  await host.fill('#player-name-input', 'Host');
  await host.click('#btn-create-room');
  await sleep(2500);
  const lobby = await host.locator('#game-view').innerText().catch(() => '');
  const code = (lobby.match(/Room:\s*(\d{4})/) || [])[1];
  check('host creates a room', !!code, 'code=' + code);
  check('14 game cards rendered', (await host.locator('#game-view .game-card').count()) === 14);

  await guest.goto(`${BASE}/?room=${code}`, { waitUntil: 'networkidle' });
  await sleep(900);
  await guest.fill('#player-name-input', 'Guest');
  await guest.click('#btn-join-room');
  await sleep(4000);
  const hostLobby = await host.locator('#game-view').innerText();
  check('guest joins, host sees 2 players', /Connected \(2\)/.test(hostLobby));
  check('guest lobby renders without crashing', (await guest.locator('#game-view .game-card').count()) === 0 && !/Waiting for Host/.test(await guest.locator('#game-view').innerText()) === false);

  // ── 3. randomness: same game twice must give different questions ──
  const drawn = [];
  for (let i = 0; i < 3; i++) {
    await host.evaluate(() => window.App.hostReturnToLobby());
    await sleep(1400);
    await host.locator('#game-view .game-card[data-game="truthOrDare"]').click();
    await sleep(2200);
    drawn.push(await host.evaluate(() => {
      const p = window.App.roomData.current_prompt;
      return p ? (p.content || p.question || '(empty)') : '(no prompt)';
    }));
    await host.evaluate(() => window.App.submitChoice('x'));
    await sleep(400);
    await guest.evaluate(() => window.App.submitChoice('y'));
    await sleep(1600);
  }
  check('3 rounds of the same game all differ', new Set(drawn).size === 3, drawn.map(d => String(d).slice(0, 26)).join(' | '));

  check('picker bag holds 100 per game', await host.evaluate(() => window.Picker.remaining('wouldRather')) <= 100);

  // ── 4. every game plays ──────────────────────────────────────────
  const GAMES = ['wouldRather', 'redGreenFlag', 'compatQuiz', 'hotTakes', 'bucketList', 'truthOrDare',
    'mindMeld', 'vibeSlider', 'percentage', 'blindRank', 'flashPoll', 'wordStorm', 'spyInTheCrowd', 'secretGuess'];

  async function act(page) {
    if (await page.locator('#mindmeld-input').count()) { await page.fill('#mindmeld-input', 'pizza'); await page.click('#btn-submit-mindmeld'); return 'mindmeld'; }
    if (await page.locator('#truth-input').count()) { await page.fill('#truth-input', 'answer'); await page.click('#btn-submit-truth'); return 'truth'; }
    if (await page.locator('#wordstorm-input').count()) { await page.fill('#wordstorm-input', 'banana'); await page.locator('#game-view button', { hasText: 'Send' }).first().click(); return 'wordstorm'; }
    if (await page.locator('#spy-input').count()) { await page.fill('#spy-input', 'clue'); await page.locator('#game-view button', { hasText: 'Submit' }).first().click(); return 'spy'; }
    if (await page.locator('#vibe-range').count()) { await page.locator('#game-view button', { hasText: 'Lock In Value' }).first().click(); return 'slider'; }
    const slots = page.locator('#game-view button', { hasText: /Slot \d/ });
    if (await slots.count()) {
      let n = 0;
      for (let i = 0; i < 5; i++) {
        const empty = page.locator('#game-view button:not([disabled])', { hasText: /Slot \d: \[ Empty \]/ }).first();
        if (!(await empty.count())) break;
        await empty.click(); n++; await sleep(120);
      }
      if (n) return 'blindrank';
    }
    const btn = page.locator('#game-view button').filter({ hasNotText: /Skip|Lobby|Force Reveal|Reveal Now|Start Voting|Copy Direct Link|Leave/ }).first();
    if (await btn.count()) { await btn.click(); return 'option'; }
    return 'none';
  }

  const results = [];
  for (const g of GAMES) {
    const before = errors.length;
    await host.evaluate(() => window.App.hostReturnToLobby());
    await sleep(900);
    const card = host.locator(`#game-view .game-card[data-game="${g}"]`).first();
    if (!(await card.count())) { results.push([g, 'NO CARD']); continue; }
    await card.click();
    await sleep(1300);
    if (await host.locator('#btn-roll-random').count()) { await host.click('#btn-roll-random'); await sleep(1100); }

    const st = await host.evaluate(() => window.App.roomData.state + '/' + window.App.roomData.game_type);

    /* the guest polls every ~900ms; wait until it has actually joined the round */
    for (let w = 0; w < 20; w++) {
      const ok = await guest.evaluate(g => window.App.roomData && window.App.roomData.state === 'PLAYING' && window.App.roomData.game_type === g, g);
      if (ok) break;
      await sleep(300);
    }
    if (g === 'spyInTheCrowd') {
      const sv = host.locator('#game-view button', { hasText: 'Start Voting' });
      await act(host); await sleep(500);
      if (await sv.count()) { await sv.click(); await sleep(1400); }
    }
    await act(host); await sleep(600);
    await act(guest); await sleep(2200);

    const txt = await host.locator('#game-view').innerText();
    const done = /PERFECT MATCH|NOT A MATCH|Results|The Spy Was|Word Submissions/i.test(txt);
    const fresh = errors.slice(before);
    results.push([g, !/PLAYING/.test(st) ? 'BAD STATE ' + st : (done ? 'OK' : 'NO RESULT'), fresh.length ? fresh[0] : '']);
  }
  for (const [g, verdict, err] of results) check(`game ${g}`, verdict === 'OK', verdict + (err ? ' :: ' + err : ''));

  // ── 5. penalty box ───────────────────────────────────────────────
  await host.evaluate(() => window.App.updateRoomState({ streak: 2, state: 'LOBBY', game_type: null, current_prompt: null, choices: {} }));
  await sleep(1600);
  await host.locator('#game-view .game-card[data-game="wouldRather"]').click();
  await sleep(1500);
  const opts = await host.evaluate(() => ({ a: window.App.roomData.current_prompt.optionA, b: window.App.roomData.current_prompt.optionB }));
  await host.locator('#game-view button', { hasText: opts.a }).first().click(); await sleep(600);
  await guest.locator('#game-view button', { hasText: opts.b }).first().click(); await sleep(2400);
  const penalty = await host.locator('.penalty-box').innerText().catch(() => '');
  check('streak penalty shows a real dare', /STREAK PENALTY/.test(penalty) && !/object Object/.test(penalty), penalty.replace(/\n/g, ' ').slice(0, 70));

  // ── 6. XSS ───────────────────────────────────────────────────────
  await host.evaluate(async () => {
    const { data } = await window.SB.from('rooms').select('players').eq('id', window.App.roomId).single();
    const ps = data.players.map((p, i) => i === 1 ? { ...p, name: '<img src=x onerror="window.__pwned=1">' } : p);
    await window.SB.from('rooms').update({ players: ps, state: 'LOBBY', game_type: null, current_prompt: null, choices: {} }).eq('id', window.App.roomId);
  });
  await sleep(2400);
  const pwned = await host.evaluate(() => window.__pwned === 1);
  check('player name cannot execute script', !pwned);

  // ── 7. leave ─────────────────────────────────────────────────────
  await guest.locator('button', { hasText: 'Leave Room' }).first().click();
  await sleep(2200);
  const left = await guest.evaluate(() => ({ room: window.App.roomId, landing: document.getElementById('landing-view').style.display }));
  const remaining = await host.evaluate(async () => {
    const { data } = await window.SB.from('rooms').select('players').eq('id', window.App.roomId).single();
    return data ? data.players.length : -1;
  });
  check('guest leaves to the landing screen', left.room === null && left.landing === 'block');
  check('host sees the player gone', remaining === 1, 'players=' + remaining);

  // ── 8. polling cost ──────────────────────────────────────────────
  let requests = 0;
  host.on('request', r => { if (r.url().includes('/rest/v1/rooms')) requests++; });
  requests = 0; await sleep(5000);
  const visible = requests;
  requests = 0;
  await host.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(5000);
  const hidden = requests;
  await host.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  check('polling pauses when the tab is hidden', hidden === 0, `visible=${visible} in 5s, hidden=${hidden}`);

  console.log('\nERRORS (' + errors.length + '):', errors.length ? '\n  ' + [...new Set(errors)].slice(0, 12).join('\n  ') : '(none)');
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
