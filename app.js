/* ═══════════════════════════════════════════════════════════════════
   DuoVibe app core

   Data layer: supabase-lite.js (window.SB), not the full Supabase SDK.
   Identity : project-scoped Supabase guest session.
   Sync     : adaptive polling that pauses when the tab is hidden, so a
              phone left in a pocket is not burning battery or data.
   ═══════════════════════════════════════════════════════════════════ */
const db = window.SB;

const POLL_PLAYING = 900;    // ms between polls while a game is live
const POLL_IDLE = 2000;      // ms between polls in the lobby / results
const POLL_MAX = 8000;       // backoff ceiling after repeated failures
const ROOM_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

function profileValue(key) {
  try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
}

function saveProfileValue(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const GAME_CARDS = [
  { id: 'postcards',     title: 'Postcards',           desc: 'Trade a tiny piece of your day', starter: true },
  { id: 'storyRelay',    title: 'Story Relay',         desc: 'Make up a story in four lines', starter: true },
  { id: 'wouldRather',   title: 'Would You Rather',    desc: 'Option A vs B' },
  { id: 'truthOrDare',   title: 'Truth or Dare',       desc: 'LDR truths & dares' },
  { id: 'mindMeld',      title: 'Mind Meld',           desc: 'Exact word match' },
  { id: 'percentage',    title: 'Percentage Predictor', desc: 'Guess within 15%' },
  { id: 'blindRank',     title: 'Blind Rank',          desc: 'Rank 5 unknown items' },
  { id: 'flashPoll',     title: 'Flash Poll',          desc: 'Quick instant votes' },
  { id: 'wordStorm',     title: 'Word Storm',          desc: 'Type against the clock' },
  { id: 'spyInTheCrowd', title: 'Spy in the Crowd',    desc: 'Find the impostor' },
  { id: 'secretGuess',   title: 'Mastermind',          desc: 'Guess the secret word' },
  { id: 'ageGuess',      title: 'Guess My Age',        desc: 'Lock an age, crack theirs' },
  { id: 'numberGuess',   title: 'Guess My Number',     desc: 'Deduce the number first' },
  { id: 'twoTruths',     title: 'Two Truths & a Lie',  desc: 'Write the bait, hunt theirs' },
  { id: 'emojiClue',     title: 'Emoji Charades',      desc: 'Five emoji. That is it.' },
  { id: 'speedRound',    title: 'Speed Round',         desc: '20 calls, 60 seconds' },
  { id: 'hotSeat',       title: 'Hot Seat',            desc: 'Predict their answers' },
  { id: 'mostLikely',    title: "Who's Most Likely",   desc: 'Point at the guilty one' },
  { id: 'nhie',          title: 'Never Have I Ever',   desc: 'Confess, then compare' }
];

function gameCardsHtml(cards, ready) {
  return cards.map(g =>
    `<button type="button" class="game-card" data-game="${g.id}" ${ready ? '' : 'disabled'} onclick="window.App.hostLaunchGame('${g.id}')">` +
    `<span class="game-icon">${window.Icons ? window.Icons.svg(g.id, 26) : ''}</span>` +
    `<span class="game-title">${g.title}</span><span class="game-desc">${g.desc}</span></button>`
  ).join('');
}

class DuoVibeApp {
  constructor() {
    this.myUid = '';
    this.myName = profileValue('duovibe_name');
    this.myAvatar = profileValue('duovibe_avatar');
    this.roomId = null;
    this.isHost = false;
    this.roomData = null;
    this.resetBlindRank();
    this._timer = null;
    this._busy = false;
    this._failures = 0;
    this._hash = '';
  }

  boot() {
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = window.SUPABASE_CONFIG;
    db.configure(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    this.init();
  }

  resetBlindRank() {
    this.blindRankSelections = [null, null, null, null, null];
    this.blindRankStep = 0;
  }

  init() {
    this.bindEvents();

    const roomParam = new URLSearchParams(location.search).get('room');
    if (roomParam) {
      const input = document.getElementById('join-room-code');
      if (input) input.value = roomParam.trim().toUpperCase().slice(0, 6);
      const nameInput = document.getElementById('player-name-input');
      if (nameInput) nameInput.focus();
    }

    /* Pause all network work while the tab/app is in the background */
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (this.roomId) this._schedulePoll(0);
      } else {
        this._stopPolling();
      }
    });

    window.addEventListener('online', () => this._schedulePoll(0));
    window.addEventListener('pageshow', () => this._schedulePoll(0));
    window.addEventListener('pagehide', () => this._stopPolling());
  }

  bindEvents() {
    const createBtn = document.getElementById('btn-create-room');
    const joinBtn = document.getElementById('btn-join-room');
    const nameInput = document.getElementById('player-name-input');

    if (nameInput) {
      nameInput.value = this.myName;
      nameInput.addEventListener('input', e => {
        this.myName = e.target.value.trim();
        saveProfileValue('duovibe_name', this.myName);
      });
    }
    this.renderAvatarPicker();
    document.getElementById('btn-av-shuffle')?.addEventListener('click', () => this.shuffleMyAvatar());

    if (createBtn) createBtn.addEventListener('click', () => this.handleCreateRoom());
    if (joinBtn) joinBtn.addEventListener('click', () => this.handleJoinRoom());

    const joinCode = document.getElementById('join-room-code');
    if (joinCode) joinCode.addEventListener('keydown', e => { if (e.key === 'Enter') this.handleJoinRoom(); });
  }

  /* ── avatar ───────────────────────────────────────────────────── */

  myEmoji() {
    if (window.Avatars?.isValid(this.myAvatar)) return this.myAvatar;
    return window.Avatars?.fallback(this.myName || this.myUid || 'duovibe') || '🙂';
  }

  shuffleMyAvatar() {
    const set = window.Avatars?.set || [];
    const current = this.roomData?.players?.find(p => p.id === this.myUid)?.emoji || this.myEmoji();
    const options = set.filter(emoji => emoji !== current);
    return this.setMyAvatar(options[Math.floor(Math.random() * options.length)]);
  }

  async setMyAvatar(emoji) {
    if (!window.Avatars?.isValid(emoji) || this._avatarWrite || this._leaving) return;
    if (this.roomId) {
      const code = this.roomId;
      this._avatarWrite = true;
      try {
        const result = await db.rpc('dv_set_avatar', { p_code: code, p_emoji: emoji });
        if (!this._applyWrite(code, result, 'Could not change your icon')) return;
      } finally {
        this._avatarWrite = false;
      }
    }
    this.myAvatar = emoji;
    saveProfileValue('duovibe_avatar', emoji);
    this.renderAvatarPicker();
  }

  renderAvatarPicker() {
    const box = document.getElementById('avatar-picker');
    if (!box || !window.Avatars) return;
    const cur = this.myEmoji();
    box.innerHTML = window.Avatars.set.map(a =>
      '<button type="button" class="av-opt' + (a === cur ? ' on' : '') + '" data-av="' + a + '">' + a + '</button>'
    ).join('');
    box.querySelectorAll('.av-opt').forEach(b => {
      b.addEventListener('click', () => this.setMyAvatar(b.dataset.av));
    });
  }

  /* ── room lifecycle ───────────────────────────────────────────── */

  showMessage(text) {
    document.getElementById('app-status').textContent = text;
  }

  _roomError(action, error) {
    if (error.code === 'session_expired') {
      this._exitRoom(error.message);
    } else if (error.code === 'anonymous_provider_disabled' || error.code === 'signup_disabled' ||
               /anonymous sign.ins (are )?disabled/i.test(error.message || '')) {
      this.showMessage('Guest sign-in is not enabled on the room server yet.');
    } else if (error.code === 'PGRST202' || error.code === 'PGRST205') {
      this.showMessage('The room server is not ready. Please try again later.');
    } else {
      this.showMessage(action + ': ' + (error.message || 'Please try again.'));
    }
  }

  handleCreateRoom() { return this._enterRoom(); }

  handleJoinRoom() {
    if (this.roomId || this._entering) return;
    const field = document.getElementById('join-room-code');
    const code = field.value.trim().toUpperCase();
    if (!ROOM_CODE.test(code)) {
      this.showMessage('Enter the six-character code from your partner’s invite.');
      field.focus();
      return;
    }
    return this._enterRoom(code);
  }

  async _enterRoom(code) {
    if (this.roomId || this._entering) return;
    this._entering = true;
    const controls = [document.getElementById('btn-create-room'), document.getElementById('btn-join-room')];
    controls.forEach(button => { button.disabled = true; });
    this.showMessage(code ? 'Joining your partner…' : 'Creating your room…');
    const name = document.getElementById('player-name-input').value.trim() || (code ? 'Player' : 'Host');
    this.myName = name;
    saveProfileValue('duovibe_name', name);
    try {
      const session = await db.init();
      if (session.error) {
        this._roomError('Could not sign in as a guest', session.error);
        return;
      }
      this.myUid = session.uid;
      const args = { p_name: name, p_emoji: this.myEmoji() };
      if (code) args.p_code = code;
      const { data, error } = await db.rpc(code ? 'dv_join_room' : 'dv_create_room', args);
      if (error || !data?.[0]?.id) {
        this._roomError(code ? 'Could not join room' : 'Could not create room', error || {});
        return;
      }
      this.roomId = data[0].id;
      this.roomData = null;
      this._hash = '';
      this.showMessage('');
      this.syncStateWithDB(data[0]);
      this.startPolling();
    } finally {
      this._entering = false;
      controls.forEach(button => { button.disabled = false; });
    }
  }

  async leaveRoom() {
    if (!this.roomId || this._leaving) return;
    this._leaving = true;
    const code = this.roomId;
    try {
      const { error } = await db.rpc('dv_leave_room', { p_code: code });
      if (code !== this.roomId) return;
      if (error) this._roomError('Could not leave room', error);
      else this._exitRoom();
    } finally {
      this._leaving = false;
    }
  }

  _exitRoom(message = '') {
    this._stopPolling();
    this.roomId = null;
    this.roomData = null;
    this.isHost = false;
    this._hash = '';
    this.resetBlindRank();
    document.getElementById('game-view').replaceChildren();
    this.renderScreen();
    this.showMessage(message);
  }

  /* ── polling ──────────────────────────────────────────────────── */

  _interval() {
    if (this._failures > 0) return Math.min(POLL_MAX, POLL_IDLE * Math.pow(2, this._failures));
    const state = this.roomData && this.roomData.state;
    return (state === 'PLAYING' || state === 'DRAFTING') ? POLL_PLAYING : POLL_IDLE;
  }

  _schedulePoll(delay) {
    if (this._timer) clearTimeout(this._timer);
    if (!this.roomId || document.visibilityState === 'hidden') return;
    const wait = delay === undefined ? this._interval() : delay;
    this._timer = setTimeout(async () => {
      await this.pollDB();
      this._schedulePoll();
    }, wait);
  }

  startPolling() {
    this._stopPolling();
    this._failures = 0;
    this._schedulePoll(0);
  }

  _stopPolling() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }

  async pollDB() {
    if (!this.roomId || this._busy || document.visibilityState === 'hidden') return;
    this._busy = true;
    const code = this.roomId;
    try {
      const { data, error } = await db.getRoom(code);
      if (this.roomId !== code) return;
      if (error?.code === 'session_expired') {
        this._exitRoom(error.message);
      } else if (error) {
        this._failures = Math.min(this._failures + 1, 4);
        if (this._failures === 2) this.showMessage('Connection interrupted. Trying to reconnect…');
      } else if (!data) {
        this._exitRoom('That room has closed or expired. Ask your partner for a new invite.');
      } else {
        if (this._failures >= 2) this.showMessage('');
        this._failures = 0;
        this.syncStateWithDB(data);
      }
    } finally {
      this._busy = false;
    }
  }

  syncStateWithDB(remote) {
    if (remote.id !== this.roomId || remote.revision < this.roomData?.revision) return;
    if (remote.turn_token !== this.roomData?.turn_token) this.resetBlindRank();
    this.isHost = remote.host_id === this.myUid;
    this.roomData = remote;
    this.renderScreen();
  }

  _applyWrite(code, { data, error }, action) {
    if (code !== this.roomId) return false;
    if (error || !data?.[0]?.id) {
      this._roomError(action, error || {});
      if (error?.code === 'PT409' || error?.code === 'P0002' || !error?.status) this._schedulePoll(0);
      return false;
    }
    this.showMessage('');
    this.syncStateWithDB(data[0]);
    return true;
  }

  /* ── gameplay writes ──────────────────────────────────────────── */

  /* A short tick on lock-in. Silently does nothing on iOS Safari and
     respects the system "reduce motion" preference. */
  _tick() {
    try {
      if (navigator.vibrate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        navigator.vibrate(12);
      }
    } catch (e) {}
  }

  async submitChoice(choiceValue) {
    if (!this.roomId || this.roomData?.state !== 'PLAYING' || this._leaving) return false;
    const { id, turn_token: turn } = this.roomData;
    if (this._choiceWrite === turn) return false;
    this._choiceWrite = turn;
    try {
      // Only the server-confirmed answer is used for scoring or other writes.
      const result = await db.rpc('dv_set_choice', { p_code: id, p_choice: String(choiceValue), p_turn: turn });
      const accepted = this._applyWrite(id, result, 'Could not send your answer');
      if (accepted) this._tick();
      return accepted;
    } finally {
      if (this._choiceWrite === turn) this._choiceWrite = null;
    }
  }

  async hostStartDrafting(gameType) {
    if (!this.isHost || this.roomData.players.length !== 2) return;
    await this.updateRoomState({ state: 'DRAFTING', game_type: gameType, choices: {} });
  }

  _buildPrompt(type, next = false) {
    const { players, id } = this.roomData;
    if (window.StreamGames?.isStream(type)) return window.StreamGames.buildPrompt(type, players, id);
    if (window.DuoGames?.isDuo(type)) return window.DuoGames.buildPrompt(type, id);
    if (window.MiniGames?.isMini(type)) {
      return next ? window.MiniGames.nextRoundPrompt(this, type) : window.MiniGames.buildPrompt(type, {});
    }
    if (window.PartyGames?.isParty(type)) {
      return next ? window.PartyGames.nextRoundPrompt(this, type) : window.PartyGames.buildPrompt(type, players, {}, 1, id);
    }
    if (window.SocialGames?.isSocial(type)) {
      return next ? window.SocialGames.nextRoundPrompt(this, type) : window.SocialGames.buildPrompt(type, players, {}, id);
    }
    return window.Picker?.nextItem(type, id);
  }

  hostLaunchGame(gameType, customPrompt = null) {
    if (!this.isHost || this.roomData.players.length !== 2 || this._stateWrite === this.roomData.turn_token) return;
    let prompt = customPrompt || this._buildPrompt(gameType);
    if (typeof prompt === 'string') {
      prompt = gameType === 'secretGuess'
        ? { items: window.Picker.get50Items(), target: prompt, question: 'Guess the secret word', title: 'Mastermind' }
        : { question: prompt, topic: prompt };
    }
    return this.updateRoomState({
      state: 'PLAYING', game_type: gameType, current_prompt: prompt, choices: {}, round: 1, streak: 0
    });
  }

  hostNextRound() {
    if (!this.isHost || this.roomData.players.length !== 2 || this._stateWrite === this.roomData.turn_token) return;
    return this.updateRoomState({
      state: 'PLAYING', round: this.roomData.round + 1,
      current_prompt: this._buildPrompt(this.roomData.game_type, true), choices: {}
    });
  }

  async updateRoomState(updates) {
    if (!this.isHost || !this.roomId || this._leaving) return false;
    const { id, turn_token: turn } = this.roomData;
    if (this._stateWrite === turn) return false;
    this._stateWrite = turn;
    let result;
    try {
      result = await db.rpc('dv_set_state', { p_code: id, p_state: updates, p_turn: turn });
    } finally {
      if (this._stateWrite === turn) this._stateWrite = null;
    }
    return this._applyWrite(id, result, 'Could not update the game');
  }

  hostReturnToLobby() {
    return this.updateRoomState({ state: 'LOBBY', game_type: null, current_prompt: null, choices: {}, round: 1, streak: 0 });
  }

  forceRevealResults() {
    if (!this.isHost) return;
    if (this._isMini() || this._isStream()) return this.updateRoomState({ state: 'COMPARISON' });
    return this._settleClassicRound(this._classicResult());
  }

  _isMini() { return window.MiniGames?.isMini(this.roomData.game_type); }
  _isParty() { return window.PartyGames?.isParty(this.roomData.game_type); }
  _isSocial() { return window.SocialGames?.isSocial(this.roomData.game_type); }
  _isDuo() { return window.DuoGames?.isDuo(this.roomData.game_type); }
  _isStream() { return window.StreamGames?.isStream(this.roomData.game_type); }

  checkAllAnswered() {
    const players = this.roomData.players || [];
    const choices = this.roomData.choices || {};
    return players.length === 2 && players.every(player => Object.hasOwn(choices, player.id));
  }

  renderScreen() {
    const landing = document.getElementById('landing-view');
    const gameView = document.getElementById('game-view');
    const data = this.roomData;
    document.body.classList.toggle('in-game', !!data);
    landing.style.display = data ? 'none' : 'block';
    gameView.style.display = data ? 'block' : 'none';
    if (!data) return;

    const state = data.state;
    const sig = JSON.stringify([data.id, state, data.turn_token, data.game_type, data.round,
      data.current_prompt, data.choices, data.players, data.streak, this.blindRankStep, this.blindRankSelections]);
    if (sig === this._hash) return;
    this._hash = sig;

    // A partner locking in must not erase the answer you are still typing.
    const myChoice = data.choices?.[this.myUid];
    const fields = this._renderedTurn === data.turn_token && this._renderedChoice === myChoice
      ? [...gameView.querySelectorAll('textarea[id], input[type="text"][id]:not([readonly]), input[type="number"][id]')]
      : [];
    const drafts = fields.filter(el => el.value !== el.defaultValue || el === document.activeElement)
      .map(el => ({ id: el.id, value: el.value, focus: el === document.activeElement,
        start: el.selectionStart, end: el.selectionEnd }));
    this._renderedTurn = data.turn_token;
    this._renderedChoice = myChoice;

    if (state === 'LOBBY') {
      this._celebrated = '';
      this.renderLobby(gameView);
    }
    else if (state === 'DRAFTING') this.renderDrafting(gameView);
    else if (this._isDuo()) window.DuoGames.render(this, gameView);
    else if (this._isStream()) window.StreamGames.render(this, gameView);
    else if (this._isMini()) {
      if (state !== 'COMPARISON') window.MiniGames.render(this, gameView);
      else if (!window.MiniGames.renderForcedResult(this, gameView)) {
        gameView.innerHTML = '<div class="glass-card gv"><h2 class="gv-q">Round ended</h2>' +
          (this.isHost ? '<div class="gv-host"><button class="btn-primary" onclick="window.App.hostNextRound()">Next Round →</button>' +
            '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change Game</button></div>'
            : '<p class="gv-note gv-center">Waiting for the next round…</p>') + '</div>';
      }
    } else if (this._isParty()) window.PartyGames.render(this, gameView);
    else if (this._isSocial()) window.SocialGames.render(this, gameView);
    else if (state === 'COMPARISON' || this.checkAllAnswered()) this.renderComparison(gameView);
    else this.renderActiveGame(gameView);

    drafts.forEach(draft => {
      const field = document.getElementById(draft.id);
      if (!field) return;
      field.value = draft.value;
      if (draft.focus) {
        field.focus({ preventScroll: true });
        if (draft.start !== null) field.setSelectionRange(draft.start, draft.end);
      }
    });
    gameView.querySelector('.room-leave')?.remove();
    const canChange = this.isHost && state !== 'LOBBY' &&
      !gameView.querySelector('[onclick*="hostReturnToLobby"], [data-duo-lobby], #stream-lobby');
    gameView.insertAdjacentHTML('beforeend', '<div class="lb-foot room-leave">' +
      (canChange ? '<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change game</button>' : '') +
      '<button class="btn-secondary" onclick="window.App.leaveRoom()">Leave room</button></div>');
  }

