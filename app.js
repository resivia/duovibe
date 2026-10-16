// DuoVibe Real-Time Multiplayer Engine - 11 Games & Voice Call

const SUPABASE_URL = (window.CONFIG && window.CONFIG.SUPABASE_URL) ? window.CONFIG.SUPABASE_URL : 'https://euqrzxxldlsbhuyjuleo.supabase.co';
const SUPABASE_ANON_KEY = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) ? window.CONFIG.SUPABASE_ANON_KEY : '';

if (window.supabase && !window.sb) {
  try {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase init error:", e);
  }
}

const ALL_GAMES = [
  { id: 'blind-rank', num: 1, title: 'Blind Ranking', emoji: '🔟', tag: 'TikTok Trend', desc: 'Rank 5 mystery items 1-5 without knowing what comes next!' },
  { id: 'truths-lie', num: 2, title: '2 Truths & 1 Lie', emoji: '🤫', tag: 'Duo Game', desc: 'Write 3 statements — partner sniffs out the lie.' },
  { id: 'would-rather', num: 3, title: 'Would You Rather', emoji: '⚖️', tag: 'Dilemmas', desc: 'Vote secretly on dilemmas. Compare choices side-by-side!' },
  { id: 'this-or-that', num: 4, title: 'This or That', emoji: '⚡', tag: 'Rapid Fire', desc: 'Quick-fire choices — see if your tastes align in real time!' },
  { id: 'red-green-flag', num: 5, title: 'Red or Green Flag', emoji: '🚩', tag: 'Opinion', desc: 'Judge dating scenarios — Red, Green, or Beige flag?' },
  { id: 'couple-compat', num: 6, title: 'Compatibility Quiz', emoji: '🔮', tag: 'Secrets', desc: 'Answer relationship questions secretly & reveal match %!' },
  { id: 'word-letters', num: 7, title: 'First / Last Letter', emoji: '🔤', tag: 'Word Battle', desc: 'Word matching constraints before the round timer runs out!' },
  { id: 'categories-bomb', num: 8, title: 'Pass The Bomb', emoji: '💣', tag: 'Adrenaline', desc: 'Name items fast before the bomb explodes on your screen!' },
  { id: 'guess-age', num: 9, title: 'Guess The Age', emoji: '🎂', tag: 'Visual Guess', desc: 'Both guess numbers/ages — closest guess wins!' },
  { id: 'guess-number', num: 10, title: 'Guess The Number', emoji: '🔢', tag: 'Hot or Cold', desc: 'Race to find secret number 1-100 with live higher/lower hints!' },
  { id: 'guess-celeb', num: 11, title: 'Guess Celebrity', emoji: '🌟', tag: 'Mystery Pop', desc: 'Unlock clues together and guess the star!' }
];

