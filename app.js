const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { realtime: { params: { eventsPerSecond: 10 } } });

const Sound = {
  ctx: null,
  init() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } },
  tone(freq, type = 'sine', dur = 0.15, vol = 0.15) {
    try {
      this.init(); if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + dur);
    } catch(e) {}
  },
  pop() { this.tone(600, 'sine', 0.08, 0.12); },
  success() { this.tone(523, 'triangle', 0.12, 0.2); setTimeout(() => this.tone(659, 'triangle', 0.12, 0.2), 100); setTimeout(() => this.tone(784, 'triangle', 0.25, 0.2), 200); },
  fail() { this.tone(300, 'sawtooth', 0.18, 0.15); setTimeout(() => this.tone(220, 'sawtooth', 0.25, 0.15), 150); },
  tick() { this.tone(850, 'sine', 0.03, 0.08); },
  boom() { this.tone(90, 'sawtooth', 0.7, 0.35); }
};

function fireConfetti(count = 50) {
  if (typeof confetti === 'function') confetti({ particleCount: count, spread: 70, origin: { y: 0.7 } });
}

const GAMES = [
  { id: 'blind-rank', num: 27, title: 'Blind Ranking', emoji: '🔟', tag: 'TikTok Trend', desc: 'Rank 5 mystery items 1-5 without knowing what comes next!' },
  { id: 'truths-lie', num: 29, title: '2 Truths & 1 Lie', emoji: '🤫', tag: 'Duo Game', desc: 'Write 3 statements — partner sniffs out the lie.' },
  { id: 'would-rather', num: 23, title: 'Would You Rather', emoji: '⚖️', tag: 'Dilemmas', desc: 'Vote secretly on dilemmas. Do you match?' },
  { id: 'this-or-that', num: 22, title: 'This or That', emoji: '⚡', tag: 'Rapid Fire', desc: 'Quick-fire choices — see if tastes align!' },
  { id: 'red-green-flag', num: 17, title: 'Red or Green Flag', emoji: '🚩', tag: 'Opinion', desc: 'Judge dating scenarios — Red, Green, Beige?' },
  { id: 'couple-compat', num: 19, title: 'Compatibility Quiz', emoji: '🔮', tag: 'Secrets', desc: 'Answer secretly — reveal match %!' },
  { id: 'word-letters', num: 8, title: 'First / Last Letter', emoji: '🔤', tag: 'Word Battle', desc: 'Word matching constraints before time runs out!' },
  { id: 'categories-bomb', num: 10, title: 'Pass The Bomb', emoji: '💣', tag: 'Adrenaline', desc: 'Name items before bomb explodes!' },
  { id: 'guess-age', num: 1, title: 'Guess The Age', emoji: '🎂', tag: 'Visual Guess', desc: 'Both guess — closest wins!' },
  { id: 'guess-number', num: 2, title: 'Guess The Number', emoji: '🔢', tag: 'Hot or Cold', desc: 'Race to find secret number 1-100!' },
  { id: 'guess-celeb', num: 5, title: 'Guess Celebrity', emoji: '🌟', tag: 'Mystery Pop', desc: 'Unlock clues and guess the star!' }
];

const DB = {
  thisOrThat: [
    { a: "Morning Cuddles", b: "Night Pillow Talks" },
    { a: "Road Trip", b: "Flight to Resort" },
    { a: "Cook Together", b: "Order Takeout" },
    { a: "Spontaneous Date", b: "Planned Itinerary" },
    { a: "Big Party", b: "Cozy Night for Two" },
    { a: "Action Movie", b: "Rom-Com" },
    { a: "Sweet Breakfast", b: "Savory Breakfast" },
    { a: "Mountains Cabin", b: "Sunny Beach" }
  ],
  wouldYouRather: [
    "Would you rather always hold hands in public OR never have PDA?",
    "Would you rather forget our anniversary OR buy a gift I hate?",
    "Would you rather swap bodies for 48hrs OR hear my thoughts for 2hrs?",
    "Would you rather share one toothbrush for a week OR one phone with no passwords?",
    "Would you rather eat only my cooking for a year OR let me pick every outfit for a month?",
    "Would you rather argue 10 min daily OR one giant fight yearly?"
  ],
  redGreenFlags: [
    "They share real-time location 24/7 without being asked",
    "They are still close best friends with an ex from 4 years ago",
    "They refuse to share their phone passcode",
    "They pack you snacks before a long trip",
    "They order food for you without asking",
    "They remember a tiny drink order from 3 weeks ago",
    "They take 6+ hours to reply to texts when not at work"
  ],
  compatQuestions: [
    { q: "Who initiated the first romantic move?", opts: ["Player 1", "Player 2", "Mutual"] },
    { q: "Who is more stubborn in disagreements?", opts: ["Player 1", "Player 2", "Equally"] },
    { q: "Ideal Saturday night?", opts: ["Netflix & Chill", "Fancy Dinner", "Night Out"] },
    { q: "Who is better with money?", opts: ["Player 1", "Player 2", "Both balanced"] },
    { q: "Who falls asleep faster?", opts: ["Player 1", "Player 2", "Both struggle"] }
  ],
  blindRankCategories: [
    { topic: "Romantic Date Spots", items: ["Sunset Beach Picnic","Fancy Dinner","IKEA Run","Cooking at Home","Amusement Park"] },
    { topic: "Worst Partner Habits", items: ["Socks on floor","Chewing loudly","Always late","Phone in bed","Stealing fries"] },
    { topic: "Vacation Destinations", items: ["Santorini","Tokyo","Swiss Alps","Bora Bora","New York City"] }
  ],
  bombCategories: [
    "Things under the bed","Excuses for bad dates","Pizza toppings in jail","Things you do alone","Romantic movies","Types of cheese","Red flags on date"
  ],
  ageDeck: [
    { name: "Maya", age: 24 }, { name: "Ethan", age: 31 }, { name: "Sophia", age: 19 }, { name: "Marcus", age: 43 }, { name: "Elena", age: 28 }
  ],
  celebDeck: [
    { name: "Zendaya", clues: ["Emmy Award Winner","Starred in Euphoria & Dune","Started on Disney Channel"] },
    { name: "Taylor Swift", clues: ["The Eras Tour","Born in 1989","Albums: Folklore & Midnights"] },
    { name: "Ryan Gosling", clues: ["Played Ken in Barbie","La La Land star","Hey Girl meme"] },
    { name: "Rihanna", clues: ["Founded Fenty Beauty","Umbrella singer","From Barbados"] }
  ]
};

