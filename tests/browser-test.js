/* Two independent browser contexts against the real schema in local PostgreSQL.
   GoTrue/PostgREST transport is emulated; no requests reach the live project. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const { chromium } = require('playwright');
const { openDatabase, asUser } = require('./database');
const { createServer } = require('./serve');

const conf = { window: {} };
runInNewContext(readFileSync(join(__dirname, '../config.js'), 'utf8'), conf);
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = conf.window.SUPABASE_CONFIG;
assert.equal(SUPABASE_URL, 'https://waraigofwvtaicuuregf.supabase.co');

const RPC = {
  dv_create_room: ['p_name', 'p_emoji'], dv_join_room: ['p_code', 'p_name', 'p_emoji'],
  dv_set_avatar: ['p_code', 'p_emoji'], dv_leave_room: ['p_code'],
  dv_set_choice: ['p_code', 'p_choice', 'p_turn'], dv_set_state: ['p_code', 'p_state', 'p_turn']
};
const ROOM_COLUMNS = new Set('id,host_id,players,state,game_type,round,current_prompt,choices,streak,turn_token,revision'.split(','));

function gateway(db, origin) {
  const access = new Map();
  const refresh = new Map();
  const failures = [];
  let signups = 0;
  let enabled = false;
  let reading = 0;

  function session(uid) {
    const data = { user: { id: uid }, access_token: randomUUID(), refresh_token: randomUUID(), expires_in: 3600 };
    access.set(data.access_token, uid);
    refresh.set(data.refresh_token, uid);
    return data;
  }

  async function routeRequest(route) {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === origin) return route.continue();
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.abort();
    const reply = (status, data) => route.fulfill({ status, json: data,
      headers: { 'access-control-allow-origin': origin, 'cache-control': 'no-store' } });
    try {
      assert.equal(url.origin, SUPABASE_URL);
      const method = req.method();
      const headers = await req.allHeaders();
      if (method === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: {
          'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST',
          'access-control-allow-headers': 'apikey, authorization, content-type'
        } });
      }
      assert.equal(headers.apikey, SUPABASE_PUBLISHABLE_KEY);
      if (url.pathname.startsWith('/auth/v1/')) {
        assert.equal(headers.authorization, undefined);
        if (url.pathname.endsWith('/signup')) {
          assert.equal(method, 'POST');
          if (!enabled) return reply(422, { error_code: 'anonymous_provider_disabled' });
          signups++;
          return reply(200, session(randomUUID()));
        }
        assert.equal(url.searchParams.get('grant_type'), 'refresh_token');
        const token = req.postDataJSON().refresh_token;
        const uid = refresh.get(token);
        if (!uid) return reply(400, { error_code: 'refresh_token_not_found' });
        refresh.delete(token);
        return reply(200, session(uid));
      }
      const uid = access.get((headers.authorization || '').replace(/^Bearer /, ''));
      if (!uid) return reply(401, { message: 'JWT required' });
      if (url.pathname === '/rest/v1/rooms') {
        assert.equal(method, 'GET', 'The app must not write the table directly');
        const cols = url.searchParams.get('select').split(',');
        assert.ok(cols.every(col => ROOM_COLUMNS.has(col)));
        assert.match(url.searchParams.get('id'), /^eq\.[A-HJ-NP-Z2-9]{6}$/);
        reading++;
        const { rows } = await asUser(db, uid, tx => tx.query('select ' + cols.join(',') + ' from public.rooms where id=$1', [url.searchParams.get('id').slice(3)]));
        return reply(200, rows);
      }
      assert.equal(method, 'POST');
      const rpc = url.pathname.split('/').at(-1);
      assert.equal(url.pathname, '/rest/v1/rpc/' + rpc);
      const params = RPC[rpc];
      assert.ok(params, 'Unexpected RPC: ' + rpc);
      const args = req.postDataJSON();
      assert.deepEqual(Object.keys(args).sort(), [...params].sort());
      const placeholders = params.map((key, i) => '$' + (i + 1) + (key === 'p_state' ? '::jsonb' : '')).join(', ');
      const values = params.map(key => key === 'p_state' ? JSON.stringify(args[key]) : args[key]);
      const { rows } = await asUser(db, uid, tx => tx.query(`select * from public.${rpc}(${placeholders})`, values));
      if (rpc === 'dv_leave_room') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': origin } });
      return reply(200, rows);
    } catch (err) {
      const status = { P0002: 404, PT409: 409, '23505': 409, '42501': 403 }[err.code];
      if (!status) failures.push(err);
      return reply(status || 400, { code: err.code, message: err.message });
    }
  }

  return { routeRequest, failures, enable: () => { enabled = true; }, signups: () => signups, reads: () => reading };
}

function waitRoom(page, expected) {
  return page.waitForFunction(fields => window.App?.roomData && Object.entries(fields).every(([k, v]) => window.App.roomData[k] === v), expected);
}

function ready(page) {
  return page.waitForFunction(() => window.App?.roomData?.players.length === 2);
}

function classic(page, value) { return page.locator(`[data-pick="${value}"]`).click(); }
function button(page, name) { return page.getByRole('button', { name, exact: true }); }
function room(page) { return page.evaluate(() => window.App.roomData); }
function countSlots(page, count) {
  return page.waitForFunction(n => Object.keys(window.App.roomData?.choices || {}).length === n, count);
}

async function main() {
  const db = await openDatabase();
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const api = gateway(db, origin);
  const options = process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {};
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...options });
    const pageErrors = [];
    async function newPage() {
      const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
      await ctx.route('**/*', api.routeRequest);
      const page = await ctx.newPage();
      page.setDefaultTimeout(12000);
      page.on('pageerror', err => pageErrors.push(err));
      return page;
    }
    const [host, guest, third] = await Promise.all([newPage(), newPage(), newPage()]);
    await host.goto(origin);
    await host.waitForFunction(() => window.App);
    await host.locator('#join-room-code').fill('1234');
    await host.locator('#btn-join-room').click();
    await host.locator('#app-status').getByText('Enter the six-character code').waitFor();
    await host.locator('#btn-create-room').click();
    await host.locator('#app-status').getByText('Guest sign-in is not enabled').waitFor();
    assert.equal(api.signups(), 0);
    api.enable();
    await host.locator('#player-name-input').fill('Alex & Moon');
    await host.locator('[data-av="🐼"]').click();
    await host.locator('#btn-create-room').click();
    await host.locator('.lb-code span').waitFor();
    const code = await host.locator('.lb-code span').textContent();
    const invite = await host.locator('#room-invite').inputValue();
    assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
    assert.equal(invite, `${origin}/?room=${code}`);
    assert.ok(await host.locator('[data-game=postcards]').isDisabled());
    const inviteJoin = async page => {
      await page.goto(invite);
      await page.waitForFunction(() => window.App);
      assert.equal(await page.locator('#join-room-code').inputValue(), code);
    };
    await inviteJoin(guest);
    await guest.locator('#player-name-input').fill('<b>Rae</b>');
    await guest.locator('[data-av="🦊"]').click();
    await guest.locator('#btn-join-room').click();
    await Promise.all([ready(host), ready(guest)]);
    const hostId = await host.evaluate(() => window.App.myUid);
    const guestId = await guest.evaluate(() => window.App.myUid);
    assert.notEqual(hostId, guestId);
    assert.equal(await host.locator('.lb-chip b').count(), 0);
    assert.equal((await room(host)).players[1].emoji, '🦊');
    await button(guest, 'Shuffle my icon').click();
    await host.waitForFunction(() => window.App.roomData.players[1].emoji !== '🦊');
    assert.equal((await room(host)).players[0].emoji, '🐼');

    await inviteJoin(third);
    await third.locator('#btn-join-room').click();
    await third.locator('#app-status').getByText('Room is full').waitFor();
    assert.equal(await third.evaluate(async c => (await window.SB.getRoom(c)).data, code), null);
    assert.equal(api.signups(), 3);
    console.log('✓ Guest-auth guard, six-character invite, independent guests, avatar, two-player cap');

    await inviteJoin(guest);
    await guest.locator('#btn-join-room').click();
    await ready(guest);
    assert.equal(await guest.evaluate(() => window.App.myUid), guestId, 'Reload reuses the current project identity');
    assert.equal(api.signups(), 3);

    async function start(type) {
      if ((await room(host)).state !== 'LOBBY') {
        await host.evaluate(() => window.App.hostReturnToLobby());
        await waitRoom(guest, { state: 'LOBBY' });
      }
      await host.locator(`[data-game="${type}"]`).click();
      await Promise.all([waitRoom(host, { state: 'PLAYING', game_type: type, round: 1 }),
        waitRoom(guest, { state: 'PLAYING', game_type: type, round: 1 })]);
    }
    async function next(round, name = 'Next Round →') {
      await button(host, name).click();
      await Promise.all([waitRoom(host, { state: 'PLAYING', round }), waitRoom(guest, { state: 'PLAYING', round })]);
    }

    await start('postcards');
    const oldPrompt = (await room(host)).current_prompt.question;
    await guest.locator('#duo-text').fill('A draft I’m still typing');
    await host.locator('#duo-text').fill('A <b>tiny</b> win');
    await button(host, 'Send postcard').click();
    await guest.locator('.duo .gv-note').getByText('is ready').waitFor();
    assert.equal(await guest.locator('#duo-text').inputValue(), 'A draft I’m still typing');
    assert.equal(await guest.getByText('A <b>tiny</b> win').count(), 0);
    await button(guest, 'Send postcard').click();
    await host.locator('.duo-reveal').getByText('A <b>tiny</b> win', { exact: true }).waitFor();
    assert.equal(await host.locator('.duo-reveal b').count(), 0);
    await next(2, 'Next postcard');
    assert.notEqual((await room(guest)).current_prompt.question, oldPrompt);
    await button(guest, 'Pass this turn').click();
    await button(host, 'Pass this turn').click();
    await guest.locator('.duo-reveal').waitFor();
    assert.equal(await guest.getByText('Passed this time').count(), 2);
    console.log('✓ Postcards: draft kept, reveal after both, literal text, new prompt and passes');

    await start('storyRelay');
    for (let i = 0; i < 4; i++) {
      const writer = i % 2 === 0 ? host : guest;
      const reader = writer === host ? guest : host;
      await writer.locator('#duo-text').waitFor();
      assert.equal(await reader.locator('#duo-text').count(), 0);
      await writer.locator('#duo-text').fill('A new story line, number ' + (i + 1));
      await button(writer, 'Add line').click();
      await writer.waitForFunction(n => document.querySelectorAll('.duo-lines li').length === n, i + 1);
      if (i === 1) await host.locator('.duo-twist').waitFor();
    }
    await host.getByText('That’s a story!', { exact: true }).waitFor();
    assert.deepEqual((await host.locator('.duo-lines li span').allTextContents()).map(s => s.at(-1)), ['1', '2', '3', '4']);
    await next(2, 'New story');
    await guest.locator('#duo-text').waitFor();
    assert.equal(await host.locator('#duo-text').count(), 0);
    console.log('✓ Story Relay: alternating lines, plot twist, ordered result, alternating first writer');

    await start('wouldRather');
    for (let round = 1; round <= 3; round++) {
      await Promise.all([classic(host, 'a'), classic(guest, round <= 2 ? 'a' : 'b')]);
      const streak = round <= 2 ? round : 0;
      await Promise.all([waitRoom(host, { state: 'COMPARISON', streak }), waitRoom(guest, { state: 'COMPARISON', streak })]);
      assert.equal(Object.keys((await room(host)).choices).length, 2);
      if (round < 3) await next(round + 1);
    }
    await guest.locator('.gv-penalty').waitFor();
    console.log('✓ Classic game settles once per round and syncs the streak and penalty');

    await start('numberGuess');
    await Promise.all([host.locator('#mg-secret').fill('12'), guest.locator('#mg-secret').fill('14')]);
    await Promise.all([host.locator('#mg-lock').click(), guest.locator('#mg-lock').click()]);
    await Promise.all([host.locator('#mg-guess').fill('14'), guest.locator('#mg-guess').fill('12')]);
    await Promise.all([host.locator('#mg-shoot').click(), guest.locator('#mg-shoot').click()]);
    await host.waitForFunction(() => window.App.roomData?.current_prompt?.finalScores);
    const duel = await room(host);
    assert.deepEqual(JSON.parse(duel.choices[guestId]), { s: 14, g: [12] });
    assert.ok(duel.current_prompt.finalScores[guestId] > 0);
    await next(2);
    assert.equal((await room(guest)).current_prompt.scores[hostId], duel.current_prompt.finalScores[hostId]);
    console.log('✓ Secret Duel preserves both structured choices and carries scores forward');

    await start('emojiClue');
    for (const [giver, guesser] of [[host, guest], [guest, host]]) {
      await giver.locator('#ec-e').fill('🌙');
      await giver.locator('#ec-go').click();
      await guesser.locator('.ec-opt').first().click();
      await host.waitForFunction(() => window.App.roomData?.current_prompt?.finalScores);
      if (giver === host) await next(2);
    }
    console.log('✓ Party game deals a clue to either player and persists scores');

    await start('hotSeat');
    const questions = (await room(host)).current_prompt.questions.length;
    for (let i = 1; i <= questions; i++) {
      await Promise.all([host.locator('.hs-opt').first().click(), guest.locator('.hs-opt').first().click()]);
      for (const p of [host, guest]) {
        await p.waitForFunction(n => {
          const a = JSON.parse(window.App.roomData?.choices[window.App.myUid] || '{}');
          return (a.a || a.p || []).length === n;
        }, i);
      }
    }
    await host.waitForFunction(() => window.App.roomData?.current_prompt?.finalScores);
    await guest.locator('.hs-list').waitFor();
    console.log('✓ Social game accepts every choice and scores both players');

    await start('spyInTheCrowd');
    await Promise.all([host.locator('#spy-input').fill('blue'), guest.locator('#spy-input').fill('bright')]);
    await Promise.all([button(host, 'Submit clue').click(), button(guest, 'Submit clue').click()]);
    await countSlots(host, 2);
    await button(host, 'Start voting').click();
    await guest.locator('[data-stream-choice]').first().waitFor();
    assert.equal((await room(guest)).current_prompt.clues[guestId], 'bright');
    await Promise.all([host.locator('[data-stream-choice]').first().click(), guest.locator('[data-stream-choice]').first().click()]);
    await guest.getByText('The spy was', { exact: true }).waitFor();
    console.log('✓ Stream game advances from clues to voting without dropping either clue');

    const others = [
      ['truthOrDare', '.gv-q'], ['mindMeld', '#mindmeld-input'], ['percentage', '#vibe-range'],
      ['blindRank', '[data-slot]'], ['flashPoll', '[data-stream-choice]'], ['wordStorm', '#wordstorm-input'],
      ['secretGuess', '.gv-word'], ['ageGuess', '#mg-secret'], ['twoTruths', '#tt-s0'],
      ['speedRound', '.sr-btn'], ['mostLikely', '.ml-person'], ['nhie', '.nh-btn']
    ];
    for (const [type, screen] of others) {
      await start(type);
      await Promise.all([host.locator(screen).first().waitFor(), guest.locator(screen).first().waitFor()]);
    }
    console.log('✓ Remaining 12 modes launch on both screens (19 modes total)');

    await button(guest, 'Leave room').click();
    await guest.locator('#landing-view').waitFor();
    await waitRoom(host, { state: 'LOBBY' });
    assert.equal((await room(host)).players.length, 1);
    assert.deepEqual((await room(host)).choices, {});
    await inviteJoin(guest);
    await guest.locator('#btn-join-room').click();
    await Promise.all([ready(host), ready(guest)]);
    await guest.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const reads = api.reads();
    await guest.waitForTimeout(2100);
    assert.equal(api.reads() - reads <= 2, true, 'Only the host should still be polling');
    await button(host, 'Leave room').click();
    await host.locator('#landing-view').waitFor();
    assert.equal(await guest.evaluate(() => window.App._timer), null);
    await guest.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await guest.locator('#app-status').getByText('That room has closed').waitFor();
    assert.equal((await db.query('select id from public.rooms')).rows.length, 0);
    assert.deepEqual(api.failures, []);
    assert.deepEqual(pageErrors, []);
    console.log('✓ Guest leave/rejoin, host leave, background polling pause, room closure on resume');

    const pwa = await browser.newContext();
    await pwa.route('https://fonts.**/*', route => route.abort());
    const offlinePage = await pwa.newPage();
    await offlinePage.goto(origin);
    await offlinePage.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert.ok(await offlinePage.evaluate(async () => (await caches.keys()).some(key => key.startsWith('duovibe-v'))));
    await pwa.setOffline(true);
    await offlinePage.goto(invite);
    await offlinePage.waitForFunction(() => window.App);
    assert.equal(await offlinePage.locator('#join-room-code').inputValue(), code);
    await pwa.close();
    console.log('✓ Versioned service worker loads the app and invite offline');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    await db.close();
  }
}

main().catch(err => { console.error(err); process.exitCode = 1; });