window.App = {
  currentRoom: null,
  myId: localStorage.getItem('duo_my_id') || 'user_' + Math.random().toString(36).substring(2, 7),
  myName: localStorage.getItem('duo_my_name') || '',
  players: [],
  activeGame: null,
  gameState: {},
  channel: null,

  init() {
    localStorage.setItem('duo_my_id', this.myId);
    if (!this.myName) {
      this.myName = 'Player ' + Math.floor(Math.random() * 90 + 10);
      localStorage.setItem('duo_my_name', this.myName);
    }
    console.log("DuoVibe Loaded - User:", this.myName);
    this.checkOnlineStatus();
    this.renderHome();
  },

  checkOnlineStatus() {
    const statusEl = document.getElementById('conn-status');
    if (!statusEl) return;
    if (this.currentRoom) {
      statusEl.textContent = '• LIVE - Room ' + this.currentRoom;
      statusEl.className = 'status-badge live';
    } else if (window.sb) {
      statusEl.textContent = '• ONLINE';
      statusEl.className = 'status-badge online';
    } else {
      statusEl.textContent = '• OFFLINE';
      statusEl.className = 'status-badge offline';
    }
  },

  renderHome() {
    this.currentRoom = null;
    this.checkOnlineStatus();
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
      <div class="home-card">
        <h2>Welcome to DuoVibe 💕</h2>
        <p class="subtitle">Play 11 real-time games with your long-distance partner</p>
        
        <div class="input-group">
          <label>Your Name:</label>
          <input type="text" id="user-name-input" value="${this.myName}" class="game-input" placeholder="Enter your name" onchange="App.updateName(this.value)" />
        </div>

        <div class="action-buttons-stack">
          <button class="btn-primary" onclick="App.createRoom()">✨ Create New Room</button>
          
          <div class="join-row">
            <input type="text" id="room-code-input" class="game-input" placeholder="6-Digit Room Code" style="text-transform:uppercase" />
            <button class="btn-secondary" onclick="App.joinRoomFromInput()">Join Room</button>
          </div>
        </div>
      </div>
    `;
  },

  updateName(val) {
    if (val.trim()) {
      this.myName = val.trim();
      localStorage.setItem('duo_my_name', this.myName);
    }
  },

  createRoom() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.joinRoomWithCode(code);
  },

  joinRoomFromInput() {
    const input = document.getElementById('room-code-input');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (!code) {
      alert("Please enter a valid 6-digit room code.");
      return;
    }
    this.joinRoomWithCode(code);
  },

  joinRoomWithCode(code) {
    this.currentRoom = code;
    this.checkOnlineStatus();

    if (window.sb) {
      if (this.channel) this.channel.unsubscribe();
      this.channel = window.sb.channel('room_' + code, {
        config: { presence: { key: this.myId } }
      });

      this.channel
        .on('presence', { event: 'sync' }, () => {
          const state = this.channel.presenceState();
          this.players = Object.keys(state).map(key => {
            const pres = state[key][0];
            return pres || { id: key, name: 'Partner' };
          });
          this.updatePlayerListUI();
        })
        .on('broadcast', { event: 'game_update' }, (payload) => {
          if (payload && payload.payload) {
            this.gameState = payload.payload;
            if (this.gameState.gameId && this.activeGame !== this.gameState.gameId) {
              this.activeGame = this.gameState.gameId;
            }
            this.renderActiveGame();
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await this.channel.track({ id: this.myId, name: this.myName, onlineAt: new Date().toISOString() });
          }
        });
    } else {
      this.players = [{ id: this.myId, name: this.myName }];
    }

    this.renderLobby();
  },

  updatePlayerListUI() {
    const listEl = document.getElementById('connected-players-bar');
    if (listEl) {
      listEl.innerHTML = this.players.map(p => 
        `<span class="player-badge ${p.id === this.myId ? 'me' : ''}">👤 ${p.name || 'Partner'}</span>`
      ).join(' ');
    }
  },

  renderLobby() {
    this.activeGame = null;
    const main = document.getElementById('main-content');
    if (!main) return;

    let html = `
      <div class="lobby-header-bar">
        <div class="lobby-title-row">
          <h3>🎮 Select a Game (${ALL_GAMES.length} Available)</h3>
          <span class="room-tag">Room Code: <strong>${this.currentRoom}</strong></span>
        </div>
        <div id="connected-players-bar" class="players-bar">
          <span class="player-badge me">👤 ${this.myName} (You)</span>
        </div>
        <button onclick="window.Features && window.Features.toggleCallWidget()" class="call-action-btn">
          🎙️ Start Voice / Video Call
        </button>
      </div>
      <div class="games-grid-container">
    `;

    ALL_GAMES.forEach(game => {
      html += `
        <div class="game-card" onclick="App.launchGame('${game.id}')">
          <div class="game-card-top">
            <span class="game-emoji">${game.emoji}</span>
            <span class="game-badge">${game.tag}</span>
          </div>
          <h4 class="game-title">${game.title}</h4>
          <p class="game-desc">${game.desc}</p>
          <button class="btn-play-card">Play Game →</button>
        </div>
      `;
    });

    html += `</div>`;
    main.innerHTML = html;
  },

  launchGame(gameId) {
    this.activeGame = gameId;
    this.gameState = { gameId, choices: {}, turn: 0 };
    this.broadcastState(this.gameState);
    this.renderActiveGame();
  },

  broadcastState(newState) {
    this.gameState = { ...this.gameState, ...newState };
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: this.gameState
      });
    }
  },

  renderActiveGame() {
    const main = document.getElementById('main-content');
    if (!main || !this.activeGame) return;

    const gameInfo = ALL_GAMES.find(g => g.id === this.activeGame) || { title: this.activeGame, emoji: '🎮' };
    let contentHTML = '';

    switch (this.activeGame) {
      case 'would-rather':
        contentHTML = this.renderWouldRather();
        break;
      case 'this-or-that':
        contentHTML = this.renderThisOrThat();
        break;
      case 'truths-lie':
        contentHTML = this.renderTruthsLie();
        break;
      case 'red-green-flag':
        contentHTML = this.renderRedGreenFlag();
        break;
      case 'blind-rank':
        contentHTML = this.renderBlindRank();
        break;
      case 'couple-compat':
        contentHTML = this.renderCompatQuiz();
        break;
      case 'guess-age':
        contentHTML = this.renderGuessAge();
        break;
      case 'guess-number':
        contentHTML = this.renderGuessNumber();
        break;
      case 'guess-celeb':
        contentHTML = this.renderGuessCeleb();
        break;
      case 'categories-bomb':
        contentHTML = this.renderBomb();
        break;
      case 'word-letters':
        contentHTML = this.renderWordLetters();
        break;
      default:
        contentHTML = `<p>Game active! Play together live.</p>`;
    }

    main.innerHTML = `
      <div class="game-play-wrapper">
        <div class="game-top-bar">
          <button class="btn-back" onclick="App.renderLobby()">← Back to All Games</button>
          <button class="btn-call-mini" onclick="window.Features && window.Features.toggleCallWidget()">🎙️ Voice/Video Call</button>
        </div>
        <div class="game-header-title">
          <h2>${gameInfo.emoji} ${gameInfo.title}</h2>
        </div>
        <div id="game-live-content">
          ${contentHTML}
        </div>
      </div>
    `;
  },

  submitChoice(choice) {
    const newChoices = { ...(this.gameState.choices || {}), [this.myId]: choice };
    this.broadcastState({ choices: newChoices });
    this.renderActiveGame();
    if (window.confetti && Object.keys(newChoices).length > 1) {
      window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  },

  renderWouldRather() {
    const prompts = [
      { a: "Always be 10 minutes late", b: "Always be 20 minutes early" },
      { a: "Live in a quiet beach house", b: "Live in a bustling city penthouse" },
      { a: "Never use social media again", b: "Never watch movies/shows again" }
    ];
    const cur = prompts[(this.gameState.turn || 0) % prompts.length];
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>Would You Rather...</h3>
        <div class="choice-buttons">
          <button class="btn-choice ${myChoice === 'A' ? 'selected' : ''}" onclick="App.submitChoice('A')">${cur.a}</button>
          <div style="text-align:center; font-weight:700; color:#888;">OR</div>
          <button class="btn-choice ${myChoice === 'B' ? 'selected' : ''}" onclick="App.submitChoice('B')">${cur.b}</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ turn: (App.gameState.turn||0)+1, choices: {} }); App.renderActiveGame();">Next Dilemma →</button>
      </div>
    `;
  },

  renderThisOrThat() {
    const pairs = [
      { a: "☕ Coffee", b: "🍵 Tea" },
      { a: "🌙 Night Owl", b: "☀️ Early Bird" },
      { a: "🍕 Pizza", b: "🍔 Burger" }
    ];
    const cur = pairs[(this.gameState.turn || 0) % pairs.length];
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>This or That?</h3>
        <div class="choice-buttons">
          <button class="btn-choice ${myChoice === 'A' ? 'selected' : ''}" onclick="App.submitChoice('A')">${cur.a}</button>
          <button class="btn-choice ${myChoice === 'B' ? 'selected' : ''}" onclick="App.submitChoice('B')">${cur.b}</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ turn: (App.gameState.turn||0)+1, choices: {} }); App.renderActiveGame();">Next Pair →</button>
      </div>
    `;
  },

  renderRedGreenFlag() {
    const scenarios = [
      "Claps when the airplane lands",
      "Remembers your exact coffee order on week 1",
      "Has 10,000 unread emails"
    ];
    const cur = scenarios[(this.gameState.turn || 0) % scenarios.length];
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>Red, Green, or Beige Flag?</h3>
        <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:16px; border-radius:12px; font-weight:600; font-size:16px; text-align:center;">"${cur}"</div>
        <div class="choice-buttons" style="flex-direction:row; gap:8px;">
          <button class="btn-choice ${myChoice === 'RED' ? 'selected' : ''}" style="flex:1" onclick="App.submitChoice('RED')">🚩 Red</button>
          <button class="btn-choice ${myChoice === 'BEIGE' ? 'selected' : ''}" style="flex:1" onclick="App.submitChoice('BEIGE')">🟨 Beige</button>
          <button class="btn-choice ${myChoice === 'GREEN' ? 'selected' : ''}" style="flex:1" onclick="App.submitChoice('GREEN')">🟩 Green</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ turn: (App.gameState.turn||0)+1, choices: {} }); App.renderActiveGame();">Next Scenario →</button>
      </div>
    `;
  },

  renderTruthsLie() {
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;
    return `
      <div class="dilemma-card">
        <h3>2 Truths & 1 Lie</h3>
        <p>Type 3 statements below (2 true, 1 lie), then let your partner guess!</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <input type="text" id="st-1" placeholder="Statement 1..." class="game-input" />
          <input type="text" id="st-2" placeholder="Statement 2..." class="game-input" />
          <input type="text" id="st-3" placeholder="Statement 3 (The Lie)..." class="game-input" />
        </div>
        <button class="btn-action" onclick="App.submitChoice('Submitted 3 Statements')">Lock Statements</button>
        ${myChoice ? `<p style="color:#137333; font-weight:600;">✅ Statements sent to partner!</p>` : ''}
      </div>
    `;
  },

  renderBlindRank() {
    const items = ["Tropical Vacation", "Homemade Dinner", "Surprise Gift", "Road Trip", "Movie Night"];
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>Blind Ranking</h3>
        <p>Rank these mystery experiences 1 to 5!</p>
        ${items.map(item => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#FAF9F7; padding:10px 14px; border-radius:10px; border:1px solid #E8E6E3;">
            <span>${item}</span>
            <select onchange="App.submitChoice(this.value)" class="game-input" style="width:auto; padding:6px;">
              <option value="">Rank</option>
              <option value="1">#1 Top</option>
              <option value="2">#2</option>
              <option value="3">#3</option>
              <option value="4">#4</option>
              <option value="5">#5</option>
            </select>
          </div>
        `).join('')}
        ${myChoice ? `<p style="color:#137333; font-weight:600;">Selected Rank: #${myChoice}</p>` : ''}
      </div>
    `;
  },

  renderCompatQuiz() {
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;
    return `
      <div class="dilemma-card">
        <h3>Compatibility Quiz</h3>
        <p>Who is more likely to buy impulse snacks on late nights?</p>
        <div class="choice-buttons">
          <button class="btn-choice ${myChoice === 'ME' ? 'selected' : ''}" onclick="App.submitChoice('ME')">🙋‍♂️ Definitely Me</button>
          <button class="btn-choice ${myChoice === 'PARTNER' ? 'selected' : ''}" onclick="App.submitChoice('PARTNER')">🙋‍♀️ Definitely Partner</button>
        </div>
        ${this.renderChoiceComparison()}
      </div>
    `;
  },

  renderGuessAge() {
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;
    return `
      <div class="dilemma-card">
        <h3>Guess The Number / Year</h3>
        <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:16px; border-radius:12px; font-weight:600; text-align:center;">"Year iPhone 1 was released"</div>
        <input type="number" id="age-input" placeholder="Enter year..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('age-input').value)">Submit Guess</button>
        ${this.renderChoiceComparison()}
      </div>
    `;
  },

  renderGuessNumber() {
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;
    return `
      <div class="dilemma-card">
        <h3>Guess Secret Number (1-100)</h3>
        <input type="number" id="num-input" placeholder="Enter 1-100..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('num-input').value)">Submit Guess</button>
        ${myChoice ? `<p style="font-weight:600;">Your guess: ${myChoice}</p>` : ''}
      </div>
    `;
  },

  renderGuessCeleb() {
    return `
      <div class="dilemma-card">
        <h3>Guess The Celebrity</h3>
        <p>Clue #1: Grammy-winning pop star born in Houston, Texas.</p>
        <input type="text" id="celeb-input" placeholder="Type answer..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('celeb-input').value)">Submit Guess</button>
      </div>
    `;
  },

  renderBomb() {
    return `
      <div class="dilemma-card">
        <h3>💣 Pass The Bomb</h3>
        <p>Category: <strong>Items in a kitchen!</strong></p>
        <input type="text" id="bomb-input" placeholder="Type word fast..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('bomb-input').value)">PASS BOMB 💣</button>
      </div>
    `;
  },

  renderWordLetters() {
    return `
      <div class="dilemma-card">
        <h3>🔤 First / Last Letter</h3>
        <p>Word must start with letter: <strong>'E'</strong></p>
        <input type="text" id="letter-input" placeholder="Type word..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('letter-input').value)">Submit Word</button>
      </div>
    `;
  },

  renderChoiceComparison() {
    const choices = this.gameState.choices || {};
    const keys = Object.keys(choices);
    if (keys.length === 0) {
      return `<p style="color:#666; font-size:14px; margin-top:10px;">Waiting for answers...</p>`;
    }

    let html = `<div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:12px; border-radius:12px; margin-top:12px;"><strong>Live Choice Sync:</strong>`;
    keys.forEach(k => {
      const isMe = k === this.myId;
      html += `<div style="margin-top:4px;">${isMe ? 'You' : 'Partner'}: <strong>${choices[k]}</strong></div>`;
    });
    if (keys.length >= 2) {
      const isMatch = choices[keys[0]] === choices[keys[1]];
      html += `<div style="margin-top:8px; padding:8px; border-radius:6px; font-weight:700; text-align:center; background:${isMatch ? '#E6F4EA' : '#FEF7E0'}; color:${isMatch ? '#137333' : '#B06000'};">${isMatch ? '🎉 MATCH!' : '🤝 Different choices — discuss!'}</div>`;
    }
    html += `</div>`;
    return html;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());