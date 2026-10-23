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
  { id: 'wouldRather', icon: '&#129300;', title: 'Would You Rather', desc: 'Option A vs B consensus' },
  { id: 'redGreenFlag', icon: '&#128681;', title: 'Red / Green Flag', desc: 'Dating LDR scenarios' },
  { id: 'compatQuiz', icon: '&#128150;', title: 'Compatibility Quiz', desc: 'Who knows who best' },
  { id: 'hotTakes', icon: '&#128293;', title: 'Hot Takes Radar', desc: 'Agree vs Disagree debate' },
  { id: 'bucketList', icon: '&#9992;&#65039;', title: 'LDR Bucket List', desc: 'Match reunion ideas' },
  { id: 'truthOrDare', icon: '&#127917;', title: 'Truth or Dare', desc: 'LDR truths & dares' },
  { id: 'mindMeld', icon: '&#129504;', title: 'Mind Meld', desc: 'Exact word match', draft: true },
  { id: 'vibeSlider', icon: '&#127914;', title: 'Vibe Slider', desc: 'Rate 0-100 intensity' },
  { id: 'percentage', icon: '&#128202;', title: 'Percentage Predictor', desc: 'Guess % within 15%' },
  { id: 'blindRank', icon: '&#128220;', title: 'Blind Rank', desc: 'Rank 5 surprise items' },
  { id: 'flashPoll', icon: '&#128202;', title: 'Flash Poll', desc: 'Quick polls for instant votes' },
  { id: 'wordStorm', icon: '&#127786;&#65039;', title: 'Word Storm', desc: 'Type as many words as you can' },
  { id: 'spyInTheCrowd', icon: '&#128373;', title: 'Spy in the Crowd', desc: 'Find the spy among us' },
  { id: 'secretGuess', icon: '&#128373;', title: 'Mastermind', desc: '100 word secret guess', draft: true },
  { id: 'ageGuess', icon: '&#127874;', title: 'Guess My Age', desc: 'Lock a secret age, race to crack theirs' },
  { id: 'numberGuess', icon: '&#128290;', title: 'Guess My Number', desc: 'Pick a number, deduce theirs first' }
];

function gameCardsHtml() {
  return GAME_CARDS.map(g =>
    `<div class="game-card" data-game="${g.id}" onclick="window.App.${g.draft ? 'hostStartDrafting' : 'hostLaunchGame'}('${g.id}')">` +
    `<div class="game-icon">${g.icon}</div><div class="game-title">${g.title}</div><div class="game-desc">${g.desc}</div></div>`
  ).join('');
}

class DuoVibeApp {
  constructor() {
    this.myUid = '';
    this.myName = localStorage.getItem('duovibe_name') || '';
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
    if (createBtn) createBtn.addEventListener('click', () => this.handleCreateRoom());
    if (joinBtn) joinBtn.addEventListener('click', () => this.handleJoinRoom());

    const joinCode = document.getElementById('join-room-code');
    if (joinCode) joinCode.addEventListener('keydown', e => { if (e.key === 'Enter') this.handleJoinRoom(); });
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
          players: [{ id: this.myUid, name: name, role: 'host' }],
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
      else players.push({ id: this.myUid, name: name, role: 'player' });
      const upd = await db.from('rooms').update({ players }).eq('id', code).select().single();
      room = upd.data || res.data;
    }

    this.roomId = code;
    this.isHost = (room.host_id === this.myUid);
    this.roomData = room;
    this._hash = '';
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

