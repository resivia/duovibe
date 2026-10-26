/* ═══════════════════════════════════════════════════════════════════
   DuoVibe social pack

   Three games lifted from the formats that keep going viral, rebuilt so
   they work with two phones and a shared row in Postgres:

     Hot Seat            one player is in the chair, the other predicts
     Who's Most Likely To  you point at a person, not an answer
     Never Have I Ever   confess, and see if they confess too

   All three run on five items a round, both players answer at the same
   time, and the reveal is where the fun lands. No phase where one
   person sits waiting.

   Content is dealt through Deck, so it is seeded per room and never
   repeats what you have just seen.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── content ─────────────────────────────────────────────────── */

  /* Hot Seat: a question with three options, so a guess is a tap. */
  const HOT_SEAT = [
    { q: 'Their ideal Friday night', o: ['In bed by 9', 'Out until late', 'Depends who asks'] },
    { q: 'How they handle being wrong', o: ['Admit it fast', 'Argue first', 'Go quiet'] },
    { q: 'Their phone battery right now', o: ['Nearly dead', 'Half way', 'Charging'] },
    { q: 'First thing they do on waking', o: ['Check phone', 'Snooze twice', 'Get straight up'] },
    { q: 'Their love language', o: ['Words', 'Time', 'Touch'] },
    { q: 'How they order at a new restaurant', o: ['The safe thing', 'The weird thing', 'Whatever you get'] },
    { q: 'What they do in an argument', o: ['Want it solved now', 'Need space', 'Crack a joke'] },
    { q: 'Their idea of a perfect gift', o: ['Something useful', 'Something silly', 'An experience'] },
    { q: 'How they pack for a trip', o: ['Night before', 'A week early', 'The morning of'] },
    { q: 'Their biggest fear in a relationship', o: ['Being left', 'Being smothered', 'Being misunderstood'] },
    { q: 'What they notice first about someone', o: ['Face', 'Voice', 'Energy'] },
    { q: 'How they deal with stress', o: ['Talk it out', 'Go quiet', 'Get busy'] },
    { q: 'Their spending weakness', o: ['Food', 'Clothes', 'Gadgets'] },
    { q: 'How they say sorry', o: ['Words', 'A gift', 'Acting normal'] },
    { q: 'Their sleep position', o: ['Starfish', 'Curled up', 'Face down'] },
    { q: 'What they would save in a fire', o: ['Their phone', 'A photo', 'A person (obviously)'] },
    { q: 'Their go-to movie genre', o: ['Comedy', 'Thriller', 'Romance'] },
    { q: 'How they react to a surprise', o: ['Love it', 'Hate it', 'Fake it'] },
    { q: 'Their morning drink', o: ['Coffee', 'Tea', 'Nothing'] },
    { q: 'What they do when they miss you', o: ['Text straight away', 'Wait for you', 'Send a meme'] },
    { q: 'How they would describe you in one word', o: ['Warm', 'Chaotic', 'Calm'] },
    { q: 'Their ideal holiday', o: ['Beach', 'City', 'Mountains'] },
    { q: 'What annoys them fastest', o: ['Being late', 'Being interrupted', 'Mess'] },
    { q: 'How they show they care', o: ['Doing favours', 'Saying it', 'Remembering details'] },
    { q: 'Their relationship with their phone', o: ['Glued to it', 'Forgets it', 'Checks it constantly'] },
    { q: 'What they would do with a free day', o: ['Sleep', 'See people', 'Create something'] },
    { q: 'How they handle a compliment', o: ['Thank you', 'Deflect', 'Argue'] },
    { q: 'Their worst habit', o: ['Late nights', 'Overthinking', 'Snacking'] },
    { q: 'What they value most in a friend', o: ['Loyalty', 'Honesty', 'Fun'] },
    { q: 'How they would spend their last £20', o: ['A meal', 'A memory', 'Save it'] }
  ];

  const MOST_LIKELY = [
    'Who is most likely to fall asleep on a call?',
    'Who is most likely to cry at a film?',
    'Who is most likely to forget an anniversary?',
    'Who is most likely to move abroad on a whim?',
    'Who is most likely to become famous?',
    'Who is most likely to text their ex?',
    'Who is most likely to survive a zombie apocalypse?',
    'Who is most likely to get thrown out of a restaurant?',
    'Who is most likely to spend all their money on food?',
    'Who takes longer to get ready?',
    'Who is most likely to start a business?',
    'Who is most likely to lie about their age?',
    'Who is most likely to break their phone screen?',
    'Who is most likely to adopt five cats?',
    'Who is most likely to talk to strangers for an hour?',
    'Who is most likely to fall asleep in a taxi?',
    'Who is most likely to win an argument with a stranger?',
    'Who is most likely to make the first move?',
    'Who is most likely to cry at their own wedding?',
    'Who is most likely to become a millionaire?',
    'Who is more likely to cheat at a board game?',
    'Who is most likely to arrive two hours early?',
    'Who is most likely to leave a voicemail instead of texting?',
    'Who is most likely to forget their own birthday?',
    'Who is most likely to laugh during a serious moment?',
    'Who is most likely to follow a random dog home?',
    'Who is most likely to fall in love at first sight?',
    'Who is more likely to say sorry first?',
    'Who is most likely to become a morning person?',
    'Who is most likely to still be awake at 4am?'
  ];

  const NEVER_HAVE = [
    'Never have I ever pretended to like a present.',
    'Never have I ever snooped through someone’s phone.',
    'Never have I ever cried to get out of trouble.',
    'Never have I ever ghosted someone.',
    'Never have I ever fallen asleep during a date.',
    'Never have I ever said I love you first.',
    'Never have I ever lied about my weekend plans.',
    'Never have I ever stalked an ex online.',
    'Never have I ever faked being ill to skip something.',
    'Never have I ever sent a text to the wrong person.',
    'Never have I ever stayed friends with someone I fancied.',
    'Never have I ever broken something and blamed someone else.',
    'Never have I ever spent money I did not have.',
    'Never have I ever pretended to remember meeting someone.',
    'Never have I ever read a message over a shoulder.',
    'Never have I ever argued with a stranger online.',
    'Never have I ever missed a flight.',
    'Never have I ever thrown up at a party.',
    'Never have I ever had a crush on a friend’s partner.',
    'Never have I ever kept a secret from someone in this room.',
    'Never have I ever walked out of a bad date.',
    'Never have I ever lied on a job application.',
    'Never have I ever forgotten something I promised to do.',
    'Never have I ever been caught doing something embarrassing.',
    'Never have I ever pretended to understand a joke.',
    'Never have I ever re-gifted something.',
    'Never have I ever taken something that was not mine.',
    'Never have I ever pretended to be busy.',
    'Never have I ever cried in public.',
    'Never have I ever said I was on my way while still in bed.'
  ];

  const PER_ROUND = 5;

  /* ── helpers ─────────────────────────────────────────────────── */

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

  function deck() { return window.Deck; }

  function deal(cat, list, count, seed, salt) {
    const d = deck();
    if (d) return d.pick(cat, list, count, seed, salt);
    const out = [], pool = list.slice();
    for (let i = 0; i < count && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }

  /* ── prompt builders (host) ──────────────────────────────────── */

  function buildPrompt(gameType, players, scores, seed) {
    scores = scores || {};
    const round = 1;

    if (gameType === 'hotSeat') {
      const qs = deal('hotSeat', HOT_SEAT, PER_ROUND, seed, 'r' + Date.now());
      const subject = players[0] || { id: '', name: 'Player' };
      return {
        social: 'hotSeat', round: round, scores: scores,
        subjectId: subject.id, subjectName: subject.name,
        questions: qs.map(x => ({ q: x.q, o: x.o }))
      };
    }
    if (gameType === 'mostLikely') {
      const qs = deal('mostLikely', MOST_LIKELY, PER_ROUND, seed, 'r' + Date.now());
      return { social: 'mostLikely', round: round, scores: scores, questions: qs };
    }
    if (gameType === 'nhie') {
      const qs = deal('nhie', NEVER_HAVE, PER_ROUND, seed, 'r' + Date.now());
      return { social: 'nhie', round: round, scores: scores, questions: qs };
    }
    return null;
  }

  /* Who is in the chair this round? Alternates by round number, but an
     explicit subjectId on the prompt always wins so both clients agree. */
  function subjectOf(prompt, players) {
    if (!players || !players.length) return null;
    if (prompt && prompt.subjectId) {
      const found = players.find(p => p.id === prompt.subjectId);
      if (found) return found;
    }
    const idx = ((prompt.round || 1) - 1) % players.length;
    return players[idx];
  }

  function roundPoints(prompt, choices, uid, players) {
    if (!prompt || !uid || !players) return 0;
    const me = slot(choices, uid);
    const other = players.find(p => p.id !== uid);
    const them = other ? slot(choices, other.id) : null;

    if (prompt.social === 'hotSeat') {
      const subject = subjectOf(prompt, players);
      if (!subject) return 0;
      const predictor = players.find(p => p.id !== subject.id);
      if (!predictor) return 0;

      /* Only the predictor scores. Being read is the whole game for the
         subject — they get the entertainment, not the points. */
      if (uid !== predictor.id) return 0;

      const subj = slot(choices, subject.id);
      const pred = slot(choices, predictor.id);
      if (!subj || !pred || !Array.isArray(subj.a) || !Array.isArray(pred.p)) return 0;

      let pts = 0;
      prompt.questions.forEach((_, i) => {
        if (subj.a[i] !== undefined && pred.p[i] !== undefined && subj.a[i] === pred.p[i]) pts++;
      });
      return pts;
    }

    if (prompt.social === 'mostLikely') {
      if (!me || !them || !Array.isArray(me.v) || !Array.isArray(them.v)) return 0;
      let pts = 0;
      prompt.questions.forEach((_, i) => {
        if (me.v[i] !== undefined && them.v[i] !== undefined && me.v[i] === them.v[i]) pts++;
      });
      return pts;
    }

    if (prompt.social === 'nhie') {
      if (!me || !them || !Array.isArray(me.v) || !Array.isArray(them.v)) return 0;
      let pts = 0;
      prompt.questions.forEach((_, i) => {
        if (me.v[i] !== undefined && them.v[i] !== undefined && me.v[i] === them.v[i]) pts++;
      });
      return pts;
    }
    return 0;
  }

  function nextRoundPrompt(app, gameType) {
    const p = app.roomData.current_prompt || {};
    const players = app.roomData.players || [];
    const choices = app.roomData.choices || {};
    const total = Object.assign({}, p.scores || {});

    players.forEach(pl => {
      total[pl.id] = (total[pl.id] || 0) + roundPoints(p, choices, pl.id, players);
    });

    const next = buildPrompt(gameType, players, total, app.roomId);
    next.round = (p.round || 1) + 1;
    delete next.subjectId;
    const chair = subjectOf(next, players);
    next.subjectId = (chair || {}).id;
    next.subjectName = (chair || {}).name;
    return next;
  }

  /* ── answers ─────────────────────────────────────────────────── */

  function answer(app, prompt, index, value) {
    const mine = slot(app.roomData.choices, app.myUid) || {};
    const arr = (mine.v || mine.a || mine.p || []).slice();
    arr[index] = value;
    const key = (prompt.social === 'hotSeat') ? (app.myUid === prompt.subjectId ? 'a' : 'p') : 'v';
    app.submitChoice(JSON.stringify({ [key]: arr, key: key }));
  }

  function answersOf(s, prompt, uid) {
    if (!s) return [];
    const key = (prompt.social === 'hotSeat') ? (uid === prompt.subjectId ? 'a' : 'p') : 'v';
    return s[key] || [];
  }

  /* ── rendering ───────────────────────────────────────────────── */

  let cursor = 0;   /* which question the local player is on */

  function nameWithAvatar(players, id, fallback) {
    const p = players.find(x => x.id === id);
    if (!p) return esc(fallback || 'Player');
    const av = window.Avatars ? window.Avatars.html(p.emoji) : '';
    return av + ' ' + esc(p.name);
  }

  /* ---- Hot Seat ---- */

  function renderHotSeat(app, el, prompt, players) {
    const me = players.find(p => p.id === app.myUid) || { name: 'You' };
    const subject = subjectOf(prompt, players) || me;
    const iAmSubject = subject.id === app.myUid;
    const partner = players.find(p => p.id !== app.myUid) || { name: 'Partner', id: '' };
    const mine = slot(app.roomData.choices, app.myUid);
    const theirs = slot(app.roomData.choices, partner.id);
    const myAns = answersOf(mine, prompt, app.myUid);
    const theirAns = answersOf(theirs, prompt, partner.id);
    const total = prompt.questions.length;

    const allIn = myAns.length >= total && theirAns.length >= total;

    if (allIn) {
      const myPts = roundPoints(prompt, app.roomData.choices, app.myUid, players);
      const theirPts = roundPoints(prompt, app.roomData.choices, partner.id, players);
      const scores = prompt.scores || {};

      if (app.isHost && !prompt.finalScores) {
        const f = Object.assign({}, scores);
        players.forEach(p => { f[p.id] = (f[p.id] || 0) + roundPoints(prompt, app.roomData.choices, p.id, players); });
        app.updateRoomState({ current_prompt: Object.assign({}, prompt, { finalScores: f }) });
      }

      let rows = '';
      prompt.questions.forEach((q, i) => {
        const subjAns = iAmSubject ? myAns[i] : theirAns[i];
        const predAns = iAmSubject ? theirAns[i] : myAns[i];
        const hit = subjAns !== undefined && predAns !== undefined && subjAns === predAns;
        rows += '<div class="hs-row' + (hit ? ' hit' : '') + '">' +
          '<div class="hs-q">' + esc(q.q) + '</div>' +
          '<div class="hs-pair">' +
            '<span class="hs-said">' + esc(q.o[subjAns]) + '</span>' +
            '<span class="hs-guessed">' + (predAns === undefined ? '—' : esc(q.o[predAns])) + '</span>' +
            '<span class="hs-tick">' + (hit ? '✓' : '✗') + '</span>' +
          '</div></div>';
      });

      el.innerHTML = shell(
        '<div class="mg-top"><span class="badge-pill">🔥 HOT SEAT</span>' +
        '<span class="badge-pill">ROUND ' + prompt.round + '</span></div>' +
        '<h2 class="mg-q">' + (iAmSubject ? 'How well did they read you?' : 'How well did you read ' + esc(subject.name) + '?') + '</h2>' +
        '<div class="hs-legend"><span>Their answer</span><span>Guess</span></div>' +
        '<div class="hs-list">' + rows + '</div>' +
        '<div class="mg-totals">' +
          '<div><span class="mg-total-num">' + ((scores[app.myUid] || 0) + myPts) + '</span><span class="mg-total-lab">you</span></div>' +
          '<div class="mg-total-vs">–</div>' +
          '<div><span class="mg-total-num">' + ((scores[partner.id] || 0) + theirPts) + '</span><span class="mg-total-lab">' + esc(partner.name) + '</span></div>' +
        '</div>' +
        (app.isHost
          ? '<div class="mg-hostbar mg-hostbar-main"><button class="btn-primary" onclick="window.App.hostNextRound()">Next Round →</button>' +
            '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change Game</button></div>'
          : '<p class="mg-note mg-center">Waiting for the host…</p>')
      );
      return;
    }

    /* still answering */
    const done = myAns.length;
    const i = Math.min(done, total - 1);
    const q = prompt.questions[i];
    if (!q) return;

    let body = '';
    body += '<div class="mg-top"><span class="badge-pill">🔥 HOT SEAT</span>' +
      '<span class="badge-pill">' + (i + 1) + ' / ' + total + '</span></div>';

    body += '<div class="hs-who">' + (window.Avatars ? window.Avatars.html(subject.emoji) : '') +
      '<div><div class="hs-who-n">' + esc(subject.name) + '</div>' +
      '<div class="hs-who-r">' + (iAmSubject ? 'in the chair' : 'you are predicting') + '</div></div></div>';

    body += '<h2 class="mg-q">' + esc(q.q) + '</h2>';
    body += '<p class="mg-sub">' + (iAmSubject ? 'Be honest. They are guessing.' : 'What would ' + esc(subject.name) + ' say?') + '</p>';

    body += '<div class="gv-stack">';
    q.o.forEach((opt, oi) => {
      body += '<button class="btn-' + (oi === 0 ? 'primary' : 'secondary') + ' gv-option hs-opt" data-opt="' + oi + '">' + esc(opt) + '</button>';
    });
    body += '</div>';

    body += '<div class="hs-dots">' + prompt.questions.map((_, di) =>
      '<span class="hs-dot' + (di < done ? ' done' : (di === done ? ' now' : '')) + '"></span>').join('') + '</div>';

    el.innerHTML = shell(body);
    el.querySelectorAll('.hs-opt').forEach(b => {
      b.addEventListener('click', () => {
        answer(app, prompt, done, Number(b.dataset.opt));
      });
    });
  }

  /* ---- Who's Most Likely To ---- */

  function renderMostLikely(app, el, prompt, players) {
    const partner = players.find(p => p.id !== app.myUid) || { id: '', name: 'Partner' };
    const mine = slot(app.roomData.choices, app.myUid);
    const theirs = slot(app.roomData.choices, partner.id);
    const myA = answersOf(mine, prompt, app.myUid);
    const theirA = answersOf(theirs, prompt, partner.id);
    const total = prompt.questions.length;

    if (myA.length >= total && theirA.length >= total) {
      const myPts = roundPoints(prompt, app.roomData.choices, app.myUid, players);
      const theirPts = roundPoints(prompt, app.roomData.choices, partner.id, players);
      const scores = prompt.scores || {};
      if (app.isHost && !prompt.finalScores) {
        const f = Object.assign({}, scores);
        players.forEach(p => { f[p.id] = (f[p.id] || 0) + roundPoints(prompt, app.roomData.choices, p.id, players); });
        app.updateRoomState({ current_prompt: Object.assign({}, prompt, { finalScores: f }) });
      }

      let rows = '';
      prompt.questions.forEach((q, i) => {
        const a = myA[i], b = theirA[i];
        const same = a !== undefined && b !== undefined && a === b;
        const nameA = (players.find(p => p.id === a) || {}).name || '—';
        const nameB = (players.find(p => p.id === b) || {}).name || '—';
        rows += '<div class="ml-row' + (same ? ' same' : '') + '">' +
          '<div class="ml-q">' + esc(q) + '</div>' +
          '<div class="ml-v"><span>' + esc(nameA) + '</span><span class="dim">' + esc(nameB) + '</span>' +
          '<span class="ml-tick">' + (same ? '✓' : '✗') + '</span></div></div>';
      });

      el.innerHTML = shell(
        '<div class="mg-top"><span class="badge-pill">👥 MOST LIKELY</span>' +
        '<span class="badge-pill">ROUND ' + prompt.round + '</span></div>' +
        '<div class="mg-verdict ' + (myPts >= 3 ? 'good' : 'bad') + '">' +
          (myPts === theirPts ? '🤝 SAME READ' : (myPts > theirPts ? '🎯 YOU READ THEM BETTER' : '😅 THEY READ YOU BETTER')) + '</div>' +
        '<div class="hs-legend"><span>You said</span><span>They said</span></div>' +
        '<div class="hs-list">' + rows + '</div>' +
        '<div class="mg-totals">' +
          '<div><span class="mg-total-num">' + ((scores[app.myUid] || 0) + myPts) + '</span><span class="mg-total-lab">you</span></div>' +
          '<div class="mg-total-vs">–</div>' +
          '<div><span class="mg-total-num">' + ((scores[partner.id] || 0) + theirPts) + '</span><span class="mg-total-lab">' + esc(partner.name) + '</span></div>' +
        '</div>' +
        (app.isHost
          ? '<div class="mg-hostbar mg-hostbar-main"><button class="btn-primary" onclick="window.App.hostNextRound()">Next Round →</button>' +
            '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change Game</button></div>'
          : '<p class="mg-note mg-center">Waiting for the host…</p>')
      );
      return;
    }

    const done = myA.length;
    const i = Math.min(done, total - 1);
    const q = prompt.questions[i];
    if (!q) return;

    let body = '<div class="mg-top"><span class="badge-pill">👥 MOST LIKELY</span>' +
      '<span class="badge-pill">' + (i + 1) + ' / ' + total + '</span></div>';
    body += '<h2 class="mg-q">' + esc(q) + '</h2>';
    body += '<p class="mg-sub">Tap a person</p>';
    body += '<div class="ml-pick">';
    players.forEach(p => {
      body += '<button class="btn-secondary ml-person" data-v="' + esc(p.id) + '">' +
        (window.Avatars ? window.Avatars.html(p.emoji, 'big') : '') +
        '<span class="ml-name">' + esc(p.name) + '</span></button>';
    });
    body += '</div>';
    body += '<div class="hs-dots">' + prompt.questions.map((_, di) =>
      '<span class="hs-dot' + (di < done ? ' done' : (di === done ? ' now' : '')) + '"></span>').join('') + '</div>';

    el.innerHTML = shell(body);
    el.querySelectorAll('.ml-person').forEach(b => {
      b.addEventListener('click', () => answer(app, prompt, done, b.dataset.v));
    });
  }

  /* ---- Never Have I Ever ---- */

  function renderNhie(app, el, prompt, players) {
    const partner = players.find(p => p.id !== app.myUid) || { id: '', name: 'Partner' };
    const mine = slot(app.roomData.choices, app.myUid);
    const theirs = slot(app.roomData.choices, partner.id);
    const myA = answersOf(mine, prompt, app.myUid);
    const theirA = answersOf(theirs, prompt, partner.id);
    const total = prompt.questions.length;

    if (myA.length >= total && theirA.length >= total) {
      const myPts = roundPoints(prompt, app.roomData.choices, app.myUid, players);
      const theirPts = roundPoints(prompt, app.roomData.choices, partner.id, players);
      const scores = prompt.scores || {};
      if (app.isHost && !prompt.finalScores) {
        const f = Object.assign({}, scores);
        players.forEach(p => { f[p.id] = (f[p.id] || 0) + roundPoints(prompt, app.roomData.choices, p.id, players); });
        app.updateRoomState({ current_prompt: Object.assign({}, prompt, { finalScores: f }) });
      }

      let rows = '', confessions = 0;
      prompt.questions.forEach((q, i) => {
        const a = myA[i], b = theirA[i];
        const same = a === b;
        const both = a === 1 && b === 1;
        if (both) confessions++;
        rows += '<div class="nh-row' + (both ? ' both' : (same ? ' same' : '')) + '">' +
          '<div class="nh-q">' + esc(q) + '</div>' +
          '<div class="nh-v">' +
            '<span class="nh-chip' + (a === 1 ? ' yes' : '') + '">you ' + (a === 1 ? 'have' : 'haven’t') + '</span>' +
            '<span class="nh-chip' + (b === 1 ? ' yes' : '') + '">them ' + (b === 1 ? 'have' : 'haven’t') + '</span>' +
            (both ? '<span class="nh-fire">🔥</span>' : '') +
          '</div></div>';
      });

      el.innerHTML = shell(
        '<div class="mg-top"><span class="badge-pill">🕳️ NEVER HAVE I EVER</span>' +
        '<span class="badge-pill">ROUND ' + prompt.round + '</span></div>' +
        '<div class="mg-verdict ' + (confessions >= 3 ? 'good' : 'bad') + '">' +
          (confessions > 0 ? '🔥 ' + confessions + ' SHARED CONFESSION' + (confessions > 1 ? 'S' : '') : '😇 BOTH ON YOUR BEST BEHAVIOUR') + '</div>' +
        '<div class="hs-list">' + rows + '</div>' +
        '<div class="mg-totals">' +
          '<div><span class="mg-total-num">' + ((scores[app.myUid] || 0) + myPts) + '</span><span class="mg-total-lab">you</span></div>' +
          '<div class="mg-total-vs">–</div>' +
          '<div><span class="mg-total-num">' + ((scores[partner.id] || 0) + theirPts) + '</span><span class="mg-total-lab">' + esc(partner.name) + '</span></div>' +
        '</div>' +
        (app.isHost
          ? '<div class="mg-hostbar mg-hostbar-main"><button class="btn-primary" onclick="window.App.hostNextRound()">Next Round →</button>' +
            '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change Game</button></div>'
          : '<p class="mg-note mg-center">Waiting for the host…</p>')
      );
      return;
    }

    const done = myA.length;
    const i = Math.min(done, total - 1);
    const q = prompt.questions[i];
    if (!q) return;

    let body = '<div class="mg-top"><span class="badge-pill">🕳️ NEVER HAVE I EVER</span>' +
      '<span class="badge-pill">' + (i + 1) + ' / ' + total + '</span></div>';
    body += '<h2 class="mg-q nh-q">' + esc(q) + '</h2>';
    body += '<div class="nh-btns">';
    body += '<button class="btn-primary nh-btn" data-v="1">I have 😬</button>';
    body += '<button class="btn-secondary nh-btn" data-v="0">Never 🙅</button>';
    body += '</div>';
    body += '<div class="hs-dots">' + prompt.questions.map((_, di) =>
      '<span class="hs-dot' + (di < done ? ' done' : (di === done ? ' now' : '')) + '"></span>').join('') + '</div>';

    el.innerHTML = shell(body);
    el.querySelectorAll('.nh-btn').forEach(b => {
      b.addEventListener('click', () => answer(app, prompt, done, Number(b.dataset.v)));
    });
  }

  /* ── entry points ────────────────────────────────────────────── */

  function isSocial(gameType) {
    return gameType === 'hotSeat' || gameType === 'mostLikely' || gameType === 'nhie';
  }

  function renderInner(app, container) {
    const prompt = app.roomData.current_prompt || {};
    const players = app.roomData.players || [];

    if (players.length < 2) {
      container.innerHTML = shell(
        '<div class="mg-top"><span class="badge-pill">👀 WAITING</span></div>' +
        '<h2 class="mg-q">Waiting for a partner</h2>' +
        '<p class="mg-note mg-center">This one needs two people.</p>');
      return;
    }

    if (prompt.social === 'hotSeat') return renderHotSeat(app, container, prompt, players);
    if (prompt.social === 'mostLikely') return renderMostLikely(app, container, prompt, players);
    if (prompt.social === 'nhie') return renderNhie(app, container, prompt, players);
  }

  function render(app, container) {
    try { renderInner(app, container); }
    catch (err) {
      console.error('[DuoVibe] social render failed', err);
      container.innerHTML = shell(
        '<div class="mg-top"><span class="badge-pill">⚠️ RECOVERED</span></div>' +
        '<h2 class="mg-q">That round hiccuped</h2>' +
        (app.isHost ? '<button class="btn-primary mg-go" onclick="window.App.hostNextRound()">Next Round</button>' : '')
      );
    }
  }

  window.SocialGames = {
    isSocial: isSocial,
    buildPrompt: buildPrompt,
    nextRoundPrompt: nextRoundPrompt,
    roundPoints: roundPoints,
    render: render,
    _banks: { HOT_SEAT: HOT_SEAT, MOST_LIKELY: MOST_LIKELY, NEVER_HAVE: NEVER_HAVE }
  };
})();