renderLobby(container){
  const players=this.roomData.players||[];
  const shareUrl=`${location.origin}${location.pathname}?room=${encodeURIComponent(this.roomId)}`;
  let html='<div class="glass-card animate-fade lb">';
  html+='<div class="lb-head"><span class="badge-pill pulse">🔴 LIVE LOBBY</span>'
    +'<h2 class="lb-code">Room <span>'+esc(this.roomId)+'</span></h2>'
    +'<p class="lb-hint">Send this code to your partner</p>'
    +'<button class="btn-secondary lb-copy" id="btn-copy-link">Copy invite link</button>'
    +'<input class="input-field lb-link" id="room-invite" type="text" readonly hidden aria-label="Invite link" value="'+esc(shareUrl)+'"></div>';
  html+='<div class="lb-players"><h3 class="lb-sub">Connected ('+players.length+')</h3><div class="lb-chips">'
    +players.map(p=>'<div class="badge-pill lb-chip '+(p.id===this.myUid?'active-player':'')+'">'
      +(window.Avatars?window.Avatars.html(p.emoji):'')+'<span>'+esc(p.name)+(p.id===this.myUid?' (you)':'')+'</span>'
      +(p.role==='host'?'<span class="lb-crown">👑</span>':'')+'</div>').join('')
    +'</div><button class="av-shuffle lb-shuffle" id="btn-lobby-icon">Shuffle my icon</button></div>';
  if(this.isHost){
    const ready=players.length===2;
    html+='<div class="lb-games"><h3 class="lb-sub">Start here</h3>'
      +'<p class="gv-note lb-guide">'+(ready?'Just the two of you. No timer or camera needed.':'Share the invite to unlock the games.')+'</p>'
      +'<div class="game-selector-grid">'+gameCardsHtml(GAME_CARDS.filter(g=>g.starter), ready)+'</div>'
      +'<h3 class="lb-sub lb-more">More games</h3><div class="game-selector-grid">'+gameCardsHtml(GAME_CARDS.filter(g=>!g.starter), ready)+'</div></div>';
  }else{
    html+='<div class="lb-wait"><div class="spinner"></div><h3>Waiting for the host</h3>'
      +'<p class="gv-note">They are picking a game.</p></div>';
  }
  html+='</div>';
  container.innerHTML=html;
  const copyBtn=document.getElementById('btn-copy-link');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copyBtn.textContent = '✓ Copied';
      setTimeout(() => { copyBtn.textContent = 'Copy invite link'; }, 2000);
    } catch (e) {
      const input = container.querySelector('#room-invite');
      if (!input) return;
      input.hidden = false;
      input.focus();
      input.select();
      this.showMessage('Copy the selected invite link to share it.');
    }
  });
  container.querySelector('#btn-lobby-icon').addEventListener('click', () => this.shuffleMyAvatar());
}
renderDrafting(container){
  if(this.isHost){
    container.innerHTML='<div class="glass-card animate-fade gv">'
      +'<div class="gv-top"><span class="badge-pill">✏️ CUSTOM PROMPT</span></div>'
      +'<h2 class="gv-q">Write your own</h2>'
      +'<p class="gv-note gv-center" style="margin-bottom:16px;">Type a topic or roll one from the bank.</p>'
      +'<input type="text" id="custom-prompt-input" class="input-field gv-text" maxlength="120" placeholder="Type a topic…" />'
      +'<div class="gv-stack" style="margin-top:14px;">'
      +'<button class="btn-primary gv-wide" id="btn-submit-draft">Launch it</button>'
      +'<button class="btn-secondary gv-wide" id="btn-roll-random">Roll a random one</button>'
      +'<button class="btn-secondary gv-wide" onclick="window.App.hostReturnToLobby()">Back to lobby</button></div></div>';
    document.getElementById('btn-submit-draft').addEventListener('click',()=>{
      const v=document.getElementById('custom-prompt-input').value.trim();
      if(!v){alert('Type something first');return;}
      this.hostLaunchGame(this.roomData.game_type,v);
    });
    document.getElementById('btn-roll-random').addEventListener('click',()=>this.hostLaunchGame(this.roomData.game_type));
  }else{
    container.innerHTML='<div class="glass-card animate-fade gv"><div class="gv-locked">'
      +'<div class="spinner"></div><h3>Host is writing…</h3>'
      +'<p class="gv-note">The round starts as soon as they submit.</p></div></div>';
  }
}
renderActiveGame(container){
  const prompt=this.roomData.current_prompt||{};
  const gameType=this.roomData.game_type;
  const choices=this.roomData.choices||{};
  const myChoice=choices[this.myUid];
  const players=this.roomData.players||[];
  const partner=players.find(p=>p.id!==this.myUid)||{name:'Partner'};
  const partnerHasChoice=partner.id&&choices[partner.id]!==undefined;
  const q=prompt.question||prompt.topic||prompt.scenario||prompt.title||'Answer the question';

  let html='<div class="glass-card animate-fade gv">';
  html+='<div class="gv-top"><span class="badge-pill">🔥 STREAK '+(this.roomData.streak||0)+'</span><span class="badge-pill">ROUND '+(this.roomData.round||1)+'</span></div>';
  html+='<h2 class="gv-q">'+esc(q)+'</h2>';
  if(prompt.target&&gameType==='secretGuess')html+='<p class="gv-hint">🔒 Target is hidden</p>';
  html+='<div class="gv-players">'
    +'<div class="status-chip '+(myChoice!==undefined?'ready':'waiting')+'">'+this._av(this.myUid)+' You: '+(myChoice!==undefined?'✓ Locked in':'Thinking…')+'</div>'
    +'<div class="status-chip '+(partnerHasChoice?'ready':'waiting')+'">'+this._av(partner.id)+' '+esc(partner.name)+': '+(partnerHasChoice?'✓ Locked in':'Thinking…')+'</div>'
    +'</div>';
  if(myChoice!==undefined){
    html+='<div class="gv-locked"><div class="spinner"></div><h3>Locked in 🔒</h3>'
      +'<p class="gv-note">Waiting for '+esc(partner.name)+'. Nothing is revealed until you both answer.</p></div>';
  }else{
    html+='<div class="gv-panel">'+this._gameInput(gameType,prompt,partner)+'</div>';
  }
  if(this.isHost){
    html+='<div class="gv-host">'
      +'<button class="btn-primary" onclick="window.App.forceRevealResults()">Reveal</button>'
      +'<button class="btn-secondary" onclick="window.App.hostNextRound()">Skip</button>'
      +'<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Lobby</button></div>';
  }
  html+='</div>';
  container.innerHTML=html;
  this._bindGameInput(gameType,prompt);
}