const App = {
  roomId: null, myPlayerNum: null, myName: '', myAvatar: '', players: { p1: null, p2: null },
  activeGameId: null, gameState: null, roomChannel: null, chatMessages: [], loveNotes: [],

    async init() {
    this.loadProfile(); this.startTimezoneClock(); this.updateDaysTogether();
    this.checkOnlineStatus();
    const params = new URLSearchParams(location.search);
    const urlRoom = params.get('room');
    if (urlRoom) { this.renderLobby(urlRoom.toUpperCase()); } else { this.renderLobby(); }
  },

  async checkOnlineStatus() {
    try {
      const { data, error } = await sb.from('rooms').select('id').limit(1);
      if (!error) {
        this.updateConnStatus('online');
      } else {
        this.updateConnStatus('disconnected');
      }
    } catch(e) {
      this.updateConnStatus('disconnected');
    }
  },

  loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem('duovibe_profile') || '{}');
      this.myName = saved.name || ''; this.myAvatar = saved.avatar || '';
    } catch(e) {}
  },

  saveProfile() {
    localStorage.setItem('duovibe_profile', JSON.stringify({ name: this.myName, avatar: this.myAvatar }));
  },

  startTimezoneClock() {
    const update = () => {
      try {
        const now = new Date();
        const t1 = now.toLocaleTimeString('en-US', { timeZone: CONFIG.TIMEZONE_1.zone, hour: '2-digit', minute: '2-digit', hour12: true });
        const t2 = now.toLocaleTimeString('en-US', { timeZone: CONFIG.TIMEZONE_2.zone, hour: '2-digit', minute: '2-digit', hour12: true });
        const e1 = document.getElementById('tz-usa'); const e2 = document.getElementById('tz-nigeria');
        if (e1) e1.textContent = t1; if (e2) e2.textContent = t2;
      } catch(e) {}
    };
    update(); setInterval(update, 30000);
  },

  updateDaysTogether() {
    try {
      const start = new Date(CONFIG.COUPLE_SINCE);
      const days = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
      const sub = document.getElementById('nav-subtitle');
      if (sub && !isNaN(days) && days > 0) { sub.textContent = `💕 Day ${days} Together`; }
    } catch(e) {}
  },

  genRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },

  async createRoom() {
    this.captureProfile(); if (!this.myName) { this.toast('Enter your name!', 'error'); return; }
    const code = this.genRoomCode();
    const playerData = { name: this.myName, avatar: this.myAvatar, score: 0 };
    const { error } = await sb.from('rooms').insert({
      id: code, player1: playerData, player2: null, current_game: '', game_state: {}
    });
    if (error) { this.toast('Failed: ' + error.message, 'error'); return; }
    this.roomId = code; this.myPlayerNum = 1; this.players.p1 = playerData; this.players.p2 = null;
    await this.subscribeToRoom(code); this.renderWaitingRoom();
  },

  async joinRoom(code) {
    this.captureProfile(); if (!this.myName) { this.toast('Enter your name!', 'error'); return; }
    const roomCode = (code || '').trim().toUpperCase();
    if (roomCode.length < 4) { this.toast('Invalid code!', 'error'); return; }
    const { data: room, error } = await sb.from('rooms').select('*').eq('id', roomCode).single();
    if (error || !room) { this.toast('Room not found!', 'error'); return; }
    const playerData = { name: this.myName, avatar: this.myAvatar, score: 0 };
    if (!room.player1) {
      await sb.from('rooms').update({ player1: playerData }).eq('id', roomCode);
      this.myPlayerNum = 1; this.players.p1 = playerData; this.players.p2 = room.player2;
    } else if (!room.player2) {
      await sb.from('rooms').update({ player2: playerData }).eq('id', roomCode);
      this.myPlayerNum = 2; this.players.p1 = room.player1; this.players.p2 = playerData;
    } else {
      if (room.player1.name === this.myName) { this.myPlayerNum = 1; }
      else if (room.player2.name === this.myName) { this.myPlayerNum = 2; }
      else { this.toast('Room is full!', 'error'); return; }
      this.players.p1 = room.player1; this.players.p2 = room.player2;
    }
    this.roomId = roomCode; this.activeGameId = room.current_game || null; this.gameState = room.game_state || {};
    await this.subscribeToRoom(roomCode);
    if (this.players.p1 && this.players.p2) {
      if (this.activeGameId) { this.renderGameView(); } else { this.renderGameLobby(); }
    } else { this.renderWaitingRoom(); }
  },

  async subscribeToRoom(code) {
    if (this.roomChannel) await sb.removeChannel(this.roomChannel);
    this.roomChannel = sb.channel(`room:${code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${code}` }, (payload) => { this.handleRoomUpdate(payload.new); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_events', filter: `room_id=eq.${code}` }, (payload) => { this.handleGameEvent(payload.new); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'love_notes', filter: `room_id=eq.${code}` }, (payload) => { this.handleLoveNote(payload.new); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { this.updateConnStatus('connected'); this.toast('Connected! 💕', 'success'); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { this.updateConnStatus('disconnected'); }
      });
    const { data: notes } = await sb.from('love_notes').select('*').eq('room_id', code).order('created_at', { ascending: false }).limit(10);
    this.loveNotes = notes || [];
  },

  handleRoomUpdate(newRoom) {
    const wasWaiting = !this.players.p2 && newRoom.player2;
    const prevGame = this.activeGameId;
    this.players.p1 = newRoom.player1; this.players.p2 = newRoom.player2;
    this.activeGameId = newRoom.current_game || null; this.gameState = newRoom.game_state || {};
    if (wasWaiting) {
      Sound.success(); fireConfetti(100); this.toast(`${newRoom.player2.name} joined! 💕`, 'success'); this.renderGameLobby(); return;
    }
    if (this.activeGameId && prevGame !== this.activeGameId) { Sound.pop(); this.renderGameView(); return; }
    if (!this.activeGameId && prevGame) { this.renderGameLobby(); return; }
    if (this.activeGameId) { this.renderGameView(); } else { this.renderGameLobby(); }
  },

  handleGameEvent(event) {
    if (event.event_type === 'chat') { this.chatMessages.push(event); this.renderChatMessages(); if (event.from_player !== this.myPlayerNum) Sound.pop(); }
    else if (event.event_type === 'emoji') { this.showFloatingEmoji(event.payload.emoji); Sound.pop(); }
    else if (event.event_type === 'notify') { Sound[event.payload.sound || 'pop'](); if (event.payload.confetti) fireConfetti(event.payload.confetti); }
  },

  handleLoveNote(note) {
    this.loveNotes.unshift(note);
    if (note.from_player !== this.myPlayerNum) { Sound.success(); this.toast('💌 New love note!', 'success'); }
  },

  async updateRoom(updates) {
    const { error } = await sb.from('rooms').update(updates).eq('id', this.roomId);
    if (error) console.error('Update failed:', error);
  },

  async sendEvent(type, payload) {
    await sb.from('game_events').insert({ room_id: this.roomId, event_type: type, from_player: this.myPlayerNum, payload: payload });
  },

  async sendLoveNote(message, emoji = '💌') {
    const { error } = await sb.from('love_notes').insert({ room_id: this.roomId, from_player: this.myPlayerNum, message: message, emoji: emoji });
    if (!error) this.toast('Love note sent 💌', 'success');
  },

  async startGame(gameId) {
    Sound.pop();
    const newState = this.initGameState(gameId);
    await this.updateRoom({ current_game: gameId, game_state: newState });
  },

  initGameState(gameId) {
    const base = { round: 1, phase: 'playing', votes: {} };
    switch(gameId) {
      case 'guess-number':
        return { ...base, secretNumber: Math.floor(Math.random() * 100) + 1, attempts: { p1: 0, p2: 0 }, hints: { p1: 'Guess 1-100!', p2: 'Guess 1-100!' }, winner: null };
      case 'this-or-that':
        return { ...base, pairs: DB.thisOrThat, currentPair: 0, matchCount: 0 };
      case 'would-rather':
        return { ...base, questions: DB.wouldYouRather, currentQ: 0 };
      case 'red-green-flag':
        return { ...base, scenarios: DB.redGreenFlags, currentScenario: 0 };
      case 'couple-compat':
        return { ...base, questions: DB.compatQuestions, currentQ: 0, matchCount: 0, totalQuestions: DB.compatQuestions.length };
      case 'truths-lie':
        return { ...base, phase: 'writing', statements: [], lieIndex: null, currentWriter: 1, guess: null };
      case 'blind-rank': {
        const cat = DB.blindRankCategories[Math.floor(Math.random() * DB.blindRankCategories.length)];
        return { ...base, activeCat: cat, rankings: { p1: [null,null,null,null,null], p2: [null,null,null,null,null] }, currentItem: { p1: 0, p2: 0 }, revealed: false };
      }
      case 'word-letters': {
        const letters = 'ABCDEFGHIJKLMNOPRSTW';
        return { ...base, startLetter: letters[Math.floor(Math.random() * letters.length)], endLetter: letters[Math.floor(Math.random() * letters.length)], currentTurn: 1, words: [], roundNum: 1 };
      }
      case 'categories-bomb':
        return { ...base, category: DB.bombCategories[Math.floor(Math.random() * DB.bombCategories.length)], currentTurn: 1, bombDuration: Math.floor(Math.random() * 15) + 8, bombStarted: false, bombStartTime: null, exploded: false, wordsUsed: [] };
      case 'guess-age':
        return { ...base, people: DB.ageDeck, currentPerson: 0, guesses: {}, revealed: false };
      case 'guess-celeb':
        return { ...base, celebs: DB.celebDeck, currentCeleb: 0, clueLevel: 0, revealed: false };
      default:
        return base;
    }
  },

  async gameAction(action, data = {}) {
    const gs = { ...this.gameState };
    const me = this.myPlayerNum; const myKey = 'p' + me; const partnerKey = me === 1 ? 'p2' : 'p1';
    const p1 = { ...this.players.p1 }; const p2 = { ...this.players.p2 };
    let scoreChanged = false;

    switch(this.activeGameId) {
      case 'guess-number':
        if (action === 'guess') {
          const g = parseInt(data.number);
          gs.attempts[myKey] = (gs.attempts[myKey] || 0) + 1;
          if (g === gs.secretNumber) {
            gs.winner = me; gs.hints[myKey] = `CORRECT! Number was ${gs.secretNumber}!`; gs.phase = 'finished';
            if (me === 1) p1.score++; else p2.score++; scoreChanged = true;
            await this.sendEvent('notify', { sound: 'success', confetti: 100 });
          } else if (g < gs.secretNumber) { gs.hints[myKey] = `Go HIGHER! (${g} too low)`; }
          else { gs.hints[myKey] = `Go LOWER! (${g} too high)`; }
        } else if (action === 'new_round') {
          gs.secretNumber = Math.floor(Math.random() * 100) + 1;
          gs.attempts = { p1: 0, p2: 0 }; gs.hints = { p1: 'New round! Guess 1-100!', p2: 'New round! Guess 1-100!' };
          gs.winner = null; gs.phase = 'playing';
        }
        break;

      case 'this-or-that':
        if (action === 'vote') {
          gs.votes = gs.votes || {}; gs.votes[myKey] = data.choice;
          if (gs.votes.p1 && gs.votes.p2) {
            if (gs.votes.p1 === gs.votes.p2) { gs.matchCount = (gs.matchCount || 0) + 1; await this.sendEvent('notify', { sound: 'success', confetti: 50 }); }
            gs.phase = 'reveal';
          }
        } else if (action === 'next') { gs.currentPair = (gs.currentPair || 0) + 1; gs.votes = {}; gs.phase = 'playing'; }
        break;

      case 'would-rather':
        if (action === 'vote') {
          gs.votes = gs.votes || {}; gs.votes[myKey] = data.choice;
          if (gs.votes.p1 && gs.votes.p2) { gs.phase = 'reveal'; if (gs.votes.p1 === gs.votes.p2) await this.sendEvent('notify', { sound: 'success', confetti: 50 }); }
        } else if (action === 'next') { gs.currentQ = (gs.currentQ || 0) + 1; gs.votes = {}; gs.phase = 'playing'; }
        break;

      case 'red-green-flag':
        if (action === 'vote') {
          gs.votes = gs.votes || {}; gs.votes[myKey] = data.flag;
          if (gs.votes.p1 && gs.votes.p2) { gs.phase = 'reveal'; if (gs.votes.p1 === gs.votes.p2) await this.sendEvent('notify', { sound: 'success', confetti: 40 }); }
        } else if (action === 'next') { gs.currentScenario = (gs.currentScenario || 0) + 1; gs.votes = {}; gs.phase = 'playing'; }
        break;

      case 'couple-compat':
        if (action === 'vote') {
          gs.votes = gs.votes || {}; gs.votes[myKey] = data.choice;
          if (gs.votes.p1 !== undefined && gs.votes.p2 !== undefined) {
            if (gs.votes.p1 === gs.votes.p2) { gs.matchCount = (gs.matchCount || 0) + 1; await this.sendEvent('notify', { sound: 'success', confetti: 50 }); }
            gs.phase = 'reveal';
          }
        } else if (action === 'next') { gs.currentQ = (gs.currentQ || 0) + 1; gs.votes = {}; gs.phase = 'playing'; }
        break;

      case 'truths-lie':
        if (action === 'submit_statements') {
          gs.statements = [data.s1, data.s2, data.s3]; gs.lieIndex = parseInt(data.lieIndex); gs.currentWriter = me; gs.phase = 'guessing';
        } else if (action === 'guess_lie') {
          gs.guess = parseInt(data.guessIndex); const correct = gs.guess === gs.lieIndex;
          if (correct) { const guesser = gs.currentWriter === 1 ? 2 : 1; if (guesser === 1) p1.score++; else p2.score++; scoreChanged = true; await this.sendEvent('notify', { sound: 'success', confetti: 60 }); }
          else await this.sendEvent('notify', { sound: 'fail' }); gs.phase = 'result';
        } else if (action === 'next_round') { gs.phase = 'writing'; gs.statements = []; gs.lieIndex = null; gs.guess = null; gs.currentWriter = gs.currentWriter === 1 ? 2 : 1; gs.round++; }
        break;

      case 'blind-rank':
        if (action === 'place_item') {
          const slot = parseInt(data.slot); const idx = gs.currentItem[myKey];
          if (idx < 5) { gs.rankings[myKey][slot] = gs.activeCat.items[idx]; gs.currentItem[myKey] = idx + 1; }
          if (gs.currentItem.p1 >= 5 && gs.currentItem.p2 >= 5) { gs.revealed = true; gs.phase = 'reveal'; await this.sendEvent('notify', { sound: 'success', confetti: 70 }); }
        } else if (action === 'new_category') {
          const cat = DB.blindRankCategories[Math.floor(Math.random() * DB.blindRankCategories.length)];
          gs.activeCat = cat; gs.rankings = { p1: [null,null,null,null,null], p2: [null,null,null,null,null] }; gs.currentItem = { p1: 0, p2: 0 }; gs.revealed = false; gs.phase = 'playing';
        }
        break;

      case 'word-letters':
        if (action === 'submit_word') {
          gs.words = gs.words || []; gs.words.push({ player: me, word: data.word }); gs.currentTurn = gs.currentTurn === 1 ? 2 : 1;
          const letters = 'ABCDEFGHIJKLMNOPRSTW'; gs.startLetter = gs.endLetter; gs.endLetter = letters[Math.floor(Math.random() * letters.length)];
        } else if (action === 'timeout') { const winner = me === 1 ? 2 : 1; if (winner === 1) p1.score++; else p2.score++; scoreChanged = true; await this.sendEvent('notify', { sound: 'fail' }); }
        else if (action === 'new_round') {
          const letters = 'ABCDEFGHIJKLMNOPRSTW'; gs.startLetter = letters[Math.floor(Math.random() * letters.length)];
          gs.endLetter = letters[Math.floor(Math.random() * letters.length)]; gs.currentTurn = gs.currentTurn === 1 ? 2 : 1; gs.words = []; gs.roundNum = (gs.roundNum || 1) + 1;
        }
        break;

      case 'categories-bomb':
        if (action === 'start_bomb') { gs.bombStarted = true; gs.bombStartTime = Date.now(); gs.bombDuration = Math.floor(Math.random() * 15) + 8; }
        else if (action === 'pass_turn') { gs.wordsUsed = gs.wordsUsed || []; gs.wordsUsed.push(data.word); gs.currentTurn = gs.currentTurn === 1 ? 2 : 1; }
        else if (action === 'bomb_exploded') { gs.exploded = true; const winner = gs.currentTurn === 1 ? 2 : 1; if (winner === 1) p1.score++; else p2.score++; scoreChanged = true; gs.phase = 'exploded'; await this.sendEvent('notify', { sound: 'boom' }); }
        else if (action === 'new_round') {
          gs.category = DB.bombCategories[Math.floor(Math.random() * DB.bombCategories.length)]; gs.currentTurn = 1; gs.bombDuration = Math.floor(Math.random() * 15) + 8;
          gs.bombStarted = false; gs.bombStartTime = null; gs.exploded = false; gs.wordsUsed = []; gs.phase = 'playing';
        }
        break;

      case 'guess-age':
        if (action === 'submit_guess') {
          gs.guesses = gs.guesses || {}; gs.guesses[myKey] = parseInt(data.guess);
          if (gs.guesses.p1 !== undefined && gs.guesses.p2 !== undefined) {
            const person = gs.people[gs.currentPerson % gs.people.length]; const d1 = Math.abs(gs.guesses.p1 - person.age); const d2 = Math.abs(gs.guesses.p2 - person.age);
            if (d1 < d2) { p1.score++; scoreChanged = true; } else if (d2 < d1) { p2.score++; scoreChanged = true; }
            gs.revealed = true; gs.phase = 'reveal'; await this.sendEvent('notify', { sound: 'success', confetti: 40 });
          }
        } else if (action === 'next') { gs.currentPerson = (gs.currentPerson || 0) + 1; gs.guesses = {}; gs.revealed = false; gs.phase = 'playing'; }
        break;

      case 'guess-celeb':
        if (action === 'reveal_clue') { gs.clueLevel = Math.min((gs.clueLevel || 0) + 1, 2); }
        else if (action === 'correct_guess') { if (me === 1) p1.score++; else p2.score++; scoreChanged = true; gs.revealed = true; gs.phase = 'reveal'; await this.sendEvent('notify', { sound: 'success', confetti: 60 }); }
        else if (action === 'reveal') { gs.revealed = true; gs.phase = 'reveal'; }
        else if (action === 'next') { gs.currentCeleb = (gs.currentCeleb || 0) + 1; gs.clueLevel = 0; gs.revealed = false; gs.phase = 'playing'; }
        break;
    }

    const updates = { game_state: gs };
    if (scoreChanged) { updates.player1 = p1; updates.player2 = p2; }
    await this.updateRoom(updates);
  },

  async endGame() { Sound.pop(); await this.updateRoom({ current_game: '', game_state: {} }); },

  async sendChat() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    await this.sendEvent('chat', { message: msg });
  },

  async sendEmoji(emoji) {
    this.showFloatingEmoji(emoji);
    await this.sendEvent('emoji', { emoji: emoji });
  },

  captureProfile() {
    const n = document.getElementById('input-name'); const a = document.getElementById('input-avatar');
    if (n) this.myName = n.value.trim() || 'Player';
    if (a) this.myAvatar = a.value.trim() || '😊';
    this.saveProfile();
  },

  async goHome() {
    if (this.roomChannel) await sb.removeChannel(this.roomChannel);
    this.roomChannel = null; this.roomId = null; this.myPlayerNum = null; this.players = { p1: null, p2: null };
    this.activeGameId = null; this.gameState = null; this.chatMessages = [];
    history.pushState({}, '', '/');
    this.updateConnStatus('disconnected');
    this.renderLobby();
  },

  copyRoomCode() {
    const url = `${location.origin}?room=${this.roomId}`;
    const text = `Join me on DuoVibe 💕\nRoom Code: ${this.roomId}\n${url}`;
    if (navigator.share) {
      navigator.share({ title: 'DuoVibe', text: text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        this.toast('Link copied! Send it to your partner 💕', 'success');
      }).catch(() => {
        this.toast(`Room: ${this.roomId}`, 'info');
      });
    }
  },

  renderLobby(prefillCode = '') {
    document.getElementById('timezone-widget').classList.add('hidden');
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="space-y-4"><div class="card"><div class="tag tag-rose mb-2">💕 Real-Time Couple Games</div><h2 class="font-heading font-black text-2xl" style="line-height:1.1;">Play together,<br><span class="text-brand">anywhere in the world</span></h2><p class="text-xs text-slate-400 mt-2 font-bold">Create a room, share with your partner, play 11 viral couple games in real-time.</p></div><div class="card space-y-3 fade-in"><h3 class="font-heading font-extrabold text-lg">Your Profile</h3><div class="flex gap-2"><input id="input-avatar" type="text" maxlength="2" value="${this.myAvatar || '😍'}" class="input input-sm" style="width:56px;text-align:center;font-size:1.3rem;" /><input id="input-name" type="text" value="${this.myName || ''}" placeholder="Your name..." class="input input-sm flex-1" /></div></div><div class="card space-y-3 fade-in" style="background:linear-gradient(135deg,#fff1f2,#ede9fe);"><div class="text-center"><span class="text-3xl">🏠</span><h3 class="font-heading font-extrabold text-lg mt-1">Create a New Room</h3><p class="text-xs text-slate-400">You'll get a code to share with your partner</p></div><button onclick="App.createRoom()" class="btn btn-primary btn-full btn-lg">Create Room 💕</button></div><div class="card space-y-3 fade-in"><div class="text-center"><span class="text-3xl">🔑</span><h3 class="font-heading font-extrabold text-lg mt-1">Join Partner's Room</h3><p class="text-xs text-slate-400">Enter the 6-letter code they shared</p></div><input id="input-room-code" type="text" maxlength="6" placeholder="ABCD12" value="${prefillCode}" class="input input-code" /><button onclick="App.joinRoom(document.getElementById('input-room-code').value)" class="btn btn-secondary btn-full btn-lg">Join Room</button></div></div>`;
  },

  renderWaitingRoom() {
    document.getElementById('timezone-widget').classList.remove('hidden');
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="card"><div class="text-center space-y-3"><div class="waiting-spinner" style="margin:0 auto;"></div><h3 class="font-heading font-extrabold text-xl">Waiting for your partner...</h3><p class="text-xs text-slate-400 font-bold">Share this room code:</p><div class="room-code-display">${this.roomId}</div><button onclick="App.copyRoomCode()" class="btn btn-primary btn-full">📱 Share Room Link</button></div></div>`;
  },

  renderGameLobby() {
    document.getElementById('timezone-widget').classList.remove('hidden');
    const main = document.getElementById('main-content');
    const p1 = this.players.p1 || {}; const p2 = this.players.p2 || {};
    main.innerHTML = `<div class="space-y-4"><div class="card" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-color:#6ee7b7;"><div class="text-center space-y-2"><span class="text-3xl">💕</span><h3 class="font-heading font-extrabold text-lg" style="color:#065f46;">${p1.avatar || '👩'} ${p1.name || 'P1'} & ${p2.avatar || '👦'} ${p2.name || 'P2'}</h3><p class="text-xs font-bold" style="color:#047857;">Room: ${this.roomId}</p></div></div><div class="card score-bar fade-in"><div class="score-player"><span class="score-avatar">${p1.avatar || '👩'}</span><span class="score-value text-brand">${p1.score || 0}</span><span class="score-name">${p1.name || 'P1'}</span></div><span class="font-heading font-black text-slate-300">VS</span><div class="score-player"><span class="score-avatar">${p2.avatar || '👦'}</span><span class="score-value text-purple">${p2.score || 0}</span><span class="score-name">${p2.name || 'P2'}</span></div></div><div class="card"><div class="emoji-bar">${['❤️','😂','🔥','😘','👀','🤯','💀','🥰'].map(e => `<button class="emoji-btn" onclick="App.sendEmoji('${e}')">${e}</button>`).join('')}</div></div><div class="card space-y-2 fade-in"><h4 class="font-heading font-extrabold text-sm">💬 Live Chat</h4><div id="chat-container" class="chat-container"></div><div class="flex gap-2"><input id="chat-input" type="text" placeholder="Type message..." class="input input-sm flex-1" onkeydown="if(event.key==='Enter') App.sendChat()" /><button onclick="App.sendChat()" class="btn btn-primary btn-sm">Send</button></div></div><h3 class="font-heading font-extrabold text-lg mt-2">🎮 Choose a Game</h3><div class="games-grid">${GAMES.map(g => `<div class="card card-game fade-in" onclick="App.startGame('${g.id}')"><div><div class="flex justify-between items-center mb-1"><span class="game-emoji">${g.emoji}</span><span class="tag tag-rose">#${g.num}</span></div><div class="game-title">${g.title}</div><div class="game-desc">${g.desc}</div></div><div class="game-footer"><span class="tag tag-purple">${g.tag}</span><div class="play-icon">▶</div></div></div>`).join('')}</div></div>`;
    this.renderChatMessages();
  },

  renderGameView() {
    document.getElementById('timezone-widget').classList.remove('hidden');
    const main = document.getElementById('main-content');
    const gInfo = GAMES.find(g => g.id === this.activeGameId);
    const gs = this.gameState || {};
    const p1 = this.players.p1 || {}; const p2 = this.players.p2 || {};
    const me = this.myPlayerNum; const myKey = 'p' + me; const partnerKey = me === 1 ? 'p2' : 'p1';

    const header = `<div class="game-header"><button onclick="App.endGame()" class="btn btn-sm btn-outline">← Games</button><span class="font-heading font-bold text-sm">${gInfo ? gInfo.emoji + ' ' + gInfo.title : ''}</span><button onclick="App.gameAction('new_round')" class="btn btn-sm btn-outline">🔄</button></div><div class="card score-bar mb-3"><div class="score-player"><span class="score-avatar">${p1.avatar || '👩'}</span><span class="score-value text-brand">${p1.score || 0}</span><span class="score-name">${p1.name || 'P1'}</span></div><span class="font-heading font-black text-slate-300">VS</span><div class="score-player"><span class="score-avatar">${p2.avatar || '👦'}</span><span class="score-value text-purple">${p2.score || 0}</span><span class="score-name">${p2.name || 'P2'}</span></div></div>`;

    let gameHTML = '';
    switch(this.activeGameId) {
      case 'guess-number': gameHTML = this.renderGuessNumber(gs, me, myKey); break;
      case 'this-or-that': gameHTML = this.renderThisOrThat(gs, me, myKey, partnerKey); break;
      case 'would-rather': gameHTML = this.renderWouldYouRather(gs, me, myKey, partnerKey); break;
      case 'red-green-flag': gameHTML = this.renderRedGreenFlag(gs, me, myKey, partnerKey); break;
      case 'couple-compat': gameHTML = this.renderCompatQuiz(gs, me, myKey, partnerKey, p1, p2); break;
      case 'truths-lie': gameHTML = this.renderTruthsLie(gs, me); break;
      case 'blind-rank': gameHTML = this.renderBlindRank(gs, me, myKey, partnerKey); break;
      case 'word-letters': gameHTML = this.renderWordLetters(gs, me); break;
      case 'categories-bomb': gameHTML = this.renderBomb(gs, me); break;
      case 'guess-age': gameHTML = this.renderGuessAge(gs, me, myKey, partnerKey); break;
      case 'guess-celeb': gameHTML = this.renderGuessCeleb(gs, me); break;
      default: gameHTML = '<div class="card text-center">Loading...</div>';
    }

    const emojiBar = `<div class="card mt-3"><div class="emoji-bar">${['❤️','😂','🔥','😘','👀','🤯','💀','🥰'].map(e => `<button class="emoji-btn" onclick="App.sendEmoji('${e}')">${e}</button>`).join('')}</div></div>`;
    main.innerHTML = header + gameHTML + emojiBar;
  },

  renderGuessNumber(gs, me, myKey) {
    const hint = (gs.hints && gs.hints[myKey]) || 'Guess 1-100!';
    const att = (gs.attempts && gs.attempts[myKey]) || 0;
    const done = gs.phase === 'finished';
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-purple">Race Mode</span><h3 class="font-heading font-extrabold text-xl mt-1">Guess The Number 🔢</h3><p class="text-xs text-slate-400">Attempts: <strong>${att}</strong></p></div><div class="dark-box"><div class="font-heading font-black text-lg text-white">${hint}</div></div>${!done ? `<div class="flex gap-2"><input id="guess-num" type="number" min="1" max="100" placeholder="1-100" class="input input-number flex-1" onkeydown="if(event.key==='Enter') App.submitNumGuess()" /><button onclick="App.submitNumGuess()" class="btn btn-primary">Guess!</button></div>` : `<div class="result-match">🎉 ${gs.winner === me ? 'YOU WON!' : 'Partner won!'} Secret was ${gs.secretNumber}!</div><button onclick="App.gameAction('new_round')" class="btn btn-secondary btn-full">New Round →</button>`}</div>`;
  },

  submitNumGuess() {
    const el = document.getElementById('guess-num');
    if (!el) return;
    const v = parseInt(el.value);
    if (isNaN(v) || v < 1 || v > 100) return;
    Sound.pop(); this.gameAction('guess', { number: v }); el.value = '';
  },

  renderThisOrThat(gs, me, myKey, pKey) {
    if (!gs.pairs) return '';
    const pair = gs.pairs[gs.currentPair % gs.pairs.length];
    const myVote = gs.votes ? gs.votes[myKey] : null;
    const pVote = gs.votes ? gs.votes[pKey] : null;
    const rev = gs.phase === 'reveal';
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-rose">Card ${(gs.currentPair || 0) + 1}/${gs.pairs.length}</span><h3 class="font-heading font-extrabold text-lg mt-1">This or That ⚡</h3></div><div class="grid grid-cols-2 gap-3"><button onclick="App.gameAction('vote',{choice:'A'})" class="option-card ${myVote === 'A' ? 'selected' : ''} ${myVote ? 'locked' : ''} text-center" style="min-height:90px;"><span class="font-heading font-black text-brand text-2xl">A</span><p class="font-extrabold text-xs mt-1">${pair.a}</p></button><button onclick="App.gameAction('vote',{choice:'B'})" class="option-card ${myVote === 'B' ? 'selected' : ''} ${myVote ? 'locked' : ''} text-center" style="min-height:90px;"><span class="font-heading font-black text-purple text-2xl">B</span><p class="font-extrabold text-xs mt-1">${pair.b}</p></button></div><div class="flex justify-around text-xs font-bold"><span>You: ${myVote ? '✅ ' + myVote : 'Pick one...'}</span><span>Partner: ${rev ? '✅ ' + pVote : (pVote ? '✅ Locked' : 'Thinking...')}</span></div>${rev ? `<div class="${myVote === pVote ? 'result-match' : 'result-differ'}">${myVote === pVote ? '🔥 SOULMATE MATCH!' : '⚡ Opposites attract!'}</div><button onclick="App.gameAction('next')" class="btn btn-secondary btn-full">Next Card →</button>` : ''}</div>`;
  },

  renderWouldYouRather(gs, me, myKey, pKey) {
    if (!gs.questions) return '';
    const q = gs.questions[gs.currentQ % gs.questions.length];
    const parts = q.replace('Would you rather ', '').split(' OR ');
    const optA = parts[0] || ''; const optB = (parts[1] || '').replace('?', '');
    const myVote = gs.votes ? gs.votes[myKey] : null;
    const pVote = gs.votes ? gs.votes[pKey] : null;
    const rev = gs.phase === 'reveal';
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-purple">Question ${(gs.currentQ || 0) + 1}</span><h3 class="font-heading font-extrabold text-xl mt-1">Would You Rather... ⚖️</h3></div><button onclick="App.gameAction('vote',{choice:'A'})" class="option-card ${myVote === 'A' ? 'selected' : ''} ${myVote ? 'locked' : ''}" style="background:var(--brand-light);"><span class="font-black text-brand">A.</span> ${optA}</button><button onclick="App.gameAction('vote',{choice:'B'})" class="option-card ${myVote === 'B' ? 'selected' : ''} ${myVote ? 'locked' : ''}" style="background:var(--purple-light);"><span class="font-black text-purple">B.</span> ${optB}</button><div class="flex justify-around text-xs font-bold"><span>You: ${myVote ? '✅ ' + myVote : '🤔...'}</span><span>Partner: ${rev ? '✅ ' + pVote : (pVote ? '✅' : '🤔...')}</span></div>${rev ? `<div class="${myVote === pVote ? 'result-match' : 'result-differ'}">${myVote === pVote ? '💕 Both chose ' + myVote + '!' : 'Different picks!'}</div><button onclick="App.gameAction('next')" class="btn btn-secondary btn-full">Next →</button>` : ''}</div>`;
  },

  renderRedGreenFlag(gs, me, myKey, pKey) {
    if (!gs.scenarios) return '';
    const sc = gs.scenarios[gs.currentScenario % gs.scenarios.length];
    const myVote = gs.votes ? gs.votes[myKey] : null;
    const pVote = gs.votes ? gs.votes[pKey] : null;
    const rev = gs.phase === 'reveal';
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-rose">Scenario ${(gs.currentScenario || 0) + 1}</span><h3 class="font-heading font-extrabold text-lg mt-1">What Flag Is This? 🏳️</h3></div><div style="background:white;border:2px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.2rem;text-align:center;"><p class="font-bold text-sm">"${sc}"</p></div><div class="grid grid-cols-3 gap-2"><button onclick="App.gameAction('vote',{flag:'red'})" class="flag-btn red ${myVote === 'red' ? 'selected' : ''}" ${myVote ? 'disabled' : ''}><span class="text-2xl">🚩</span><span>Red</span></button><button onclick="App.gameAction('vote',{flag:'beige'})" class="flag-btn beige ${myVote === 'beige' ? 'selected' : ''}" ${myVote ? 'disabled' : ''}><span class="text-2xl">🟡</span><span>Beige</span></button><button onclick="App.gameAction('vote',{flag:'green'})" class="flag-btn green ${myVote === 'green' ? 'selected' : ''}" ${myVote ? 'disabled' : ''}><span class="text-2xl">🟢</span><span>Green</span></button></div>${rev ? `<div class="${myVote === pVote ? 'result-match' : 'result-differ'}">${myVote === pVote ? '🎯 Both said: ' + myVote.toUpperCase() : 'You: ' + myVote + ' | Partner: ' + pVote}</div><button onclick="App.gameAction('next')" class="btn btn-secondary btn-full">Next →</button>` : ''}</div>`;
  },

  renderCompatQuiz(gs, me, myKey, pKey, p1, p2) {
    if (!gs.questions) return '';
    const q = gs.questions[gs.currentQ % gs.questions.length];
    const myVote = gs.votes ? gs.votes[myKey] : null;
    const pVote = gs.votes ? gs.votes[pKey] : null;
    const rev = gs.phase === 'reveal';
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-purple">Q${(gs.currentQ || 0) + 1}</span><h3 class="font-heading font-extrabold text-lg mt-1">Compatibility 🔮</h3></div><div class="gradient-box"><p class="font-bold text-sm">${q.q}</p></div>${!rev ? `<div class="space-y-2">${q.opts.map((opt, i) => `<button onclick="App.gameAction('vote',{choice:${i}})" class="option-card ${myVote === i ? 'selected' : ''} ${myVote !== null && myVote !== undefined ? 'locked' : ''}">${opt.replace('Player 1', p1.name || 'P1').replace('Player 2', p2.name || 'P2')}</button>`).join('')}</div>` : `<div class="${myVote === pVote ? 'result-match' : 'result-differ'}">${myVote === pVote ? '💖 100% MATCH!' : '🤷 Different thoughts!'}</div><button onclick="App.gameAction('next')" class="btn btn-secondary btn-full">Next Question →</button>`}</div>`;
  },

  renderTruthsLie(gs, me) {
    const isWriter = gs.currentWriter === me;
    if (gs.phase === 'writing') {
      return isWriter ? `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-rose">Your Turn</span><h3 class="font-heading font-extrabold text-lg mt-1">2 Truths & 1 Lie 🤫</h3></div><input id="tt-s1" type="text" placeholder="Statement 1 (Truth)..." class="input input-sm" /><input id="tt-s2" type="text" placeholder="Statement 2 (Truth)..." class="input input-sm" /><input id="tt-s3" type="text" placeholder="Statement 3 (The Lie)..." class="input input-sm" /><p class="text-xs font-bold text-slate-600">Which statement is the LIE?</p><div class="grid grid-cols-3 gap-2"><button onclick="App.submitTT(0)" class="btn btn-outline btn-sm">#1</button><button onclick="App.submitTT(1)" class="btn btn-outline btn-sm">#2</button><button onclick="App.submitTT(2)" class="btn btn-outline btn-sm">#3</button></div></div>` : `<div class="card text-center"><div class="waiting-spinner" style="margin:0 auto 1rem;"></div><h3 class="font-heading font-bold">Partner is writing statements...</h3></div>`;
    }
    if (gs.phase === 'guessing') {
      return !isWriter ? `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-purple">Find the Lie</span><h3 class="font-heading font-extrabold text-lg mt-1">Spot The Fake!</h3></div><div class="space-y-2">${gs.statements.map((s, i) => `<button onclick="App.gameAction('guess_lie',{guessIndex:${i}})" class="option-card"><span class="font-black text-brand">#${i+1}</span> — ${s}</button>`).join('')}</div></div>` : `<div class="card text-center"><div class="waiting-spinner" style="margin:0 auto 1rem;"></div><h3 class="font-heading font-bold">Partner is guessing your lie...</h3></div>`;
    }
    if (gs.phase === 'result') {
      const correct = gs.guess === gs.lieIndex;
      return `<div class="card space-y-3 fade-in"><div class="text-center text-3xl">${correct ? '🎯' : '😈'}</div><div class="${correct ? 'result-match' : 'result-differ'}">${correct ? 'BUSTED! Lie found!' : 'FOOLED! Guessed wrong!'}</div><button onclick="App.gameAction('next_round')" class="btn btn-secondary btn-full">Next Round →</button></div>`;
    }
    return '';
  },

  submitTT(lieIdx) {
    const s1 = document.getElementById('tt-s1'); const s2 = document.getElementById('tt-s2'); const s3 = document.getElementById('tt-s3');
    if (!s1.value.trim() || !s2.value.trim() || !s3.value.trim()) { this.toast('Fill all 3 statements!', 'error'); return; }
    Sound.pop(); this.gameAction('submit_statements', { s1: s1.value.trim(), s2: s2.value.trim(), s3: s3.value.trim(), lieIndex: lieIdx });
  },

  renderBlindRank(gs, me, myKey, partnerKey) {
    if (!gs.activeCat) return '';
    const cat = gs.activeCat;
    const myIdx = gs.currentItem ? (gs.currentItem[myKey] || 0) : 0;
    const myR = gs.rankings ? gs.rankings[myKey] : [null,null,null,null,null];
    const done = myIdx >= 5;
    const both = gs.phase === 'reveal';
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-purple">Blind Ranking</span><h3 class="font-heading font-extrabold text-lg mt-1">${cat.topic}</h3></div>${!done ? `<div class="gradient-box"><span class="text-xs uppercase">Item ${myIdx + 1}/5</span><div class="font-heading font-black text-xl mt-1">${cat.items[myIdx]}</div></div>` : ''}<div class="space-y-2">${myR.map((v, i) => `<div class="rank-slot"><div class="rank-num ${v ? 'filled' : 'empty'}">#${i+1}</div>${v ? `<div class="flex-1 bg-white p-2 rounded-xl text-xs font-bold border">${v} ✅</div>` : !done ? `<button onclick="App.gameAction('place_item',{slot:${i}})" class="flex-1 btn btn-outline btn-sm">Place at #${i+1}</button>` : `<div class="flex-1 text-xs text-slate-400 p-2">Empty</div>`}</div>`).join('')}</div>${both ? `<button onclick="App.gameAction('new_category')" class="btn btn-primary btn-full">New Category →</button>` : ''}</div>`;
  },

  renderWordLetters(gs, me) {
    const isMyTurn = gs.currentTurn === me;
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-rose">Round ${gs.roundNum || 1}</span><h3 class="font-heading font-extrabold text-lg mt-1">First & Last Letter 🔤</h3></div><div class="gradient-box"><div class="flex justify-center gap-4 text-3xl font-black"><span>${gs.startLetter || '?'}</span><span>⋯</span><span>${gs.endLetter || '?'}</span></div></div><div class="p-3 bg-white border text-center font-bold">${isMyTurn ? '🔥 YOUR TURN!' : '⏳ Partner turn...'}</div>${isMyTurn ? `<div class="flex gap-2"><input id="word-in" type="text" placeholder="Type word..." class="input input-sm flex-1" onkeydown="if(event.key==='Enter') App.subWord()" style="text-transform:uppercase;" /><button onclick="App.subWord()" class="btn btn-primary btn-sm">Submit</button></div>` : ''}</div>`;
  },

  subWord() {
    const el = document.getElementById('word-in'); if (!el) return;
    const w = el.value.trim().toUpperCase(); if (!w) return;
    Sound.pop(); this.gameAction('submit_word', { word: w }); el.value = '';
  },

  renderBomb(gs, me) {
    const isMyTurn = gs.currentTurn === me;
    const exploded = gs.phase === 'exploded';
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-rose">💣 Pass The Bomb</span><h3 class="font-heading font-extrabold text-lg mt-1">${gs.category}</h3></div><div class="dark-box"><div class="text-5xl">${exploded ? '💥' : '💣'}</div><p class="font-bold text-sm mt-2">${exploded ? 'BOOM! Exploded!' : gs.bombStarted ? '🔥 TICKING!' : 'Tap Start!'}</p></div>${!gs.bombStarted && !exploded ? `<button onclick="App.gameAction('start_bomb')" class="btn btn-primary btn-full">🔥 Ignite Bomb!</button>` : isMyTurn && !exploded ? `<div class="flex gap-2"><input id="bomb-word" type="text" placeholder="Say word..." class="input input-sm flex-1" onkeydown="if(event.key==='Enter') App.passBomb()" /><button onclick="App.passBomb()" class="btn btn-green btn-sm">Pass!</button></div>` : ''}${exploded ? `<button onclick="App.gameAction('new_round')" class="btn btn-secondary btn-full">New Round →</button>` : ''}</div>`;
  },

  passBomb() {
    const el = document.getElementById('bomb-word'); if (!el) return;
    const w = el.value.trim(); if (!w) return;
    Sound.pop(); this.gameAction('pass_turn', { word: w }); el.value = '';
  },

  renderGuessAge(gs, me, myKey, partnerKey) {
    if (!gs.people) return '';
    const p = gs.people[gs.currentPerson % gs.people.length];
    const myG = gs.guesses ? gs.guesses[myKey] : null;
    const rev = gs.phase === 'reveal';
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-rose">Age Guess</span><h3 class="font-heading font-extrabold text-lg mt-1">How old is ${p.name}? 🎂</h3></div>${!rev ? `${myG === null || myG === undefined ? `<div class="text-center"><span class="font-heading font-black text-3xl text-brand" id="age-disp">25</span><span class="text-xs font-bold"> years</span><input type="range" min="15" max="65" value="25" class="w-full mt-2" oninput="document.getElementById('age-disp').innerText=this.value" id="age-sl" /><button onclick="App.subAge()" class="btn btn-primary btn-full mt-3">Lock Guess 🔒</button></div>` : `<div class="result-match">Locked: ${myG} years. Waiting for partner...</div>`}` : `<div class="dark-box"><div class="font-heading font-black text-2xl">Real Age: ${p.age}</div></div><button onclick="App.gameAction('next')" class="btn btn-secondary btn-full">Next →</button>`}</div>`;
  },

  subAge() {
    const sl = document.getElementById('age-sl'); if (!sl) return;
    Sound.pop(); this.gameAction('submit_guess', { guess: parseInt(sl.value) });
  },

  renderGuessCeleb(gs, me) {
    if (!gs.celebs) return '';
    const c = gs.celebs[gs.currentCeleb % gs.celebs.length];
    const rev = gs.phase === 'reveal';
    return `<div class="card space-y-3 fade-in"><div class="text-center"><span class="tag tag-purple">Mystery Star</span><h3 class="font-heading font-extrabold text-lg mt-1">Who Is This? 🌟</h3></div><div class="dark-box font-heading font-black text-2xl">${rev ? c.name : '❓❓❓'}</div><div class="space-y-1">${c.clues.map((cl, i) => `<div class="p-2 border rounded-xl text-xs font-bold ${i <= (gs.clueLevel || 0) ? 'bg-white' : 'bg-slate-100 text-slate-400'}">${i <= (gs.clueLevel || 0) ? cl : '🔒 Locked Clue'}</div>`).join('')}</div>${!rev ? `<div class="grid grid-cols-2 gap-2"><button onclick="App.gameAction('reveal_clue')" class="btn btn-outline btn-sm">💡 Clue</button><button onclick="App.gameAction('correct_guess')" class="btn btn-green btn-sm">✅ Got It!</button></div>` : `<button onclick="App.gameAction('next')" class="btn btn-secondary btn-full">Next Celeb →</button>`}</div>`;
  },

  renderChatMessages() {
    const c = document.getElementById('chat-container'); if (!c) return;
    if (this.chatMessages.length === 0) { c.innerHTML = '<div class="text-xs text-slate-400 text-center">No messages yet...</div>'; return; }
    c.innerHTML = this.chatMessages.slice(-20).map(m => {
      const isMe = m.from_player === this.myPlayerNum;
      return `<div class="chat-msg ${isMe ? 'mine' : ''}"><div class="chat-bubble ${m.from_player === 1 ? 'p1' : 'p2'}">${m.payload.message}</div></div>`;
    }).join('');
    c.scrollTop = c.scrollHeight;
  },

    updateConnStatus(status) {
    const el = document.getElementById('conn-status');
    if (!el) return;
    el.className = 'conn-status ' + (status === 'disconnected' ? 'disconnected' : 'connected');
    const label = status === 'connected' ? 'Live' : status === 'online' ? 'Online' : status === 'waiting' ? 'Waiting' : 'Offline';
    el.innerHTML = `<span class="conn-dot"></span> ${label}`;
  },

  showFloatingEmoji(emoji) {
    const container = document.getElementById('floating-emojis'); if (!container) return;
    const el = document.createElement('div'); el.className = 'emoji-float'; el.textContent = emoji;
    el.style.left = (Math.random() * 70 + 15) + '%'; el.style.bottom = '20%';
    container.appendChild(el); setTimeout(() => el.remove(), 2500);
  },

  toast(msg, type = 'info') {
    const c = document.getElementById('toast-container'); if (!c) return;
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
    c.appendChild(t); setTimeout(() => t.remove(), 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.addEventListener('popstate', () => App.init());