  async submitChoice(choiceValue) {
    if (!this.roomId) return;
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
        : (window.Picker ? window.Picker.nextItem(gameType) : { question: 'Default question' });
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
      : (window.Picker ? window.Picker.nextItem(gameType) : null);
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
 if(!this.roomId||!this.roomData){if(landing)landing.style.display='block';if(gameView)gameView.style.display='none';return;}
 if(landing)landing.style.display='none';if(gameView)gameView.style.display='block';
 const state=this.roomData.state||'LOBBY';
 const sig=JSON.stringify([state,this.roomData.game_type,this.roomData.round,this.roomData.current_prompt,this.roomData.choices,(this.roomData.players||[]).map(p=>p.id+'~'+p.name).join('|'),this.roomData.streak,this.blindRankStep,this.blindRankSelections]);
 if(sig===this._hash)return;
 this._hash=sig;
 if(state==='LOBBY')this.renderLobby(gameView);
 else if(state==='DRAFTING')this.renderDrafting(gameView);
 else if(state==='PLAYING'){if(this._isMini())this._renderMini(gameView);else if(this.checkAllAnswered())this.renderComparison(gameView);else this.renderActiveGame(gameView);}
 else if(state==='COMPARISON'){if(this._isMini())this._renderMini(gameView);else this.renderComparison(gameView);}
}
renderLobby(container){
 const players=this.roomData.players||[];const shareUrl=`${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
 let html=`<div class="glass-card animate-fade"><div class="header-banner"><span class="badge-pill pulse">&#128308; LIVE LOBBY</span><h2 style="margin-top:8px;">Room: <span class="text-glow">${this.roomId}</span></h2><p style="font-size:0.9rem;opacity:0.8;">Share code with partner!</p><div style="margin-top:10px;"><button class="btn-secondary" id="btn-copy-link" style="padding:8px 16px;font-size:0.85rem;">&#128203; Copy Direct Link</button></div></div><div style="margin:20px 0;"><h4 style="margin-bottom:12px;font-size:1rem;opacity:0.9;">Connected (${players.length})</h4><div style="display:flex;gap:10px;flex-wrap:wrap;">${players.map(p=>`<div class="badge-pill ${p.id===this.myUid?'active-player':''}" style="padding:10px 16px;font-size:0.9rem;">${p.role==='host'?'&#128081;':'&#128104;&#8205;&#128187;'} ${esc(p.name)} ${p.id===this.myUid?'(You)':''}</div>`).join('')}</div></div>`;
 if(this.isHost){
  html+=`<div style="margin-top:22px;"><h3 style="margin-bottom:12px;">Select Game (16 Modes)</h3><div class="game-selector-grid">
  ${gameCardsHtml()}
  </div></div>`;
 } else {
 html+=`<div style="margin-top:24px;text-align:center;padding:30px;" class="glass-card"><div class="spinner" style="margin:0 auto 16px auto;"></div><h3>Waiting for Host...</h3><p style="opacity:0.8;font-size:0.9rem;margin-top:8px;">Host is picking from the games list.</p></div>`;
 }
 html+=`<div style="margin-top:18px;text-align:center;"><button class="btn-secondary" onclick="window.App.leaveRoom()" style="padding:10px 18px;font-size:0.85rem;opacity:0.85;">Leave Room</button></div></div>`;container.innerHTML=html;
 const copyBtn=document.getElementById('btn-copy-link');if(copyBtn){copyBtn.addEventListener('click',()=>{navigator.clipboard.writeText(shareUrl);copyBtn.innerText='&#10004; Copied!';setTimeout(()=>copyBtn.innerText='&#128203; Copy Direct Link',2000);});}
}
renderDrafting(container){
 if(this.isHost){
 container.innerHTML=`<div class="glass-card animate-fade"><span class="badge-pill">&#9997; HOST DRAFTING</span><h2 style="margin-top:12px;">Draft Custom Prompt</h2><p style="opacity:0.8;margin-bottom:20px;">Type custom topic or roll random from bank.</p><div style="margin-bottom:20px;"><input type="text" id="custom-prompt-input" class="input-field" placeholder="Type custom topic/question..." style="margin-bottom:12px;"/><div style="display:flex;gap:12px;"><button class="btn-primary" id="btn-submit-draft" style="flex:1;">Launch Custom</button><button class="btn-secondary" id="btn-roll-random" style="flex:1;">Auto-Roll Random</button></div></div><button class="btn-secondary" onclick="window.App.hostReturnToLobby()" style="width:100%;">Back to Lobby</button></div>`;
 document.getElementById('btn-submit-draft')?.addEventListener('click',()=>{const val=document.getElementById('custom-prompt-input').value.trim();if(val){this.hostLaunchGame(this.roomData.game_type,val);}else{alert('Enter topic or roll random');}});
 document.getElementById('btn-roll-random')?.addEventListener('click',()=>{this.hostLaunchGame(this.roomData.game_type);});
 } else {
 container.innerHTML=`<div class="glass-card animate-fade" style="text-align:center;padding:40px 20px;"><div class="spinner" style="margin:0 auto 20px auto;"></div><h2>Host is Drafting...</h2><p style="opacity:0.8;margin-top:10px;">Round starts when host submits.</p></div>`;
 }
}
renderActiveGame(container){
 const prompt=this.roomData.current_prompt||{};const gameType=this.roomData.game_type;const choices=this.roomData.choices||{};const myChoice=choices[this.myUid];const players=this.roomData.players||[];const partner=players.find(p=>p.id!==this.myUid)||{name:'Partner'};const partnerHasChoice=partner.id&&choices[partner.id]!==undefined;
 let html=`<div class="glass-card animate-fade"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><span class="badge-pill">&#128293; STREAK: ${this.roomData.streak||0}</span><span class="badge-pill">ROUND ${this.roomData.round||1}</span></div><div style="margin-bottom:20px;text-align:center;"><h2 style="font-size:1.32rem;font-weight:800;">${esc(prompt.question||prompt.topic||prompt.scenario||prompt.title||'Answer the Question')}</h2>${prompt.target&&gameType==='secretGuess'?`<div style="margin-top:8px;font-size:0.85rem;opacity:0.7;">Target is hidden &#128274;</div>`:''}</div>`;
 html+=`<div style="display:flex;gap:10px;margin-bottom:20px;justify-content:center;"><div class="status-chip ${myChoice!==undefined?'ready':'waiting'}">You: ${myChoice!==undefined?'&#10004; Locked In':'Thinking...'}</div><div class="status-chip ${partnerHasChoice?'ready':'waiting'}">${partner.name}: ${partnerHasChoice?'&#10004; Locked In':'Thinking...'}</div></div>`;
 if(myChoice!==undefined){
 html+=`<div style="text-align:center;padding:30px 10px;" class="glass-card"><div class="spinner" style="margin:0 auto 16px auto;"></div><h3>Locked! &#128274;</h3><p style="opacity:0.8;margin-top:8px;">Waiting for ${partner.name}... Choice is [ HIDDEN ] until all lock in.</p></div>`;
 } else {
  if(gameType==='wouldRather'||gameType==='bucketList'){
   html+=`<div style="display:flex;flex-direction:column;gap:14px;"><button class="btn-primary" onclick="window.App.submitChoice('${(prompt.optionA||'Option A').replace(/'/g,"\\'")}')" style="padding:18px;font-size:1.05rem;">${prompt.optionA||'Option A'}</button><button class="btn-secondary" onclick="window.App.submitChoice('${(prompt.optionB||'Option B').replace(/'/g,"\\'")}')" style="padding:18px;font-size:1.05rem;">${prompt.optionB||'Option B'}</button></div>`;
  } else if(gameType==='redGreenFlag'){
   html+=`<div style="display:flex;gap:16px;"><button class="btn-primary" onclick="window.App.submitChoice('GREEN FLAG')" style="flex:1;background:linear-gradient(135deg,#00E676,#00B0FF);padding:20px;font-size:1.1rem;">&#128689; GREEN FLAG</button><button class="btn-primary" onclick="window.App.submitChoice('RED FLAG')" style="flex:1;background:linear-gradient(135deg,#FF1744,#FF5252);padding:20px;font-size:1.1rem;">&#128681; RED FLAG</button></div>`;
  } else if(gameType==='hotTakes'){
   html+=`<div style="display:flex;gap:16px;"><button class="btn-primary" onclick="window.App.submitChoice('AGREE')" style="flex:1;background:linear-gradient(135deg,#00E676,#00B0FF);padding:20px;font-size:1.1rem;">&#128077; AGREE</button><button class="btn-primary" onclick="window.App.submitChoice('DISAGREE')" style="flex:1;background:linear-gradient(135deg,#FF1744,#FF5252);padding:20px;font-size:1.1rem;">&#128078; DISAGREE</button></div>`;
  } else if(gameType==='truthOrDare'){
   const mode=prompt.mode||'TRUTH';html+=`<div style="text-align:center;"><div class="badge-pill" style="margin-bottom:14px;background:var(--primary);color:#fff;">${mode} MODE</div>${mode==='TRUTH'?`<input type="text" id="truth-input" class="input-field" placeholder="Type answer..." style="margin-bottom:16px;text-align:center;font-size:1.1rem;"/><button class="btn-primary" id="btn-submit-truth" style="width:100%;">Lock In Truth</button>`:`<p style="opacity:0.9;margin-bottom:16px;">Perform dare live via voice/video, then complete!</p><button class="btn-primary" onclick="window.App.submitChoice('DARE COMPLETED!')" style="width:100%;padding:18px;">&#10004; I Completed Dare!</button>`}</div>`;
  } else if(gameType==='compatQuiz'){
   const options=prompt.options||["Me","Partner","Both","Neither"];html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">`;options.forEach(opt=>{let label=opt;if(opt==='Me')label=this.myName||'Me';if(opt==='Partner')label=partner.name||'Partner';html+=`<button class="btn-secondary" onclick="window.App.submitChoice('${opt}')" style="padding:16px;font-size:1rem;">${label}</button>`;});html+=`</div>`;
  } else if(gameType==='mindMeld'){
   html+=`<div style="text-align:center;"><input type="text" id="mindmeld-input" class="input-field" placeholder="Type 1-word answer..." style="margin-bottom:16px;text-align:center;font-size:1.2rem;"/><button class="btn-primary" id="btn-submit-mindmeld" style="width:100%;">Lock In Word</button></div>`;
  } else if(gameType==='vibeSlider'||gameType==='percentage'){
   html+=`<div style="text-align:center;padding:10px 0;"><div id="slider-val-display" style="font-size:2.5rem;font-weight:900;margin-bottom:12px;color:var(--secondary);">50</div><input type="range" id="vibe-range" min="0" max="100" value="50" oninput="document.getElementById('slider-val-display').innerText=this.value"/><button class="btn-primary" onclick="window.App.submitChoice(document.getElementById('vibe-range').value)" style="width:100%;margin-top:18px;">Lock In Value</button></div>`;
  } else if(gameType==='secretGuess'){
   const items=prompt.items||(window.Picker?window.Picker.get50Items():[]);html+=`<div class="options-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;max-height:340px;overflow-y:auto;padding:8px;">`;items.forEach(item=>{html+=`<button class="btn-secondary" onclick="window.App.submitChoice('${item.replace(/'/g,"\\'")}')" style="padding:10px 4px;font-size:0.8rem;">${item}</button>`;});html+=`</div>`;
  } else if(gameType==='blindRank'){
   const items=prompt.items||[];const currentItem=items[this.blindRankStep]||'Final Item';html+=`<div style="text-align:center;"><div class="badge-pill" style="margin-bottom:10px;">Item ${this.blindRankStep+1} of 5</div><h3 style="font-size:1.3rem;margin-bottom:16px;color:var(--secondary);">${currentItem}</h3><div style="display:flex;flex-direction:column;gap:8px;">`;for(let i=0;i<5;i++){const filled=this.blindRankSelections[i];html+=`<button class="btn-secondary" ${filled?'disabled style="opacity:0.5;"':`onclick="window.App.handleBlindRankSelect(${i},'${currentItem.replace(/'/g,"\\'")}')"`} style="padding:12px;font-size:0.95rem;">Slot ${i+1}: ${filled||'[ Empty ]'}</button>`;}html+=`</div></div>`;
  }
 }
 if(this.isHost){html+=`<div style="margin-top:24px;border-top:1px solid var(--border-glass);padding-top:16px;display:flex;gap:10px;"><button class="btn-primary" onclick="window.App.forceRevealResults()" style="flex:1;">Reveal Now</button><button class="btn-secondary" onclick="window.App.hostNextRound()" style="flex:1;">Skip</button><button class="btn-secondary" onclick="window.App.hostReturnToLobby()" style="flex:1;">Lobby</button></div>`;}
 html+=`</div>`;container.innerHTML=html;
 const mmBtn=document.getElementById('btn-submit-mindmeld');if(mmBtn){mmBtn.addEventListener('click',()=>{const val=document.getElementById('mindmeld-input').value.trim();if(val)this.submitChoice(val);else alert('Enter a word!');});}
 const truthBtn=document.getElementById('btn-submit-truth');if(truthBtn){truthBtn.addEventListener('click',()=>{const val=document.getElementById('truth-input').value.trim()||'Answered Live';this.submitChoice(val);});}
}
handleBlindRankSelect(slotIdx,itemText){this.blindRankSelections[slotIdx]=itemText;this.blindRankStep++;if(this.blindRankStep>=5){this.submitChoice(JSON.stringify(this.blindRankSelections));}else{this.renderScreen();}}
renderComparison(container){
 const prompt=this.roomData.current_prompt||{};const gameType=this.roomData.game_type;const choices=this.roomData.choices||{};const players=this.roomData.players||[];const p1=players[0]||{id:this.myUid,name:this.myName||'Player 1'};const p2=players[1]||{id:'p2',name:'Partner'};const c1=choices[p1.id];const c2=choices[p2.id];
 let isMatch=false;
 if(c1!==undefined&&c2!==undefined){
  if(gameType==='wouldRather'||gameType==='redGreenFlag'||gameType==='compatQuiz'||gameType==='hotTakes'||gameType==='bucketList'||gameType==='truthOrDare'){isMatch=(String(c1).trim()===String(c2).trim());}
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
 let html=`<div class="glass-card animate-fade" style="text-align:center;"><div class="match-box" style="padding:20px;border-radius:16px;margin-bottom:20px;background:${isMatch?'rgba(0,230,118,0.15)':'rgba(255,23,68,0.15)'};border:2px solid ${isMatch?'#00E676':'#FF1744'};"><h1 style="font-size:1.8rem;margin-bottom:6px;">${isMatch?'&#127881; PERFECT MATCH!':'&#128148; NOT A MATCH'}</h1><p style="opacity:0.9;">${isMatch?'Same wavelength!':'Different vibes this time!'}</p></div><h3 style="margin-bottom:16px;">Revealed Answers</h3>`;
 if(gameType==='secretGuess'&&prompt.target){html+=`<div class="badge-pill" style="margin-bottom:14px;background:rgba(0,229,255,0.2);">Secret Target Was: ${prompt.target}</div>`;}
 html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;"><div class="glass-card" style="padding:16px;"><div style="font-size:0.85rem;opacity:0.8;margin-bottom:6px;">${esc(p1.name)}</div><div style="font-size:1.1rem;font-weight:800;color:var(--secondary);word-break:break-word;">${c1!==undefined?esc(c1):'No answer'}</div></div><div class="glass-card" style="padding:16px;"><div style="font-size:0.85rem;opacity:0.8;margin-bottom:6px;">${esc(p2.name)}</div><div style="font-size:1.1rem;font-weight:800;color:var(--primary);word-break:break-word;">${c2!==undefined?esc(c2):'No answer'}</div></div></div>`;
 if(!isMatch&&prompt.penalty){html+=`<div class="penalty-box" style="margin-bottom:24px;padding:18px;border-radius:14px;background:rgba(255,46,147,0.2);border:1px solid var(--primary);"><div class="badge-pill" style="background:var(--primary);color:#fff;margin-bottom:8px;">&#9888;&#65039; STREAK PENALTY DARE</div><p style="font-size:1rem;font-weight:700;color:#fff;">${esc(prompt.penalty)}</p></div>`;}
 if(this.isHost){html+=`<div style="display:flex;gap:12px;margin-top:20px;"><button class="btn-primary" onclick="window.App.hostNextRound()" style="flex:1;">Next Round &#10140;</button><button class="btn-secondary" onclick="window.App.hostReturnToLobby()" style="flex:1;">Change Game</button></div>`;}else{html+=`<div style="margin-top:20px;text-align:center;"><p style="opacity:0.8;font-size:0.9rem;">Waiting for host to start next round...</p></div>`;}
 html+=`</div>`;container.innerHTML=html;
}
}
window.DuoVibeApp=DuoVibeApp;
window.addEventListener('DOMContentLoaded',()=>{window.App=new DuoVibeApp();window.App.boot().catch(err=>console.error('[DuoVibe] boot error',err));});