_gameInput(gameType,prompt,partner){
  if(gameType==='wouldRather'||gameType==='bucketList'){
    const a=prompt.optionA||'Option A',b=prompt.optionB||'Option B';
    return '<div class="gv-stack">'
      +'<button class="btn-primary gv-option" data-pick="a">'+esc(a)+'</button>'
      +'<button class="btn-secondary gv-option" data-pick="b">'+esc(b)+'</button></div>';
  }
  if(gameType==='truthOrDare'){
    const mode=prompt.mode||'TRUTH';
    if(mode==='TRUTH'){
      return '<div class="gv-stack"><input type="text" id="truth-input" class="input-field gv-text" placeholder="Type your answer…" maxlength="120" />'
        +'<button class="btn-primary gv-wide" id="btn-submit-truth">Lock In Truth</button></div>';
    }
    return '<div class="gv-stack"><p class="gv-note">Do it live on voice or video, then confirm.</p>'
      +'<button class="btn-primary gv-wide" data-pick="done">✓ I did the dare</button></div>';
  }
  if(gameType==='mindMeld'){
    return '<div class="gv-stack"><input type="text" id="mindmeld-input" class="input-field gv-text" placeholder="One word…" maxlength="24" />'
      +'<button class="btn-primary gv-wide" id="btn-submit-mindmeld">Lock In Word</button></div>';
  }
  if(gameType==='percentage'){
    return '<div class="gv-stack gv-center">'
      +'<div class="gv-big" id="slider-val-display">50<span>%</span></div>'
      +'<input type="range" id="vibe-range" class="gv-range" min="0" max="100" value="50" />'
      +'<button class="btn-primary gv-wide" id="btn-submit-slider">Lock In Value</button></div>';
  }
  if(gameType==='secretGuess'){
    const items=prompt.items||(window.Picker?window.Picker.get50Items():[]);
    return '<div class="gv-grid4">'+items.map(it=>'<button class="btn-secondary gv-word" data-pick="'+esc(it)+'">'+esc(it)+'</button>').join('')+'</div>';
  }
  if(gameType==='blindRank'){
    const items=prompt.items||[];
    const cur=items[this.blindRankStep]||'Final item';
    let out='<div class="gv-center"><div class="badge-pill">Item '+(this.blindRankStep+1)+' of 5</div>'
      +'<h3 class="gv-rank-item">'+esc(cur)+'</h3><div class="gv-stack">';
    for(let i=0;i<5;i++){
      const filled=this.blindRankSelections[i];
      out+='<button class="btn-secondary gv-slot'+(filled?' full':'')+'"'+(filled?' disabled':' data-slot="'+i+'"')+'>'
        +'<span class="gv-slot-n">Slot '+(i+1)+'</span><span class="gv-slot-v">'+(filled?esc(filled):'Empty')+'</span></button>';
    }
    return out+'</div></div>';
  }
  return '<button class="btn-primary gv-wide" data-pick="done">Continue</button>';
}

