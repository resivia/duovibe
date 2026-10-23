/* ═══════════════════════════════════════════════════════════════════
   DuoVibe — Secret Duel games

   Two games built on one engine:

     Guess My Age    — each player locks a secret age, then both race
                       to crack the other's by deduction.
     Guess My Number — same hunt, wider ranges, lucky numbers.

   Why it works:

   · Every round each player COMMITS a secret of their own, so the
     content can never run out. No question bank to exhaust.
   · Guessing is not luck. Every miss returns higher/lower, so the
     safe range visibly shrinks in front of you. Seven probes cracks
     any 1–120 range. It feels like deduction, because it is.
   · Both players hunt AT THE SAME TIME. Seeing "partner is on guess 2"
     while you are on guess 4 is the whole tension.
   · Speed pays. Cracking it first guess is worth the full jackpot;
     every extra probe costs a point.

   State lives in the existing `choices` map as JSON, one slot per
   player: { s: secret, g: [guesses] }. Nobody ever writes another
   player's slot, so there is nothing to race on and no referee
   needed. Both clients derive the same result from the same data.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORE = 'duovibe_minigame_decks_v1';

  /* ── round variants ───────────────────────────────────────────────
     Each round asks for a DIFFERENT kind of secret, so replaying never
     feels like the same round twice. min/max set the hunt size, limit
     is how many probes you get. limit is always >= ceil(log2(range+1))
     so a perfect player can always crack it.                            */
  const VARIANTS = {
    ageGuess: [
      { q: 'Your real age',                    sub: 'The honest one. No judgement.',                    min: 1, max: 120, limit: 7 },
      { q: 'The age you feel inside',          sub: 'Forget the birth certificate.',                    min: 1, max: 120, limit: 7 },
      { q: 'The age you act when you are tired', sub: 'The version of you at 11pm.',                    min: 1, max: 120, limit: 7 },
      { q: 'The age you were when we first met', sub: 'Whatever number that is for you.',                min: 1, max: 120, limit: 7 },
      { q: 'The age you think you look',       sub: 'Flatter yourself. We will find out.',              min: 1, max: 120, limit: 7 },
      { q: 'The age you would freeze at forever', sub: 'One number. No changing your mind.',            min: 1, max: 120, limit: 7 },
      { q: 'The age you were at your best',    sub: 'The year you would replay.',                       min: 1, max: 120, limit: 7 },
      { q: 'The age you will claim to be at 80', sub: 'Start lying early.',                             min: 1, max: 120, limit: 7 }
    ],
    numberGuess: [
      { q: 'Your lucky number',                sub: 'The one you always say out loud.',                 min: 1, max: 99,  limit: 8 },
      { q: 'A number that means something to you', sub: 'Only you know why.',                          min: 1, max: 500, limit: 10 },
      { q: 'A number nobody else would pick',  sub: 'Be strange. Be unpredictable.',                    min: 1, max: 999, limit: 11 },
      { q: 'The number of times you thought about them today', sub: 'Be honest.',                       min: 1, max: 200, limit: 9 },
      { q: 'A number with a story behind it',  sub: 'A date, a flat, a lucky shirt.',                   min: 1, max: 999, limit: 11 },
      { q: 'Your favourite number under 50',   sub: 'Small number, strong feelings.',                   min: 1, max: 50,  limit: 7 },
      { q: 'The number of days until you meet again', sub: 'Count them.',                              min: 1, max: 365, limit: 10 },
      { q: 'A number you would never forget',  sub: 'Pick it before you talk yourself out of it.',      min: 1, max: 999, limit: 11 }
    ]
  };

  function loadDecks() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  function saveDecks(d) {
    try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {}
  }

  /* Shuffle-bag: every variant is used once before any repeats. */
  function nextVariant(gameType) {
    const decks = loadDecks();
    const list = VARIANTS[gameType];
    if (!list || !list.length) return null;

    let bag = decks[gameType];
    if (!Array.isArray(bag) || !bag.length) {
      bag = list.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = bag[i]; bag[i] = bag[j]; bag[j] = t;
      }
    }
    const idx = bag.pop();
    decks[gameType] = bag;
    saveDecks(decks);
    return list[idx] || list[0];
  }

  function isMini(gameType) {
    return Object.prototype.hasOwnProperty.call(VARIANTS, gameType);
  }

  /* ── state helpers ───────────────────────────────────────────── */

  function parseSlot(choices, uid) {
    if (!choices || !uid) return null;
    const raw = choices[uid];
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw === 'object') return raw;
    try {
      const o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : null;
    } catch (e) { return null; }
  }

  function guessesOf(slot) {
    return (slot && Array.isArray(slot.g)) ? slot.g : [];
  }

  /* Solved, spent and out are all derived — no extra state to sync. */
  function statusOf(slot, secret, limit) {
    const g = guessesOf(slot);
    const spent = g.length;
    const solved = secret != null && spent > 0 && g[spent - 1] === secret;
    return { guesses: g, spent: spent, solved: solved, out: !solved && spent >= limit };
  }

  function pointsFor(spent, solved, limit) {
    if (!solved) return 0;
    return Math.max(1, limit - spent + 1);
  }

  /* The visible window, recomputed from your own guesses. This is what
     makes a miss feel like progress instead of luck. */
  function safeRange(cfg, mySlot, secret) {
    let lo = cfg.min, hi = cfg.max;
    if (secret == null) return { lo: lo, hi: hi };
    guessesOf(mySlot).forEach(function (g) {
      if (g === secret) return;
      if (g < secret) { if (g + 1 > lo) lo = g + 1; }
      else { if (g - 1 < hi) hi = g - 1; }
    });
    return { lo: lo, hi: hi };
  }

  function heatFor(dist, span) {
    if (dist === 0) return { label: 'BULLSEYE', cls: 'bull', flame: '🎯' };
    const pct = span > 0 ? dist / span : 0;
    if (pct <= 0.02) return { label: 'Burning', cls: 'hot3', flame: '🔥🔥🔥' };
    if (pct <= 0.06) return { label: 'Hot',     cls: 'hot2', flame: '🔥🔥' };
    if (pct <= 0.15) return { label: 'Warm',    cls: 'hot1', flame: '🔥' };
    return { label: 'Cold', cls: 'cold', flame: '❄️' };
  }

  function totalScores(prompt) {
    return (prompt && prompt.finalScores) || (prompt && prompt.scores) || {};
  }

  /* ── prompt construction (host only) ─────────────────────────── */

  function buildPrompt(gameType, carryScores) {
    const v = nextVariant(gameType) || VARIANTS[gameType][0];
    return {
      mini: gameType,
      variant: v.q,
      question: v.q,
      subtitle: v.sub,
      min: v.min,
      max: v.max,
      limit: v.limit,
      scores: carryScores || {}
    };
  }

  /* Called by the host when it presses Next Round. Scores earned this
     round are folded in here, once. */
  function nextRoundPrompt(app, gameType) {
    const prompt = app.roomData.current_prompt || {};
    const players = app.roomData.players || [];
    const choices = app.roomData.choices || {};
    const total = Object.assign({}, prompt.scores || {});

    players.forEach(function (p) {
      const other = players.find(function (q) { return q.id !== p.id; });
      if (!other) return;
      const mine = parseSlot(choices, p.id);
      const theirs = parseSlot(choices, other.id);
      if (!mine || !theirs || theirs.s == null) return;
      const st = statusOf(mine, theirs.s, prompt.limit || 7);
      total[p.id] = (total[p.id] || 0) + pointsFor(st.spent, st.solved, prompt.limit || 7);
    });

    return buildPrompt(gameType, total);
  }

  /* ── rendering ───────────────────────────────────────────────── */

  let keepInput = '';

  function inputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function shell(inner) {
    return '<div class="glass-card animate-fade mg-wrap">' + inner + '</div>';
  }

  function raceStrip(app, myStatus, theirStatus, theirName) {
    const mine = myStatus.spent, theirs = theirStatus.spent;
    const lead = mine < theirs ? 'you' : (theirs < mine ? 'them' : 'tie');
    return '' +
      '<div class="mg-race ' + (lead === 'you' ? 'mg-lead' : '') + '">' +
        '<div class="mg-race-side"><span class="mg-race-num">' + mine + '</span><span class="mg-race-lab">you</span></div>' +
        '<div class="mg-race-vs">vs</div>' +
        '<div class="mg-race-side"><span class="mg-race-num">' + theirs + '</span><span class="mg-race-lab">' + esc(theirName) + '</span></div>' +
      '</div>';
  }

  function historyHtml(cfg, mySlot, secret) {
    const g = guessesOf(mySlot);
    if (!g.length) return '<div class="mg-empty">No probes yet. Every guess narrows the range.</div>';
    const rows = g.map(function (v, i) {
      if (v === secret) {
        return '<div class="mg-row mg-row-hit"><span class="mg-row-i">' + (i + 1) + '</span>' +
               '<span class="mg-row-v">' + v + '</span><span class="mg-row-t">🎯 BULLSEYE</span></div>';
      }
      const dir = v < secret ? 'too low' : 'too high';
      const arrow = v < secret ? '▲' : '▼';
      const heat = heatFor(Math.abs(v - secret), cfg.max - cfg.min);
      return '<div class="mg-row"><span class="mg-row-i">' + (i + 1) + '</span>' +
             '<span class="mg-row-v">' + v + '</span>' +
             '<span class="mg-row-t">' + arrow + ' ' + dir + '</span>' +
             '<span class="mg-heat ' + heat.cls + '">' + heat.flame + '</span></div>';
    });
    return rows.join('');
  }

  function renderSetup(app, container, cfg, prompt) {
    const existing = inputValue('mg-secret') || '';
    container.innerHTML = shell(
      '<div class="mg-top"><span class="badge-pill">🔒 SET YOUR SECRET</span>' +
      '<span class="badge-pill">ROUND ' + (app.roomData.round || 1) + '</span></div>' +
      '<h2 class="mg-q">' + esc(prompt.question) + '</h2>' +
      '<p class="mg-sub">' + esc(prompt.subtitle || '') + '</p>' +
      '<div class="mg-range-badge">Anyone between <b>' + cfg.min + '</b> and <b>' + cfg.max + '</b></div>' +
      '<input type="number" id="mg-secret" class="input-field mg-input" inputmode="numeric" ' +
        'min="' + cfg.min + '" max="' + cfg.max + '" placeholder="?" value="' + esc(existing) + '" />' +
      '<button class="btn-primary mg-go" id="mg-lock">Lock It In 🔒</button>' +
      '<p class="mg-note">Pick the number that is true for you. Your partner cannot see it until the reveal.</p>'
    );

    const input = document.getElementById('mg-secret');
    const lock = function () { lockSecret(app, cfg, input ? input.value : ''); };

    if (input) {
      input.focus();
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') lock(); });
    }
    const btn = document.getElementById('mg-lock');
    if (btn) btn.addEventListener('click', lock);
  }

  function renderWaiting(app, container, cfg, prompt, theirName) {
    container.innerHTML = shell(
      '<div class="mg-top"><span class="badge-pill">🔒 SECRET LOCKED</span>' +
      '<span class="badge-pill">ROUND ' + (app.roomData.round || 1) + '</span></div>' +
      '<h2 class="mg-q">' + esc(prompt.question) + '</h2>' +
      '<div class="mg-locked-box"><div class="spinner"></div>' +
      '<h3>Waiting on ' + esc(theirName) + '</h3>' +
      '<p class="mg-note">They are picking their number. Nobody sees anything until you both commit.</p></div>' +
      (app.isHost ? '<button class="btn-secondary mg-wide" onclick="window.App.hostReturnToLobby()">Change Game</button>' : '')
    );
  }

  function renderHunt(app, container, cfg, prompt, mySlot, theirSlot, theirName) {
    const secret = theirSlot.s;
    const mine = statusOf(mySlot, secret, cfg.limit);
    const theirs = statusOf(theirSlot, mySlot.s, cfg.limit);
    const span = cfg.max - cfg.min;
    const range = safeRange(cfg, mySlot, secret);
    const left = cfg.limit - mine.spent;
    const narrowing = (range.hi - range.lo + 1);

    let body = '';

    body += '<div class="mg-top">' +
      '<span class="badge-pill">ROUND ' + (app.roomData.round || 1) + '</span>' +
      '<span class="badge-pill ' + (left <= 2 ? 'mg-pill-warn' : '') + '">' + left + ' probes left</span>' +
      '</div>';

    body += '<h2 class="mg-q">' + esc(prompt.question) + '</h2>';
    body += '<p class="mg-sub">' + esc(prompt.subtitle || '') + '</p>';

    body += raceStrip(app, mine, theirs, theirName);

    if (theirs.solved && !mine.solved) {
      body += '<div class="mg-alert">⚡ ' + esc(theirName) + ' just cracked yours. ' +
              'Catch up — crack theirs before you run out.</div>';
    } else if (theirs.solved && mine.solved) {
      body += '<div class="mg-alert mg-alert-good">Both cracked. Loading the reveal…</div>';
    }

    body += '<div class="mg-window"><div class="mg-window-lab">Safe range</div>' +
      '<div class="mg-window-vals"><span>' + range.lo + '</span>' +
      '<span class="mg-window-dash">–</span><span>' + range.hi + '</span></div>' +
      '<div class="mg-window-bar"><span style="width:' +
        Math.max(2, Math.round((1 - (narrowing - 1) / Math.max(1, span)) * 100)) + '%"></span></div>' +
      '<div class="mg-window-note">' + narrowing + ' number' + (narrowing === 1 ? '' : 's') +
        ' left · you have used ' + mine.spent + ' of ' + cfg.limit + '</div></div>';

    body += '<div class="mg-history">' + historyHtml(cfg, mySlot, secret) + '</div>';

    if (!mine.solved && !mine.out) {
      body += '<div class="mg-entry">' +
        '<input type="number" id="mg-guess" class="input-field mg-input" inputmode="numeric" ' +
          'min="' + cfg.min + '" max="' + cfg.max + '" placeholder="Your guess" value="' + esc(keepInput) + '" />' +
        '<button class="btn-primary mg-go" id="mg-shoot">Probe</button></div>';
    } else if (mine.solved) {
      body += '<div class="mg-done-good">🎯 You cracked it in ' + mine.spent +
              ' probe' + (mine.spent === 1 ? '' : 's') + '.</div>';
    } else {
      body += '<div class="mg-done-bad">Out of probes. Their secret is revealed below.</div>';
    }

    if (app.isHost) {
      body += '<div class="mg-hostbar">' +
        '<button class="btn-secondary" onclick="window.App.forceRevealResults()">Reveal</button>' +
        '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Lobby</button></div>';
    }

    container.innerHTML = shell(body);

    const input = document.getElementById('mg-guess');
    const shoot = function () { submitGuess(app, cfg, input ? input.value : ''); };
    if (input) {
      if (!keepInput) input.focus();
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') shoot(); });
      input.addEventListener('input', function () { keepInput = input.value; });
    }
    const btn = document.getElementById('mg-shoot');
    if (btn) btn.addEventListener('click', shoot);
    keepInput = '';
  }

  function renderResult(app, container, cfg, prompt, mySlot, theirSlot, theirName) {
    const mySecret = mySlot.s;
    const theirSecret = theirSlot.s;
    const mine = statusOf(mySlot, theirSecret, cfg.limit);   // my hunt of theirs
    const theirs = statusOf(theirSlot, mySecret, cfg.limit); // their hunt of mine

    const myPts = pointsFor(mine.spent, mine.solved, cfg.limit);
    const theirPts = pointsFor(theirs.spent, theirs.solved, cfg.limit);
    const totals = totalScores(prompt);

    /* Persisted once by the host so the running total survives a reload. */
    if (app.isHost && !prompt.finalScores) {
      const final = Object.assign({}, prompt.scores || {});
      final[app.myUid] = (final[app.myUid] || 0) + myPts;
      const partner = (app.roomData.players || []).find(function (p) { return p.id !== app.myUid; });
      if (partner) final[partner.id] = (final[partner.id] || 0) + theirPts;
      const next = Object.assign({}, prompt, { finalScores: final });
      app.updateRoomState({ current_prompt: next });
    }

    const iWon = myPts > theirPts;
    const tie = myPts === theirPts;
    const banner = mine.solved
      ? (iWon ? '🏆 CRACKED IT FIRST' : (tie ? '🤝 DEAD HEAT' : '🎯 CRACKED — BUT SLOWER'))
      : '💀 OUT OF PROBES';

    let html = '';
    html += '<div class="mg-top">' +
      '<span class="badge-pill">ROUND ' + (app.roomData.round || 1) + ' · RESULT</span>' +
      '<span class="badge-pill">' + esc(prompt.question) + '</span></div>';

    html += '<div class="mg-verdict ' + (mine.solved ? 'good' : 'bad') + '">' + banner + '</div>';

    html += '<div class="mg-reveal">' +
      '<div class="mg-reveal-card"><div class="mg-reveal-name">' + esc(theirName) + '’s secret</div>' +
        '<div class="mg-reveal-num accent">' + theirSecret + '</div>' +
        '<div class="mg-reveal-score">you scored <b>+' + myPts + '</b> in ' + mine.spent +
          ' probe' + (mine.spent === 1 ? '' : 's') + '</div></div>' +
      '<div class="mg-reveal-card"><div class="mg-reveal-name">Your secret</div>' +
        '<div class="mg-reveal-num">' + mySecret + '</div>' +
        '<div class="mg-reveal-score">they scored <b>+' + theirPts + '</b> in ' + theirs.spent +
          ' probe' + (theirs.spent === 1 ? '' : 's') + '</div></div>' +
      '</div>';

    html += '<div class="mg-history mg-history-final"><div class="mg-window-lab">Your probes</div>' +
      historyHtml(cfg, mySlot, theirSecret) + '</div>';

    const myTotal = totals[app.myUid] || 0;
    const partnerId = ((app.roomData.players || []).find(function (p) { return p.id !== app.myUid; }) || {}).id;
    const theirTotal = partnerId ? (totals[partnerId] || 0) : 0;

    html += '<div class="mg-totals"><div><span class="mg-total-num">' + myTotal + '</span>' +
      '<span class="mg-total-lab">you</span></div>' +
      '<div class="mg-total-vs">–</div>' +
      '<div><span class="mg-total-num">' + theirTotal + '</span>' +
      '<span class="mg-total-lab">' + esc(theirName) + '</span></div></div>';

    if (app.isHost) {
      html += '<div class="mg-hostbar mg-hostbar-main">' +
        '<button class="btn-primary" onclick="window.App.hostNextRound()">Next Round →</button>' +
        '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change Game</button></div>';
    } else {
      html += '<p class="mg-note mg-center">Waiting for the host to deal the next round…</p>';
    }

    container.innerHTML = shell(html);
  }

  /* ── actions ─────────────────────────────────────────────────── */

  function lockSecret(app, cfg, raw) {
    const n = parseInt(String(raw).replace(/[^0-9-]/g, ''), 10);
    if (!isFinite(n)) { flash('Enter a number first'); return; }
    if (n < cfg.min || n > cfg.max) {
      flash('Pick a number between ' + cfg.min + ' and ' + cfg.max);
      return;
    }
    app.submitChoice(JSON.stringify({ s: n, g: [] }));
  }

  function submitGuess(app, cfg, raw) {
    const n = parseInt(String(raw).replace(/[^0-9-]/g, ''), 10);
    if (!isFinite(n)) { flash('Enter a number first'); return; }
    if (n < cfg.min || n > cfg.max) {
      flash('Stay between ' + cfg.min + ' and ' + cfg.max);
      return;
    }
    const mySlot = parseSlot(app.roomData.choices, app.myUid);
    if (!mySlot || mySlot.s == null) return;
    const g = guessesOf(mySlot).slice();
    if (g.length >= cfg.limit) return;
    if (g.indexOf(n) !== -1) { flash('You already tried ' + n); return; }
    g.push(n);
    keepInput = '';
    app.submitChoice(JSON.stringify({ s: mySlot.s, g: g }));
  }

  function flash(msg) {
    let el = document.getElementById('mg-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mg-flash';
      el.className = 'mg-flash';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  /* ── entry points called by app.js ───────────────────────────── */

  function render(app, container) {
    const prompt = app.roomData.current_prompt || {};
    const cfg = {
      min: prompt.min || 1,
      max: prompt.max || 100,
      limit: prompt.limit || 7
    };
    const players = app.roomData.players || [];
    const partner = players.find(function (p) { return p.id !== app.myUid; });
    const theirName = partner ? partner.name : 'Partner';

    const mySlot = parseSlot(app.roomData.choices, app.myUid);
    const theirSlot = partner ? parseSlot(app.roomData.choices, partner.id) : null;

    if (!partner) {
      container.innerHTML = shell(
        '<div class="mg-top"><span class="badge-pill">👀 WAITING</span></div>' +
        '<h2 class="mg-q">' + esc(prompt.question || 'Secret Duel') + '</h2>' +
        '<p class="mg-note mg-center">Waiting for a partner to join the room…</p>' +
        (app.isHost ? '<button class="btn-secondary mg-wide" onclick="window.App.hostReturnToLobby()">Change Game</button>' : '')
      );
      return;
    }

    keepInput = inputValue('mg-secret');

    if (!mySlot || mySlot.s == null) { renderSetup(app, container, cfg, prompt); return; }
    if (!theirSlot || theirSlot.s == null) { renderWaiting(app, container, cfg, prompt, theirName); return; }

    const mine = statusOf(mySlot, theirSlot.s, cfg.limit);
    const theirs = statusOf(theirSlot, mySlot.s, cfg.limit);
    if ((mine.solved || mine.out) && (theirs.solved || theirs.out)) {
      renderResult(app, container, cfg, prompt, mySlot, theirSlot, theirName);
      return;
    }

    renderHunt(app, container, cfg, prompt, mySlot, theirSlot, theirName);
  }

  /* Used by app.js when the host forces a reveal mid-round. */
  function renderForcedResult(app, container) {
    const prompt = app.roomData.current_prompt || {};
    const cfg = { min: prompt.min || 1, max: prompt.max || 100, limit: prompt.limit || 7 };
    const players = app.roomData.players || [];
    const partner = players.find(function (p) { return p.id !== app.myUid; });
    if (!partner) return false;
    const mySlot = parseSlot(app.roomData.choices, app.myUid);
    const theirSlot = parseSlot(app.roomData.choices, partner.id);
    if (!mySlot || !theirSlot || mySlot.s == null || theirSlot.s == null) return false;
    renderResult(app, container, cfg, prompt, mySlot, theirSlot, partner.name);
    return true;
  }

  window.MiniGames = {
    isMini: isMini,
    buildPrompt: buildPrompt,
    nextRoundPrompt: nextRoundPrompt,
    render: render,
    renderForcedResult: renderForcedResult,
    variants: VARIANTS
  };
})();
