/* ═══════════════════════════════════════════════════════════════════
   DuoVibe — Party pack

   Three games with mechanics the lineup did not have:

     Two Truths & a Lie  — bluffing. You write the bait, they hunt it.
     Emoji Charades      — encoding. Five emoji is all you get.
     Speed Round         — a 60-second clock. The app had none.

   Same rules as minigames.js: each player writes ONLY their own slot
   in `choices`, both clients derive the same result from the same
   data, and nothing needs a server to referee.

   Slot addresses are written to be short over the wire:
     tt  → { s:[three statements], l: lie index, g: guess index }
     ec  → { e: emoji, o:[four options], a: answer index, g: guess }
     sr  → { a:{pairIndex: pick}, f: finish time }
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── content ─────────────────────────────────────────────────── */

  const TT_PROMPTS = [
    'Three things about you — two true, one a lie',
    'Three things about your childhood — one is made up',
    'Three opinions you hold — one of them is fake',
    'Three things you have done — one you invented',
    'Three things about your family — one is a lie',
    'Three things in your room right now — one is not there',
    'Three jobs you would be good at — one you would be terrible at',
    'Three weird habits you have — one is fabricated'
  ];

  const EMOJI_BANK = [
    ['Jaws', 'movie'], ['Titanic', 'movie'], ['Frozen', 'movie'],
    ['The Lion King', 'movie'], ['Spider-Man', 'movie'], ['Harry Potter', 'movie'],
    ['Finding Nemo', 'movie'], ['Jurassic Park', 'movie'], ['Cinderella', 'movie'],
    ['Star Wars', 'movie'], ['Toy Story', 'movie'], ['Fast & Furious', 'movie'],

    ['Penguin', 'animal'], ['Elephant', 'animal'], ['Octopus', 'animal'],
    ['Kangaroo', 'animal'], ['Sloth', 'animal'], ['Peacock', 'animal'],
    ['Bat', 'animal'], ['Dolphin', 'animal'], ['Giraffe', 'animal'],
    ['Snake', 'animal'], ['Bee', 'animal'], ['Owl', 'animal'],

    ['Pizza', 'food'], ['Sushi', 'food'], ['Ice cream', 'food'],
    ['Popcorn', 'food'], ['Hot dog', 'food'], ['Pancakes', 'food'],
    ['Tacos', 'food'], ['Watermelon', 'food'], ['Coffee', 'food'],
    ['Birthday cake', 'food'], ['Ramen', 'food'], ['Burger', 'food'],

    ['First date', 'event'], ['Moving house', 'event'], ['Job interview', 'event'],
    ['Going to the gym', 'event'], ['Road trip', 'event'], ['Getting a haircut', 'event'],
    ['A wedding', 'event'], ['Karaoke night', 'event'], ['Camping', 'event'],
    ['Exam day', 'event'], ['A first day at work', 'event'], ['A long flight', 'event'],

    ['Butterflies in your stomach', 'feeling'], ['Exhausted', 'feeling'],
    ['Jealous', 'feeling'], ['Proud of yourself', 'feeling'],
    ['Nervous', 'feeling'], ['Homesick', 'feeling'],

    ['An alarm clock', 'object'], ['A smartphone', 'object'], ['An umbrella', 'object'],
    ['A passport', 'object'], ['Headphones', 'object'], ['A laundry basket', 'object'],
    ['A mirror', 'object'], ['A suitcase', 'object']
  ];

  const SR_DURATION = 60000;
  const SR_PAIRS = 20;

  /* ── tiny helpers ────────────────────────────────────────────── */

  /* Same escaping as app.js, kept local so this file stands alone. */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function slot(choices, uid) {
    if (!choices || !uid) return null;
    const raw = choices[uid];
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw === 'object') return raw;
    try { const o = JSON.parse(raw); return (o && typeof o === 'object') ? o : null; }
    catch (e) { return null; }
  }

  function partnerOf(app) {
    return (app.roomData.players || []).find(p => p.id !== app.myUid) || null;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
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
    el._t = setTimeout(() => el.classList.remove('show'), 1900);
  }

  function shell(inner) {
    return '<div class="glass-card animate-fade mg-wrap">' + inner + '</div>';
  }

  function header(round, right) {
    return '<div class="mg-top"><span class="badge-pill">ROUND ' + round + '</span>' +
           (right ? '<span class="badge-pill">' + right + '</span>' : '') + '</div>';
  }

  /* ── prompt builders (host only) ─────────────────────────────── */

  function buildPrompt(gameType, players, scores) {
    scores = scores || {};
    if (gameType === 'twoTruths') {
      return { party: 'twoTruths', question: TT_PROMPTS[Math.floor(Math.random() * TT_PROMPTS.length)], scores: scores };
    }
    if (gameType === 'emojiClue') {
      return { party: 'emojiClue', scores: scores };
    }
    if (gameType === 'speedRound') {
      const src = (window.GAME_BANKS && window.GAME_BANKS.wouldRather) || [];
      const picks = shuffle(src.slice()).slice(0, SR_PAIRS).map(p => ({ q: p.question, a: p.optionA, b: p.optionB }));
      return { party: 'speedRound', pairs: picks, startedAt: Date.now(), dur: SR_DURATION, scores: scores };
    }
    return null;
  }

  /* Fold this round's points in, once, when the host deals the next round. */
  function nextRoundPrompt(app, gameType) {
    const p = app.roomData.current_prompt || {};
    const players = app.roomData.players || [];
    const choices = app.roomData.choices || {};
    const total = Object.assign({}, p.scores || {});

    players.forEach(pl => {
      const pts = roundPoints(p, choices, pl.id, players);
      total[pl.id] = (total[pl.id] || 0) + pts;
    });

    return buildPrompt(gameType, players, total);
  }

  /* Points earned by `uid` in the given prompt. */
  function roundPoints(prompt, choices, uid, players) {
    if (!prompt || !uid) return 0;
    const me = slot(choices, uid);

    if (prompt.party === 'twoTruths') {
      const other = players.find(x => x.id !== uid);
      const them = other ? slot(choices, other.id) : null;
      if (!me || !them || !Array.isArray(them.s) || them.l == null) return 0;
      return (Number(me.g) === Number(them.l)) ? 2 : 0;
    }

    if (prompt.party === 'emojiClue') {
      const idx = ((prompt.round || 1) - 1) % players.length;
      const giverId = (players[idx] || {}).id;
      const guesserId = (players[(idx + 1) % players.length] || {}).id;
      const giver = slot(choices, giverId);
      const guesser = slot(choices, guesserId);
      if (!giver || giver.a == null) return 0;
      const guessed = guesser ? guesser.g : null;
      const hit = guessed != null && Number(guessed) === Number(giver.a);
      if (!hit) return 0;
      if (uid === guesserId) return 2;
      if (uid === giverId) return 1;
      return 0;
    }

    if (prompt.party === 'speedRound') {
      const pairs = prompt.pairs || [];
      const mine = (me && me.a) || {};
      const other = players.find(x => x.id !== uid);
      const theirs = other ? ((slot(choices, other.id) || {}).a || {}) : {};
      let pts = 0;
      pairs.forEach((_, i) => {
        if (mine[i] !== undefined && theirs[i] !== undefined && mine[i] === theirs[i]) pts += 1;
      });
      return pts;
    }
    return 0;
  }

  /* ── Two Truths & a Lie ──────────────────────────────────────── */

  function renderTT(app, el, prompt, partner, mine, theirs) {
    const round = app.roomData.round || 1;
    const scores = prompt.scores || {};

    if (!mine || !Array.isArray(mine.s)) {
      el.innerHTML = shell(
        header(round, '🤥 BLUFF') +
        '<h2 class="mg-q">' + esc(prompt.question || 'Two truths and a lie') + '</h2>' +
        '<p class="mg-sub">Write them so nobody can tell. Then pick which one is the lie.</p>' +
        [0, 1, 2].map(i =>
          '<input class="input-field tt-input" id="tt-s' + i + '" maxlength="70" placeholder="Statement ' + (i + 1) + '" />'
        ).join('') +
        '<div class="tt-pick"><div class="mg-window-lab">Which one is the lie?</div><div class="tt-pick-row">' +
        [0, 1, 2].map(i => '<button class="btn-secondary tt-pick-btn" data-lie="' + i + '">' + (i + 1) + '</button>').join('') +
        '</div></div>' +
        '<button class="btn-primary mg-go" id="tt-go">Lock It In 🔒</button>' +
        '<p class="mg-note">Your partner sees all three but not which one you marked.</p>'
      );

      let lie = null;
      el.querySelectorAll('.tt-pick-btn').forEach(b => {
        b.addEventListener('click', () => {
          lie = Number(b.dataset.lie);
          el.querySelectorAll('.tt-pick-btn').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
        });
      });
      el.querySelector('#tt-go').addEventListener('click', () => {
        const s = [0, 1, 2].map(i => (el.querySelector('#tt-s' + i).value || '').trim());
        if (s.some(x => !x)) { flash('Fill in all three statements'); return; }
        if (new Set(s.map(x => x.toLowerCase())).size < 3) { flash('They have to be different'); return; }
        if (lie === null) { flash('Tap the number of the lie'); return; }
        app.submitChoice(JSON.stringify({ s: s, l: lie, g: null }));
      });
      return;
    }

    if (!theirs || !Array.isArray(theirs.s)) {
      el.innerHTML = shell(
        header(round, '🤥 BLUFF') +
        '<h2 class="mg-q">Locked in.</h2>' +
        '<div class="mg-locked-box"><div class="spinner"></div><h3>Waiting on ' + esc(partner.name) + '</h3>' +
        '<p class="mg-note">They are writing their lie. Do not help them.</p></div>' +
        (app.isHost ? '<button class="btn-secondary mg-wide" onclick="window.App.hostReturnToLobby()">Change Game</button>' : '')
      );
      return;
    }

    if (mine.g == null) {
      el.innerHTML = shell(
        header(round, '🤥 ' + esc(partner.name).toUpperCase() + '’S THREE') +
        '<h2 class="mg-q">One of these is a lie.</h2>' +
        '<div class="tt-statements">' +
        theirs.s.map((t, i) =>
          '<button class="btn-secondary tt-stmt" data-g="' + i + '"><span class="tt-num">' + (i + 1) + '</span>' + esc(t) + '</button>'
        ).join('') + '</div>' +
        '<p class="mg-note">Pick the one you think they made up.</p>'
      );
      el.querySelectorAll('.tt-stmt').forEach(b => {
        b.addEventListener('click', () => {
          app.submitChoice(JSON.stringify({ s: mine.s, l: mine.l, g: Number(b.dataset.g) }));
        });
      });
      return;
    }

    if (theirs.g == null) {
      el.innerHTML = shell(
        header(round, '🤥 BLUFF') +
        '<h2 class="mg-q">Guess locked.</h2>' +
        '<div class="mg-locked-box"><div class="spinner"></div><h3>Waiting on ' + esc(partner.name) + '</h3>' +
        '<p class="mg-note">They are still deciding which of yours is the lie.</p></div>'
      );
      return;
    }

    const myPts = roundPoints(prompt, app.roomData.choices, app.myUid, app.roomData.players);
    const theirPts = roundPoints(prompt, app.roomData.choices, partner.id, app.roomData.players);
    const iGot = Number(mine.g) === Number(theirs.l);

    if (app.isHost && !prompt.finalScores) {
      const f = Object.assign({}, prompt.scores || {});
      f[app.myUid] = (f[app.myUid] || 0) + myPts;
      f[partner.id] = (f[partner.id] || 0) + theirPts;
      app.updateRoomState({ current_prompt: Object.assign({}, prompt, { finalScores: f }) });
    }

    const myTotal = (scores[app.myUid] || 0) + myPts;
    const theirTotal = (scores[partner.id] || 0) + theirPts;

    el.innerHTML = shell(
      header(round, '🤥 REVEAL') +
      '<div class="mg-verdict ' + (iGot ? 'good' : 'bad') + '">' +
        (iGot ? '🎯 YOU SPOTTED THE LIE' : '😵 YOU FELL FOR IT') + '</div>' +
      '<div class="tt-reveal">' + theirs.s.map((t, i) =>
        '<div class="tt-row ' + (i === Number(theirs.l) ? 'lie' : 'truth') + '">' +
          '<span class="tt-tag">' + (i === Number(theirs.l) ? 'LIE' : 'TRUE') + '</span>' +
          '<span class="tt-txt">' + esc(t) + '</span>' +
          (i === Number(mine.g) ? '<span class="tt-you">you picked</span>' : '') +
        '</div>').join('') + '</div>' +
      '<div class="mg-totals"><div><span class="mg-total-num">' + myTotal + '</span><span class="mg-total-lab">you</span></div>' +
      '<div class="mg-total-vs">–</div>' +
      '<div><span class="mg-total-num">' + theirTotal + '</span><span class="mg-total-lab">' + esc(partner.name) + '</span></div></div>' +
      (app.isHost
        ? '<div class="mg-hostbar mg-hostbar-main"><button class="btn-primary" onclick="window.App.hostNextRound()">Next Round →</button>' +
          '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change Game</button></div>'
        : '<p class="mg-note mg-center">Waiting for the host…</p>')
    );
  }

  /* ── Emoji Charades ──────────────────────────────────────────── */

  function buildOptions(correct, cat) {
    const pool = EMOJI_BANK.filter(x => x[0] !== correct);
    const sameCat = shuffle(pool.filter(x => x[1] === cat)).slice(0, 3);
    const fill = shuffle(pool.filter(x => x[1] !== cat));
    const three = sameCat.concat(fill).slice(0, 3).map(x => x[0]);
    const opts = shuffle([correct].concat(three));
    return { o: opts, a: opts.indexOf(correct) };
  }

  function renderEC(app, el, prompt, partner, mySlot, theirSlot, players) {
    const round = app.roomData.round || 1;
    const idx = (round - 1) % players.length;
    const giverId = (players[idx] || {}).id;
    const iAmGiver = app.myUid === giverId;
    const guesserId = (players[(idx + 1) % players.length] || {}).id;
    const iAmGuesser = app.myUid === guesserId;
    const giverSlot = iAmGiver ? mySlot : theirSlot;
    const guesserSlot = iAmGuesser ? mySlot : theirSlot;

    /* clue giver, not written yet */
    if (!giverSlot || !giverSlot.e) {
      if (!iAmGiver) {
        el.innerHTML = shell(
          header(round, '🙂 EMOJI CHARADES') +
          '<h2 class="mg-q">' + esc(partner.name) + ' is building a clue</h2>' +
          '<div class="mg-locked-box"><div class="spinner"></div>' +
          '<p class="mg-note">Five emoji. That is the whole clue.</p></div>'
        );
        return;
      }

      /* The clue giver gets a secret target. */
      if (!prompt._target || prompt._round !== round) {
        const pick = EMOJI_BANK[Math.floor(Math.random() * EMOJI_BANK.length)];
        const built = buildOptions(pick[0], pick[1]);
        app.updateRoomState({ current_prompt: Object.assign({}, prompt, { _target: pick[0], _round: round, _opts: built.o, _ans: built.a }) });
        return;
      }

      el.innerHTML = shell(
        header(round, '🙂 YOUR TURN TO CLUE') +
        '<h2 class="mg-q">Make them guess…</h2>' +
        '<div class="ec-target">' + esc(prompt._target) + '</div>' +
        '<input class="input-field ec-input" id="ec-e" maxlength="24" placeholder="🔥😱🎬" />' +
        '<div class="ec-quick">' + ['😂', '🔥', '😭', '❤️', '💀', '🎯', '🍕', '🌙', '⚡', '🎬'].map(e =>
          '<button class="btn-secondary ec-emoji" data-e="' + e + '">' + e + '</button>').join('') + '</div>' +
        '<button class="btn-primary mg-go" id="ec-go">Send Clue</button>' +
        '<p class="mg-note">Tap emoji or type your own. Max 5.</p>'
      );

      const input = el.querySelector('#ec-e');
      el.querySelectorAll('.ec-emoji').forEach(b => {
        b.addEventListener('click', () => {
          const cur = Array.from(input.value);
          if (cur.length < 5) input.value = input.value + b.dataset.e;
        });
      });
      el.querySelector('#ec-go').addEventListener('click', () => {
        const chars = Array.from(input.value.trim());
        if (!chars.length) { flash('Give them at least one emoji'); return; }
        if (chars.length > 5) { flash('Five emoji max'); return; }
        app.submitChoice(JSON.stringify({ e: input.value.trim(), o: prompt._opts, a: prompt._ans, g: null }));
      });
      return;
    }

    /* guesser */
    const guess = guesserSlot ? guesserSlot.g : null;
    if (guess == null && !iAmGiver) {
      el.innerHTML = shell(
        header(round, '🙂 GUESS IT') +
        '<h2 class="mg-q">' + esc(partner.name) + ' says…</h2>' +
        '<div class="ec-clue">' + esc(giverSlot.e) + '</div>' +
        '<div class="ec-options">' + giverSlot.o.map((t, i) =>
          '<button class="btn-secondary ec-opt" data-g="' + i + '">' + esc(t) + '</button>').join('') + '</div>' +
        '<p class="mg-note">Pick one.</p>'
      );
      el.querySelectorAll('.ec-opt').forEach(b => {
        b.addEventListener('click', () => {
          app.submitChoice(JSON.stringify({ g: Number(b.dataset.g) }));
        });
      });
      return;
    }

    /* clue giver waiting for a guess */
    if (guess == null) {
      el.innerHTML = shell(
        header(round, '🙂 CLUE SENT') +
        '<div class="ec-clue">' + esc(giverSlot.e) + '</div>' +
        '<div class="mg-locked-box"><div class="spinner"></div><h3>Waiting on ' + esc(partner.name) + '</h3>' +
        '<p class="mg-note">They are guessing right now.</p></div>'
      );
      return;
    }

    /* reveal */
    const hit = Number(guess) === Number(giverSlot.a);
    const myPts = roundPoints(prompt, app.roomData.choices, app.myUid, players);
    const other = players.find(p => p.id !== app.myUid);
    const theirPts = other ? roundPoints(prompt, app.roomData.choices, other.id, players) : 0;

    if (app.isHost && !prompt.finalScores) {
      const f = Object.assign({}, prompt.scores || {});
      players.forEach(p => {
        f[p.id] = (f[p.id] || 0) + roundPoints(prompt, app.roomData.choices, p.id, players);
      });
      app.updateRoomState({ current_prompt: Object.assign({}, prompt, { finalScores: f }) });
    }

    const scores = prompt.scores || {};
    const myTotal = (scores[app.myUid] || 0) + myPts;
    const theirTotal = other ? (scores[other.id] || 0) + theirPts : 0;

    el.innerHTML = shell(
      header(round, '🙂 REVEAL') +
      '<div class="ec-clue">' + esc(giverSlot.e) + '</div>' +
      '<div class="mg-verdict ' + (hit ? 'good' : 'bad') + '">' + (hit ? '✅ NAILED IT' : '❌ THEY MISSED') + '</div>' +
      '<div class="ec-answer"><div class="mg-window-lab">It was</div><div class="ec-answer-txt">' +
        esc(giverSlot.o[giverSlot.a]) + '</div>' +
        '<div class="mg-window-note">You picked: ' + esc(giverSlot.o[Number(guess)]) + '</div></div>' +
      '<div class="mg-totals"><div><span class="mg-total-num">' + myTotal + '</span><span class="mg-total-lab">you</span></div>' +
      '<div class="mg-total-vs">–</div>' +
      '<div><span class="mg-total-num">' + theirTotal + '</span><span class="mg-total-lab">' + esc(partner.name) + '</span></div></div>' +
      (app.isHost
        ? '<div class="mg-hostbar mg-hostbar-main"><button class="btn-primary" onclick="window.App.hostNextRound()">Next Round →</button>' +
          '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change Game</button></div>'
        : '<p class="mg-note mg-center">Waiting for the host…</p>')
    );
  }

  /* ── Speed Round ─────────────────────────────────────────────── */

  let srTimer = null;

  function renderSR(app, el, prompt, partner, mine, theirs) {
    const pairs = prompt.pairs || [];
    const answers = (mine && mine.a) || {};
    const answered = Object.keys(answers).length;
    const left = Math.max(0, (prompt.startedAt + prompt.dur) - Date.now());
    const done = left <= 0 || answered >= pairs.length;
    const theirAnswers = (theirs && theirs.a) || {};
    const theirCount = Object.keys(theirAnswers).length;

    if (srTimer) { clearInterval(srTimer); srTimer = null; }

    if (done) {
      if (app.isHost && !prompt.finalScores && (left <= 0 || theirCount >= pairs.length)) {
        const f = Object.assign({}, prompt.scores || {});
        app.roomData.players.forEach(p => {
          f[p.id] = (f[p.id] || 0) + roundPoints(prompt, app.roomData.choices, p.id, app.roomData.players);
        });
        app.updateRoomState({ current_prompt: Object.assign({}, prompt, { finalScores: f }) });
      }
      const myPts = roundPoints(prompt, app.roomData.choices, app.myUid, app.roomData.players);
      const theirPts = partner ? roundPoints(prompt, app.roomData.choices, partner.id, app.roomData.players) : 0;
      const scores = prompt.scores || {};
      const rows = pairs.map((p, i) => {
        const m = answers[i], t = theirAnswers[i];
        const m2 = m === undefined ? null : (m === 0 ? p.a : p.b);
        const t2 = t === undefined ? null : (t === 0 ? p.a : p.b);
        const same = m !== undefined && t !== undefined && m === t;
        return '<div class="sr-row ' + (same ? 'match' : '') + '">' +
          '<span class="sr-q">' + esc(p.q) + '</span>' +
          '<span class="sr-a">' + esc(m2 === null ? '—' : m2) + '</span>' +
          '<span class="sr-a dim">' + esc(t2 === null ? '—' : t2) + '</span>' +
          '<span class="sr-tick">' + (same ? '✓' : '') + '</span></div>';
      }).join('');

      el.innerHTML = shell(
        header(app.roomData.round || 1, '⏱ TIME') +
        '<div class="mg-verdict ' + (myPts >= theirPts ? 'good' : 'bad') + '">' +
          (myPts > theirPts ? '⚡ YOU WON THE RUSH' : myPts === theirPts ? '🤝 DEAD EVEN' : '😤 THEY WERE FASTER') + '</div>' +
        '<div class="mg-totals"><div><span class="mg-total-num">' + ((scores[app.myUid] || 0) + myPts) + '</span><span class="mg-total-lab">you</span></div>' +
        '<div class="mg-total-vs">–</div>' +
        '<div><span class="mg-total-num">' + (partner ? (scores[partner.id] || 0) + theirPts : 0) + '</span>' +
        '<span class="mg-total-lab">' + (partner ? esc(partner.name) : '—') + '</span></div></div>' +
        '<div class="sr-head"><span>Question</span><span>You</span><span>Them</span><span></span></div>' +
        '<div class="sr-list">' + rows + '</div>' +
        (app.isHost
          ? '<div class="mg-hostbar mg-hostbar-main"><button class="btn-primary" onclick="window.App.hostNextRound()">Next Round →</button>' +
            '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change Game</button></div>'
          : '<p class="mg-note mg-center">Waiting for the host…</p>')
      );
      return;
    }

    const i = answered;
    const p = pairs[i] || pairs[0];
    const pct = Math.round((left / prompt.dur) * 100);

    el.innerHTML = shell(
      header(app.roomData.round || 1, '⏱ ' + Math.ceil(left / 1000) + 's') +
      '<div class="sr-clock"><div class="sr-clock-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="sr-count">' + answered + ' / ' + pairs.length + ' · ' + esc(partner.name) + ' ' + theirCount + '</div>' +
      '<h2 class="mg-q sr-qtext">' + esc(p.q) + '</h2>' +
      '<div class="sr-btns">' +
        '<button class="btn-primary sr-btn" data-c="0">' + esc(p.a) + '</button>' +
        '<button class="btn-primary sr-btn" data-c="1">' + esc(p.b) + '</button>' +
      '</div>' +
      '<p class="mg-note">Tap fast. Every match scores.</p>'
    );

    el.querySelectorAll('.sr-btn').forEach(b => {
      b.addEventListener('click', () => {
        const cur = Object.assign({}, (slot(app.roomData.choices, app.myUid) || {}).a || {});
        cur[i] = Number(b.dataset.c);
        app.submitChoice(JSON.stringify({ a: cur, f: Date.now() }));
      });
    });

    srTimer = setInterval(() => {
      if (!app.roomId) { clearInterval(srTimer); return; }
      const rest = Math.max(0, (prompt.startedAt + prompt.dur) - Date.now());
      const bar = el.querySelector('.sr-clock-fill');
      if (bar) bar.style.width = Math.round((rest / prompt.dur) * 100) + '%';
      const pill = el.querySelectorAll('.badge-pill')[1];
      if (pill) pill.textContent = '⏱ ' + Math.ceil(rest / 1000) + 's';
      if (rest <= 0) { clearInterval(srTimer); app._hash = ''; app.renderScreen(); }
    }, 250);
  }

  /* ── entry points ────────────────────────────────────────────── */

  function render(app, container) {
    /* Never let a half-written round blank the screen or throw. */
    try { renderInner(app, container); }
    catch (err) {
      console.error('[DuoVibe] party render failed', err);
      container.innerHTML = shell(
        '<div class="mg-top"><span class="badge-pill">⚠️ RECOVERED</span></div>' +
        '<h2 class="mg-q">That round hiccupped</h2>' +
        '<p class="mg-note mg-center">Press Next Round to deal a fresh one.</p>' +
        (app.isHost ? '<button class="btn-primary mg-go" onclick="window.App.hostNextRound()">Next Round</button>' : '')
      );
    }
  }

  function renderInner(app, container) {
    const prompt = app.roomData.current_prompt || {};
    const players = app.roomData.players || [];
    const partner = partnerOf(app);
    const mine = slot(app.roomData.choices, app.myUid);

    if (!partner) {
      container.innerHTML = shell(header(app.roomData.round || 1, '👀 WAITING') +
        '<h2 class="mg-q">Waiting for a partner</h2>' +
        '<p class="mg-note mg-center">Both players are needed for this one.</p>');
      return;
    }
    const theirs = slot(app.roomData.choices, partner.id);

    if (prompt.party === 'twoTruths') return renderTT(app, container, prompt, partner, mine, theirs);
    if (prompt.party === 'emojiClue') return renderEC(app, container, prompt, partner, mine, theirs, players);
    if (prompt.party === 'speedRound') return renderSR(app, container, prompt, partner, mine, theirs);
  }

  function isParty(gameType) {
    return gameType === 'twoTruths' || gameType === 'emojiClue' || gameType === 'speedRound';
  }

  window.PartyGames = {
    isParty: isParty,
    buildPrompt: buildPrompt,
    nextRoundPrompt: nextRoundPrompt,
    render: render,
    roundPoints: roundPoints,
    _banks: { EMOJI_BANK: EMOJI_BANK, TT_PROMPTS: TT_PROMPTS }
  };
})();