_bindGameInput(gameType,prompt){
  const root=document.getElementById('game-view')||document;
  const pick=v=>this.submitChoice(v);
  root.querySelectorAll('[data-pick]').forEach(b=>{
    b.addEventListener('click',()=>{
      const v=b.getAttribute('data-pick');
      if((gameType==='wouldRather'||gameType==='bucketList')&&v==='a')pick(prompt.optionA||'Option A');
      else if((gameType==='wouldRather'||gameType==='bucketList')&&v==='b')pick(prompt.optionB||'Option B');
      else if(gameType==='truthOrDare'&&v==='done')pick('DARE COMPLETED!');
      else pick(v);
    });
  });
  root.querySelectorAll('[data-slot]').forEach(b=>{
    b.addEventListener('click',()=>{
      const items=prompt.items||[];
      this.handleBlindRankSelect(Number(b.getAttribute('data-slot')),items[this.blindRankStep]||'');
    });
  });
  const truth=document.getElementById('btn-submit-truth');
  if(truth)truth.addEventListener('click',()=>{
    const el=document.getElementById('truth-input');
    const v=el?el.value.trim():'';
    if(!v){alert('Type your answer first');return;}
    this.submitChoice(v);
  });
  const mm=document.getElementById('btn-submit-mindmeld');
  if(mm)mm.addEventListener('click',()=>{
    const el=document.getElementById('mindmeld-input');
    const v=el?el.value.trim():'';
    if(!v){alert('One word, any word');return;}
    this.submitChoice(v);
  });
  const range=document.getElementById('vibe-range');
  if(range){
    const out=document.getElementById('slider-val-display');
    range.addEventListener('input',()=>{if(out)out.innerHTML=range.value+'<span>%</span>';});
    const go=document.getElementById('btn-submit-slider');
    if(go)go.addEventListener('click',()=>this.submitChoice(range.value));
  }
}
async handleBlindRankSelect(slotIdx, itemText) {
  const turn = this.roomData.turn_token;
  if (this._choiceWrite === turn || this.blindRankSelections[slotIdx]) return;
  this.blindRankSelections[slotIdx] = itemText;
  if (this.blindRankStep === 4) {
    const saved = await this.submitChoice(JSON.stringify(this.blindRankSelections));
    if (!saved && this.roomData?.turn_token === turn) this.blindRankSelections[slotIdx] = null;
  } else {
    this.blindRankStep++;
    this.renderScreen();
  }
}
_classicResult(){
  const prompt=this.roomData.current_prompt||{};
  const gameType=this.roomData.game_type;
  const choices=this.roomData.choices||{};
  const players=this.roomData.players||[];
  const p1=players[0]||{id:this.myUid,name:this.myName||'Player 1'};
  const p2=players[1]||{id:'p2',name:'Partner'};
  const c1=choices[p1.id],c2=choices[p2.id];
  let isMatch=false;
  if(c1!==undefined&&c2!==undefined){
    if(gameType==='wouldRather'||gameType==='truthOrDare'||gameType==='bucketList'){isMatch=(String(c1).trim()===String(c2).trim());}
    else if(gameType==='mindMeld'){isMatch=(String(c1).toLowerCase().trim()===String(c2).toLowerCase().trim());}
    else if(gameType==='vibeSlider'||gameType==='percentage'){isMatch=(Math.abs(Number(c1)-Number(c2))<=15);}
    else if(gameType==='secretGuess'){if(prompt.target){isMatch=(String(c1).toLowerCase()===String(prompt.target).toLowerCase()&&String(c2).toLowerCase()===String(prompt.target).toLowerCase());}else{isMatch=(String(c1).trim()===String(c2).trim());}}
    else if(gameType==='blindRank'){isMatch=(String(c1)===String(c2));}
  }
  return { prompt, gameType, p1, p2, c1, c2, isMatch };
}

