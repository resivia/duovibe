// DuoVibe Engine - Direct Supabase Realtime Connection

const SUPABASE_URL = 'https://euqrzxxldlsbhuyjuleo.supabase.co';
const SUPABASE_ANON_KEY = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) ? window.CONFIG.SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cXJ6eHhsZGxzYmh1eWp1bGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4NTYwMDAsImV4cCI6MjAyNTQzMjAwMH0.placeholder';

function initSupabase() {
  if (window.supabase && !window.sb) {
    try {
      const key = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) ? window.CONFIG.SUPABASE_ANON_KEY : SUPABASE_ANON_KEY;
      window.sb = window.supabase.createClient(SUPABASE_URL, key);
      console.log("Supabase Client Initialized Successfully!");
    } catch (e) {
      console.error("Supabase Client Init Error:", e);
    }
  }
}

initSupabase();

const ALL_GAMES = [
  { id: 'blind-rank', num: 1, title: 'Blind Ranking', emoji: 'Ã°Å¸â€Å¸', tag: 'TikTok Trend', desc: 'Rank 5 mystery items 1-5 without knowing what comes next!' },
  { id: 'truths-lie', num: 2, title: '2 Truths & 1 Lie', emoji: 'Ã°Å¸Â¤Â«', tag: 'Duo Game', desc: 'Write 3 statements Ã¢â‚¬â€ partner sniffs out the lie.' },
  { id: 'would-rather', num: 3, title: 'Would You Rather', emoji: 'Ã¢Å¡â€“Ã¯Â¸Â', tag: 'Dilemmas', desc: 'Vote secretly on dilemmas. Compare choices side-by-side!' },
  { id: 'this-or-that', num: 4, title: 'This or That', emoji: 'Ã¢Å¡Â¡', tag: 'Rapid Fire', desc: 'Quick-fire choices Ã¢â‚¬â€ see if your tastes align in real time!' },
  { id: 'red-green-flag', num: 5, title: 'Red or Green Flag', emoji: 'Ã°Å¸Å¡Â©', tag: 'Opinion', desc: 'Judge dating scenarios Ã¢â‚¬â€ Red, Green, or Beige flag?' },
  { id: 'couple-compat', num: 6, title: 'Compatibility Quiz', emoji: 'Ã°Å¸â€Â®', tag: 'Secrets', desc: 'Answer relationship questions secretly & reveal match %!' },
  { id: 'word-letters', num: 7, title: 'First / Last Letter', emoji: 'Ã°Å¸â€Â¤', tag: 'Word Battle', desc: 'Word matching constraints before the round timer runs out!' },
  { id: 'categories-bomb', num: 8, title: 'Pass The Bomb', emoji: 'Ã°Å¸â€™Â£', tag: 'Adrenaline', desc: 'Name items fast before the bomb explodes on your screen!' },
  { id: 'guess-age', num: 9, title: 'Guess The Age', emoji: 'Ã°Å¸Å½â€š', tag: 'Visual Guess', desc: 'Both guess numbers/ages Ã¢â‚¬â€ closest guess wins!' },
  { id: 'guess-number', num: 10, title: 'Guess The Number', emoji: 'Ã°Å¸â€Â¢', tag: 'Hot or Cold', desc: 'Race to find secret number 1-100 with live higher/lower hints!' },
  { id: 'guess-celeb', num: 11, title: 'Guess Celebrity', emoji: 'Ã°Å¸Å’Å¸', tag: 'Mystery Pop', desc: 'Unlock clues together and guess the star!' }
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
    initSupabase();
    localStorage.setItem('duo_my_id', this.myId);
    if (!this.myName) {
      this.myName = 'Player ' + Math.floor(Math.random() * 90 + 10);
      localStorage.setItem('duo_my_name', this.myName);
    }
    this.checkOnlineStatus();
    this.renderHome();
  },

  checkOnlineStatus() {
    const statusEl = document.getElementById('conn-status');
    if (!statusEl) return;
    if (this.currentRoom) {
      statusEl.textContent = 'Ã¢â‚¬Â¢ LIVE - Room ' + this.currentRoom;
      statusEl.className = 'status-badge live';
    } else if (window.sb || window.supabase) {
      statusEl.textContent = 'Ã¢â‚¬Â¢ ONLINE';
      statusEl.className = 'status-badge online';
    } else {
      statusEl.textContent = 'Ã¢â‚¬Â¢ OFFLINE';
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
        <h2>Welcome to DuoVibe Ã°Å¸â€™â€¢</h2>
        <p class="subtitle">Play 11 real-time games with your long-distance partner</p>
        
        <div class="input-group">
          <label>Your Name:</label>
          <input type="text" id="user-name-input" value="${this.myName}" class="game-input" placeholder="Enter your name" onchange="App.updateName(this.value)" />
        </div>

        <div class="action-buttons-stack">
          <button class="btn-primary" onclick="App.createRoom()">Ã¢Å“Â¨ Create New Room</button>
          
          <div class="join-row">
            <input type="text" id="room-code-input" class="game-input" placeholder="6-DIGIT ROOM CODE" style="text-transform:uppercase" />
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

    initSupabase();
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
    }

    this.renderLobby();
  },

  updatePlayerListUI() {
    const listEl = document.getElementById('connected-players-bar');
    if (listEl) {
      listEl.innerHTML = this.players.map(p => 
        `<span class="player-badge ${p.id === this.myId ? 'me' : ''}">Ã°Å¸â€˜Â¤ ${p.name || 'Partner'}</span>`
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
          <h3>Ã°Å¸Å½Â® Select a Game (${ALL_GAMES.length} Available)</h3>
          <span class="room-tag">Room Code: <strong>${this.currentRoom}</strong></span>
        </div>
        <div id="connected-players-bar" class="players-bar">
          <span class="player-badge me">Ã°Å¸â€˜Â¤ ${this.myName} (You)</span>
        </div>
        <button onclick="window.Features && window.Features.toggleCallWidget()" class="call-action-btn">
          Ã°Å¸Å½â„¢Ã¯Â¸Â Start Voice / Video Call
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
          <button class="btn-play-card">Play Game Ã¢â€ â€™</button>
        </div>
      `;
    });

    html += `</div>`;
    main.innerHTML = html;
  },

  launchGame(gameId) {
    this.activeGame = gameId;
    this.gameState = { gameId, choices: {}, turn: 0, currentPrompt: null, rankSet: null, secretNumber: null, clueIdx: 0 };
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

    const gameInfo = ALL_GAMES.find(g => g.id === this.activeGame) || { title: this.activeGame, emoji: 'Ã°Å¸Å½Â®' };
    let contentHTML = '';

    switch (this.activeGame) {
      case 'would-rather': contentHTML = this.renderWouldRather(); break;
      case 'this-or-that': contentHTML = this.renderThisOrThat(); break;
      case 'truths-lie': contentHTML = this.renderTruthsLie(); break;
      case 'red-green-flag': contentHTML = this.renderRedGreenFlag(); break;
      case 'blind-rank': contentHTML = this.renderBlindRank(); break;
      case 'couple-compat': contentHTML = this.renderCompatQuiz(); break;
      case 'guess-age': contentHTML = this.renderGuessAge(); break;
      case 'guess-number': contentHTML = this.renderGuessNumber(); break;
      case 'guess-celeb': contentHTML = this.renderGuessCeleb(); break;
      case 'categories-bomb': contentHTML = this.renderBomb(); break;
      case 'word-letters': contentHTML = this.renderWordLetters(); break;
      default: contentHTML = `<p>Game active! Play together live.</p>`;
    }

    main.innerHTML = `
      <div class="game-play-wrapper">
        <div class="game-top-bar">
          <button class="btn-back" onclick="App.renderLobby()">Ã¢â€ Â Back to All Games</button>
          <button class="btn-call-mini" onclick="window.Features && window.Features.toggleCallWidget()">Ã°Å¸Å½â„¢Ã¯Â¸Â Voice/Video Call</button>
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
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('wouldRather', window.BANKS.wouldRather);
    }
    const cur = this.gameState.currentPrompt;
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
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ turn: (App.gameState.turn||0)+1, choices: {}, currentPrompt: null }); App.renderActiveGame();">Next Dilemma Ã¢â€ â€™</button>
      </div>
    `;
  },

  renderThisOrThat() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('thisOrThat', window.BANKS.thisOrThat);
    }
    const cur = this.gameState.currentPrompt;
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>This or That?</h3>
        <div class="choice-buttons">
          <button class="btn-choice ${myChoice === 'A' ? 'selected' : ''}" onclick="App.submitChoice('A')">${cur.a}</button>
          <button class="btn-choice ${myChoice === 'B' ? 'selected' : ''}" onclick="App.submitChoice('B')">${cur.b}</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ turn: (App.gameState.turn||0)+1, choices: {}, currentPrompt: null }); App.renderActiveGame();">Next Pair Ã¢â€ â€™</button>
      </div>
    `;
  },

  renderRedGreenFlag() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('redGreenFlag', window.BANKS.redGreenFlag);
    }
    const cur = this.gameState.currentPrompt;
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;

    return `
      <div class="dilemma-card">
        <h3>Red, Green, or Beige Flag?</h3>
        <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:16px; border-radius:12px; font-weight:600; font-size:16px; text-align:center;">"${cur}"</div>
        <div class="choice-buttons" style="flex-direction:row; gap:8px;">
          <button class="btn-choice ${myChoice === 'RED' ? 'selected' : ''}" style="flex:1" onclick="App.submitChoice('RED')">Ã°Å¸Å¡Â© Red</button>
          <button class="btn-choice ${myChoice === 'BEIGE' ? 'selected' : ''}" style="flex:1" onclick="App.submitChoice('BEIGE')">Ã°Å¸Å¸Â¨ Beige</button>
          <button class="btn-choice ${myChoice === 'GREEN' ? 'selected' : ''}" style="flex:1" onclick="App.submitChoice('GREEN')">Ã°Å¸Å¸Â© Green</button>
        </div>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px;" onclick="App.broadcastState({ turn: (App.gameState.turn||0)+1, choices: {}, currentPrompt: null }); App.renderActiveGame();">Next Scenario Ã¢â€ â€™</button>
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
        ${myChoice ? `<p style="color:#137333; font-weight:600;">Ã¢Å“â€¦ Statements sent to partner!</p>` : ''}
      </div>
    `;
  },

  renderBlindRank() {
    if (!this.gameState.rankSet) {
      this.gameState.rankSet = window.Picker.freshBlindRankSet(5);
    }
    const items = this.gameState.rankSet;
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
          <button class="btn-choice ${myChoice === 'ME' ? 'selected' : ''}" onclick="App.submitChoice('ME')">Ã°Å¸â„¢â€¹Ã¢â‚¬ÂÃ¢â„¢â€šÃ¯Â¸Â Definitely Me</button>
          <button class="btn-choice ${myChoice === 'PARTNER' ? 'selected' : ''}" onclick="App.submitChoice('PARTNER')">Ã°Å¸â„¢â€¹Ã¢â‚¬ÂÃ¢â„¢â‚¬Ã¯Â¸Â Definitely Partner</button>
        </div>
        ${this.renderChoiceComparison()}
      </div>
    `;
  },

  renderGuessAge() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('guessAge', window.BANKS.guessAge);
    }
    const cur = this.gameState.currentPrompt;
    return `
      <div class="dilemma-card">
        <h3>Guess The Year</h3>
        <div style="background:#FAF9F7; border:1px solid #E8E6E3; padding:16px; border-radius:12px; font-weight:600; text-align:center;">"${cur.subject}"</div>
        <input type="number" id="age-input" placeholder="Enter year..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('age-input').value)">Submit Guess</button>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="alert('Answer: ' + App.gameState.currentPrompt.answer); App.broadcastState({ choices: {}, currentPrompt: null }); App.renderActiveGame();">Reveal & Next â†’</button>
      </div>
    `;
  },

  renderGuessNumber() {
    if (!this.gameState.secretNumber) {
      this.gameState.secretNumber = window.Picker.freshNumber(1, 100);
    }
    const myChoice = this.gameState.choices ? this.gameState.choices[this.myId] : null;
    const guess = myChoice ? parseInt(myChoice) : null;
    const secret = this.gameState.secretNumber;
    let hint = '';
    if (guess !== null) {
      if (guess === secret) hint = 'ðŸŽ‰ CORRECT!';
      else if (guess < secret) hint = 'â¬†ï¸ Higher';
      else hint = 'â¬‡ï¸ Lower';
    }
    return `
      <div class="dilemma-card">
        <h3>Guess Secret Number (1-100)</h3>
        <input type="number" id="num-input" placeholder="Enter 1-100..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('num-input').value)">Submit Guess</button>
        ${myChoice ? `<p style="font-weight:600;">Your guess: ${myChoice} â€” <strong>${hint}</strong></p>` : ''}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="App.broadcastState({ choices: {}, secretNumber: null }); App.renderActiveGame();">New Round â†’</button>
      </div>
    `;
  },

  renderGuessCeleb() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('guessCeleb', window.BANKS.guessCeleb);
      this.gameState.clueIdx = 0;
    }
    const cur = this.gameState.currentPrompt;
    const clueIdx = this.gameState.clueIdx || 0;
    const cluesShown = cur.clues.slice(0, clueIdx + 1);
    return `
      <div class="dilemma-card">
        <h3>Guess The Celebrity</h3>
        ${cluesShown.map((c, i) => `<p><strong>Clue #${i+1}:</strong> ${c}</p>`).join('')}
        ${clueIdx < cur.clues.length - 1 ? `<button class="btn-action" style="background:#E8E6E3; color:#1A1A1A;" onclick="App.broadcastState({ clueIdx: (App.gameState.clueIdx||0)+1 }); App.renderActiveGame();">Reveal Next Clue</button>` : ''}
        <input type="text" id="celeb-input" placeholder="Type answer..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('celeb-input').value)">Submit Guess</button>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="alert('Answer: ' + App.gameState.currentPrompt.answer); App.broadcastState({ choices: {}, currentPrompt: null, clueIdx: 0 }); App.renderActiveGame();">Reveal & Next â†’</button>
      </div>
    `;
  },

  renderBomb() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('bombCategories', window.BANKS.bombCategories);
    }
    const cat = this.gameState.currentPrompt;
    return `
      <div class="dilemma-card">
        <h3>ðŸ’£ Pass The Bomb</h3>
        <p>Category: <strong>${cat}</strong></p>
        <input type="text" id="bomb-input" placeholder="Type word fast..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('bomb-input').value)">PASS BOMB ðŸ’£</button>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="App.broadcastState({ choices: {}, currentPrompt: null }); App.renderActiveGame();">New Category â†’</button>
      </div>
    `;
  },

  renderWordLetters() {
    if (!this.gameState.currentPrompt) {
      this.gameState.currentPrompt = window.Picker.nextItem('letterPrompts', window.BANKS.letterPrompts);
    }
    const cur = this.gameState.currentPrompt;
    return `
      <div class="dilemma-card">
        <h3>ðŸ”¤ First / Last Letter</h3>
        <p>Category: <strong>${cur.category}</strong></p>
        <p>Word must start with letter: <strong>'${cur.letter}'</strong></p>
        <input type="text" id="letter-input" placeholder="Type word..." class="game-input" />
        <button class="btn-action" onclick="App.submitChoice(document.getElementById('letter-input').value)">Submit Word</button>
        ${this.renderChoiceComparison()}
        <button class="btn-action" style="margin-top:12px; background:#E8E6E3; color:#1A1A1A;" onclick="App.broadcastState({ choices: {}, currentPrompt: null }); App.renderActiveGame();">New Category â†’</button>
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
      html += `<div style="margin-top:8px; padding:8px; border-radius:6px; font-weight:700; text-align:center; background:${isMatch ? '#E6F4EA' : '#FEF7E0'}; color:${isMatch ? '#137333' : '#B06000'};">${isMatch ? 'Ã°Å¸Å½â€° MATCH!' : 'Ã°Å¸Â¤Â Different choices Ã¢â‚¬â€ discuss!'}</div>`;
    }
    html += `</div>`;
    return html;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());