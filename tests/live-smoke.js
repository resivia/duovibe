/* Opt-in only. Uses the live config.js backend and creates two test guest
   sessions and one test room. The room is closed even on assertion failure. */
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { chromium } = require('playwright');
const { createServer } = require('./serve');

async function liveSmoke() {
  if (process.env.DUOVIBE_LIVE_SMOKE !== '1') {
    throw new Error('Set DUOVIBE_LIVE_SMOKE=1 to test against the real Supabase project.');
  }
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHROMIUM_EXECUTABLE;
  let browser, host, guest;
  const authStatuses = [];
  const pageErrors = [];
  const expectedBackend = 'https://waraigofwvtaicuuregf.supabase.co';
  const timeout = 20000;
  let step = 'launch';

  async function page() {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    // Prevent tests from contacting font servers; all room/auth traffic is real.
    await context.route(/^https:\/\/fonts\./, route => route.abort());
    const tab = await context.newPage();
    tab.setDefaultTimeout(timeout);
    tab.on('pageerror', error => pageErrors.push(error.message));
    tab.on('response', response => {
      if (response.url() === `${expectedBackend}/auth/v1/signup`) authStatuses.push(response.status());
    });
    return tab;
  }

  const room = (tab, fields) => tab.waitForFunction(expected => {
    const r = window.App?.roomData;
    return r && Object.entries(expected).every(([key, value]) => key === 'players' ? r.players.length === value : r[key] === value);
  }, fields, { timeout });

  try {
    browser = await chromium.launch({ headless: true, executablePath });
    [host, guest] = await Promise.all([page(), page()]);
    step = 'host signup and create';
    await host.goto(origin);
    await host.waitForFunction(() => !!window.App);
    assert.equal(await host.evaluate(() => window.SUPABASE_CONFIG.SUPABASE_URL), expectedBackend);
    await host.locator('#player-name-input').fill('DuoVibe test host');
    await host.locator('#btn-create-room').click();
    await room(host, { state: 'LOBBY', players: 1 });
    const code = await host.locator('.lb-code span').textContent();
    assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
    const invite = await host.locator('#room-invite').inputValue();
    assert.equal(invite, `${origin}/?room=${code}`);

    step = 'guest signup and join';
    await guest.goto(invite);
    await guest.waitForFunction(() => !!window.App);
    assert.equal(await guest.locator('#join-room-code').inputValue(), code);
    await guest.locator('#player-name-input').fill('DuoVibe test guest');
    await guest.locator('[data-av="🦊"]').click();
    await guest.locator('#btn-join-room').click();
    await Promise.all([room(host, { players: 2 }), room(guest, { players: 2 })]);
    assert.equal(authStatuses.filter(status => status >= 200 && status < 300).length, 2);
    assert.notEqual(await host.evaluate(() => window.App.myUid), await guest.evaluate(() => window.App.myUid));
    assert.equal(await host.evaluate(() => window.App.roomData.players[1].emoji), '🦊');
    console.log('✓ Live Auth, separate guest sessions, create, invite, join, avatar sync');

    step = 'play and advance';
    await host.locator('[data-game="postcards"]').click();
    await Promise.all([room(host, { state: 'PLAYING', game_type: 'postcards', round: 1 }),
      room(guest, { state: 'PLAYING', game_type: 'postcards', round: 1 })]);
    await Promise.all([host.locator('#duo-text').fill('Test: a tiny piece of my day'),
      guest.locator('#duo-text').fill('Test: I saw a bright moon')]);
    await Promise.all([host.getByRole('button', { name: 'Send postcard' }).click(), guest.getByRole('button', { name: 'Send postcard' }).click()]);
    for (const tab of [host, guest]) {
      const reveal = tab.locator('.duo-reveal');
      await reveal.getByText('Test: a tiny piece of my day', { exact: true }).waitFor();
      await reveal.getByText('Test: I saw a bright moon', { exact: true }).waitFor();
    }
    await host.getByRole('button', { name: 'Next postcard' }).click();
    await Promise.all([room(host, { round: 2 }), room(guest, { round: 2 })]);
    assert.deepEqual(await guest.evaluate(() => window.App.roomData.choices), {});
    console.log('✓ Both live choices survive, reveal on both screens, and clear on next round');

    step = 'leave and rejoin';
    await guest.getByRole('button', { name: 'Leave room', exact: true }).click();
    await guest.locator('#landing-view').waitFor();
    await room(host, { state: 'LOBBY', players: 1 });
    assert.equal(await guest.evaluate(async code => {
      const { data, error } = await window.SB.getRoom(code);
      return !error && data === null;
    }, code), true);
    await guest.locator('#btn-join-room').click();
    await Promise.all([room(host, { players: 2 }), room(guest, { players: 2 })]);
    await host.getByRole('button', { name: 'Leave room', exact: true }).click();
    await host.locator('#landing-view').waitFor();
    await guest.locator('#app-status').getByText('That room has closed').waitFor();
    assert.deepEqual(pageErrors, []);
    console.log('✓ Guest leave/rejoin, member-only reads, host closes room, no browser errors');
  } catch (error) {
    for (const [label, tab] of [['host', host], ['guest', guest]]) {
      const status = await tab?.locator('#app-status').textContent({ timeout: 500 }).catch(() => '');
      if (status) console.error(`${label}: ${status}`);
    }
    if (authStatuses.length) console.error('Signup HTTP statuses:', authStatuses.join(', '));
    throw new Error(`Live Supabase smoke test failed at: ${step}`, { cause: error });
  } finally {
    if (host) {
      const left = await host.evaluate(async () => {
        if (!window.App?.roomId) return true;
        await window.App.leaveRoom();
        return window.App.roomId === null;
      }).catch(() => false);
      if (!left) console.warn('Test room cleanup did not complete; the inactivity limit still applies.');
    }
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

liveSmoke().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