_settleClassicRound({ prompt, isMatch }) {
  if (this.roomData.state !== 'PLAYING') return;
  const streak = this.roomData.streak || 0;
  const nextPrompt = { ...prompt };
  if (!isMatch && streak >= 2) {
    const dare = window.Picker?.nextItem('dares', this.roomId);
    nextPrompt.penalty = typeof dare === 'string' ? dare : dare?.text || dare?.content;
  }
  if (this._stateWrite === this.roomData.turn_token) return;
  const turn = this.roomData.turn_token;
  return this.updateRoomState({
    state: 'COMPARISON', current_prompt: nextPrompt, streak: isMatch ? streak + 1 : 0
  }).then(saved => {
    // The next poll may retry a result write interrupted by a mobile outage.
    if (!saved && this.roomData?.turn_token === turn) this._hash = '';
  });
}

renderComparison(container){
  const result=this._classicResult();
  const { prompt,gameType,p1,p2,c1,c2,isMatch }=result;
  if(this.isHost && this.roomData.state==='PLAYING') this._settleClassicRound(result);
  const key = `${this.roomId}:${gameType}:${this.roomData.round}`;
  if(isMatch && this._celebrated !== key){
    this._celebrated=key;
    document.body.classList.remove('dv-win');void document.body.offsetWidth;document.body.classList.add('dv-win');
  }

  let html='<div class="glass-card animate-fade gv">';
  html+='<div class="gv-top"><span class="badge-pill">ROUND '+(this.roomData.round||1)+'</span>'
    +'<span class="badge-pill">🔥 STREAK '+(this.roomData.streak||0)+'</span></div>';
  html+='<div class="gv-verdict '+(isMatch?'good':'bad')+'">'
    +'<div class="gv-verdict-t">'+(isMatch?'🎉 MATCH':'💔 NO MATCH')+'</div>'
    +'<div class="gv-verdict-s">'+(isMatch?'Same wavelength.':'Different vibes this time.')+'</div></div>';
  if(gameType==='secretGuess'&&prompt.target){html+='<div class="gv-target">Secret was <b>'+esc(prompt.target)+'</b></div>';}
  html+='<div class="gv-reveal">';
  html+=this._revealCard(p1.name,c1,isMatch,p1.id);
  html+=this._revealCard(p2.name,c2,isMatch,p2.id);
  html+='</div>';
  if(!isMatch&&prompt.penalty){
    html+='<div class="gv-penalty"><div class="gv-penalty-tag">⚠️ STREAK PENALTY</div><p>'+esc(prompt.penalty)+'</p></div>';
  }
  if(this.isHost){
    html+='<div class="gv-host gv-host-main"><button class="btn-primary" onclick="window.App.hostNextRound()">Next Round →</button>'
      +'<button class="btn-secondary" onclick="window.App.hostReturnToLobby()">Change Game</button></div>';
  }else{
    html+='<p class="gv-note gv-center">Waiting for the host to start the next round…</p>';
  }
  html+='</div>';
  container.innerHTML=html;
}

_av(uid){
  const p=(this.roomData&&this.roomData.players||[]).find(x=>x.id===uid);
  return (window.Avatars&&p)?window.Avatars.html(p.emoji):'';
}

_revealCard(name,value,isMatch,uid){
  const shown=value===undefined?'No answer':esc(value);
  return '<div class="gv-reveal-card'+(isMatch?' match':'')+'">'
    +'<div class="gv-reveal-name">'+this._av(uid)+' '+esc(name)+'</div>'
    +'<div class="gv-reveal-val">'+shown+'</div></div>';
}
}
window.DuoVibeApp=DuoVibeApp;
window.addEventListener('DOMContentLoaded', () => {
  window.App = new DuoVibeApp();
  window.App.boot();
});
