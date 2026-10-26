/* ═══════════════════════════════════════════════════════════════════
   DuoVibe app core

   Data layer: supabase-lite.js (window.SB), not the full Supabase SDK.
   Identity : anonymous auth user id when available, local id otherwise.
   Sync     : adaptive polling that pauses when the tab is hidden, so a
              phone left in a pocket is not burning battery or data.
   ═══════════════════════════════════════════════════════════════════ */
const db = window.SB;

const POLL_PLAYING = 900;    // ms between polls while a game is live
const POLL_IDLE = 2000;      // ms between polls in the lobby / results
const POLL_MAX = 8000;       // backoff ceiling after repeated failures
const ROOM_COLS = 'id,host_id,state,game_type,round,current_prompt,choices,players,streak';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const GAME_CARDS = [
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

function gameCardsHtml() {
  return GAME_CARDS.map(g =>
    `<div class="game-card" data-game="${g.id}" onclick="window.App.${g.draft ? 'hostStartDrafting' : 'hostLaunchGame'}('${g.id}')">` +
    `<div class="game-icon">${window.Icons ? window.Icons.svg(g.id, 26) : ''}</div>` +
    `<div class="game-title">${g.title}</div><div class="game-desc">${g.desc}</div></div>`
  ).join('');
}

class DuoVibeApp {
  constructor() {
    this.myUid = '';
    this.myName = localStorage.getItem('duovibe_name') || '';
    this.myAvatar = localStorage.getItem('duovibe_avatar') || '';

    this.roomId = null;
    this.isHost = false;
    this.roomData = null;
    this.blindRankSelections = [null, null, null, null, null];
    this.blindRankStep = 0;
    this._timer = null;
    this._busy = false;
    this._failures = 0;
    this._hash = '';
    this._rpcOff = false;
  }

  /* Called once on DOMContentLoaded, after the auth handshake */
  async boot() {
    db.configure(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const session = await db.init();
      this.myUid = session.uid;
    } catch (err) {
      console.error('[DuoVibe] auth boot failed', err);
      this.myUid = 'local_' + Math.random().toString(36).slice(2, 11);
    }
    this.init();
  }

  init() {
    this.bindEvents();

    const roomParam = new URLSearchParams(location.search).get('room');
    if (roomParam) {
      const input = document.getElementById('join-room-code');
      if (input) input.value = roomParam.toUpperCase();
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

    window.addEventListener('online', () => { if (this.roomId) this._schedulePoll(0); });
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
        localStorage.setItem('duovibe_name', this.myName);
      });
    }
    this.renderAvatarPicker();
    const avShuffle = document.getElementById('btn-av-shuffle');
    if (avShuffle) avShuffle.addEventListener('click', () => {
      const set = (window.Avatars ? window.Avatars.set : []);
      if (!set.length) return;
      let pick = set[Math.floor(Math.random() * set.length)];
      if (pick === this.myAvatar && set.length > 1) pick = set[(set.indexOf(pick) + 1) % set.length];
      this.setMyAvatar(pick);
    });

    if (createBtn) createBtn.addEventListener('click', () => this.handleCreateRoom());
    if (joinBtn) joinBtn.addEventListener('click', () => this.handleJoinRoom());

    const joinCode = document.getElementById('join-room-code');
    if (joinCode) joinCode.addEventListener('keydown', e => { if (e.key === 'Enter') this.handleJoinRoom(); });
  }

  /* ── avatar ───────────────────────────────────────────────────── */

  myEmoji() {
    if (this.myAvatar) return this.myAvatar;
    if (window.Avatars) return window.Avatars.fallback(this.myName || this.myUid || 'duovibe');
    return '🙂';
  }

  setMyAvatar(emoji) {
    if (!emoji) return;
    this.myAvatar = emoji;
    try { localStorage.setItem('duovibe_avatar', emoji); } catch (e) {}
    this.renderAvatarPicker();
    if (this.roomId) {
      this._pushAvatarToRoom(emoji);
      this._hash = '';
      this.renderScreen();
    }
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

  /* dv_create_room / dv_join_room build the players JSON server-side and
     do not know about emoji, so we patch our own entry right after the
     room exists. One extra PATCH, and the avatar survives every later
     read because players is written back verbatim. */
  async _ensureAvatar() {
    if (!this.roomId || !this.roomData) return;
    const players = this.roomData.players || [];
    const me = players.find(p => p.id === this.myUid);
    if (!me) return;
    const mine = this.myEmoji();
    if (me.emoji === mine) return;
    await this._pushAvatarToRoom(mine);
  }

  /* Write our emoji into the room's players array (read-modify-write,
     same pattern as the join fallback). */
  async _pushAvatarToRoom(emoji) {
    if (!this.roomId) return;
    const players = (this.roomData && this.roomData.players ? this.roomData.players.slice() : []);
    const at = players.findIndex(p => p.id === this.myUid);
    if (at < 0) return;
    if (players[at].emoji === emoji) return;
    players[at].emoji = emoji;
    this.roomData = Object.assign({}, this.roomData, { players: players });
    const upd = await db.from('rooms').update({ players: players }).eq('id', this.roomId);
    if (upd && upd.error) console.warn('[DuoVibe] avatar save failed', upd.error.message);
  }

  /* ── room lifecycle ───────────────────────────────────────────── */

  generateRoomCode() { return String(Math.floor(1000 + Math.random() * 9000)); }

  async handleCreateRoom() {
    const name = (document.getElementById('player-name-input')?.value.trim()) || this.myName || 'Host';
    this.myName = name;
    localStorage.setItem('duovibe_name', name);

    let room = null;

    /* Preferred path: one atomic call that picks a free code and inserts */
    let r = await this._rpc('dv_create_room', { p_name: name, p_uid: this.myUid });
    if (!r.error && Array.isArray(r.data) && r.data[0]) room = r.data[0];
    else if (!r.error && r.data && r.data.id) room = r.data;

    /* Fallback for a database that has not had the RPC installed */
    if (!room) {
      for (let attempt = 0; attempt < 6 && !room; attempt++) {
        const code = this.generateRoomCode();
        const res = await db.from('rooms').insert([{
          id: code, host_id: this.myUid, host_name: name,
          players: [{ id: this.myUid, name: name, role: 'host', emoji: this.myEmoji() }],
          state: 'LOBBY', game_type: null, current_prompt: null,
          choices: {}, streak: 0, round: 1
        }]).select().single();
        if (!res.error) room = res.data;
        else if (!/duplicate|unique|already exists/i.test(res.error.message || '')) {
          alert('Could not create room: ' + res.error.message);
          return;
        }
      }
    }

    if (!room) { alert('Could not create a room. Check your connection and try again.'); return; }

    this.roomId = room.id;
    this.isHost = true;
    this.roomData = room;
    this._hash = '';
    await this._ensureAvatar();
    this.startPolling();
    this.renderScreen();
  }

  async handleJoinRoom() {
    const name = (document.getElementById('player-name-input')?.value.trim()) || this.myName || 'Player';
    const code = (document.getElementById('join-room-code')?.value.trim() || '').toUpperCase();
    if (!code) { alert('Enter a 4-digit room code.'); return; }
    this.myName = name;
    localStorage.setItem('duovibe_name', name);

    let room = null;

    let r = await this._rpc('dv_join_room', { p_code: code, p_name: name, p_uid: this.myUid });
    if (!r.error && Array.isArray(r.data) && r.data[0]) room = r.data[0];
    else if (!r.error && r.data && r.data.id) room = r.data;

    if (!room) {
      /* Fallback: read, merge, write */
      const res = await db.from('rooms').select(ROOM_COLS).eq('id', code).single();
      if (res.error || !res.data) {
        alert(r.error && r.error.message ? 'Could not join: ' + r.error.message : 'Room not found! Check the code.');
        return;
      }
      const players = res.data.players || [];
      const at = players.findIndex(p => p.id === this.myUid);
      if (at >= 0) players[at].name = name;
      else players.push({ id: this.myUid, name: name, role: 'player', emoji: this.myEmoji() });
      const upd = await db.from('rooms').update({ players }).eq('id', code).select().single();
      room = upd.data || res.data;
    }

    this.roomId = code;
    this.isHost = (room.host_id === this.myUid);
    this.roomData = room;
    this._hash = '';
    await this._ensureAvatar();
    this.startPolling();
    this.renderScreen();
  }

  async leaveRoom() {
    if (this.roomId) {
      const r = await this._rpc('dv_leave_room', { p_code: this.roomId, p_uid: this.myUid });
      if (r.error) {
        /* Fallback: drop ourselves from players, delete the room if empty */
        const res = await db.from('rooms').select('players').eq('id', this.roomId).single();
        const rest = ((res.data && res.data.players) || []).filter(p => p.id !== this.myUid);
        if (rest.length === 0) await db.from('rooms').delete().eq('id', this.roomId);
        else await db.from('rooms').update({ players: rest }).eq('id', this.roomId);
      }
    }

    this._stopPolling();
    this.roomId = null;
    this.roomData = null;
    this.isHost = false;
    this._hash = '';

    document.body.classList.remove('in-game');
    const landing = document.getElementById('landing-view');
    const gameView = document.getElementById('game-view');
    if (landing) landing.style.display = 'block';
    if (gameView) { gameView.style.display = 'none'; gameView.innerHTML = ''; }
  }

  /* ── polling ──────────────────────────────────────────────────── */

  _interval() {
    if (this._failures > 0) return Math.min(POLL_MAX, POLL_IDLE * Math.pow(2, this._failures));
    const state = this.roomData && this.roomData.state;
    return (state === 'PLAYING' || state === 'DRAFTING') ? POLL_PLAYING : POLL_IDLE;
  }

  _schedulePoll(delay) {
    if (this._timer) clearTimeout(this._timer);
    const wait = delay === undefined ? this._interval() : delay;
    this._timer = setTimeout(async () => {
      await this.pollDB();
      if (this.roomId) this._schedulePoll();
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
    if (!this.roomId || this._busy) return;
    if (document.visibilityState === 'hidden') return;

    this._busy = true;
    try {
      const { data, error } = await db.from('rooms').select(ROOM_COLS).eq('id', this.roomId).single();
      if (error) {
        /* Row gone: the host left or the room was cleaned up */
        if (error.status === 406 || /No matching row/.test(error.message || '')) {
          this._stopPolling();
          this.roomId = null;
          this.roomData = null;
          const landing = document.getElementById('landing-view');
          const gameView = document.getElementById('game-view');
          if (landing) landing.style.display = 'block';
          if (gameView) { gameView.style.display = 'none'; gameView.innerHTML = ''; }
          alert('That room has closed.');
          return;
        }
        this._failures = Math.min(this._failures + 1, 4);
        return;
      }
      this._failures = 0;
      if (data) this.syncStateWithDB(data);
    } catch (err) {
      this._failures = Math.min(this._failures + 1, 4);
    } finally {
      this._busy = false;
    }
  }

  syncStateWithDB(remote) {
    if (!this.roomData) {
      this.roomData = remote;
      this._hash = '';
      this.renderScreen();
      return;
    }
    this.isHost = (remote.host_id === this.myUid);
    this.roomData = remote;
    this.renderScreen();
  }

  /* RPC availability. A database that has not had the new SQL applied
     answers 404 / PGRST202 for every dv_* call; remember that once and go
     straight to the table fallbacks instead of firing a doomed request on
     every action. */
  async _rpc(name, args) {
    if (this._rpcOff) return { data: null, error: { message: 'rpc disabled', offline: true } };
    const r = await db.rpc(name, args);
    if (r.error && (r.error.status === 404 || /does not exist|PGRST202/i.test(r.error.message || ''))) {
      this._rpcOff = true;
      console.warn('[DuoVibe] dv_* functions not installed; using table fallbacks.');
    }
    return r;
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
    if (!this.roomId) return;
    this._tick();
    this._optimisticChoice(choiceValue);

    /* Atomic server-side write: no read-modify-write race with the partner */
    const r = await this._rpc('dv_set_choice', { p_code: this.roomId, p_choice: String(choiceValue), p_uid: this.myUid });
    if (!r.error) {
      const row = Array.isArray(r.data) ? r.data[0] : r.data;
      if (row && row.id) { this.roomData = row; this.renderScreen(); }
      return;
    }

    /* Fallback for a database without the RPC */
    const fresh = await db.from('rooms').select('choices').eq('id', this.roomId).single();
    const choices = (fresh.data && fresh.data.choices) || (this.roomData.choices || {});
    choices[this.myUid] = choiceValue;
    const upd = await db.from('rooms').update({ choices }).eq('id', this.roomId).select().single();
    if (upd.data) { this.roomData = upd.data; this.renderScreen(); }
  }

  /* Paint the pick instantly, before the network answers */
  _optimisticChoice(value) {
    if (!this.roomData) return;
    this.roomData = Object.assign({}, this.roomData, {
      choices: Object.assign({}, this.roomData.choices || {}, { [this.myUid]: value })
    });
    this.renderScreen();
  }

  async hostStartDrafting(gameType) {
    if (!this.isHost) return;
    await this.updateRoomState({ state: 'DRAFTING', game_type: gameType, choices: {} });
  }

  async hostLaunchGame(gameType, customPrompt = null) {
    if (!this.isHost) return;

    let prompt = customPrompt;
    if (!prompt) {
      prompt = (window.MiniGames && window.MiniGames.isMini(gameType))
        ? window.MiniGames.buildPrompt(gameType, {})
        : (window.PartyGames && window.PartyGames.isParty(gameType))
          ? window.PartyGames.buildPrompt(gameType, this.roomData.players || [], {})
          : (window.SocialGames && window.SocialGames.isSocial(gameType))
            ? window.SocialGames.buildPrompt(gameType, this.roomData.players || [], {}, this.roomId)
            : (window.Picker ? window.Picker.nextItem(gameType, this.roomId) : { question: 'Default question' });
    }

    if (typeof prompt === 'string') {
      const v = prompt;
      if (gameType === 'secretGuess') {
        prompt = { items: window.Picker.get50Items(), target: v, question: 'Guess the secret: ' + v, title: 'Mastermind' };
      } else {
        prompt = { question: v, topic: v, scenario: v, title: v };
      }
    }

    this.blindRankSelections = [null, null, null, null, null];
    this.blindRankStep = 0;

    await this.updateRoomState({
      state: 'PLAYING', game_type: gameType, current_prompt: prompt, choices: {}, round: 1
    });
  }

  async hostNextRound() {
    if (!this.isHost) return;
    const gameType = this.roomData.game_type;
    const prompt = (window.MiniGames && window.MiniGames.isMini(gameType))
      ? window.MiniGames.nextRoundPrompt(this, gameType)
      : (window.PartyGames && window.PartyGames.isParty(gameType))
        ? window.PartyGames.nextRoundPrompt(this, gameType)
        : (window.SocialGames && window.SocialGames.isSocial(gameType))
          ? window.SocialGames.nextRoundPrompt(this, gameType)
          : (window.Picker ? window.Picker.nextItem(gameType, this.roomId) : null);
    this.blindRankSelections = [null, null, null, null, null];
    this.blindRankStep = 0;
    await this.updateRoomState({
      state: 'PLAYING',
      round: (this.roomData.round || 1) + 1,
      current_prompt: prompt,
      choices: {}
    });
  }

  async updateRoomState(updates) {
    if (!this.isHost || !this.roomId) return;

    /* Atomic host write; the function itself re-checks host_id server-side */
    const r = await this._rpc('dv_set_state', { p_code: this.roomId, p_state: updates, p_uid: this.myUid });
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    if (!r.error && row && row.id) { this.roomData = row; this.renderScreen(); return; }

    /* Fallback for a database without the RPC */
    const { data, error } = await db.from('rooms').update(updates).eq('id', this.roomId).select().single();
    if (error) { console.error('Room update error:', error); return; }
    if (data) { this.roomData = data; this.renderScreen(); }
  }

  async hostReturnToLobby() {
    if (!this.isHost) return;
    await this.updateRoomState({ state: 'LOBBY', game_type: null, current_prompt: null, choices: {} });
  }

  async forceRevealResults() { return this.updateRoomState({ state: 'COMPARISON' }); }

  async updateStreak(newStreak) {
    if (!this.isHost || !this.roomId) return;
    await db.from('rooms').update({ streak: newStreak }).eq('id', this.roomId);
  }

_isMini(){return !!(window.MiniGames&&window.MiniGames.isMini(this.roomData&&this.roomData.game_type));}
_isParty(){return !!(window.PartyGames&&window.PartyGames.isParty(this.roomData&&this.roomData.game_type));}
_isSocial(){return !!(window.SocialGames&&window.SocialGames.isSocial(this.roomData&&this.roomData.game_type));}
_renderMini(el){
 if(this.roomData.state==='COMPARISON'&&window.MiniGames.renderForcedResult(this,el))return;
 window.MiniGames.render(this,el);
}
checkAllAnswered(){
 if(!this.roomData||!this.roomData.choices)return false;const players=this.roomData.players||[];const choices=this.roomData.choices;const count=Object.keys(choices).length;
 if(players.length<=1)return count>=1;return count>=players.length;
}
renderScreen(){
 const landing=document.getElementById('landing-view');const gameView=document.getElementById('game-view');
 if(!this.roomId||!this.roomData){document.body.classList.remove('in-game');if(landing)landing.style.display='block';if(gameView)gameView.style.display='none';return;}
 if(landing)landing.style.display='none';if(gameView)gameView.style.display='block';
 document.body.classList.add('in-game');
 const state=this.roomData.state||'LOBBY';
 const sig=JSON.stringify([state,this.roomData.game_type,this.roomData.round,this.roomData.current_prompt,this.roomData.choices,(this.roomData.players||[]).map(p=>p.id+'~'+p.name).join('|'),this.roomData.streak,this.blindRankStep,this.blindRankSelections]);
 if(sig===this._hash)return;
 this._hash=sig;
 if(state==='LOBBY')this.renderLobby(gameView);
 else if(state==='DRAFTING')this.renderDrafting(gameView);
 else if(state==='PLAYING'){if(this._isMini())this._renderMini(gameView);else if(this._isParty())window.PartyGames.render(this,gameView);else if(this._isSocial())window.SocialGames.render(this,gameView);else if(this.checkAllAnswered())this.renderComparison(gameView);else this.renderActiveGame(gameView);}
 else if(state==='COMPARISON'){if(this._isMini())this._renderMini(gameView);else if(this._isParty())window.PartyGames.render(this,gameView);else if(this._isSocial())window.SocialGames.render(this,gameView);else this.renderComparison(gameView);}
}
renderLobby(container){
  const players=this.roomData.players||[];
  const shareUrl=`${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
  let html='<div class="glass-card animate-fade lb">';
  html+='<div class="lb-head"><span class="badge-pill pulse">🔴 LIVE LOBBY</span>'
    +'<h2 class="lb-code">Room <span>'+this.roomId+'</span></h2>'
    +'<p class="lb-hint">Send this code to your partner</p>'
    +'<button class="btn-secondary lb-copy" id="btn-copy-link">Copy invite link</button></div>';
  html+='<div class="lb-players"><h3 class="lb-sub">Connected ('+players.length+')</h3><div class="lb-chips">'
    +players.map(p=>'<div class="badge-pill lb-chip '+(p.id===this.myUid?'active-player':'')+'">'
      +(window.Avatars?window.Avatars.html(p.emoji):'')+'<span>'+esc(p.name)+(p.id===this.myUid?' (you)':'')+'</span>'
      +(p.role==='host'?'<span class="lb-crown">👑</span>':'')+'</div>').join('')
    +'</div></div>';
  if(this.isHost){
    html+='<div class="lb-games"><h3 class="lb-sub">Pick a game</h3><div class="game-selector-grid">'+gameCardsHtml()+'</div></div>';
  }else{
    html+='<div class="lb-wait"><div class="spinner"></div><h3>Waiting for the host</h3>'
      +'<p class="gv-note">They are picking a game.</p></div>';
  }
  html+='<div class="lb-foot"><button class="btn-secondary" onclick="window.App.leaveRoom()">Leave room</button></div>';
  html+='</div>';
  container.innerHTML=html;
  const copyBtn=document.getElementById('btn-copy-link');
  if(copyBtn){copyBtn.addEventListener('click',()=>{navigator.clipboard.writeText(shareUrl);copyBtn.innerText='✓ Copied';setTimeout(()=>copyBtn.innerText='Copy invite link',2000);});}
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
      if(v==='a')pick(prompt.optionA||'Option A');
      else if(v==='b')pick(prompt.optionB||'Option B');
      else if(v==='done')pick('DARE COMPLETED!');
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
handleBlindRankSelect(slotIdx,itemText){this.blindRankSelections[slotIdx]=itemText;this.blindRankStep++;if(this.blindRankStep>=5){this.submitChoice(JSON.stringify(this.blindRankSelections));}else{this.renderScreen();}}
renderComparison(container){
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
  if(isMatch){document.body.classList.remove('dv-win');void document.body.offsetWidth;document.body.classList.add('dv-win');}
  if(this.isHost&&!isMatch&&!prompt.penalty&&(this.roomData.streak||0)>=2){
    const dare=window.Picker?window.Picker.nextItem('dares'):null;
    const dareText=dare?(typeof dare==='string'?dare:(dare.text||dare.content||'')):'Do a funny dance!';
    if(dareText){prompt.penalty=dareText;this.roomData.current_prompt=prompt;this.updateRoomState({current_prompt:prompt});}
  }
  if(this.isHost){const cur=this.roomData.streak||0;if(isMatch)this.updateStreak(cur+1);else this.updateStreak(0);}

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
window.addEventListener('DOMContentLoaded',()=>{window.App=new DuoVibeApp();window.App.boot().catch(err=>console.error('[DuoVibe] boot error',err));});